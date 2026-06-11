// ═══════════════════════════════════════════════════════════════════════
// A2Z Cloud — CRM Health Check — Static Check Catalogue
// Only sections backed by a deployed Zoho CRM standalone function.
//
// value_type hints tell CheckRow how to render the value field:
//   'kv'        — flat key:value map    e.g. { start_month:'MAY' }
//   'count'     — plain number          e.g. 8
//   'bool'      — true/false            e.g. true
//   'stale_list'— array of {currency, days_since}
//   'user_list' — {count, users:[{name,email,role?}]}
//   'name_list' — {count, roles/profiles/territories:[]}
//   'rule_list' — {count, examples:[{name,module}]}
//   'mod_map'   — flat map module->number  e.g. {Leads:2, Deals:4}
//   'field_map' — map module->{total,custom}
//   'tag_map'   — map module->{total,zero_use}
//   'rl_map'    — map module->{enabled,disabled}
//   'picklist'  — {total,orphaned_count,orphaned:[]}
//   'template'  — {total,custom,never_used,stale,never_used_examples,stale_examples}
//   'wf_limits' — {total_configured,active,inactive,total_limit}
//   'org_kv'    — {company_name,country,time_zone,primary_email}
//   null        — manual row (no value rendered)
// ═══════════════════════════════════════════════════════════════════════

export const STATUS = { OK: 'ok', WARNING: 'warning', BAD: 'bad', REVIEW: 'review' }

function check(task, auto_key = null, value_type = null, default_status = 'review', comment = '') {
    return { task, auto_key, value_type, default_status, comment }
}

export const HEALTH_SECTIONS = [

    // ─── hc_general_settings ────────────────────────────────────────────
    {
        key: 'general_settings',
        title: 'General Settings',
        fn: 'hc_general_settings',
        overview: '',
        checks: [
            check('Company details',                           'company_details',     'org_kv'),
            check('Fiscal year',                               'fiscal_year',         'kv'),
            check('Language & time zone',                      'language_timezone',   'kv'),
            check('Currency settings',                         'currency_settings',   'count'),
            check('Exchange rates up to date',                 'multi_currency_rates','stale_list'),
            check('Business hours & holidays',                 'business_hours',      'kv'),
            check('Org variables',                             'org_variables',       'kv'),
            check('Data backup',                               'data_backup',         'kv'),
            check('Email settings (IMAP)',                     null, null, 'bad',     'Most users have not set up IMAP'),
            check('Client Portal enabled',                     null),
            check('Sandbox',                                   null, null, 'warning', 'Enabled but not used for over 2 years'),
            check('Modules edited recently',                   null, null, 'warning', 'Most not edited since 2023–2024'),
            check('Multiple languages',                        null),
            check('Email authentication',                      null, null, 'ok',      'Credibility score 0. Spam low, bounce 0%')
        ]
    },

    // ─── hc_modules ─────────────────────────────────────────────────────
    {
        key: 'modules',
        title: 'Modules',
        fn: 'hc_modules',
        overview: 'Suggest hiding modules clearly not in use.',
        checks: [
            check('Module visibility',                         'module_visibility',    'mod_visibility'),
            check('Module layouts',                            'module_layouts',       'mod_map'),
            check('Custom fields per module',                  'custom_fields',        'field_map'),
            check('Related lists',                             'related_lists',        'rl_map'),
            check('Global picklist sets',                      'global_picklists',     'picklist'),
            check('Tags audit',                                'tags_audit',           'tag_map'),
            check('Record-count baseline',                     'record_count_baseline','mod_map'),
            check('Lead conversion mapping',                   'lead_conversion_mapping', null, 'ok', 'All correct'),
            check('Validation rules (manual — no API)',        null, null, 'review',  'Review in Setup → Modules'),
            check('Picklist values accurate',                  null),
            check('Module permissions',                        null)
        ]
    },

    // ─── hc_users ───────────────────────────────────────────────────────
    {
        key: 'user_management',
        title: 'User Management',
        fn: 'hc_users',
        overview: '',
        checks: [
            check('User counts',                               'user_counts',          'kv'),
            check('Unconfirmed users',                         'unconfirmed_users',    'user_list'),
            check('Deactivated users',                         'deactivated_users',    'user_list'),
            check('Admin users',                               'admin_users',          'user_list'),
            check('Roles',                                     'roles_summary',        'name_list'),
            check('Profiles',                                  'profiles_summary',     'name_list'),
            check('Deactivated users reassigned',              null)
        ]
    },

    // ─── hc_templates ───────────────────────────────────────────────────
    {
        key: 'templates',
        title: 'Templates',
        fn: 'hc_templates',
        overview: '',
        checks: [
            check('Email templates',                           'email_templates',      'template'),
            check('Inventory templates',                       'inventory_templates',  'template'),
            check('Template variables',                        null),
            check('Template permissions',                      null)
        ]
    },

    // ─── hc_automation ──────────────────────────────────────────────────
    {
        key: 'automation',
        title: 'Automation',
        fn: 'hc_automation',
        overview: '',
        checks: [
            check('Workflow rule limits',                      'workflow_limits',      'wf_limits'),
            check('Inactive workflow rules',                   'inactive_rules',       'rule_list'),
            check('Active rules never executed',               'never_executed',       'rule_list'),
            check('Deprecated rules',                          'deprecated_rules',     'rule_list'),
            check('Workflow actions & email alerts',           null),
            check('Workflow permissions',                      null)
        ]
    },

    // ─── hc_security ────────────────────────────────────────────────────
    {
        key: 'security',
        title: 'Security',
        fn: 'hc_security',
        overview: 'Suggest mandating TFA via Zoho One console.',
        checks: [
            check('GDPR compliance',                           'gdpr_compliance',      'bool'),
            check('HIPAA compliance',                          'hipaa_compliance',     'bool'),
            check('User licences',                             'user_licences',        null, 'review', 'Check Setup → Subscription → User Licences'),
            check('Territories',                               'territories',          'name_list'),
            check('Audit log',                                 'audit_log',            null, 'review', 'Verify in Setup → Security Control → Audit Log'),
            check('Password policy',                           'password_policy',      null, 'review', 'Verify in Setup → Security Control'),
            check('Two-factor authentication',                 'two_factor_auth',      null, 'review', 'Mandate TFA via Zoho One console'),
            check('IP restrictions',                           'ip_restrictions',      null, 'review', 'Verify in Setup → Security Control')
        ]
    }
]

export const FN_TO_SECTIONS = HEALTH_SECTIONS.reduce((acc, s) => {
    if (s.fn) (acc[s.fn] = acc[s.fn] || []).push(s.key)
    return acc
}, {})

export const FUNCTIONS_TO_RUN = [...new Set(HEALTH_SECTIONS.map(s => s.fn).filter(Boolean))]
