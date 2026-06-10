// ═══════════════════════════════════════════════════════════════════════
// A2Z Cloud — CRM Health Check — Vuex Store
// ALL Zoho CRM calls happen here (via api.js execute_function). Components
// only dispatch actions and read getters.
// ═══════════════════════════════════════════════════════════════════════
import { createStore } from 'vuex'
import { execute_function } from '@/javascript/api.js'
import {
    HEALTH_SECTIONS,
    FUNCTIONS_TO_RUN,
    FN_TO_SECTIONS
} from '@/data/health_checks.js'
import {
    normalise_status,
    compute_section_score,
    compute_overall_score,
    count_by_status,
    sanitize_input
} from '@/javascript/Util.js'

// Build the initial, hydrated section list from the static catalogue.
// Each check gets a live `status` (from its seed), `value`, `comment`, `source`.
function build_initial_sections() {
    return HEALTH_SECTIONS.map(section => {
        const checks = section.checks.map((c, idx) => ({
            id: `${section.key}__${idx}`,
            task: c.task,
            auto_key: c.auto_key,
            status: normalise_status(c.default_status),
            value: null,
            comment: c.comment || '',
            source: c.auto_key ? 'auto' : 'manual'   // 'auto' until proven otherwise
        }))
        return {
            key: section.key,
            title: section.title,
            fn: section.fn,
            overview: section.overview || '',
            checks,
            score: compute_section_score(checks),
            ai_summary: null,     // populated from the function's AI summary block
            fetch_state: 'idle'   // idle | loading | done | error
        }
    })
}

export const store = createStore({
    state: {
        // CRM context (from PageLoad)
        module: null,
        record_id: null,
        button_position: null,

        // Health dashboard
        sections: build_initial_sections(),
        active_section_key: HEALTH_SECTIONS[0].key,
        running: false,
        sdk_ready: false,          // set true when PageLoad fires (handshake done)

        // Errors
        api_error: null,
        validation_errors: {}
    },

    getters: {
        module:           state => state.module,
        record_id:        state => state.record_id,
        button_position:  state => state.button_position,

        sections:         state => state.sections,
        active_section_key: state => state.active_section_key,
        active_section:   state => state.sections.find(s => s.key === state.active_section_key) || null,
        section_by_key:   state => key => state.sections.find(s => s.key === key) || null,
        running:          state => state.running,

        overall_score:    state => compute_overall_score(state.sections),

        // aggregate counts across all checks
        overall_counts:   state => {
            const all = state.sections.flatMap(s => s.checks)
            return count_by_status(all)
        },

        api_error:        state => state.api_error,
        has_api_error:    state => !!state.api_error,
        validation_errors: state => state.validation_errors
    },

    mutations: {
        set_module(state, v)          { state.module = v },
        set_record_id(state, v)       { state.record_id = v },
        set_button_position(state, v) { state.button_position = v },

        set_active_section(state, key) { state.active_section_key = key },
        set_running(state, v)          { state.running = v },
        set_sdk_ready(state, v)        { state.sdk_ready = v },

        set_section_fetch_state(state, { key, fetch_state }) {
            const s = state.sections.find(x => x.key === key)
            if (s) s.fetch_state = fetch_state
        },

        set_section_ai_summary(state, { key, ai_summary }) {
            const s = state.sections.find(x => x.key === key)
            if (s) s.ai_summary = ai_summary
        },

        // Merge a function's returned `checks` map onto the matching section's check rows.
        apply_section_results(state, { section_key, returned_checks }) {
            const section = state.sections.find(s => s.key === section_key)
            if (!section) return
            section.checks = section.checks.map(check => {
                if (!check.auto_key) return check   // manual row, leave as-is
                const result = returned_checks ? returned_checks[check.auto_key] : null
                if (!result) {
                    // function ran but had nothing for this key -> needs review
                    return { ...check, status: 'review', source: 'auto' }
                }
                return {
                    ...check,
                    status: normalise_status(result.status),
                    value: result.value ?? null,
                    comment: result.comment != null && result.comment !== ''
                        ? result.comment
                        : check.comment,
                    source: 'auto'
                }
            })
            section.score = compute_section_score(section.checks)
        },

        // When a function fails entirely, degrade its auto rows to review.
        degrade_section(state, { section_key, message }) {
            const section = state.sections.find(s => s.key === section_key)
            if (!section) return
            section.checks = section.checks.map(check =>
                check.auto_key
                    ? { ...check, status: 'review', comment: check.comment || message, source: 'auto' }
                    : check
            )
            section.score = compute_section_score(section.checks)
        },

        // Manual edit of a check's comment / status from the UI
        update_check(state, { section_key, check_id, comment, status }) {
            const section = state.sections.find(s => s.key === section_key)
            if (!section) return
            const check = section.checks.find(c => c.id === check_id)
            if (!check) return
            if (comment !== undefined) check.comment = sanitize_input(comment)
            if (status !== undefined)  check.status = normalise_status(status)
            section.score = compute_section_score(section.checks)
        },

        set_api_error(state, msg)  { state.api_error = msg },
        clear_api_error(state)     { state.api_error = null }
    },

    actions: {
        set_active_section({ commit }, key) { commit('set_active_section', key) },
        clear_error({ commit })             { commit('clear_api_error') },

        update_check({ commit }, payload)   { commit('update_check', payload) },

        // Run ONE Deluge function and apply its results to every section it feeds.
        async fetch_function({ commit }, fn_name) {
            const section_keys = FN_TO_SECTIONS[fn_name] || []
            section_keys.forEach(key =>
                commit('set_section_fetch_state', { key, fetch_state: 'loading' })
            )

            const result = await execute_function(fn_name, {})

            if (!result.ok) {
                const message = result.missing_scope
                    ? `No access (${result.missing_scope}) — manual review`
                    : (result.error || 'Could not fetch — manual review')
                section_keys.forEach(key => {
                    commit('degrade_section', { section_key: key, message })
                    commit('set_section_fetch_state', { key, fetch_state: 'error' })
                })
                return { fn_name, ok: false, error: message }
            }

            // A function returns one `section` key in its payload, but our catalogue
            // may map the same fn to several sections (e.g. hc_automation -> workflows
            // + automation). Apply the same checks map to all mapped sections; each
            // section only picks up the auto_keys it actually declares.
            section_keys.forEach(key => {
                commit('apply_section_results', { section_key: key, returned_checks: result.checks })
                if (result.ai_summary) {
                    commit('set_section_ai_summary', { key, ai_summary: result.ai_summary })
                }
                commit('set_section_fetch_state', { key, fetch_state: 'done' })
            })
            return { fn_name, ok: true }
        },

        // Run the whole health check. Fan out all functions; one failure never
        // blocks the others (Promise.allSettled).
        async run_health_check({ commit, dispatch, state }) {
            commit('set_running', true)
            commit('clear_api_error')
            try {
                // Guard: PageLoad must have fired before any ZOHO.CRM.* call.
                // Without it the SDK throws "Parentwindow reference not found".
                if (!state.sdk_ready) {
                    commit('set_api_error', 'Waiting for CRM to initialise. Please wait and try again.')
                    return
                }
                const results = await Promise.allSettled(
                    FUNCTIONS_TO_RUN.map(fn => dispatch('fetch_function', fn))
                )
                const failed = results.filter(r =>
                    r.status === 'rejected' || (r.value && r.value.ok === false)
                )
                if (failed.length === FUNCTIONS_TO_RUN.length) {
                    const first = failed[0]
                    const detail = first?.status === 'rejected'
                        ? (first.reason?.message || String(first.reason))
                        : (first?.value?.error || 'unknown')
                    commit('set_api_error',
                        `All checks failed. First error — ${detail}. ` +
                        `Check: functions deployed with exact names, REST API enabled, connection "crm_healthcheck" authorised. See browser console for details.`)
                }
            } finally {
                commit('set_running', false)
            }
        },

        // Re-run a single section's function (refresh button on a card)
        async refresh_section({ dispatch, getters }, section_key) {
            const section = getters.section_by_key(section_key)
            if (!section || !section.fn) return
            await dispatch('fetch_function', section.fn)
        },

        async close_widget() {
            try { await ZOHO.CRM.UI.Popup.close() }
            catch (e) { console.error('close_widget failed:', e) }
        }
    }
})
