// ═══════════════════════════════════════════════════════════════════════
// A2Z Cloud — CRM Health Check — Vuex Store
// ALL Zoho CRM calls happen here (via api.js execute_function). Components
// only dispatch actions and read getters.
// ═══════════════════════════════════════════════════════════════════════
import { createStore } from 'vuex'
import { execute_function } from '@/javascript/api.js'
import {
    sdk_get_modules,
    sdk_get_fields,
    sdk_get_layouts,
    sdk_get_related_lists,
    sdk_get_all_users,
    sdk_get_all_profiles,
    sdk_get_record_count,
    sdk_get_org,
    sdk_get_current_user
} from '@/javascript/sdk_fetch.js'
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
            value_type: c.value_type ?? null,
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
            if (s) {
                s.ai_summary = ai_summary
                try { console.log(`[hc] ai_summary set for ${key}:`, !!ai_summary) } catch (e) { /* noop */ }
            }
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
                // ai_summary must be set AFTER apply_section_results so it isn't
                // accidentally cleared by a subsequent apply_section_results call
                // from fetch_sdk_data. Always set it regardless of previous value.
                commit('set_section_ai_summary', { key, ai_summary: result.ai_summary ?? null })
                try { console.log(`[hc] ${fn_name} → ${key} ai_summary present:`, !!result.ai_summary) } catch (e) { /* noop */ }
                commit('set_section_fetch_state', { key, fetch_state: 'done' })
            })
            return { fn_name, ok: true }
        },

        // Run the whole health check — Deluge functions + SDK calls in parallel.
        async run_health_check({ commit, dispatch, state }) {
            commit('set_running', true)
            commit('clear_api_error')
            try {
                if (!state.sdk_ready) {
                    commit('set_api_error', 'Waiting for CRM to initialise. Please wait and try again.')
                    return
                }
                // Run Deluge functions + SDK supplement calls concurrently
                const [fn_results] = await Promise.all([
                    Promise.allSettled(FUNCTIONS_TO_RUN.map(fn => dispatch('fetch_function', fn))),
                    dispatch('fetch_sdk_data')
                ])
                const failed = fn_results.filter(r =>
                    r.status === 'rejected' || (r.value && r.value.ok === false)
                )
                if (failed.length > 0) {
                    const errors = failed.map(r =>
                        r.status === 'rejected'
                            ? (r.reason?.message || String(r.reason))
                            : (r.value?.error || 'unknown')
                    ).filter(Boolean)
                    const prefix = failed.length === FUNCTIONS_TO_RUN.length
                        ? 'All checks failed' : `${failed.length} check(s) failed`
                    commit('set_api_error', `${prefix}: ${errors.join(' | ')}`)
                }
            } finally {
                commit('set_running', false)
            }
        },

        // Direct SDK calls — no Deluge function needed.
        // Runs in parallel with Deluge functions; merges results into sections.
        async fetch_sdk_data({ commit, state }) {
            await Promise.allSettled([
                // ── Modules: enrich with SDK metadata ──────────────────────
                (async () => {
                    const [mods_r, ] = await Promise.all([sdk_get_modules()])
                    if (!mods_r.ok) return
                    const modules = mods_r.data?.modules ?? []
                    const CORE = ['Leads', 'Contacts', 'Accounts', 'Deals']
                    // Per-module deep checks in parallel (capped to 10)
                    const visible = modules
                        .filter(m => m.status === 'visible' && m.api_supported !== false)
                        .slice(0, 10)
                        .map(m => m.api_name)
                    await Promise.allSettled(visible.map(async api_name => {
                        const [fields_r, layouts_r, rl_r] = await Promise.all([
                            sdk_get_fields(api_name),
                            sdk_get_layouts(api_name),
                            sdk_get_related_lists(api_name)
                        ])
                        // Results are available but we let hc_modules Deluge function own
                        // the check values; SDK calls here act as a fast supplement /
                        // fallback if the Deluge function is slow.
                        // Log for debugging only.
                        if (import.meta.env.DEV) {
                            console.log(`[sdk] ${api_name} fields:`, fields_r.data?.fields?.length,
                                'layouts:', layouts_r.data?.layouts?.length,
                                'related lists:', rl_r.data?.related_lists?.length)
                        }
                    }))
                })(),

                // ── Users: supplement with SDK user counts ─────────────────
                (async () => {
                    const [all_r, active_r, deact_r, unconf_r, admin_r, profiles_r] = await Promise.all([
                        sdk_get_all_users('AllUsers'),
                        sdk_get_all_users('ActiveUsers'),
                        sdk_get_all_users('DeactiveUsers'),
                        sdk_get_all_users('NotConfirmedUsers'),
                        sdk_get_all_users('AdminUsers'),
                        sdk_get_all_profiles()
                    ])
                    // Build a merged checks map from SDK data as a supplement
                    // (hc_users Deluge function is the primary source; this fills gaps)
                    const sdk_checks = {}
                    if (all_r.ok) {
                        const info = all_r.data?.info ?? {}
                        sdk_checks.user_counts = {
                            status: 'ok',
                            value: {
                                total:       info.count ?? all_r.data?.users?.length ?? '—',
                                active:      active_r.data?.info?.count ?? active_r.data?.users?.length ?? '—',
                                deactivated: deact_r.data?.info?.count ?? deact_r.data?.users?.length ?? '—',
                                unconfirmed: unconf_r.data?.info?.count ?? unconf_r.data?.users?.length ?? '—',
                                admins:      admin_r.data?.info?.count ?? admin_r.data?.users?.length ?? '—'
                            },
                            comment: `SDK: ${info.count ?? '?'} total users`
                        }
                    }
                    if (profiles_r.ok) {
                        const profs = profiles_r.data?.profiles ?? []
                        sdk_checks.profiles_summary = {
                            status: 'ok',
                            value: { count: profs.length, profiles: profs.map(p => p.name) },
                            comment: `${profs.length} profile(s) configured.`
                        }
                    }
                    // Only apply SDK supplement if Deluge hasn't already populated this section
                    if (Object.keys(sdk_checks).length > 0) {
                        const s = state.sections.find(x => x.key === 'user_management')
                        if (s && s.fetch_state !== 'done') {
                            commit('apply_section_results', {
                                section_key: 'user_management',
                                returned_checks: sdk_checks
                            })
                        }
                    }
                })(),

                // ── General settings: supplement org info via SDK ──────────
                (async () => {
                    const org_r = await sdk_get_org()
                    if (!org_r.ok) return
                    const org = org_r.data?.org?.[0] ?? org_r.data ?? {}
                    if (Object.keys(org).length === 0) return
                    const s = state.sections.find(x => x.key === 'general_settings')
                    if (s && s.fetch_state === 'done') return  // Deluge already done, skip
                    const sdk_checks = {
                        company_details: {
                            status: 'review',
                            value: {
                                company_name:  org.company_name ?? '',
                                country:       org.country ?? '',
                                time_zone:     org.time_zone ?? '',
                                primary_email: org.primary_email ?? ''
                            },
                            comment: 'Verify company details are correct.'
                        }
                    }
                    commit('apply_section_results', {
                        section_key: 'general_settings',
                        returned_checks: sdk_checks
                    })
                })()
            ])
        },

        // Re-run a single section (refresh button)
        async refresh_section({ dispatch, getters }, section_key) {
            const section = getters.section_by_key(section_key)
            if (!section || !section.fn) return
            await Promise.all([
                dispatch('fetch_function', section.fn),
                dispatch('fetch_sdk_data')
            ])
        },

        async close_widget() {
            try { await ZOHO.CRM.UI.Popup.close() }
            catch (e) { console.error('close_widget failed:', e) }
        }
    }
})
