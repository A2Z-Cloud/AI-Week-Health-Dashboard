# Zoho CRM Health Dashboard — Function Logic Specification

This document explains, **in detail, what happens inside each Deluge function**: the steps, the
endpoints called, how each result is evaluated into a status, and the exact JSON returned. Read this
alongside [STANDALONE_FUNCTIONS.md](STANDALONE_FUNCTIONS.md) (the index) and the reference `.dg`
sources under `functions/`.

> **A2Z Cloud — CRM Health Check.** British English. Every function is READ-only. No function writes,
> updates, or deletes CRM data.

---

## ⚠️ VERIFIED API AVAILABILITY (checked against Zoho CRM v8 docs — read this first)

Each check was verified against the official v8 API reference. **Some things I originally planned have
NO API and must become manual checks.** This table is the source of truth; the per-function sections
below are annotated to match.

Base path: `https://www.zohoapis.com/crm/v8`. Native Deluge `zoho.crm.*` tasks exist for many of these.

### ✅ Available — build as auto checks

| Check | Method + Path | Scope | Note |
|---|---|---|---|
| Org details | `GET /org` | `ZohoCRM.org.READ` | |
| Currencies + rates | `GET /org/currencies` | `ZohoCRM.settings.currencies.READ` | **Path is `/org/currencies`, not `/settings/currencies`.** Has `exchange_rate` + `modified_time`. |
| Org variables | `GET /settings/variables` | `ZohoCRM.settings.variables.READ` | |
| Business hours | `GET /settings/business_hours` | `ZohoCRM.settings.business_hours.READ` | |
| Holidays | `GET /settings/holidays` | `ZohoCRM.settings.business_hours.READ` | Separate endpoint. |
| Modules | `GET /settings/modules` | `ZohoCRM.settings.modules.READ` | |
| Fields | `GET /settings/fields?module=` | `ZohoCRM.settings.fields.READ` | |
| Layouts | `GET /settings/layouts?module=` | `ZohoCRM.settings.layouts.READ` | |
| Related lists | `GET /settings/related_lists?module=` | `ZohoCRM.settings.related_lists.READ` | |
| Global picklists | `GET /settings/global_picklists` | `ZohoCRM.settings.fields.READ` | |
| Tags | `GET /settings/tags?module=` | `ZohoCRM.settings.tags.READ` | `module` required. |
| Custom views | `GET /settings/custom_views?module=` | `ZohoCRM.settings.custom_views.READ` | |
| Record count | `GET /{module}/actions/count` or `GET /{module}?per_page=1` (`info.count`) | `ZohoCRM.modules.{m}.READ` | |
| COQL | `POST /coql` | `ZohoCRM.coql.READ` | POST for a read; 2,000/call, 100k paged. |
| Users | `GET /users?type=AllUsers` | `ZohoCRM.users.READ` | |
| Roles | `GET /settings/roles` | `ZohoCRM.settings.roles.READ` | |
| Profiles | `GET /settings/profiles` | `ZohoCRM.settings.profiles.READ` | |
| User groups | `GET /settings/user_groups` | `ZohoCRM.settings.user_groups.READ` | **Resource is `user_groups`.** |
| Territories | `GET /settings/territories` | `ZohoCRM.settings.territories.READ` | |
| Workflow rules | `GET /settings/automation/workflow_rules` | `ZohoCRM.settings.workflow_rules.READ` | |
| Assignment rules | `GET /settings/automation/assignment_rules` | `ZohoCRM.settings.assignment_rules.READ` | |
| Scoring rules | `GET /settings/automation/scoring_rules` | `ZohoCRM.settings.scoring_rules.READ` | |
| Pipeline / stages | `GET /settings/pipeline?layout_id=` | `ZohoCRM.settings.pipeline.READ` | **`layout_id` is mandatory.** |
| Email templates | `GET /settings/email_templates` | `ZohoCRM.templates.email.READ` | **Scope is `templates.email`, not `settings.email_templates`.** |
| Notifications | `GET /actions/watch` | `ZohoCRM.notifications.READ` | Instant-notification/webhook subscriptions. |
| Data backup | `GET`/`POST /backup` (info/history/schedule) | bulk/backup scope (admin) | Async; admin only. |
| Audit log | async export job: `POST` create → `GET` status → download | security/settings scope | **No live read; export-job model.** |
| API credits | response header `X-API-CREDITS-REMAINING` | n/a | **Only appears after ≥50% daily usage.** No standalone endpoint. |

### 🟡 Partial — build with caveats

| Check | Reality |
|---|---|
| Blueprint / approval | **No settings-level listing.** Only per-record `GET /{module}/{id}/actions/blueprint`. Approval state via `$approval_state` field on records. So "list all blueprints" is not possible — degrade to **review**. |
| Custom buttons | Scope `ZohoCRM.settings.custom_buttons` exists; no clean documented GET-list. Try `GET /settings/custom_buttons?module=`; if it fails ⇒ **review**. |
| Custom links | Same as buttons — `GET /settings/custom_links?module=` unconfirmed ⇒ try, else **review**. |

### ❌ NO API — must be MANUAL checks (no function fetches these)

| Check | Why |
|---|---|
| Validation rules | No API. Only enforced during record writes. **Manual.** |
| Forecast configuration | No v8 API. **Manual.** |
| Webforms | Not exposed as a v8 resource. **Manual.** |
| Functions list | No list-functions metadata API. **Manual** (or count is unknown). |
| Function error logs | No API — UI only. **Manual** (analyst reads execution logs; CSV already did this). |
| Connections list + expiry | No API — connections are used, not enumerable. **Manual** (CSV already flagged the 2 expiring). |
| Client scripts | No list API. **Manual.** |
| Widgets list | No list API. **Manual.** |
| Storage usage (data/file) | No usage-metrics API. **Manual** (read from Subscription/Storage UI). |
| Per-user email storage | No API. **Manual** (CSV already has Richard Tisdall figure). |

> **Net effect on the plan:** the `hc_functions` and `hc_integrations` functions shrink a lot — most of
> their intended auto checks have no API and become manual rows pre-seeded from the CSV. `hc_data_mgmt`
> loses storage-usage auto-fetch (manual). Everything in the ✅ table stays auto. The widget already
> renders manual checks as editable rows, so these degrade cleanly.

---

## Shared conventions (apply to ALL functions)

### A. Skeleton every function follows

```javascript
// Deluge — standalone function, REST API enabled
// arg: optional JSON string of parameters from the widget
string hc_<section>(string params)
{
    response = Map();
    response.put("ok", true);
    response.put("section", "<section_key>");
    checks = Map();          // auto_key -> { status, value, comment }
    meta   = Map();

    try
    {
        // 1. CALL endpoint(s) via invokeurl
        // 2. EVALUATE each result into a status
        // 3. checks.put("<auto_key>", build_check(status, value, comment));
    }
    catch (e)
    {
        response.put("ok", false);
        response.put("error", e.toString());
        // response.put("missing_scope", "...") when detectable
        return response.toString();
    }

    response.put("checks", checks);
    meta.put("fetched_at", zoho.currenttime.toString());
    response.put("meta", meta);
    return response.toString();   // widget parses this JSON
}
```

### B. The `build_check` helper (conceptual — inline it in each function)

```javascript
Map build_check(string status, value, string comment)
{
    c = Map();
    c.put("status", status);     // "ok" | "warning" | "bad" | "review"
    c.put("value", value);       // number, list, map, or string the UI displays
    c.put("comment", comment);   // human-readable one-liner
    return c;
}
```

### C. Status semantics (consistent across the whole dashboard)

| Status | Meaning | UI colour |
|---|---|---|
| `ok` | Healthy / configured / within limits | green |
| `warning` | Works but worth attention (stale, near a limit, unused) | amber |
| `bad` | Broken / missing / over limit / security gap | red |
| `review` | Fetched but needs human judgement, OR endpoint unavailable | grey |

### D. Calling an endpoint with `invokeurl` (the pattern used everywhere)

```javascript
resp = invokeurl
[
    url    : "https://www.zohoapis.com/crm/v8/settings/variables"
    type   : GET
    connection : "crm_healthcheck"   // a CRM connection holding the scopes
];
// resp is already a Map (Deluge auto-parses JSON)
```

> Two ways to authenticate the call:
> - **Connection** (`connection:"crm_healthcheck"`) — create one CRM connection with all scopes; cleanest.
> - **`zoho.crm.*` integration tasks** (e.g. `zoho.crm.getOrgVariable`, `zoho.crm.searchRecords`) —
>   no connection needed for many calls, but not every settings endpoint has a native task, so
>   `invokeurl` + connection is the fallback for settings APIs.
> Decision: **use the `crm_healthcheck` connection for all `/settings/*` and `/org` calls; use native
> `zoho.crm.*` tasks for record/COQL reads** where they're simpler.

### E. Error & scope handling

- Wrap the whole body in try/catch. On any failure return `ok:false` with the message.
- When a response contains `code == "OAUTH_SCOPE_MISMATCH"` or `"INVALID_SCOPE"`, set
  `missing_scope` so the widget can tell the user precisely what to grant.
- **Per-check degrade:** if ONE endpoint inside a multi-check function fails, that single check is set
  to `review` with the error in its comment — the rest of the function still returns `ok:true`. Only a
  total failure (e.g. connection invalid) returns `ok:false`.

### F. Pagination

Settings lists are usually small (one page). Record/COQL reads can page. Where counts matter, read
`info.count` / `info.more_records` and loop until `more_records == false` (cap at a sane max, e.g. 10
pages, to protect API credits — log if capped).

---

## 1. `hc_general_settings` — General Settings

**Goal:** confirm the org's foundational configuration is set and current.

### Steps

1. **Org details** — `GET /crm/v8/org`
   Extract `company_name`, `country`, `time_zone`, `primary_email`, `fiscal_year` start month,
   `mc_status` (multi-currency on/off), storage flags.
   - `company_details` → `review` (correctness is human judgement; we just surface the values).
   - `fiscal_year` → `ok` if a start month is present, else `bad`.
   - `language_timezone` → `ok` if time zone + locale set.

2. **Currencies** — `GET /crm/v8/org/currencies`  *(verified path — NOT `/settings/currencies`)*
   - `currency_settings` → `ok` if active currencies present. If `mc_status` is true but only one
     active currency ⇒ `warning` ("multi-currency enabled but unused").
   - `multi_currency_rates` (**NEW**) → for each non-base currency read `exchange_rate` +
     `modified_time`. If any rate's `modified_time` older than **180 days** ⇒ `warning`
     ("exchange rates stale — last updated <date>"). If rates fine ⇒ `ok`.

3. **Languages** — `GET /crm/v8/settings/languages` (or org `languages` array)
   - Append enabled-language list to `language_timezone.value`; flag `warning` if multiple languages
     enabled but translation incomplete (best-effort; else `review`).

4. **Org variables** — `GET /crm/v8/settings/variables`
   - `org_variables` → count variables. Flag `warning` if any variable has an empty `value` or a
     placeholder ("TODO", "xxx", "test").

5. **Business hours & holidays** (**NEW**) — `GET /crm/v8/settings/business_hours` then `/holidays`
   - `business_hours` → `bad` if not configured at all; `ok` if configured; `warning` if configured
     but the holiday list has no entries for the current year.

6. **Data backup** — `GET /crm/v8/backup` (info/history; admin scope)  *(verified — `/backup`, not `/settings/backup`)*
   - `data_backup` → `ok` if a scheduled backup exists; `warning` if manual-only; `bad` if none.
   - If the backup scope/admin access is unavailable ⇒ `review`.

### Returns
`checks`: `company_details, fiscal_year, language_timezone, currency_settings,
multi_currency_rates, org_variables, business_hours, data_backup`.

---

## 2. `hc_functions` — Functions

**Goal:** surface automation health. **⚠️ MAJOR API CAVEAT (verified):** function list, function error
logs, connections, client scripts, and widgets have **NO read API**. Only **API-credit usage** is
fetchable, and only via a response header. So this function is thin; the rest are **manual rows
pre-seeded from the CSV.**

### Step that the function CAN do

1. **API limit / credit usage** — `api_limit_usage` (the only auto check here).
   - Make one cheap call (e.g. `GET /org`) and read the `X-API-CREDITS-REMAINING` response header.
     **This header only appears once daily usage ≥ 50 %.** There is no standalone "get credits" endpoint.
   - If present: `warning` if remaining low, `bad` if near zero, else `ok`.
   - **If absent** (usage <50 %, the healthy/common case — matches the CSV's ~1 % baseline) ⇒ `ok` with
     comment "usage below 50% — within limits". Absence is NOT an error.

### NOT possible → returned as `review` (UI shows editable rows, pre-seeded from CSV)

| auto_key | Reality | CSV seed |
|---|---|---|
| `function_list` | No list-functions API. | analyst lists manually |
| `function_error_logs` | No API — execution logs are UI-only. | "99% of failures: BANTS Calculation, Float Pull" |
| `connections_expiry` | No connections list/expiry API. | "2 connections expiring → migrate to OAuth" |
| `client_scripts` | No list API. | manual |
| `widgets_list` | No list API. | manual |

The function returns these keys with `status:"review"` and an explanatory comment, so they render as
editable rows rather than blanks.

### Returns
`checks`: `api_limit_usage` (auto) + `function_list, function_error_logs, connections_expiry,
client_scripts, widgets_list` (all `review`).

---

## 3. `hc_data_quality` — Data Quality & Hygiene (NEW SECTION)

**Goal:** find dirty/orphaned/stale records. **Pure COQL.** Core modules only: **Leads, Contacts,
Accounts, Deals.**

### Method
Each check is a COQL `select COUNT(...)` (or a small id select) per applicable module. Use
`zoho.crm.coql` or `POST /crm/v8/coql`. The function loops the four modules, runs each applicable
query, and **returns a per-module breakdown** so one failed query degrades only that cell.

### Per-check queries

```sql
-- orphaned_ownership (all 4 modules)
select id from <Module> where Owner is null

-- contacts_no_account (Contacts only)
select id from Contacts where Account_Name is null

-- deals_no_contact (Deals only)
select id from Deals where Contact_Name is null

-- unconverted_stale_leads (Leads only) — UNCONVERTED_LEAD_DAYS = 90
select id from Leads where Converted = false and Modified_Time < '<today-90d>'

-- stale_records (all 4 modules) — STALE_RECORD_MONTHS = 12
select id from <Module> where Modified_Time < '<today-12mo>'

-- empty_required_fields (all 4 modules)
-- For each system-required field on the module, count nulls:
select id from <Module> where <Required_Field> is null

-- duplicate_phone_email (Leads/Contacts on Email+Phone; Accounts on Phone)
-- COQL has no GROUP BY HAVING in all editions, so:
--   pull Email/Phone columns, tally in Deluge, flag values appearing >1
select Email, Phone from <Module> where Email is not null
```

### Evaluation
For each `(check, module)` pair compute a count.
- `orphaned_ownership`, `deals_no_contact`, `contacts_no_account`: any count >0 ⇒ `warning`,
  large (>5 % of module) ⇒ `bad`.
- `unconverted_stale_leads`, `stale_records`: counts surfaced; `warning` if a meaningful share is stale.
- `empty_required_fields`: any null in a required field ⇒ `bad` (data integrity).
- `duplicate_phone_email`: duplicates found ⇒ `warning` with the count and a few example values.

Each check's `value` is a map `{ "Leads": n, "Contacts": n, "Accounts": n, "Deals": n }`.

### Credit safety
8 checks × up to 4 modules ≈ ≤32 COQL calls per full run. `COUNT`-style selects are cheap. Cap result
selects with `LIMIT`/paging; log if any module is skipped.

### Returns
`checks`: `orphaned_ownership, contacts_no_account, deals_no_contact, unconverted_stale_leads,
empty_required_fields, stale_records, duplicate_phone_email`.

---

## 4. `hc_modules` — Modules

**Goal:** module-level configuration hygiene.

### Steps

1. **Modules** — `GET /crm/v8/settings/modules`
   - Build the working list of modules; record `visible`, `api_name`, `generated_type` (custom vs system).
   - `module_visibility` → list hidden vs visible; `warning` if clearly-unused modules are still visible.

2. **Layouts** — `GET /crm/v8/settings/layouts?module=<m>` per relevant module
   - `module_layouts` → count layouts per module; flag near-identical / single-record layouts
     (CSV: Leads digital-imagery layout used by 1 record; Opportunities 4 identical layouts) ⇒ `warning`.

3. **Fields** — `GET /crm/v8/settings/fields?module=<m>`
   - `custom_fields` → count custom fields per module; surface fields that look unused (no value in a
     sampled COQL read — optional, else just count).

4. **Lead conversion mapping** — module meta for Leads
   - `lead_conversion_mapping` → `ok` if mapping present and complete.

5. **Validation rules** (**NEW**) — **⚠️ NO API (verified).** Validation rules are only enforced during
   record writes; there is no settings endpoint to list them.
   - `validation_rules` → return `status:"review"` ("no API — manual review"). Renders as editable row.

6. **Related lists** (**NEW**) — `GET /crm/v8/settings/related_lists?module=<m>`
   - `related_lists` → enabled vs disabled per module.

7. **Global picklists** (**NEW**) — `GET /crm/v8/settings/global_picklists`
   - `global_picklists` → which sets are referenced by fields; **orphaned** sets (referenced nowhere)
     ⇒ `warning`.

8. **Tags** (**NEW**) — `GET /crm/v8/settings/tags?module=<m>`
   - `tags_audit` → tags with **zero** tagged records ⇒ `warning`; near-duplicate tag names flagged.

9. **Record-count baseline** (**NEW**) — `GET /crm/v8/<module>?fields=id&per_page=1` → read `info.count`
   - `record_count_baseline` → visible module with `count <= 5` ⇒ `warning` ("module looks abandoned").

### Returns
`checks`: `module_visibility, module_layouts, custom_fields, lead_conversion_mapping,
validation_rules, related_lists, global_picklists, tags_audit, record_count_baseline`.

---

## 5. `hc_users` — User Management

**Goal:** user/role/profile/territory hygiene.

### Steps

1. **Users** — `GET /crm/v8/users?type=AllUsers`
   - Tally `active`, `inactive`, `deactivated`.
   - `active_inactive_users` → `warning` if deactivated users remain that still own records.

2. **Roles** — `GET /crm/v8/settings/roles`
   - `user_roles` → role tree; count users per role; flag empty roles.

3. **Profiles** — `GET /crm/v8/settings/profiles`
   - `user_profiles` → list profiles; `warning` for profiles with zero users.

4. **Groups** — `GET /crm/v8/settings/user_groups`  *(verified — resource is `user_groups`)*
   - `user_groups` → group list + membership counts.

5. **Deactivated-still-referenced** — cross-reference deactivated user ids against record ownership
   (sample COQL `select id from <core module> where Owner = <deactivated_id>`) and assignment rules.
   - `deactivated_still_referenced` → `bad` if a deactivated user still owns live records.

6. **Territories** (**NEW**) — `GET /crm/v8/settings/territories`
   - `territories` → list all; territories with **no rules** ⇒ `warning`; territories whose manager is
     a **deactivated** user ⇒ `bad`.

### Returns
`checks`: `active_inactive_users, user_roles, user_profiles, user_groups,
deactivated_still_referenced, territories`.

---

## 6. `hc_automation` — Workflows + Automation

**Goal:** automation rules are active, valid, and owned by live users.

### Steps

1. **Workflow rules** — `GET /crm/v8/settings/automation/workflow_rules`
   - `workflow_rules` → active vs total; list inactive/unused rules (`warning` if many dormant).

2. **Assignment rules** (**NEW**) — `GET /crm/v8/settings/automation/assignment_rules`
   - `assignment_rules` → rules assigning to **deactivated** users ⇒ `bad`; modules with **none**
     ⇒ `warning`; rules with **empty criteria** flagged.

3. **Approval processes** (**NEW**) — **⚠️ no settings-level listing API (verified).** Approval state is
   only readable per-record (`$approval_state` field / per-record blueprint actions).
   - `approval_processes` → `review` ("no settings API — manual review"). Optionally sample
     `$approval_state` across core modules to note whether approvals are in use at all.

4. **Scoring rules** (**NEW**) — `GET /crm/v8/settings/automation/scoring_rules`  *(verified — under `/automation/`)*
   - `scoring_rules` → exist? active? reference **valid** fields? Missing on Leads/Contacts ⇒ `warning`.

5. **Scheduled automations** — **⚠️ no dedicated list API.** Surface what's visible via workflow rules
   of type "schedule"; otherwise `scheduled_automations` → `review`.

### Returns
`checks`: `workflow_rules, assignment_rules, approval_processes, scoring_rules, scheduled_automations`.

---

## 7. `hc_data_mgmt` — Data Management

**Goal:** storage headroom + backup + attachment hotspots.

### Steps

1. **Storage usage** — **⚠️ NO usage-metrics API (verified).** Data/file storage % is UI-only
   (Subscription → Storage).
   - `storage_usage` → `review` ("no API — read from Subscription/Storage UI").

2. **Email storage per user** — **⚠️ NO API (verified).**
   - `email_storage_per_user` → `review`, pre-seeded from CSV ("Richard Tisdall 138 vs next 20").

3. **Backup settings** — `GET /crm/v8/backup` (info/history; admin scope)  *(verified — `/backup`)*
   - `backup_settings` → scheduled backup enabled? ⇒ `ok`/`warning`. If no admin access ⇒ `review`.

4. **Dedupe config** — **⚠️ no settings API to read dedupe config.**
   - `dedupe_config` → `review` ("manual — Setup → Data Administration → De-duplication").

5. **Attachments & notes volume** (**NEW**) — sample `GET /crm/v8/<module>/<id>/Attachments` and Notes
   counts on a sample of records (full aggregation is expensive; sample + extrapolate)
   - `attachments_notes_volume` → records/modules with high attachment counts (ties to the email-storage
     flag); large hotspots ⇒ `warning`. This one IS doable via the record-attachment API.

### Returns
`checks`: `storage_usage, email_storage_per_user, backup_settings, dedupe_config,
attachments_notes_volume`.

---

## 8. `hc_customisation` — Customisation

**Goal:** customisation sprawl + pipeline/forecast correctness.

### Steps

1. **Custom views** — `GET /crm/v8/settings/custom_views?module=<m>` → `custom_views` count; unused views `warning`. ✅
2. **Field-type usage** — `GET /crm/v8/settings/fields?module=<m>` → `field_type_usage`: usage vs
   per-module field limits per type; near a limit ⇒ `warning`. ✅
3. **Custom buttons** — 🟡 try `GET /crm/v8/settings/custom_buttons?module=<m>` (scope exists, GET-list
   not cleanly documented). On success → `custom_buttons` count; on failure ⇒ `review`.
4. **Custom links** — 🟡 try `GET /crm/v8/settings/custom_links?module=<m>`. On failure ⇒ `review`.
5. **Pipeline** (**NEW**) — `GET /crm/v8/settings/pipeline?layout_id=<id>` ✅ **`layout_id` is
   mandatory** — first read layouts for the Deals module, then query pipeline per layout.
   - `pipeline_config` → stages per pipeline; stages with **no probability** set ⇒ `warning`.
6. **Forecast** (**NEW**) — **⚠️ NO v8 forecast-config API (verified).**
   - `forecast_config` → `review` ("manual — Setup → Forecasts").

### Returns
`checks`: `custom_views, field_type_usage` (auto), `pipeline_config` (auto, needs layout_id),
`custom_buttons, custom_links` (try/`review`), `forecast_config` (`review`).

---

## 9. `hc_integrations` — Integrations

**Goal:** external touchpoints + lead-capture hygiene.

### Steps

1. **Installed extensions / channels** — **⚠️ no clean list API for marketplace extensions.**
   - `installed_extensions` → `review` ("manual — Setup → Marketplace").
2. **Webforms** (**NEW**) — **⚠️ NO v8 webforms API (verified).**
   - `webforms` → `review` ("manual — Setup → Developer Space → Webforms").
3. **Notifications / signals** (**NEW**) — `GET /crm/v8/actions/watch` ✅ *(verified path — `/actions/watch`)*
   - `notifications_signals` → list instant-notification/webhook subscriptions; stale or
     misconfigured channels ⇒ `warning`.

### Returns
`checks`: `notifications_signals` (auto) + `installed_extensions, webforms` (`review`).

---

## 10–13. Stub functions

Create each as the skeleton returning `ok:true` with an empty `checks` map, so the widget wiring is
complete and these sections show **needs review** until the body is filled.

| Function | Section | Reality / when built, fetch |
|---|---|---|
| `hc_blueprints` | Blueprints | 🟡 **No settings-level listing API.** Only per-record `GET /{module}/{id}/actions/blueprint`. Can sample whether any blueprint transitions exist; otherwise `review`. (CSV says "No Blueprints" anyway.) |
| `hc_templates` | Email + Merge Templates | ✅ `GET /crm/v8/settings/email_templates` (scope `ZohoCRM.templates.email.READ`) — counts, unused. Merge templates: confirm endpoint at build, else `review`. |
| `hc_security` | Security Settings | 🟡 TFA/IP/password-policy/encryption are mostly **admin-UI only**; audit-log is an **async export job** (`POST` create → `GET` status → download), not a live read. Most checks ⇒ `review`. |
| `hc_reports` | Reports & Dashboards | 🟡 Reports/dashboards listing is **not a clean v8 API**; confirm at build, else `review`. |

Stub body:

```javascript
string hc_blueprints(string params)
{
    r = Map();
    r.put("ok", true);
    r.put("section", "blueprints");
    r.put("checks", Map());          // empty → UI shows "needs review"
    r.put("meta", { "stub": true });
    return r.toString();
}
```

---

## Cross-cutting build notes

- **Reality check (verified against v8 docs):** ~10 originally-planned checks have **no API** and are
  now manual `review` rows — validation rules, forecast config, webforms, function list, function error
  logs, connections list, client scripts, widgets, storage usage, per-user email storage. They render
  as editable rows pre-seeded from the CSV. Everything in the ✅ table at the top stays auto.
- **Confirm partial paths at build time** (custom buttons/links, merge templates, reports/dashboards,
  blueprint sampling). Where unreachable, the check returns `review`, never an error.
- **Thresholds** (`STALE_RECORD_MONTHS`, `UNCONVERTED_LEAD_DAYS`, `ABANDONED_MODULE_MAX_RECORDS`,
  `STALE_EXCHANGE_RATE_DAYS`, `UNUSED_WEBFORM_MONTHS`) are the single source of truth in the widget's
  `health_checks.js`; the functions hardcode the same numbers (documented in each function header) so
  function and UI agree.
- **One connection, all scopes:** create a CRM connection named `crm_healthcheck` with the
  consolidated scope list from [STANDALONE_FUNCTIONS.md](STANDALONE_FUNCTIONS.md); every function's
  `invokeurl` uses `connection:"crm_healthcheck"`.
- **Test each function in CRM** (Functions → Execute) before wiring the widget, confirming it returns
  valid JSON matching the contract.
