/**
 * api.js — Single point of contact with ZOHO.CRM.FUNCTIONS.
 *
 * All Zoho CRM standalone Deluge function calls must be routed through
 * execute_function(). Callers should not use ZOHO directly; instead,
 * all API calls must go through the Vuex store actions, which in turn
 * call the helpers exported here.
 *
 * No imports required — the ZOHO JS SDK is injected as a global by the
 * Zoho CRM widget runtime.
 */

/**
 * Extracts and parses the Deluge function output from the raw SDK response.
 *
 * Fallback chain (in order):
 *   1. response?.details?.output
 *   2. response?.details?.output_value
 *   3. response?.output
 *
 * If the resolved value is a string, it is JSON.parse'd.
 * If the resolved value is already an object, it is returned as-is.
 * Throws if no parseable value is found.
 *
 * @param {*} response - Raw value returned by ZOHO.CRM.FUNCTIONS.execute
 * @returns {object} Parsed Deluge response payload
 */
export function parse_function_output(response) {
  // ZOHO.CRM.FUNCTIONS.execute response shapes seen in the wild:
  //   { code:'success', details:{ output:'<json-string>', ... }, message }
  //   { details:{ output_value:'<json-string>' } }
  //   { output:'<json-string>' }
  //   sometimes details.output is itself { output:'<json-string>' }
  // We dig through up to two layers and JSON.parse any string we find.
  let raw =
    response?.details?.output ??
    response?.details?.output_value ??
    response?.output ??
    response?.details ??
    response;

  // Unwrap a string that is JSON
  const try_parse = (v) => {
    if (typeof v !== 'string') return v;
    const t = v.trim();
    if (!t) return null;
    try { return JSON.parse(t); }
    catch (e) { return v; } // leave as string; caller decides
  };

  raw = try_parse(raw);

  // If we unwrapped to an object that still nests the real payload, dig once more
  if (raw && typeof raw === 'object' && raw.output !== undefined && raw.ok === undefined) {
    raw = try_parse(raw.output);
  }

  if (raw === undefined || raw === null) {
    throw new Error('No output field found in SDK response');
  }
  if (typeof raw === 'string') {
    // still a string and not JSON -> surface it as an error message
    throw new Error(`Function output was not JSON: ${raw.slice(0, 200)}`);
  }
  if (typeof raw === 'object') {
    return raw;
  }
  throw new Error(`Unexpected output type: ${typeof raw}`);
}

/**
 * Calls a Zoho CRM standalone Deluge function and returns a normalised result.
 *
 * Never throws — always resolves to a normalised result object of shape:
 *   { ok, section, checks, error, missing_scope, meta }
 *
 * @param {string} function_name - The Deluge function API name
 * @param {object} [params={}]   - Parameters forwarded as the function arguments
 * @returns {Promise<{
 *   ok: boolean,
 *   section: string|null,
 *   checks: object,
 *   error: string|null,
 *   missing_scope: string|null,
 *   meta: object
 * }>}
 */
export async function execute_function(function_name, params = {}) {
  const error_result = (msg, missing_scope = null) => ({
    ok: false,
    section: null,
    checks: {},
    error: msg,
    missing_scope,
    meta: {},
  });

  try {
    // Some SDK versions take (name, argMap), others (name, argMap, 'POST').
    // The arguments map must be a plain object of string values.
    const sdk_response = await ZOHO.CRM.FUNCTIONS.execute(function_name, {
      arguments: JSON.stringify(params),
    });

    // Diagnostic: log the raw shape so the real failure cause is visible in
    // the browser console (Right-click widget -> Inspect -> Console).
    try { console.log(`[hc] ${function_name} raw response:`, sdk_response) } catch (e) { /* noop */ }

    let parsed;
    try {
      parsed = parse_function_output(sdk_response);
    } catch (parse_err) {
      return {
        ok: false, section: null, checks: {},
        error: `${function_name}: ${parse_err.message}`,
        missing_scope: null,
        meta: { raw: safe_raw(sdk_response) }
      };
    }

    if (!parsed.ok) {
      return {
        ok: false,
        section: parsed.section ?? null,
        checks: {},
        error: parsed.error ?? 'Function returned ok:false',
        missing_scope: parsed.missing_scope ?? null,
        meta: parsed.meta ?? {},
      };
    }

    return {
      ok: true,
      section: parsed.section ?? null,
      checks: parsed.checks ?? {},
      ai_summary: parsed.ai_summary ?? null,
      error: null,
      missing_scope: null,
      meta: parsed.meta ?? {},
    };
  } catch (err) {
    try { console.error(`[hc] ${function_name} execute() threw:`, err) } catch (e) { /* noop */ }
    return error_result(`${function_name}: ${err?.message ?? String(err)}`);
  }
}

// Trim a raw response to something safe/small to attach to a result for display.
function safe_raw(response) {
  try { return JSON.stringify(response).slice(0, 300) }
  catch (e) { return String(response).slice(0, 300) }
}

/**
 * Returns true when the Zoho JS SDK is loaded and ZOHO.CRM.FUNCTIONS is
 * available. Guards against calling execute_function before the SDK is ready.
 *
 * @returns {boolean}
 */
export function is_sdk_ready() {
  return (
    typeof ZOHO !== 'undefined' && !!ZOHO.CRM && !!ZOHO.CRM.FUNCTIONS
  );
}
