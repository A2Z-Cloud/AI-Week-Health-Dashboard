// ═══════════════════════════════════════════════════════════════════════
// A2Z Cloud — CRM Health Check — Direct Zoho JS SDK helpers
//
// Use these for calls the SDK supports natively — no Deluge function
// needed. All return { ok, data, error } — never throw.
// ═══════════════════════════════════════════════════════════════════════

const wrap = async (label, fn) => {
    try {
        const data = await fn()
        return { ok: true, data }
    } catch (e) {
        console.error(`[hc sdk] ${label} failed:`, e)
        return { ok: false, data: null, error: e?.message ?? String(e) }
    }
}

// ─── Org / config ────────────────────────────────────────────────────

export const sdk_get_org = () =>
    wrap('getOrgInfo', () => ZOHO.CRM.CONFIG.getOrgInfo())

export const sdk_get_current_user = () =>
    wrap('getCurrentUser', () => ZOHO.CRM.CONFIG.getCurrentUser())

// ─── Users ───────────────────────────────────────────────────────────

export const sdk_get_all_users = (type = 'AllUsers', page = 1, per_page = 200) =>
    wrap(`getAllUsers:${type}`, () =>
        ZOHO.CRM.API.getAllUsers({ Type: type, page, per_page })
    )

export const sdk_get_all_profiles = () =>
    wrap('getAllProfiles', () => ZOHO.CRM.API.getAllProfiles())

// ─── Modules / metadata ──────────────────────────────────────────────

export const sdk_get_modules = () =>
    wrap('getModules', () => ZOHO.CRM.META.getModules())

export const sdk_get_fields = (module_name) =>
    wrap(`getFields:${module_name}`, () =>
        ZOHO.CRM.META.getFields({ Entity: module_name })
    )

export const sdk_get_layouts = (module_name) =>
    wrap(`getLayouts:${module_name}`, () =>
        ZOHO.CRM.META.getLayouts({ Entity: module_name })
    )

export const sdk_get_related_lists = (module_name) =>
    wrap(`getRelatedList:${module_name}`, () =>
        ZOHO.CRM.META.getRelatedList({ Entity: module_name })
    )

export const sdk_get_custom_views = (module_name) =>
    wrap(`getCustomViews:${module_name}`, () =>
        ZOHO.CRM.META.getCustomViews({ Entity: module_name })
    )

export const sdk_get_assignment_rules = (module_name) =>
    wrap(`getAssignmentRules:${module_name}`, () =>
        ZOHO.CRM.META.getAssignmentRules({ Entity: module_name })
    )

// ─── Records ─────────────────────────────────────────────────────────

// Get total record count for a module (reads info.count from a 1-record fetch)
export const sdk_get_record_count = async (module_name) => {
    const r = await wrap(`recordCount:${module_name}`, () =>
        ZOHO.CRM.API.getAllRecords({ Entity: module_name, per_page: 1 })
    )
    if (!r.ok) return r
    const count = r.data?.info?.count ?? r.data?.info?.total_count ?? null
    return { ok: true, data: count }
}

export const sdk_coql = (select_query) =>
    wrap('coql', () => ZOHO.CRM.API.coql({ select_query }))
