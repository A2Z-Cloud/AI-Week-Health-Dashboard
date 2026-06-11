const MAX_INPUT_LENGTH = 200

export function sanitize_input(input) {
    if (input === null || input === undefined) return ''
    return String(input)
        .replace(/[<>]/g, '')
        .replace(/["'`]/g, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '')
        .trim()
        .slice(0, MAX_INPUT_LENGTH)
}

export function validate_required(value, field_name) {
    const cleaned = sanitize_input(value)
    if (!cleaned || cleaned.length === 0)
        return { is_valid: false, error: `${field_name} is required.` }
    return { is_valid: true, error: '' }
}

export function normalise_status(raw) {
    if (raw === null || raw === undefined) return 'review'
    const s = String(raw).trim().toLowerCase()
    if (['ok', 'ook', 'good', 'pass', 'green'].includes(s)) return 'ok'
    if (['warning', 'warn', 'amber', 'attention'].includes(s)) return 'warning'
    if (['bad', 'fail', 'error', 'red', 'critical'].includes(s)) return 'bad'
    if (['', 'review', 'manual', 'na', 'n/a'].includes(s)) return 'review'
    return 'review'
}

export function status_weight(status) {
    if (status === 'ok') return 100
    if (status === 'warning') return 60
    if (status === 'bad') return 0
    return null
}

export function compute_section_score(checks) {
    if (!Array.isArray(checks) || checks.length === 0) return null
    const weights = checks
        .map(c => status_weight(c.status))
        .filter(w => w !== null)
    if (weights.length === 0) return null
    const total = weights.reduce((sum, w) => sum + w, 0)
    return Math.round(total / weights.length)
}

export function compute_overall_score(sections) {
    if (!Array.isArray(sections) || sections.length === 0) return null
    const scores = sections
        .map(s => s.score)
        .filter(s => s !== null && s !== undefined)
    if (scores.length === 0) return null
    const total = scores.reduce((sum, s) => sum + s, 0)
    return Math.round(total / scores.length)
}

export function score_band(score) {
    if (score === null || score === undefined) return 'unknown'
    if (score >= 80) return 'healthy'
    if (score >= 50) return 'attention'
    return 'critical'
}

export function count_by_status(checks) {
    const counts = { ok: 0, warning: 0, bad: 0, review: 0 }
    if (!Array.isArray(checks)) return counts
    for (const check of checks) {
        const s = check.status
        if (s in counts) counts[s]++
    }
    return counts
}

export function format_value(value) {
    const TRUNCATE_LIMIT = 120
    const MAX_ITEMS = 5

    if (value === null || value === undefined) return '—'

    // Scalar shortcut
    if (typeof value === 'boolean') return value ? 'Yes' : 'No'
    if (typeof value === 'number') return String(value)
    if (typeof value === 'string') {
        return value.length > TRUNCATE_LIMIT ? value.slice(0, TRUNCATE_LIMIT) + '…' : value
    }

    // Render a single value to a readable string (no [object Object])
    const render_item = (v) => {
        if (v === null || v === undefined) return '—'
        if (typeof v === 'boolean') return v ? 'Yes' : 'No'
        if (typeof v === 'number' || typeof v === 'string') return String(v)
        if (Array.isArray(v)) return `(${v.length} items)`
        if (typeof v === 'object') {
            // For objects like {currency:'USD', days_since:1561} pick the most meaningful field
            const label = v.name || v.currency || v.iso_code || v.api_name || v.label || v.email || v.module
            if (label) return String(label)
            // Fall back to first scalar value
            const first_scalar = Object.values(v).find(x => typeof x !== 'object' && x !== null)
            return first_scalar !== undefined ? String(first_scalar) : `{${Object.keys(v).join(', ')}}`
        }
        return String(v)
    }

    if (Array.isArray(value)) {
        if (value.length === 0) return '—'
        const items = value.slice(0, MAX_ITEMS).map(render_item)
        const suffix = value.length > MAX_ITEMS ? ` +${value.length - MAX_ITEMS} more` : ''
        const result = items.join(', ') + suffix
        return result.length > TRUNCATE_LIMIT ? result.slice(0, TRUNCATE_LIMIT) + '…' : result
    }

    if (typeof value === 'object') {
        const entries = Object.entries(value).slice(0, MAX_ITEMS)
        const result =
            entries.map(([k, v]) => `${k}: ${render_item(v)}`).join(' · ') +
            (Object.keys(value).length > MAX_ITEMS ? '…' : '')
        return result.length > TRUNCATE_LIMIT
            ? result.slice(0, TRUNCATE_LIMIT) + '…'
            : result
    }

    const str = String(value)
    return str.length > TRUNCATE_LIMIT ? str.slice(0, TRUNCATE_LIMIT) + '…' : str
}
