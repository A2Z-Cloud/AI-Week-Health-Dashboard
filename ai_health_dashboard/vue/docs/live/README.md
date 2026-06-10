# Live Functions Archive

The **actual** Deluge functions deployed in Zoho CRM (`.eu` datacentre, connection
`crm_healthcheck`) plus a captured sample of each one's **real response**. These supersede the
generic reference copies in [../functions/](../functions/) — they reflect what is really running,
including the Zoho Creator `ai_summary` integration.

> **A2Z Cloud — CRM Health Check.** British English. READ-ONLY audits.

## Conventions (all live functions follow these)

- Datacentre base URL: `https://www.zohoapis.eu/crm/v8`
- Connection for CRM calls: **`crm_healthcheck`**
- AI summary: each function POSTs its `checks` to a Zoho Creator endpoint via connection
  **`zoho_creator_ai`** and attaches the parsed result as `ai_summary`.
- Signature: `string standalone.<fn>(String params)` (params currently unused).
- Return: JSON string `{ ok, section, checks, meta, ai_summary? }`.

## Status

**Deployed (7 live functions):** general_settings, modules, users, templates, automation, security — all archived here with real responses.

**Not yet deployed (widget calls these, degrades to "needs review" until deployed):** hc_blueprints, hc_functions, hc_integrations, hc_data_mgmt, hc_customisation, hc_reports, hc_data_quality.

## Captured functions

| Function | Source | Sample response | Section auto_keys |
|---|---|---|---|
| `hc_general_settings` | [hc_general_settings.dg](hc_general_settings.dg) | [hc_general_settings.response.json](hc_general_settings.response.json) | company_details, fiscal_year, language_timezone, currency_settings, multi_currency_rates, org_variables, business_hours, data_backup |
| `hc_templates` | [hc_templates.dg](hc_templates.dg) | [hc_templates.response.json](hc_templates.response.json) | email_templates, inventory_templates |
| `hc_automation` | [hc_automation.dg](hc_automation.dg) | [hc_automation.response.json](hc_automation.response.json) | workflow_limits, inactive_rules, never_executed, deprecated_rules |
| `hc_security` | [hc_security.dg](hc_security.dg) | [hc_security.response.json](hc_security.response.json) | gdpr_compliance, hipaa_compliance, user_licences, territories, audit_log, password_policy, two_factor_auth, ip_restrictions |
| `hc_modules` | [hc_modules.dg](hc_modules.dg) | [hc_modules.response.json](hc_modules.response.json) | module_visibility, module_layouts, custom_fields, related_lists, tags_audit, record_count_baseline, global_picklists |
| `hc_users` | [hc_users.dg](hc_users.dg) | [hc_users.response.json](hc_users.response.json) | user_counts, unconfirmed_users, deactivated_users, admin_users, roles_summary, profiles_summary |

## How to add a future function here

1. Save the deployed Deluge as `docs/live/<fn>.dg`.
2. Save one real execution result as `docs/live/<fn>.response.json`.
3. Add a row to the table above.
4. Update the widget to match its real `auto_keys`:
   - add/adjust the section's checks in `src/data/health_checks.js`
   - mirror the response in `src/data/mock_responses.js` (for the no-CRM demo)
