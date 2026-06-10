// ═══════════════════════════════════════════════════════════════════════
// A2Z Cloud — CRM Health Check — Static Check Catalogue
// Single source of truth for all 17 sections and their checks.
//
// Each check: { task, default_status, comment, auto_key, fn }
//   - task          : human-readable check label
//   - default_status : 'ok' | 'warning' | 'bad' | 'review' (seed from the CSV audit)
//   - comment        : seed comment from the CSV (analyst notes)
//   - auto_key       : key the Deluge function returns in its `checks` map
//                      (null = manual check, analyst fills in)
//   - fn             : Deluge function that populates this section's auto checks
//
// Verified against Zoho CRM v8 API. Checks with no API are auto_key:null (manual).
// ═══════════════════════════════════════════════════════════════════════

// ─── Thresholds (single source of truth; Deluge functions mirror these) ───
export const STALE_RECORD_MONTHS = 12
export const UNCONVERTED_LEAD_DAYS = 90
export const ABANDONED_MODULE_MAX_RECORDS = 5
export const STALE_EXCHANGE_RATE_DAYS = 180
export const STORAGE_WARN_PCT = 75
export const STORAGE_BAD_PCT = 90
export const API_CREDIT_WARN_PCT = 50
export const API_CREDIT_BAD_PCT = 80

// ─── Canonical status values ───
export const STATUS = { OK: 'ok', WARNING: 'warning', BAD: 'bad', REVIEW: 'review' }

// Helper: build a check row
function check(task, auto_key = null, default_status = 'review', comment = '') {
    return { task, auto_key, default_status, comment }
}

// ═══════════════════════════════════════════════════════════════════════
// SECTIONS
// ═══════════════════════════════════════════════════════════════════════
export const HEALTH_SECTIONS = [

    // ─── 1. General Settings ────────────────────────────────────────────
    {
        key: 'general_settings',
        title: 'General Settings',
        fn: 'hc_general_settings',
        overview: '',
        checks: [
            check('Company details', 'company_details'),
            check('Fiscal year settings', 'fiscal_year'),
            check('Language and time zone', 'language_timezone'),
            check('Currency settings', 'currency_settings'),
            check('Multi-currency: exchange rates up to date', 'multi_currency_rates'),
            check('Business hours & holidays', 'business_hours'),
            check('Org variables', 'org_variables'),
            check('Data backup', 'data_backup'),
            check('Review email settings (IMAP)', null, 'bad', 'Most users have not set up IMAP'),
            check('Check if Client Portal enabled', null),
            check('Sandbox', null, 'warning', 'Enabled but not used for over 2 years'),
            check('Modules edited recently', null, 'warning', 'Most have not been edited since 2023-2024'),
            check('Multiple languages enabled', null),
            check('Email authentication', null, 'ok', 'Credibility score since April 2025: 0. Spam complaints low, bounce 0%')
        ]
    },

    // ─── 2. Modules ─────────────────────────────────────────────────────
    {
        key: 'modules',
        title: 'Modules',
        fn: 'hc_modules',
        overview: 'Suggest to hide modules clearly not being used.',
        checks: [
            check('Verify module visibility', 'module_visibility', 'review', 'Suggest to hide modules clearly not being used'),
            check('Check module layouts', 'module_layouts', 'review', 'Leads: only 1 record using the digital imagery layout = remove? Opportunities: all 4 layouts seem the same. Needed?'),
            check('Lead Conversion', 'lead_conversion_mapping', 'ok', 'All correct'),
            check('Review custom fields', 'custom_fields'),
            check('Validation rules (no API — manual)', null, 'review', 'No settings API for validation rules — review in Setup'),
            check('Related lists per module', 'related_lists'),
            check('Global picklist sets — orphaned sets', 'global_picklists'),
            check('Tags audit — unused / duplicate tags', 'tags_audit'),
            check('Record-count baseline — abandoned modules', 'record_count_baseline'),
            check('Ensure picklist values are accurate', null),
            check('Review module permissions', null)
        ]
    },

    // ─── 3. Blueprints ──────────────────────────────────────────────────
    {
        key: 'blueprints',
        title: 'Blueprints',
        fn: 'hc_blueprints',
        overview: 'No Blueprints.',
        checks: [
            check('Blueprints in use (per-record only — no listing API)', 'blueprint_usage', 'review', 'No Blueprints'),
            check('Verify blueprint stages', null),
            check('Check transition settings', null),
            check('Review validation rules', null),
            check('Ensure email notifications are set', null),
            check('Check blueprint permissions', null)
        ]
    },

    // ─── 4. Functions ───────────────────────────────────────────────────
    {
        key: 'functions',
        title: 'Functions',
        fn: 'hc_functions',
        overview: '',
        checks: [
            check('API limit usage', 'api_limit_usage', 'ok', 'Average 1% last 30 days'),
            check('Function list (no list API — manual)', 'function_list', 'review', 'No list-functions API'),
            check('Function error logs (no API — manual)', 'function_error_logs', 'bad', '99% of failures are from: BANTS Calculation, Float Pull. Suggest we look into fixing'),
            check('Connections + expiry (no API — manual)', 'connections_expiry', 'warning', '2 connections to expire soon — migrate to OAuth'),
            check('Client Scripts (no list API — manual)', 'client_scripts', 'review', 'No list API'),
            check('Widgets (no list API — manual)', 'widgets_list', 'review', 'No list API'),
            check('Verify custom functions', null),
            check('Check function triggers', null),
            check('Review function code for errors', null),
            check('Check function permissions', null)
        ]
    },

    // ─── 5. Workflows & Automation ──────────────────────────────────────
    // hc_automation feeds section:"automation" — one section covers both
    {
        key: 'automation',
        title: 'Workflows & Automation',
        fn: 'hc_automation',
        overview: '',
        checks: [
            check('Workflow rule limits & usage (total / active / limit)', 'workflow_limits'),
            check('Inactive workflow rules', 'inactive_rules'),
            check('Active rules that have never executed', 'never_executed'),
            check('Deprecated rules still active', 'deprecated_rules'),
            check('Check workflow actions & email alerts', null),
            check('Check workflow permissions', null)
        ]
    },

    // ─── 6. Templates ───────────────────────────────────────────────────
    {
        key: 'templates',
        title: 'Templates',
        fn: 'hc_templates',
        overview: '',
        checks: [
            check('Email templates (total / custom / drafts / never used / stale)', 'email_templates'),
            check('Inventory templates (Quotes, Invoices, POs — never used / stale)', 'inventory_templates'),
            check('Check template variables', null),
            check('Check template permissions', null)
        ]
    },

    // ─── 8. Integrations ────────────────────────────────────────────────
    {
        key: 'integrations',
        title: 'Integrations',
        fn: 'hc_integrations',
        overview: '',
        checks: [
            check('Installed extensions & channels (no clean API — manual)', 'installed_extensions', 'review', 'Review Setup → Marketplace'),
            check('Webforms (no v8 API — manual)', 'webforms', 'review', 'Review Setup → Developer Space → Webforms'),
            check('Notifications / signals subscriptions', 'notifications_signals'),
            check('Review data sync settings', null),
            check('Check integration logs', null)
        ]
    },

    // ─── 9. Data Management ─────────────────────────────────────────────
    {
        key: 'data_management',
        title: 'Data Management',
        fn: 'hc_data_mgmt',
        overview: '',
        checks: [
            check('Storage usage (no metrics API — manual)', 'storage_usage', 'review', 'Read from Subscription → Storage'),
            check('Email storage per user (no API — manual)', 'email_storage_per_user', 'warning', 'Email storage 75% used. Richard Tisdall 138 vs 2nd 20 — ask what differs'),
            check('Data backup settings', 'backup_settings', 'ok', 'Sharon is using it'),
            check('Deduplication configured (manual)', 'dedupe_config', 'review', 'Review Setup → Data Administration'),
            check('Attachments & notes volume', 'attachments_notes_volume'),
            check('Verify data import settings', null),
            check('Check data export settings', null)
        ]
    },

    // ─── 10. User Management ────────────────────────────────────────────
    {
        key: 'user_management',
        title: 'User Management',
        fn: 'hc_users',
        overview: '',
        checks: [
            check('User counts (active / deactivated / unconfirmed / admins)', 'user_counts'),
            check('Unconfirmed users (invited, not logged in)', 'unconfirmed_users'),
            check('Deactivated users (may still own records)', 'deactivated_users'),
            check('Admin users (too many = risk)', 'admin_users'),
            check('Roles configured', 'roles_summary'),
            check('Profiles configured', 'profiles_summary'),
            check('Ensure deactivated users are reassigned', null)
        ]
    },

    // ─── 11. Security Settings ──────────────────────────────────────────
    {
        key: 'security',
        title: 'Security Settings',
        fn: 'hc_security',
        overview: 'Suggest mandating TFA via Zoho One console.',
        checks: [
            check('GDPR compliance enabled', 'gdpr_compliance'),
            check('HIPAA compliance', 'hipaa_compliance'),
            check('User licences (manual)', 'user_licences', 'review', 'Check Setup → Subscription → User Licences'),
            check('Territories configured', 'territories'),
            check('Audit log (manual)', 'audit_log', 'review', 'Verify in Setup → Security Control → Audit Log'),
            check('Password policy (manual)', 'password_policy', 'review', 'Verify in Setup → Security Control → Password Policy'),
            check('Two-factor authentication (manual)', 'two_factor_auth', 'review', 'Suggest mandate TFA via Zoho One console'),
            check('IP restrictions (manual)', 'ip_restrictions', 'review', 'Verify in Setup → Security Control → Allowed IP Addresses')
        ]
    },


    // ─── 13. Customisation ──────────────────────────────────────────────
    {
        key: 'customisation',
        title: 'Customisation',
        fn: 'hc_customisation',
        overview: '',
        checks: [
            check('Verify custom views', 'custom_views'),
            check('Field-type usage vs limits', 'field_type_usage', 'review', 'Check Field Type usage limit and unused fields'),
            check('Custom buttons (GET-list unconfirmed)', 'custom_buttons'),
            check('Custom links (GET-list unconfirmed)', 'custom_links'),
            check('Pipeline & stages — probability set', 'pipeline_config'),
            check('Forecast configuration (no v8 API — manual)', 'forecast_config', 'review', 'Review Setup → Forecasts'),
            check('Check if correct field type is used for existing fields', null),
            check('Check if fields can be merged (e.g. checkbox vs dropdown)', null),
            check('Check dropdown values match between modules', null),
            check('Duplication of data across Accounts/Deals/Contacts', null),
            check('Check customisation permissions', null)
        ]
    },

    // ─── 14. Reports & Dashboards ───────────────────────────────────────
    {
        key: 'reports_dashboards',
        title: 'Reports & Dashboards',
        fn: 'hc_reports',
        overview: '',
        checks: [
            check('Verify report settings (limited API)', 'report_list', 'review', 'No clean v8 reports listing API'),
            check('Check dashboard layouts', null),
            check('Review report schedules', null),
            check('Ensure reports are up to date', null),
            check('Check report permissions', null)
        ]
    },

    // ─── 15. Data Quality & Hygiene (NEW — pure COQL, core modules) ──────
    {
        key: 'data_quality',
        title: 'Data Quality & Hygiene',
        fn: 'hc_data_quality',
        overview: 'Automated COQL audits across Leads, Contacts, Accounts and Deals.',
        checks: [
            check('Records with no owner (orphaned)', 'orphaned_ownership'),
            check('Contacts not linked to an Account', 'contacts_no_account'),
            check('Deals with no Contact', 'deals_no_contact'),
            check(`Leads unconverted > ${UNCONVERTED_LEAD_DAYS}d with no activity`, 'unconverted_stale_leads'),
            check('Required fields left empty', 'empty_required_fields'),
            check(`Records not modified in ${STALE_RECORD_MONTHS}+ months`, 'stale_records'),
            check('Duplicate phone / email within a module', 'duplicate_phone_email')
        ]
    },

    // ─── 16. Zoho Flow (special — fully manual) ─────────────────────────
    {
        key: 'zoho_flow',
        title: 'Zoho Flow',
        fn: null,
        overview: 'No CRM API surface — analyst enters figures.',
        checks: [
            check('Successes and errors', null, 'ok', '2025: 1,300 successes, 21 failures (1.6% failure rate). 2 error emails but later processed correctly')
        ]
    },

    // ─── 17. Zoho Sign CRM (special — fully manual) ─────────────────────
    {
        key: 'zoho_sign',
        title: 'Zoho Sign CRM',
        fn: null,
        overview: 'No CRM API surface — analyst enters figures.',
        checks: [
            check('Usage', null, 'warning', 'Last signed doc in CRM May 22 2023, but in Sign last was this month and is used. Why not using it in CRM?')
        ]
    }
]

// Map of fn -> [section keys] (a function may feed multiple sections, e.g. hc_automation)
export const FN_TO_SECTIONS = HEALTH_SECTIONS.reduce((acc, s) => {
    if (s.fn) (acc[s.fn] = acc[s.fn] || []).push(s.key)
    return acc
}, {})

// Distinct Deluge functions to invoke (null fn = manual-only section, skipped)
export const FUNCTIONS_TO_RUN = [...new Set(HEALTH_SECTIONS.map(s => s.fn).filter(Boolean))]
