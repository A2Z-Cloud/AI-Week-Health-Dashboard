<script setup>
import { ref, watch, computed } from 'vue'
import StatusChip from './StatusChip.vue'

const props = defineProps({
    check:      { type: Object, required: true },
    sectionKey: { type: String, required: true }
})
const emit = defineEmits(['update'])

const local_comment   = ref(props.check.comment ?? '')
const local_status    = ref(props.check.status  ?? 'review')
const editing_comment = ref(false)

watch(() => props.check, c => {
    local_comment.value = c.comment ?? ''
    local_status.value  = c.status  ?? 'review'
})

// Show status dropdown only on manual rows or unresolved auto rows
const show_controls = computed(() =>
    !props.check.auto_key || props.check.status === 'review'
)

const has_value = computed(() =>
    props.check.value !== null && props.check.value !== undefined
)

function handle_change() {
    emit('update', { check_id: props.check.id, comment: local_comment.value, status: local_status.value })
}

// ─── Value rendering helpers ─────────────────────────────────────────

const v = computed(() => props.check.value)
const vt = computed(() => props.check.value_type)

// kv — flat {key: scalar} map — arrays and nested objects are skipped
const kv_pairs = computed(() => {
    if (!v.value || typeof v.value !== 'object' || Array.isArray(v.value)) return []
    return Object.entries(v.value)
        .filter(([, val]) => {
            if (val === null || val === undefined || val === '') return false
            if (Array.isArray(val)) return false          // skip array sub-values
            if (typeof val === 'object') return false     // skip nested maps
            return true
        })
        .map(([k, val]) => ({ k: k.replace(/_/g, ' '), val: typeof val === 'boolean' ? (val ? 'Yes' : 'No') : String(val) }))
        .slice(0, 8)
})

// stale_list — [{currency, days_since, last_updated}]
const stale_items = computed(() =>
    Array.isArray(v.value) ? v.value.slice(0, 6) : []
)

// user_list — {count, users:[{name, email, role?}]}
const user_items = computed(() =>
    Array.isArray(v.value?.users) ? v.value.users.slice(0, 5) : []
)

// name_list — {count, roles/profiles/territories:[string]}
const name_items = computed(() => {
    if (!v.value || typeof v.value !== 'object') return []
    const list = v.value.roles ?? v.value.profiles ?? v.value.territories ?? []
    return Array.isArray(list) ? list.slice(0, 8) : []
})

// mod_map — {ModuleName: number}
const mod_entries = computed(() => {
    if (!v.value || typeof v.value !== 'object' || Array.isArray(v.value)) return []
    return Object.entries(v.value).slice(0, 8).map(([k, val]) => ({ k, val }))
})

// field_map — {ModuleName: {total, custom}}
const field_entries = computed(() => {
    if (!v.value || typeof v.value !== 'object' || Array.isArray(v.value)) return []
    return Object.entries(v.value).slice(0, 8).map(([k, val]) => ({
        k, total: val?.total ?? '?', custom: val?.custom ?? '?'
    }))
})

// rl_map — {ModuleName: {enabled, disabled}}
const rl_entries = computed(() => {
    if (!v.value || typeof v.value !== 'object' || Array.isArray(v.value)) return []
    return Object.entries(v.value).slice(0, 6).map(([k, val]) => ({
        k, enabled: val?.enabled ?? 0, disabled: val?.disabled ?? 0
    }))
})

// tag_map — {ModuleName: {total, zero_use}}
const tag_entries = computed(() => {
    if (!v.value || typeof v.value !== 'object' || Array.isArray(v.value)) return []
    return Object.entries(v.value).slice(0, 6).map(([k, val]) => ({
        k, total: val?.total ?? 0, zero_use: val?.zero_use ?? 0
    }))
})

// rule_list — {count, examples:[{name, module}]}
const rule_examples = computed(() =>
    Array.isArray(v.value?.examples) ? v.value.examples.slice(0, 5) : []
)

// template — {total, custom, never_used, stale, never_used_examples, stale_examples}
const tpl = computed(() => v.value && typeof v.value === 'object' ? v.value : null)

// wf_limits — {total_configured, active, inactive, total_limit, active_limit}
const wfl = computed(() => v.value && typeof v.value === 'object' ? v.value : null)
</script>

<template>
  <div class="cr" :class="`cr--${check.status}`">

    <!-- ── Col 1: task + badge ── -->
    <div class="cr__task">
      <span class="cr__label">{{ check.task }}</span>
      <span class="cr__badge" :class="check.auto_key ? 'cr__badge--auto' : 'cr__badge--manual'">
        {{ check.auto_key ? 'AUTO' : 'MANUAL' }}
      </span>
    </div>

    <!-- ── Col 2: status chip ── -->
    <div class="cr__chip">
      <StatusChip :status="check.status" />
    </div>

    <!-- ── Col 3: value (type-aware renderer) ── -->
    <div class="cr__value" v-if="has_value">

      <!-- bool -->
      <template v-if="vt === 'bool'">
        <span class="val-bool" :class="v ? 'val-bool--yes' : 'val-bool--no'">
          {{ v ? '✓ Enabled' : '✗ Disabled' }}
        </span>
      </template>

      <!-- count — plain number -->
      <template v-else-if="vt === 'count'">
        <span class="val-num">{{ v }}</span>
      </template>

      <!-- org_kv — company details -->
      <template v-else-if="vt === 'org_kv'">
        <dl class="val-kv">
          <template v-for="p in kv_pairs" :key="p.k">
            <dt>{{ p.k }}</dt><dd>{{ p.val }}</dd>
          </template>
        </dl>
      </template>

      <!-- mod_visibility — {visible_count, hidden_count, custom_count, hidden_modules:[]} -->
      <template v-else-if="vt === 'mod_visibility'">
        <dl class="val-kv">
          <dt>visible</dt><dd>{{ v.visible_count }}</dd>
          <dt>hidden</dt><dd>{{ v.hidden_count }}</dd>
          <dt>custom</dt><dd>{{ v.custom_count }}</dd>
        </dl>
        <div class="val-tags" v-if="v.hidden_modules?.length">
          <span
            v-for="m in v.hidden_modules.slice(0, 6)"
            :key="m.api_name"
            class="val-tag"
            :title="m.api_name"
          >{{ m.label }}</span>
          <span v-if="v.hidden_modules.length > 6" class="val-more">+{{ v.hidden_modules.length - 6 }}</span>
        </div>
      </template>

      <!-- kv — generic flat map -->
      <template v-else-if="vt === 'kv'">
        <dl class="val-kv">
          <template v-for="p in kv_pairs" :key="p.k">
            <dt>{{ p.k }}</dt><dd>{{ p.val }}</dd>
          </template>
        </dl>
      </template>

      <!-- stale_list — currency exchange rates -->
      <template v-else-if="vt === 'stale_list'">
        <table class="val-table">
          <tr v-for="item in stale_items" :key="item.currency">
            <td class="vt-code">{{ item.currency }}</td>
            <td class="vt-days" :class="item.days_since > 365 ? 'vt-days--bad' : 'vt-days--warn'">
              {{ item.days_since }}d
            </td>
          </tr>
        </table>
        <span v-if="v.length > 6" class="val-more">+{{ v.length - 6 }} more</span>
      </template>

      <!-- user_list -->
      <template v-else-if="vt === 'user_list'">
        <div class="val-count-badge">{{ v.count ?? user_items.length }}</div>
        <ul class="val-list" v-if="user_items.length">
          <li v-for="u in user_items" :key="u.email">
            <span class="vl-name">{{ u.name }}</span>
            <span class="vl-meta" v-if="u.role"> · {{ u.role }}</span>
          </li>
        </ul>
      </template>

      <!-- name_list — roles/profiles/territories -->
      <template v-else-if="vt === 'name_list'">
        <div class="val-count-badge">{{ v.count ?? name_items.length }}</div>
        <div class="val-tags" v-if="name_items.length">
          <span v-for="n in name_items" :key="n" class="val-tag">{{ n }}</span>
        </div>
      </template>

      <!-- mod_map — module → number -->
      <template v-else-if="vt === 'mod_map'">
        <table class="val-table">
          <tr v-for="e in mod_entries" :key="e.k">
            <td class="vt-mod">{{ e.k }}</td>
            <td class="vt-num">{{ e.val }}</td>
          </tr>
        </table>
      </template>

      <!-- field_map — module → {total, custom} -->
      <template v-else-if="vt === 'field_map'">
        <table class="val-table">
          <tr v-for="e in field_entries" :key="e.k">
            <td class="vt-mod">{{ e.k }}</td>
            <td class="vt-num">{{ e.custom }} <span class="vt-sub">/ {{ e.total }}</span></td>
          </tr>
        </table>
      </template>

      <!-- rl_map — module → {enabled, disabled} -->
      <template v-else-if="vt === 'rl_map'">
        <table class="val-table">
          <tr v-for="e in rl_entries" :key="e.k">
            <td class="vt-mod">{{ e.k }}</td>
            <td class="vt-num">{{ e.enabled }}✓ <span class="vt-sub">{{ e.disabled }}✗</span></td>
          </tr>
        </table>
      </template>

      <!-- tag_map -->
      <template v-else-if="vt === 'tag_map'">
        <table class="val-table">
          <tr v-for="e in tag_entries" :key="e.k">
            <td class="vt-mod">{{ e.k }}</td>
            <td class="vt-num">{{ e.total }} <span class="vt-sub" v-if="e.zero_use">({{ e.zero_use }} unused)</span></td>
          </tr>
        </table>
      </template>

      <!-- picklist — {total, orphaned_count, orphaned:[]} -->
      <template v-else-if="vt === 'picklist'">
        <div class="val-count-badge" :class="v.orphaned_count > 0 ? 'val-count-badge--warn' : ''">
          {{ v.total }} total · {{ v.orphaned_count }} orphaned
        </div>
        <div class="val-tags" v-if="v.orphaned?.length">
          <span v-for="n in v.orphaned.slice(0,6)" :key="n" class="val-tag val-tag--warn">{{ n }}</span>
        </div>
      </template>

      <!-- template — email/inventory -->
      <template v-else-if="vt === 'template' && tpl">
        <dl class="val-kv">
          <dt>total</dt><dd>{{ tpl.total }}</dd>
          <dt v-if="tpl.custom != null">custom</dt><dd v-if="tpl.custom != null">{{ tpl.custom }}</dd>
          <dt v-if="tpl.never_used">never used</dt><dd v-if="tpl.never_used" class="dd--warn">{{ tpl.never_used }}</dd>
          <dt v-if="tpl.stale">stale</dt><dd v-if="tpl.stale" class="dd--warn">{{ tpl.stale }}</dd>
        </dl>
        <ul class="val-list val-list--sm" v-if="tpl.never_used_examples?.length">
          <li v-for="ex in tpl.never_used_examples.slice(0,3)" :key="ex" class="vl-warn">{{ ex }}</li>
        </ul>
      </template>

      <!-- wf_limits -->
      <template v-else-if="vt === 'wf_limits' && wfl">
        <dl class="val-kv">
          <dt>configured</dt><dd>{{ wfl.total_configured }}</dd>
          <dt>active</dt><dd class="dd--ok">{{ wfl.active }}</dd>
          <dt>inactive</dt><dd class="dd--warn">{{ wfl.inactive }}</dd>
          <dt>limit</dt><dd>{{ wfl.total_limit }}</dd>
        </dl>
      </template>

      <!-- rule_list — inactive/never-executed rules -->
      <template v-else-if="vt === 'rule_list'">
        <div class="val-count-badge" :class="v.count > 0 ? 'val-count-badge--warn' : ''">
          {{ v.count }}
        </div>
        <ul class="val-list val-list--sm" v-if="rule_examples.length">
          <li v-for="r in rule_examples" :key="r.name">
            <span class="vl-name">{{ r.name }}</span>
            <span class="vl-meta"> · {{ r.module }}</span>
          </li>
        </ul>
      </template>

    </div>
    <div class="cr__value cr__value--empty" v-else />

    <!-- ── Col 4: comment + optional override ── -->
    <div class="cr__edit">
      <div
        v-if="!editing_comment && !show_controls"
        class="comment-pill"
        @click="editing_comment = true"
        :title="local_comment || 'Add a note'"
      >
        {{ local_comment || check.comment || '—' }}
      </div>
      <template v-else>
        <textarea
          v-model="local_comment"
          class="comment-ta"
          rows="2"
          placeholder="Add a note…"
          @blur="editing_comment = false; handle_change()"
          @focus="editing_comment = true"
          @input="handle_change"
        />
        <select v-if="show_controls" v-model="local_status" class="status-sel" @change="handle_change">
          <option value="ok">OK</option>
          <option value="warning">Attention</option>
          <option value="bad">Issue</option>
          <option value="review">Needs review</option>
        </select>
      </template>
    </div>

  </div>
</template>

<style scoped>
/* Row */
.cr {
    display: grid;
    grid-template-columns: minmax(140px,1fr) auto minmax(0,260px) minmax(0,200px);
    gap: 10px;
    align-items: start;
    padding: 10px 0;
    border-bottom: 1px solid #f1f5f9;
}
.cr:last-child { border-bottom: none; }

/* Left accent by status */
.cr--bad     { border-left: 3px solid #fca5a5; padding-left: 8px; margin-left: -8px; }
.cr--warning { border-left: 3px solid #fcd34d; padding-left: 8px; margin-left: -8px; }

/* Task */
.cr__task { display: flex; flex-direction: column; gap: 3px; }
.cr__label { font-size: 13px; font-weight: 500; color: #1e293b; line-height: 1.4; }
.cr__badge {
    display: inline-block; align-self: flex-start;
    font-size: 9px; font-weight: 700; letter-spacing: .05em;
    text-transform: uppercase; padding: 1px 5px; border-radius: 3px;
}
.cr__badge--auto   { background: #dbeafe; color: #1d4ed8; }
.cr__badge--manual { background: #f1f5f9; color: #64748b; }

/* Chip */
.cr__chip { padding-top: 1px; }

/* Value */
.cr__value { font-size: 12px; line-height: 1.5; min-width: 0; }
.cr__value--empty { min-width: 0; }

/* Bool */
.val-bool { font-size: 12px; font-weight: 600; }
.val-bool--yes { color: #16a34a; }
.val-bool--no  { color: #94a3b8; }

/* Count */
.val-num { font-size: 18px; font-weight: 700; color: #1e293b; }

/* KV list */
.val-kv {
    display: grid; grid-template-columns: auto 1fr;
    column-gap: 8px; row-gap: 2px; margin: 0;
}
.val-kv dt { color: #94a3b8; font-size: 11px; text-transform: capitalize; white-space: nowrap; }
.val-kv dd { margin: 0; color: #1e293b; font-size: 11.5px; word-break: break-word; }
.val-kv dd.dd--warn { color: #b26a00; font-weight: 600; }
.val-kv dd.dd--ok   { color: #16a34a; font-weight: 600; }

/* Table */
.val-table { border-collapse: collapse; width: 100%; }
.val-table tr:not(:last-child) td { padding-bottom: 2px; }
.vt-mod { font-size: 11px; color: #64748b; padding-right: 8px; white-space: nowrap; max-width: 90px; overflow: hidden; text-overflow: ellipsis; }
.vt-code { font-size: 12px; font-weight: 600; color: #1e293b; padding-right: 6px; }
.vt-num  { font-size: 12px; font-weight: 600; color: #1e293b; }
.vt-sub  { font-size: 11px; color: #94a3b8; font-weight: 400; }
.vt-days { font-size: 12px; font-weight: 600; }
.vt-days--bad  { color: #c5221f; }
.vt-days--warn { color: #b26a00; }
.val-more { font-size: 11px; color: #94a3b8; }

/* Count badge */
.val-count-badge {
    display: inline-block; font-size: 18px; font-weight: 700; color: #1e293b; margin-bottom: 4px;
}
.val-count-badge--warn { color: #b26a00; }

/* Tags */
.val-tags { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 3px; }
.val-tag {
    font-size: 11px; padding: 1px 6px; border-radius: 4px;
    background: #f1f5f9; color: #475569;
}
.val-tag--warn { background: #fff3cd; color: #856404; }

/* Lists */
.val-list { margin: 3px 0 0; padding-left: 14px; }
.val-list li { font-size: 11.5px; color: #475569; margin-bottom: 2px; }
.val-list--sm li { font-size: 11px; }
.vl-name { color: #1e293b; }
.vl-meta { color: #94a3b8; }
.vl-warn { color: #b26a00; }

/* Comment */
.cr__edit { display: flex; flex-direction: column; gap: 4px; min-width: 0; }

.comment-pill {
    font-size: 12px; color: #64748b; line-height: 1.45;
    padding: 4px 8px; border: 1px solid transparent; border-radius: 6px;
    cursor: text; white-space: pre-wrap; word-break: break-word;
    transition: border-color .12s, background .12s;
}
.comment-pill:hover { border-color: #e2e8f0; background: #f8fafc; }

.comment-ta {
    width: 100%; box-sizing: border-box; font: inherit;
    font-size: 12px; color: #374151; border: 1px solid #d1d5db;
    border-radius: 6px; padding: 5px 8px; resize: vertical; min-height: 34px;
    line-height: 1.45; transition: border-color .15s, box-shadow .15s;
}
.comment-ta:focus { outline: none; border-color: #6ea8fe; box-shadow: 0 0 0 3px rgba(110,168,254,.18); }

.status-sel {
    width: 100%; box-sizing: border-box; font-size: 12px; color: #374151;
    background: #fff; border: 1px solid #d1d5db; border-radius: 6px;
    padding: 4px 6px; cursor: pointer;
}
.status-sel:focus { outline: none; border-color: #6ea8fe; }
</style>
