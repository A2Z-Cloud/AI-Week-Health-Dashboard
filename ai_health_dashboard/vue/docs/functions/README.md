# Deluge Functions — Setup Guide

Reference source for the 13 standalone Deluge functions that power the CRM Health Check widget.
These `.dg` files are **pasted into Zoho CRM** — they cannot ship inside the widget bundle.

> **A2Z Cloud — CRM Health Check.** British English. Every function is READ-ONLY.

---

## Prerequisites

1. A CRM **connection** named exactly **`crm_connection`** holding all required scopes
   (see [../STANDALONE_FUNCTIONS.md](../STANDALONE_FUNCTIONS.md) for the consolidated scope list).
   Every function's `invokeurl` uses `connection:"crm_connection"`.
2. **Professional, Enterprise, or Ultimate** CRM edition with Developer Permissions enabled.

---

## How to create each function

For every `.dg` file in this folder:

1. **Setup → Developer Space → Functions → New Function**
2. Category: **Standalone**
3. Name it **exactly** the file name without `.dg` (e.g. `hc_general_settings`). The widget calls
   functions by this API name — a mismatch means that section never populates.
4. Paste the file contents.
5. **Enable REST API** on the function (Function → ⋯ → REST API).
6. Confirm the function's scopes (it inherits them from `crm_connection`).
7. **Save**, then **Execute** once in CRM to confirm it returns valid JSON (`{"ok":true,...}`).

The widget invokes them via `ZOHO.CRM.FUNCTIONS.execute("<name>", { arguments: "{}" })`.

---

## The 13 functions

| File | Feeds section(s) | Auto checks | Notes |
|---|---|---|---|
| `hc_general_settings.dg` | general_settings | company, fiscal year, currencies, rates, business hours, variables, backup | `/org`, `/org/currencies`, `/settings/variables`, `/settings/business_hours` |
| `hc_modules.dg` | modules | visibility, layouts, fields, related lists, picklists, tags, record counts | core modules: Leads/Contacts/Accounts/Deals |
| `hc_data_quality.dg` | data_quality | 7 COQL checks (orphans, stale, duplicates…) | pure `POST /coql`, core modules |
| `hc_users.dg` | user_management | users, roles, profiles, groups, territories | `/users`, `/settings/roles` etc. |
| `hc_automation.dg` | workflows + automation | workflow rules, assignment rules, scoring rules | one fn feeds two sections |
| `hc_customisation.dg` | customisation | custom views, field types, buttons, links, pipeline | pipeline needs `layout_id` |
| `hc_templates.dg` | email_templates + merge_templates | email template count | merge templates = review |
| `hc_integrations.dg` | integrations | notifications (`/actions/watch`) | extensions/webforms = review |
| `hc_data_mgmt.dg` | data_management | backup, attachments sample | storage/email = review (no API) |
| `hc_functions.dg` | functions | API credit usage (best-effort) | list/logs/connections = review (no API) |
| `hc_blueprints.dg` | blueprints | — | review-only (no listing API) |
| `hc_security.dg` | security_settings | — | review-only (admin UI / audit export) |
| `hc_reports.dg` | reports_dashboards | — | review-only (no clean API) |

---

## Return contract (every function)

```json
{
  "ok": true,
  "section": "<section_key>",
  "checks": {
    "<auto_key>": { "status": "ok|warning|bad|review", "value": <any>, "comment": "..." }
  },
  "meta": { ... }
}
```

On failure: `{ "ok": false, "section": "...", "error": "...", "checks": {}, "meta": {} }`.

The widget maps each `auto_key` onto its matching check row. Any `review` status (or a missing key)
renders as an editable "needs review" row, pre-seeded from the CSV audit. A whole-function failure
degrades only that section — `Promise.allSettled` in the store keeps the rest of the dashboard live.

---

## Minimum viable deployment

To see the dashboard light up fast, create these **6 highest-signal functions** first:
`hc_general_settings`, `hc_data_quality`, `hc_modules`, `hc_users`, `hc_automation`,
`hc_customisation`. The remaining 7 can be added later; until then their sections show
"needs review" rows.
