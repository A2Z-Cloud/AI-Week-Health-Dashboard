// ═══════════════════════════════════════════════════════════════════════
// A2Z Cloud — CRM Health Check — Static Check Catalogue
//
// Only sections backed by a DEPLOYED Zoho CRM standalone function are
// included. Add a section here only once its hc_* function is live.
//
// Each check: { task, auto_key, default_status, comment }
//   auto_key  : key the Deluge function returns in its checks map
//               (null = manual row, analyst fills in)
// ═══════════════════════════════════════════════════════════════════════

export const STATUS = { OK: 'ok', WARNING: 'warning', BAD: 'bad', REVIEW: 'review' }

function check(task, auto_key = null, default_status = 'review', comment = '') {
    return { task, auto_key, default_status, comment }
}

export const HEALTH_SECTIONS = [

    // ─── hc_general_settings ────────────────────────────────────────────
    {
        key: 'general_settings',
        title: 'General Settings',
        fn: 'hc_general_settings',
        overview: '',
        checks: [
            check('Company details',                       'company_details'),
            check('Fiscal year settings',                  'fiscal_year'),
            check('Language and time zone',                'language_timezone'),
            check('Currency settings',                     'currency_settings'),
            check('Multi-currency: exchange rates up to date', 'multi_currency_rates'),
            check('Business hours & holidays',             'business_hours'),
            check('Org variables',                         'org_variables'),
            check('Data backup',                           'data_backup'),
            check('Review email settings (IMAP)',          null, 'bad',     'Most users have not set up IMAP'),
            check('Client Portal enabled',                 null),
            check('Sandbox',                               null, 'warning', 'Enabled but not used for over 2 years'),
            check('Modules edited recently',               null, 'warning', 'Most have not been edited since 2023-2024'),
            check('Multiple languages enabled',            null),
            check('Email authentication',                  null, 'ok',      'Credibility score since April 2025: 0. Spam low, bounce 0%')
        ]
    },

    // ─── hc_modules ─────────────────────────────────────────────────────
    {
        key: 'modules',
        title: 'Modules',
        fn: 'hc_modules',
        overview: 'Suggest hiding modules clearly not in use.',
        checks: [
            check('Module visibility',                          'module_visibility'),
            check('Module layouts',                             'module_layouts',       'review', 'Leads digital imagery layout — 1 record. Deals 4 layouts — needed?'),
            check('Custom fields',                              'custom_fields'),
            check('Related lists',                             'related_lists'),
            check('Global picklist sets — orphaned',            'global_picklists'),
            check('Tags — unused / duplicate',                  'tags_audit'),
            check('Record-count baseline — abandoned modules',  'record_count_baseline'),
            check('Lead conversion mapping',                    'lead_conversion_mapping', 'ok', 'All correct'),
            check('Validation rules (manual — no API)',         null, 'review', 'Review in Setup → Modules'),
            check('Picklist values accurate',                   null),
            check('Module permissions',                         null)
        ]
    },

    // ─── hc_users ───────────────────────────────────────────────────────
    {
        key: 'user_management',
        title: 'User Management',
        fn: 'hc_users',
        overview: '',
        checks: [
            check('User counts (active / deactivated / unconfirmed / admins)', 'user_counts'),
            check('Unconfirmed users (invited, not yet logged in)',             'unconfirmed_users'),
            check('Deactivated users (may still own records)',                  'deactivated_users'),
            check('Admin users (too many = risk)',                              'admin_users'),
            check('Roles configured',                                           'roles_summary'),
            check('Profiles configured',                                        'profiles_summary'),
            check('Ensure deactivated users are reassigned',                    null)
        ]
    },

    // ─── hc_templates ───────────────────────────────────────────────────
    {
        key: 'templates',
        title: 'Templates',
        fn: 'hc_templates',
        overview: '',
        checks: [
            check('Email templates (total / custom / drafts / never used / stale)', 'email_templates'),
            check('Inventory templates (Quotes, Invoices, POs)',                     'inventory_templates'),
            check('Template variables',   null),
            check('Template permissions', null)
        ]
    },

    // ─── hc_automation ──────────────────────────────────────────────────
    {
        key: 'automation',
        title: 'Workflows & Automation',
        fn: 'hc_automation',
        overview: '',
        checks: [
            check('Workflow rule limits & usage (total / active / limit)', 'workflow_limits'),
            check('Inactive workflow rules',                                'inactive_rules'),
            check('Active rules that have never executed',                  'never_executed'),
            check('Deprecated rules still active',                          'deprecated_rules'),
            check('Workflow actions & email alerts', null),
            check('Workflow permissions',            null)
        ]
    },

    // ─── hc_security ────────────────────────────────────────────────────
    {
        key: 'security',
        title: 'Security Settings',
        fn: 'hc_security',
        overview: 'Suggest mandating TFA via Zoho One console.',
        checks: [
            check('GDPR compliance',    'gdpr_compliance'),
            check('HIPAA compliance',   'hipaa_compliance'),
            check('User licences',      'user_licences', 'review', 'Check Setup → Subscription → User Licences'),
            check('Territories',        'territories'),
            check('Audit log',          'audit_log',       'review', 'Verify in Setup → Security Control → Audit Log'),
            check('Password policy',    'password_policy', 'review', 'Verify in Setup → Security Control → Password Policy'),
            check('Two-factor auth',    'two_factor_auth', 'review', 'Suggest mandate TFA via Zoho One console'),
            check('IP restrictions',    'ip_restrictions', 'review', 'Verify in Setup → Security Control → Allowed IP Addresses')
        ]
    },

    // ─── Manual-only (no function — fn: null) ───────────────────────────
    {
        key: 'zoho_flow',
        title: 'Zoho Flow',
        fn: null,
        overview: 'No CRM API surface — analyst enters figures.',
        checks: [
            check('Successes and errors', null, 'ok', '2025: 1,300 successes, 21 failures (1.6% failure rate). 2 error emails but later processed correctly')
        ]
    },

    {
        key: 'zoho_sign',
        title: 'Zoho Sign CRM',
        fn: null,
        overview: 'No CRM API surface — analyst enters figures.',
        checks: [
            check('Usage', null, 'warning', 'Last signed doc in CRM May 2023, but Sign used this month. Why not via CRM?')
        ]
    }
]

// fn → [section keys]
export const FN_TO_SECTIONS = HEALTH_SECTIONS.reduce((acc, s) => {
    if (s.fn) (acc[s.fn] = acc[s.fn] || []).push(s.key)
    return acc
}, {})

// Only functions that are actually deployed — null fn sections are skipped
export const FUNCTIONS_TO_RUN = [...new Set(HEALTH_SECTIONS.map(s => s.fn).filter(Boolean))]
