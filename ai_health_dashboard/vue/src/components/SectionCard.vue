<script setup>
import { computed } from 'vue'
import CheckRow from './CheckRow.vue'
import ScoreRing from './ScoreRing.vue'
import AISummary from './AISummary.vue'
import { count_by_status } from '@/javascript/Util.js'

// ---------------------------------------------------------------------------
// Props & emits
// ---------------------------------------------------------------------------

const props = defineProps({
  section: {
    type: Object,
    required: true,
    // shape: { key, title, fn, overview, checks: [...], score: Number|null,
    //          fetch_state: 'idle'|'loading'|'done'|'error' }
    // check shape: { id, task, auto_key, status, value, comment, source }
  },
})

const emit = defineEmits(['refresh', 'update-check'])

// ---------------------------------------------------------------------------
// Computed
// ---------------------------------------------------------------------------

const counts = computed(() => count_by_status(props.section.checks))

const is_loading = computed(() => props.section.fetch_state === 'loading')

const has_fn = computed(() => props.section.fn !== null && props.section.fn !== undefined)

// ---------------------------------------------------------------------------
// Event handlers
// ---------------------------------------------------------------------------

function on_refresh_click() {
  emit('refresh', props.section.key)
}

function on_row_update(payload) {
  emit('update-check', { section_key: props.section.key, ...payload })
}
</script>

<template>
  <div class="section-card">

    <!-- ------------------------------------------------------------------ -->
    <!-- Header row                                                          -->
    <!-- ------------------------------------------------------------------ -->
    <div class="section-card__header">

      <!-- Left: title + overview -->
      <div class="section-card__title-block">
        <h2 class="section-card__title">{{ section.title }}</h2>
        <p v-if="section.overview" class="section-card__overview">
          {{ section.overview }}
        </p>
      </div>

      <!-- Right: score ring + refresh control -->
      <div class="section-card__controls">
        <ScoreRing :score="section.score" :size="64" label="score" />

        <button
          v-if="has_fn"
          class="section-card__refresh-btn"
          :disabled="is_loading"
          @click="on_refresh_click"
        >
          {{ is_loading ? 'Refreshing…' : 'Refresh' }}
        </button>

        <span v-else class="section-card__manual-note">
          Manual section
        </span>
      </div>

    </div>

    <!-- ------------------------------------------------------------------ -->
    <!-- Loading state — replaces content while function is fetching        -->
    <!-- ------------------------------------------------------------------ -->
    <div v-if="is_loading" class="section-card__loading" aria-live="polite" aria-busy="true">
      <div class="skeleton skeleton--wide" />
      <div class="skeleton skeleton--medium" />
      <div class="skeleton skeleton--wide" />
      <div class="skeleton skeleton--narrow" />
      <div class="skeleton skeleton--medium" />
      <p class="loading-label">Fetching data…</p>
    </div>

    <!-- ------------------------------------------------------------------ -->
    <!-- Loaded content                                                      -->
    <!-- ------------------------------------------------------------------ -->
    <template v-else>

      <!-- Status count summary -->
      <div v-if="section.checks && section.checks.length" class="section-card__summary">
        <span v-if="counts.ok"      class="pill pill--ok">{{ counts.ok }} OK</span>
        <span v-if="counts.warning" class="pill pill--warning">{{ counts.warning }} Attention</span>
        <span v-if="counts.bad"     class="pill pill--bad">{{ counts.bad }} Issue</span>
        <span v-if="counts.review"  class="pill pill--review">{{ counts.review }} Review</span>
      </div>

      <!-- AI summary -->
      <AISummary v-if="section.ai_summary" :summary="section.ai_summary" />

      <!-- Check rows -->
      <div class="section-card__checks">
        <CheckRow
          v-for="check in section.checks"
          :key="check.id"
          :check="check"
          :section-key="section.key"
          @update="on_row_update"
        />
      </div>

    </template>

  </div>
</template>

<style scoped>
.section-card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 18px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

/* ---- Header ---- */
.section-card__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.section-card__title-block {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.section-card__title {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
  color: #1a2233;
  line-height: 1.3;
}

.section-card__overview {
  margin: 0;
  font-size: 13px;
  color: #6b7280;
  line-height: 1.5;
}

.section-card__controls {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

/* ---- Refresh button ---- */
.section-card__refresh-btn {
  font-size: 12px;
  font-weight: 500;
  color: #1d4ed8;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 6px;
  padding: 4px 10px;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.15s, border-color 0.15s;
}

.section-card__refresh-btn:hover:not(:disabled) {
  background: #dbeafe;
  border-color: #93c5fd;
}

.section-card__refresh-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

/* ---- Manual note ---- */
.section-card__manual-note {
  font-size: 11px;
  color: #9ca3af;
  font-style: italic;
  white-space: nowrap;
}

/* ---- Status summary ---- */
.section-card__summary {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 14px;
}

.pill {
  display: inline-block;
  font-size: 12px;
  font-weight: 600;
  border-radius: 20px;
  padding: 2px 10px;
}

.pill--ok {
  background: #dcfce7;
  color: #166534;
}

.pill--warning {
  background: #fef9c3;
  color: #854d0e;
}

.pill--bad {
  background: #fee2e2;
  color: #991b1b;
}

.pill--review {
  background: #f1f5f9;
  color: #475569;
}

/* ---- Check rows container ---- */
.section-card__checks {
  margin-top: 14px;
}

/* ---- Loading skeleton ---- */
.section-card__loading {
  margin-top: 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

@keyframes shimmer {
  0%   { background-position: -600px 0; }
  100% { background-position: 600px 0; }
}

.skeleton {
  height: 18px;
  border-radius: 6px;
  background: linear-gradient(90deg, #f0f4f8 25%, #e2e8f0 50%, #f0f4f8 75%);
  background-size: 600px 100%;
  animation: shimmer 1.4s infinite linear;
}

.skeleton--wide   { width: 100%; }
.skeleton--medium { width: 70%; }
.skeleton--narrow { width: 45%; }

.loading-label {
  font-size: 12px;
  color: #94a3b8;
  text-align: center;
  margin: 4px 0 0;
}
</style>
