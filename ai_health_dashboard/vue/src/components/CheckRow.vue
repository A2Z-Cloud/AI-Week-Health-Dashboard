<script setup>
import { ref, watch } from 'vue'
import StatusChip from './StatusChip.vue'
import { format_value } from '@/javascript/Util.js'

// ---------------------------------------------------------------------------
// Props & emits
// ---------------------------------------------------------------------------

const props = defineProps({
  check: {
    type: Object,
    required: true,
    // shape: { id, task, auto_key, status, value, comment, source }
  },
  sectionKey: {
    type: String,
    required: true,
  },
})

const emit = defineEmits(['update'])

// ---------------------------------------------------------------------------
// Local state — mirror the prop so the analyst can edit freely
// ---------------------------------------------------------------------------

const local_comment = ref(props.check.comment ?? '')
const local_status  = ref(props.check.status  ?? 'review')

// Re-sync when the parent store pushes a fresh fetch
watch(
  () => props.check,
  (new_check) => {
    local_comment.value = new_check.comment ?? ''
    local_status.value  = new_check.status  ?? 'review'
  },
)

// ---------------------------------------------------------------------------
// Derived helpers
// ---------------------------------------------------------------------------

const is_auto   = (check) => check.auto_key !== null && check.auto_key !== undefined
const badge_label = (check) => is_auto(check) ? 'AUTO' : 'MANUAL'

// ---------------------------------------------------------------------------
// Emit helper — always send the full current state
// ---------------------------------------------------------------------------

function handle_change() {
  emit('update', {
    check_id: props.check.id,
    comment:  local_comment.value,
    status:   local_status.value,
  })
}
</script>

<template>
  <div class="check-row">

    <!-- Left: task label + source badge -->
    <div class="check-task">
      <span class="task-label">{{ check.task }}</span>
      <span
        class="source-badge"
        :class="is_auto(check) ? 'source-badge--auto' : 'source-badge--manual'"
      >
        {{ badge_label(check) }}
      </span>
    </div>

    <!-- Middle: status chip -->
    <div class="check-status">
      <StatusChip :status="check.status" />
    </div>

    <!-- Value cell (only when value is present) -->
    <div v-if="check.value !== null && check.value !== undefined" class="check-value">
      <span class="value-text">{{ format_value(check.value) }}</span>
    </div>
    <div v-else class="check-value check-value--empty"></div>

    <!-- Right: comment textarea + status override select -->
    <div class="check-edit">
      <textarea
        v-model="local_comment"
        class="comment-textarea"
        rows="1"
        placeholder="Add a note..."
        @blur="handle_change"
        @input="handle_change"
      />
      <select
        v-model="local_status"
        class="status-select"
        @change="handle_change"
      >
        <option value="ok">OK</option>
        <option value="warning">Attention</option>
        <option value="bad">Issue</option>
        <option value="review">Needs review</option>
      </select>
    </div>

  </div>
</template>

<style scoped>
.check-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: flex-start;
  padding: 10px 0;
  border-bottom: 1px solid #eef1f5;
}

/* ---- Task label + badge ---- */
.check-task {
  flex: 1;
  min-width: 160px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.task-label {
  font-size: 14px;
  font-weight: 500;
  color: #1a2233;
  line-height: 1.4;
}

.source-badge {
  display: inline-block;
  align-self: flex-start;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.04em;
  padding: 2px 6px;
  border-radius: 4px;
  text-transform: uppercase;
}

.source-badge--auto {
  background-color: #dbeafe;
  color: #1d4ed8;
}

.source-badge--manual {
  background-color: #f0f1f3;
  color: #6b7280;
}

/* ---- Status chip column ---- */
.check-status {
  display: flex;
  align-items: flex-start;
  padding-top: 2px;
}

/* ---- Value cell ---- */
.check-value {
  min-width: 80px;
  max-width: 220px;
  display: flex;
  align-items: flex-start;
  padding-top: 3px;
}

.check-value--empty {
  /* preserve column space when no value */
  min-width: 80px;
}

.value-text {
  font-size: 12px;
  font-family: ui-monospace, 'SFMono-Regular', Consolas, monospace;
  color: #6b7280;
  word-break: break-all;
}

/* ---- Edit column ---- */
.check-edit {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 180px;
  flex: 1;
}

.comment-textarea {
  width: 100%;
  box-sizing: border-box;
  font: inherit;
  font-size: 13px;
  color: #374151;
  background: #fff;
  border: 1px solid #d8dee6;
  border-radius: 6px;
  padding: 6px 8px;
  resize: vertical;
  min-height: 32px;
  line-height: 1.45;
  transition: border-color 0.15s;
}

.comment-textarea:focus {
  outline: none;
  border-color: #6ea8fe;
  box-shadow: 0 0 0 3px rgba(110, 168, 254, 0.18);
}

.comment-textarea::placeholder {
  color: #b0b8c4;
}

.status-select {
  width: 100%;
  box-sizing: border-box;
  font-size: 12px;
  color: #374151;
  background: #fff;
  border: 1px solid #d8dee6;
  border-radius: 6px;
  padding: 4px 6px;
  cursor: pointer;
  transition: border-color 0.15s;
}

.status-select:focus {
  outline: none;
  border-color: #6ea8fe;
}
</style>
