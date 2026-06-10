// ═══════════════════════════════════════════════════════════════════════
// A2Z Cloud — CRM Health Check — Mock Function Responses
//
// Sample data mimicking exactly what each Deluge function returns, so the
// dashboard can be demoed without a live CRM. Shape matches the function
// contract: { ok, section, checks: { auto_key: { status, value, comment } }, meta }.
//
// Used automatically by the store when the Zoho SDK is NOT available
// (i.e. running `npm run dev` in a plain browser). Values are realistic and
// seeded from the original CRM Health Check CSV audit.
// ═══════════════════════════════════════════════════════════════════════

const c = (status, value, comment) => ({ status, value, comment })

export const MOCK_RESPONSES = {

    // ─── hc_general_settings ────────────────────────────────────────────
    hc_general_settings: {
        ok: true,
        section: 'general_settings',
        checks: {
            company_details:      c('review', { name: 'A2Z Cloud Ltd', country: 'GB', time_zone: 'Europe/London' }, 'Verify company details in Setup'),
            fiscal_year:          c('ok', 'January', 'Fiscal year start month is set'),
            language_timezone:    c('ok', { time_zone: 'Europe/London', languages: ['en_GB'] }, 'Time zone and locale configured'),
            currency_settings:    c('ok', { active: 1, base: 'GBP' }, '1 active currency (GBP)'),
            multi_currency_rates: c('ok', { stale: 0, checked: 1 }, 'Exchange rates current (single-currency org)'),
            business_hours:       c('ok', { configured: true }, 'Business hours configured'),
            org_variables:        c('warning', { total: 14, blank: 2 }, '2 of 14 org variables have empty values'),
            data_backup:          c('ok', { scheduled: true }, 'Scheduled backup enabled (Sharon)')
        },
        meta: { fetched_at: '2026-06-09T10:00:00Z' }
    },

    // ─── hc_modules ─────────────────────────────────────────────────────
    hc_modules: {
        ok: true,
        section: 'modules',
        checks: {
            module_visibility:     c('ok', { visible_count: 107, hidden_count: 16, custom_count: 45 }, '107 visible module(s), 16 hidden (user/system), 45 custom.'),
            module_layouts:        c('warning', { Leads: 2, Contacts: 2, Accounts: 2, Deals: 4, Campaigns: 5 }, 'Deal has 4 layouts. Campaign has 5 layouts.'),
            custom_fields:         c('warning', { Leads: { total: 157, custom: 93 }, Contacts: { total: 115, custom: 59 }, Accounts: { total: 105, custom: 70 }, Deals: { total: 122, custom: 88 } }, 'Lead 93, Contact 59, Account 70, Deal 88 custom fields — review for redundancy.'),
            related_lists:         c('ok', { Leads: { enabled: 0, disabled: 36 }, Deals: { enabled: 0, disabled: 42 } }, 'Related list visibility summary per module.'),
            global_picklists:      c('warning', { total: 11, orphaned_count: 11, orphaned: ['Source', 'Industry', 'relationship status', 'Status 2', 'Servers'] }, '11 global picklist(s) not referenced by any field.'),
            tags_audit:            c('ok', { Leads: { total: 25, zero_use: 0 }, Contacts: { total: 5, zero_use: 0 } }, 'No unused tags detected.'),
            record_count_baseline: c('warning', { Leads: 1, Contacts: 1, Accounts: 1, Deals: 1 }, 'Several modules have only 1 record — looks abandoned (demo org).')
        },
        ai_summary: {
            summary: 'The CRM is generally stable with most modules visible and no critical data issues. However, several areas show redundancy and inefficiency, particularly in custom fields and module layouts.',
            critical: [
                '11 global picklists are orphaned and not used by any field — these should be removed to avoid maintenance overhead.',
                'Deal module has 4 layouts and 88 custom fields — a significant configuration burden.'
            ],
            warnings: [
                'Lead module has 93 custom fields — high; review for redundancy.',
                'Account module has 70 custom fields — audit for relevance.',
                'Campaign has 5 layouts, Deals has 4 — may cause confusion.'
            ],
            positives: [
                'No unused tags detected — tag usage is clean.',
                'Hidden modules are properly marked as user or system hidden.'
            ],
            recommended_actions: [
                'Remove the 11 orphaned global picklists to clean up configuration.',
                'Reduce custom fields in Leads, Contacts, Accounts and Deals to under 30 per module.',
                'Standardise module layouts — limit to one primary layout where possible.'
            ]
        },
        meta: { fetched_at: '2026-06-10 11:28:43', modules_deep_checked: 15 }
    },

    // ─── hc_data_quality ────────────────────────────────────────────────
    hc_data_quality: {
        ok: true,
        section: 'data_quality',
        checks: {
            orphaned_ownership:      c('warning', { Leads: 12, Contacts: 0, Accounts: 3, Deals: 0 }, '15 records with no owner across core modules'),
            contacts_no_account:     c('warning', 47, '47 Contacts not linked to an Account'),
            deals_no_contact:        c('warning', 8, '8 Deals with no associated Contact'),
            unconverted_stale_leads: c('warning', 134, '134 Leads unconverted > 90 days with no activity'),
            empty_required_fields:   c('review', { Leads: 21, Contacts: 5 }, 'Records with empty Email (proxy for required fields)'),
            stale_records:           c('warning', { Leads: 890, Contacts: 1203, Accounts: 340, Deals: 0 }, 'Records not modified in 12+ months'),
            duplicate_phone_email:   c('warning', { Leads: 6, Contacts: 11 }, '17 duplicate email addresses found in sample')
        },
        meta: { stale_cutoff_date: '2025-06-09', run_date: '2026-06-09', coql_page_limit: 200 }
    },

    // ─── hc_users ───────────────────────────────────────────────────────
    hc_users: {
        ok: true,
        section: 'users',
        checks: {
            user_counts:        c('ok', { total: 8, active: 2, deactivated: 5, unconfirmed: 3, admins: 1 }, '8 total users — 2 active, 5 deactivated, 3 unconfirmed.'),
            unconfirmed_users:  c('warning', { count: 3, users: [{ name: 'Test3 User3', email: 'testuser3@a2zcloud.eu.com' }, { name: 'Test1 User1', email: 'testuser1@a2zcloud.eu.com' }, { name: 'Test2 User2', email: 'testuser2@a2zcloud.eu.com' }] }, '3 user(s) invited but not yet confirmed — they cannot log in until they do.'),
            deactivated_users:  c('warning', { count: 5, users: [{ name: 'Scott Holland', email: 'scott.holl123a2z@gmail.com', role: 'CEO' }, { name: 'Test Test User', email: 'testuser@a2zcloud.eu.com', role: 'Test Role Manager' }] }, '5 deactivated user(s) — verify their records have been reassigned to active users.'),
            admin_users:        c('ok', { count: 1, users: [{ name: 'Owlfred Haze', email: 'dev_demo1@a2zcloud.eu.com' }] }, '1 admin user(s) — within reasonable limits.'),
            roles_summary:      c('ok', { count: 9, roles: ['CEO', 'Manager', 'Standard', 'Junior', 'Test Role Manager', 'CRM Admin'] }, '9 role(s) configured.'),
            profiles_summary:   c('ok', { count: 5, profiles: ['Administrator', 'Standard', 'Administrator - Editable', 'Standard - Editable', 'Gas Contractor'] }, '5 profile(s) configured.')
        },
        ai_summary: {
            summary: 'The CRM has a small number of active users and a significant number of unconfirmed and deactivated accounts. Overall structure is stable with adequate roles and profiles, but user management requires immediate attention.',
            critical: [],
            warnings: [
                '3 unconfirmed users have not verified their accounts and cannot log in.',
                '5 deactivated users are inactive, including key roles like CEO and Manager — their records should be reassigned.'
            ],
            positives: [
                '1 admin user is present and within reasonable limits.',
                '9 roles and 5 profiles configured — sufficient flexibility.'
            ],
            recommended_actions: [
                'Require all 3 unconfirmed users to confirm their accounts to enable login.',
                'Reassign responsibilities from the 5 deactivated users to active users.',
                "Review test roles (e.g. 'Test Role Manager') to remove or rename them."
            ]
        },
        meta: { fetched_at: '2026-06-10 11:32:00' }
    },

    // ─── hc_automation (feeds workflows + automation) ───────────────────
    hc_automation: {
        ok: true,
        section: 'automation',
        checks: {
            workflow_rules:        c('ok', { active: 28, total: 31 }, '28 active of 31 workflow rules'),
            assignment_rules:      c('ok', 4, '4 assignment rules configured'),
            approval_processes:    c('review', null, 'No settings-level API — review manually'),
            scoring_rules:         c('warning', 0, 'No active scoring rules — consider adding for Leads'),
            scheduled_automations: c('review', null, 'No dedicated list API')
        },
        meta: { fetched_at: '2026-06-09T10:00:03Z' }
    },

    // ─── hc_customisation ───────────────────────────────────────────────
    hc_customisation: {
        ok: true,
        section: 'customisation',
        checks: {
            custom_views:     c('ok', { Leads: 8, Contacts: 6, Accounts: 5, Deals: 11 }, 'Custom views per module'),
            field_type_usage: c('review', { picklist: 24, text: 41, lookup: 12, currency: 7 }, 'Field-type distribution on Deals'),
            custom_buttons:   c('ok', 5, '5 custom buttons on Deals'),
            custom_links:     c('review', 0, 'GET-list unconfirmed — review manually'),
            pipeline_config:  c('warning', { stages: 7, no_probability: 2 }, '2 of 7 pipeline stages have no probability set'),
            forecast_config:  c('review', null, 'No v8 forecast API — review in Setup')
        },
        meta: { fetched_at: '2026-06-09T10:00:04Z' }
    },

    // ─── hc_templates (feeds email_templates + merge_templates) ─────────
    hc_templates: {
        ok: true,
        section: 'email_templates',
        checks: {
            email_template_list: c('ok', 42, '42 email templates'),
            merge_template_list: c('review', null, 'Merge-template endpoint to confirm at build')
        },
        meta: { fetched_at: '2026-06-09T10:00:05Z' }
    },

    // ─── hc_integrations ────────────────────────────────────────────────
    hc_integrations: {
        ok: true,
        section: 'integrations',
        checks: {
            notifications_signals: c('ok', 7, '7 notification/webhook subscriptions active'),
            installed_extensions:  c('review', null, 'No clean API — review Setup → Marketplace'),
            webforms:              c('review', null, 'No v8 webforms API — review manually')
        },
        meta: { fetched_at: '2026-06-09T10:00:06Z' }
    },

    // ─── hc_data_mgmt ───────────────────────────────────────────────────
    hc_data_mgmt: {
        ok: true,
        section: 'data_management',
        checks: {
            storage_usage:           c('review', null, 'No usage-metrics API — read from Subscription → Storage'),
            email_storage_per_user:  c('warning', { top_user: 'Richard Tisdall', mb: 138, next: 20 }, 'Email storage 75% used; Richard Tisdall 138MB vs next 20MB'),
            backup_settings:         c('ok', { scheduled: true }, 'Scheduled backup enabled'),
            dedupe_config:           c('review', null, 'Manual — Data Administration'),
            attachments_notes_volume: c('review', { sampled: 5, attachments: 23 }, 'Sampled 5 Deals — 23 attachments total')
        },
        meta: { fetched_at: '2026-06-09T10:00:07Z' }
    },

    // ─── hc_functions ───────────────────────────────────────────────────
    hc_functions: {
        ok: true,
        section: 'functions',
        checks: {
            api_limit_usage:     c('ok', '~1%', 'Usage below 50% — within limits (avg 1% last 30 days)'),
            function_list:       c('review', null, 'No list-functions API — review manually'),
            function_error_logs: c('bad', null, '99% of failures: BANTS Calculation, Float Pull — investigate'),
            connections_expiry:  c('warning', null, '2 connections expiring soon — migrate to OAuth'),
            client_scripts:      c('review', null, 'No list API'),
            widgets_list:        c('review', null, 'No list API')
        },
        meta: { fetched_at: '2026-06-09T10:00:08Z' }
    },

    // ─── Stub functions ─────────────────────────────────────────────────
    hc_blueprints: {
        ok: true,
        section: 'blueprints',
        checks: {
            blueprint_usage: c('review', null, 'No Blueprints (per-record API only)')
        },
        meta: {}
    },

    hc_security: {
        ok: true,
        section: 'security_settings',
        checks: {
            two_factor_auth: c('review', null, 'Admin UI only — suggest mandating TFA via Zoho One console'),
            audit_logs:      c('review', null, 'Audit log is async export job only')
        },
        meta: {}
    },

    hc_reports: {
        ok: true,
        section: 'reports_dashboards',
        checks: {
            report_list: c('review', null, 'No clean v8 reports listing API')
        },
        meta: {}
    }
}
