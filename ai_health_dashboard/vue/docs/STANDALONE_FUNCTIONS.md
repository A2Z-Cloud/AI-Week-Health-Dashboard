# Zoho CRM Health Dashboard — Standalone Functions to Create in CRM

This report lists every **standalone Deluge function** that must be created inside Zoho CRM for the
Health Dashboard widget to populate its automated checks. The widget cannot ship these functions in
its bundle — they live in CRM and the widget calls them with `ZOHO.CRM.FUNCTIONS.execute()`.

> **A2Z Cloud — CRM Health Check.** British English throughout. All functions are READ-only audits;
> none modify CRM data.

---

## How these functions work

1. Each function is a **standalone function** written in Deluge:
   **Setup → Developer Space → Functions → New Function → Function Category: _Standalone_.**
2. Each must have **REST API enabled** (Function → ⋯ → REST API → enable, generate the API key /
   note the function's `apiName`) so the widget can invoke it.
3. The widget invokes it as:
   ```js
   ZOHO.CRM.FUNCTIONS.execute("hc_general_settings", { arguments: JSON.stringify({ ... }) })
   ```
4. Each function calls the CRM REST/Settings APIs server-side via `invokeurl` (or the native
   `zoho.crm.*` Deluge integration tasks) and **returns a single JSON object** the widget maps onto
   its check rows.
5. All functions run as the connection/owner identity, so **no OAuth tokens touch the browser**.

### Standard return contract (every function follows this)

```javascript
// Success
{
  "ok": true,
  "section": "general_settings",
  "checks": {
    "<auto_key>": { "status": "ok|warning|bad|review", "value": <any>, "comment": "..." }
    // ...one entry per auto check this function covers
  },
  "meta": { "fetched_at": "<timestamp>", "credits_remaining": <int|null> }
}

// Failure / missing scope — widget degrades the affected checks to "needs review"
{
  "ok": false,
  "section": "general_settings",
  "error": "AUTHENTICATION_FAILURE | INVALID_SCOPE | <message>",
  "missing_scope": "ZohoCRM.settings.variables.READ"   // when known
}
```

---

## Summary — 13 functions

| # | Function (apiName)   | Tier      | Sections fed                         |
|---|----------------------|-----------|--------------------------------------|
| 1 | `hc_general_settings`| Priority  | General Settings                     |
| 2 | `hc_functions`       | Priority  | Functions                            |
| 3 | `hc_data_quality`    | Priority  | Data Quality & Hygiene (**new**)     |
| 4 | `hc_modules`         | Priority  | Modules                              |
| 5 | `hc_users`           | Priority  | User Management                      |
| 6 | `hc_automation`      | Priority  | Workflows + Automation               |
| 7 | `hc_data_mgmt`       | Secondary | Data Management                      |
| 8 | `hc_customisation`   | Secondary | Customisation                        |
| 9 | `hc_integrations`    | Secondary | Integrations                         |
| 10| `hc_blueprints`      | Stub      | Blueprints                           |
| 11| `hc_templates`       | Stub      | Email Templates + Merge Templates    |
| 12| `hc_security`        | Stub      | Security Settings                    |
| 13| `hc_reports`         | Stub      | Reports & Dashboards                 |

**Not functions:** Zoho Flow and Zoho Sign sections are **fully manual** (no CRM API surface) — the
analyst types figures directly into the dashboard.

---

## PRIORITY FUNCTIONS (build first)

### 1. `hc_general_settings`
**Section:** General Settings

| Auto check (auto_key) | REST endpoint / source | Logic |
|---|---|---|
| `company_details` | `GET /crm/v8/org` | Return company name, country, time zone, primary email; status `review` (correctness is judgement). |
| `fiscal_year` | `GET /crm/v8/org` | Read fiscal-year start month; `ok` if set. |
| `language_timezone` | `GET /crm/v8/org` + `GET /crm/v8/settings/languages` | List enabled languages, default locale. |
| `currency_settings` | `GET /crm/v8/settings/currencies` | List active currencies; flag if multi-currency on but only 1 currency. |
| `multi_currency_rates` | `GET /crm/v8/settings/currencies` | **NEW** — exchange-rate `modified_time` older than `STALE_EXCHANGE_RATE_DAYS` (180) ⇒ `warning`. |
| `org_variables` | `GET /crm/v8/settings/variables` | Count variables; surface any blank/placeholder values. |
| `business_hours` | `GET /crm/v8/settings/business_hours` + `/holidays` | **NEW** — `bad` if not configured; `warning` if holidays not updated this year. |
| `data_backup` | `GET /crm/v8/settings/backup` (or org flag) | Whether scheduled backup is enabled. |

**Scopes:** `ZohoCRM.org.READ`, `ZohoCRM.settings.variables.READ`,
`ZohoCRM.settings.business_hours.READ` (currencies covered by `org.READ`).

---

### 2. `hc_functions`
**Section:** Functions

| Auto check (auto_key) | REST endpoint / source | Logic |
|---|---|---|
| `api_limit_usage` | `X-API-CREDITS-*` response headers / org limits | Report % of daily credit used; `warning` >50%, `bad` >80%. |
| `function_list` | `GET /crm/v8/settings/functions` | Count functions; list inactive ones. |
| `function_error_logs` | function error-log endpoint (probe at build; may be admin-only) | Surface top failing functions (e.g. BANTS Calculation, Float Pull from the CSV). Degrade to `review` if endpoint unavailable. |
| `connections_expiry` | `GET /crm/v8/settings/connections` | **Flag connections expiring soon** (the CSV's "2 to expire → migrate to OAuth"). |
| `client_scripts` | `GET /crm/v8/settings/client_scripts` | Count client scripts. |
| `widgets_list` | `GET /crm/v8/settings/widgets` | Count widgets. |

**Scopes:** `ZohoCRM.settings.functions.READ`, `ZohoCRM.settings.connections.READ`,
`ZohoCRM.settings.client_scripts.READ`, `ZohoCRM.settings.widgets.READ`.

> The exact **function error-log** path and **API-credit** read method are confirmed during build;
> if not directly fetchable, those two checks degrade to needs-review.

---

### 3. `hc_data_quality`  (NEW SECTION)
**Section:** Data Quality & Hygiene
**Method:** one `POST /crm/v8/coql` per check per module, **core modules only** — Leads, Contacts,
Accounts, Deals. The function batches them and returns a per-module result so one bad query doesn't
sink the section.

| Auto check (auto_key) | COQL logic |
|---|---|
| `orphaned_ownership` | `select id from <module> where Owner is null` — records with no owner. |
| `contacts_no_account` | `select id from Contacts where Account_Name is null`. |
| `deals_no_contact` | `select id from Deals where Contact_Name is null`. |
| `unconverted_stale_leads` | `select id from Leads where Converted = false and Modified_Time < (today - UNCONVERTED_LEAD_DAYS=90)`. |
| `empty_required_fields` | Per module: count records where a system/required field is null. |
| `stale_records` | `select id from <module> where Modified_Time < (today - STALE_RECORD_MONTHS=12 months)`. |
| `duplicate_phone_email` | Group by Phone / Email within module; flag duplicates. |

**Thresholds** (hardcoded in widget `health_checks.js`, echoed here for the function):
`STALE_RECORD_MONTHS=12`, `UNCONVERTED_LEAD_DAYS=90`.

**Scopes:** `ZohoCRM.modules.leads.READ`, `.contacts.READ`, `.accounts.READ`, `.deals.READ`
(or `ZohoCRM.modules.ALL`), plus `ZohoCRM.coql.READ` if required by edition.

---

### 4. `hc_modules`
**Section:** Modules

| Auto check (auto_key) | REST endpoint / source | Logic |
|---|---|---|
| `module_visibility` | `GET /crm/v8/settings/modules` | List visible vs hidden modules. |
| `module_layouts` | `GET /crm/v8/settings/layouts?module=<m>` | Layouts per module; flag duplicate/near-identical layouts. |
| `custom_fields` | `GET /crm/v8/settings/fields?module=<m>` | Count custom fields per module. |
| `lead_conversion_mapping` | `GET /crm/v8/settings/modules/Leads` mapping | Conversion field mapping present/correct. |
| `validation_rules` | `GET /crm/v8/settings/validation_rules?module=<m>` | **NEW** — modules with none, rules on deleted fields, disabled rules. |
| `related_lists` | `GET /crm/v8/settings/related_lists?module=<m>` | **NEW** — enabled vs disabled related lists. |
| `global_picklists` | `GET /crm/v8/settings/global_picklists` | **NEW** — sets used across modules, orphaned sets. |
| `tags_audit` | `GET /crm/v8/settings/tags?module=<m>` | **NEW** — tags with zero records, duplicate names. |
| `record_count_baseline` | `GET /crm/v8/<module>?per_page=1` (read `info.count`) | **NEW** — visible module with ≤`ABANDONED_MODULE_MAX_RECORDS`(5) ⇒ `warning` (abandoned). |

**Scopes:** `ZohoCRM.settings.modules.READ`, `.fields.READ`, `.layouts.READ`,
`.related_lists.READ`, `.tags.READ`, `.global_picklists.READ`, `.validation_rules.READ`,
plus module READ for record counts.

---

### 5. `hc_users`
**Section:** User Management

| Auto check (auto_key) | REST endpoint / source | Logic |
|---|---|---|
| `active_inactive_users` | `GET /crm/v8/users?type=AllUsers` | Counts of active / inactive / deactivated. |
| `user_roles` | `GET /crm/v8/settings/roles` | Role tree; users per role. |
| `user_profiles` | `GET /crm/v8/settings/profiles` | Profiles; flag unused profiles. |
| `user_groups` | `GET /crm/v8/settings/groups` | Group list. |
| `deactivated_still_referenced` | cross-ref users + assignment rules | Deactivated users still owning records / in rules. |
| `territories` | `GET /crm/v8/settings/territories` | **NEW** — list all; territories with no rules; assigned to deactivated users. |

**Scopes:** `ZohoCRM.users.READ`, `ZohoCRM.settings.profiles.READ`, `ZohoCRM.settings.roles.READ`,
`ZohoCRM.settings.territories.READ`.

---

### 6. `hc_automation`
**Sections:** Workflows + Automation

| Auto check (auto_key) | REST endpoint / source | Logic |
|---|---|---|
| `workflow_rules` | `GET /crm/v8/settings/automation/workflow_rules` | Active vs total; unused rules. |
| `assignment_rules` | `GET /crm/v8/settings/automation/assignment_rules` | **NEW** — assigned to deactivated users; modules with none; empty criteria. |
| `approval_processes` | `GET /crm/v8/settings/automation/approval_processes` | **NEW** — list all; approvers active?; modules missing expected approvals. |
| `scoring_rules` | `GET /crm/v8/settings/scoring_rules` | **NEW** — exist + active + reference valid fields. |
| `scheduled_automations` | scheduled-functions endpoint | Scheduled automations + recent logs. |

**Scopes:** `ZohoCRM.settings.automation.READ`, `ZohoCRM.settings.scoring_rules.READ`.

---

## SECONDARY FUNCTIONS

### 7. `hc_data_mgmt`
**Section:** Data Management

| Auto check (auto_key) | Source | Logic |
|---|---|---|
| `storage_usage` | `GET /crm/v8/org` / usage endpoint | Data + file storage % used. |
| `email_storage_per_user` | usage endpoint (probe; may be admin-only) | Per-user email storage; flag outliers (CSV: Richard Tisdall 138 vs 20). Degrade to `review` if unavailable. |
| `backup_settings` | `GET /crm/v8/settings/backup` | Scheduled backup enabled. |
| `dedupe_config` | dedupe settings | Deduplication configured per module. |
| `attachments_notes_volume` | `GET /crm/v8/<module>/<id>/Attachments`, Notes | **NEW** — modules/records hoarding attachments (ties to email-storage flag). |

**Scopes:** `ZohoCRM.org.READ`, module READ for attachment counts.

---

### 8. `hc_customisation`
**Section:** Customisation

| Auto check (auto_key) | REST endpoint | Logic |
|---|---|---|
| `custom_views` | `GET /crm/v8/settings/custom_views?module=<m>` | Count; unused views. |
| `field_type_usage` | `GET /crm/v8/settings/fields` | Field-type usage vs per-module limits. |
| `custom_buttons` | `GET /crm/v8/settings/custom_buttons?module=<m>` | Count; unused buttons. |
| `custom_links` | `GET /crm/v8/settings/links?module=<m>` | Outdated links. |
| `pipeline_config` | `GET /crm/v8/settings/pipeline` | **NEW** — stages per module; stages with no probability. |
| `forecast_config` | `GET /crm/v8/settings/forecasts` | **NEW** — forecast configured? categories mapped? |

**Scopes:** `ZohoCRM.settings.custom_views.READ`, `ZohoCRM.settings.fields.READ`,
`ZohoCRM.settings.pipeline.READ`, `ZohoCRM.settings.forecasts.READ`.

---

### 9. `hc_integrations`
**Section:** Integrations

| Auto check (auto_key) | REST endpoint | Logic |
|---|---|---|
| `installed_extensions` | marketplace/extensions endpoint | Installed extensions + channels. |
| `webforms` | `GET /crm/v8/settings/webforms` | **NEW** — active vs inactive; target module; map to valid fields; unused >`UNUSED_WEBFORM_MONTHS`(12). |
| `notifications_signals` | `GET /crm/v8/notifications` (or settings) | **NEW** — subscriptions; stale/misconfigured channels. |

**Scopes:** `ZohoCRM.settings.webforms.READ`, `ZohoCRM.notifications.READ`.

---

## STUB FUNCTIONS (create returning `{ "ok": true, "checks": {} }` — UI shows "needs review")

Build the body later; create the shell now so the widget wiring is complete.

### 10. `hc_blueprints` — Blueprints
🟡 **No settings-level listing API.** Only per-record `GET /{module}/{id}/actions/blueprint`. Mostly
`review`. (CSV notes "No Blueprints".) **Scope:** `ZohoCRM.modules.{m}.READ`.

### 11. `hc_templates` — Email Templates + Merge Templates
✅ `GET /crm/v8/settings/email_templates` — counts, unused. Merge templates: confirm at build.
**Scope:** `ZohoCRM.templates.email.READ` *(not `settings.email_templates`)*.

### 12. `hc_security` — Security Settings
🟡 TFA/IP/password-policy/encryption are admin-UI only; **audit log is an async export job**
(`POST` create → `GET` status → download), not a live read. Most checks ⇒ `review`.
**Scope:** security/settings + bulk (for audit export); confirm at build.

### 13. `hc_reports` — Reports & Dashboards
🟡 No clean v8 reports/dashboards listing API. Confirm at build, else `review`.

---

## Consolidated scope list (grant across the functions)

**VERIFIED list** — only scopes for APIs that actually exist. Scopes for non-existent APIs (validation
rules, webforms, functions list, connections, client scripts, widgets, forecasts) have been **removed**;
those checks are manual.

```
ZohoCRM.org.READ                          # /org
ZohoCRM.settings.currencies.READ          # /org/currencies   (NOT /settings/currencies)
ZohoCRM.settings.variables.READ           # /settings/variables
ZohoCRM.settings.business_hours.READ      # /settings/business_hours, /settings/holidays
ZohoCRM.settings.modules.READ             # /settings/modules
ZohoCRM.settings.fields.READ              # /settings/fields, /settings/global_picklists
ZohoCRM.settings.layouts.READ             # /settings/layouts (needed for pipeline layout_id)
ZohoCRM.settings.custom_views.READ        # /settings/custom_views
ZohoCRM.settings.related_lists.READ       # /settings/related_lists
ZohoCRM.settings.tags.READ                # /settings/tags
ZohoCRM.settings.territories.READ         # /settings/territories
ZohoCRM.settings.pipeline.READ            # /settings/pipeline?layout_id=
ZohoCRM.settings.workflow_rules.READ      # /settings/automation/workflow_rules
ZohoCRM.settings.assignment_rules.READ    # /settings/automation/assignment_rules
ZohoCRM.settings.scoring_rules.READ       # /settings/automation/scoring_rules
ZohoCRM.templates.email.READ             # /settings/email_templates  (NOT settings.email_templates)
ZohoCRM.settings.roles.READ               # /settings/roles
ZohoCRM.settings.profiles.READ            # /settings/profiles
ZohoCRM.settings.user_groups.READ         # /settings/user_groups  (resource is user_groups)
ZohoCRM.users.READ                        # /users
ZohoCRM.notifications.READ                # /actions/watch
ZohoCRM.coql.READ                         # POST /coql
ZohoCRM.modules.leads.READ                # COQL + record counts + attachments
ZohoCRM.modules.contacts.READ
ZohoCRM.modules.accounts.READ
ZohoCRM.modules.deals.READ
# Admin-only / optional (grant if you want these auto, else they stay manual):
ZohoCRM.bulk.READ                         # /backup (data backup info/history)
# settings.custom_buttons / settings.custom_links — try; GET-list undocumented, may stay manual
```

> If a function call fails, the widget surfaces the exact `missing_scope` from the function's error
> payload, and that check degrades to **needs review** rather than breaking the dashboard.

---

## Creation checklist (per function)

- [ ] Setup → Developer Space → Functions → New Function → **Standalone**
- [ ] Name it exactly per the table (e.g. `hc_general_settings`) — the widget calls by `apiName`
- [ ] Paste the Deluge body (reference `.dg` source provided under `vue/docs/functions/`)
- [ ] Add the scopes listed for that function
- [ ] Enable **REST API** on the function
- [ ] Save & execute once in CRM to confirm it returns valid JSON
- [ ] Confirm the widget's `fetch_<section>` action populates the matching check rows

---

## Optional consolidation

If creating 13 functions is too many, the **4 stubs (10–13)** can be merged into a single
`hc_misc` function that returns all four sections' data in one payload. Trade-off: one larger function
to maintain vs cleaner one-per-section scoping. Recommendation: keep them split for clarity unless
function-count is a constraint in your org (200-widget / function limits are not a concern here).
