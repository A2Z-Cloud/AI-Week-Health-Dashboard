<script setup>
import { computed } from 'vue'

const props = defineProps({
    summary: {
        type: Object,
        required: true
        // shape: { summary, critical[], warnings[], positives[], recommended_actions[] }
    }
})

const has_text     = computed(() => !!(props.summary && props.summary.summary))
const critical     = computed(() => props.summary?.critical || [])
const warnings     = computed(() => props.summary?.warnings || [])
const positives    = computed(() => props.summary?.positives || [])
const actions      = computed(() => props.summary?.recommended_actions || [])
</script>

<template>
  <div class="ai-summary">
    <div class="ai-summary__head">
      <span class="ai-summary__icon" aria-hidden="true">✦</span>
      <span class="ai-summary__title">AI Summary</span>
    </div>

    <p v-if="has_text" class="ai-summary__text">{{ summary.summary }}</p>

    <div v-if="critical.length" class="ai-block ai-block--critical">
      <div class="ai-block__label">Critical</div>
      <ul><li v-for="(item, i) in critical" :key="'c' + i">{{ item }}</li></ul>
    </div>

    <div v-if="warnings.length" class="ai-block ai-block--warning">
      <div class="ai-block__label">Warnings</div>
      <ul><li v-for="(item, i) in warnings" :key="'w' + i">{{ item }}</li></ul>
    </div>

    <div v-if="actions.length" class="ai-block ai-block--action">
      <div class="ai-block__label">Recommended actions</div>
      <ul><li v-for="(item, i) in actions" :key="'a' + i">{{ item }}</li></ul>
    </div>

    <div v-if="positives.length" class="ai-block ai-block--positive">
      <div class="ai-block__label">Positives</div>
      <ul><li v-for="(item, i) in positives" :key="'p' + i">{{ item }}</li></ul>
    </div>
  </div>
</template>

<style scoped>
.ai-summary {
    background: linear-gradient(180deg, #f5f3ff 0%, #faf9ff 100%);
    border: 1px solid #e3dcff;
    border-radius: 9px;
    padding: 14px 16px;
    margin: 4px 0 16px;
}
.ai-summary__head {
    display: flex; align-items: center; gap: 7px;
    margin-bottom: 8px;
}
.ai-summary__icon { color: #7c3aed; font-size: 14px; }
.ai-summary__title {
    font-size: 12px; font-weight: 700; letter-spacing: 0.04em;
    text-transform: uppercase; color: #6d28d9;
}
.ai-summary__text {
    font-size: 13px; line-height: 1.55; color: #3b3357;
    margin-bottom: 10px;
}
.ai-block { margin-top: 8px; }
.ai-block__label {
    font-size: 11px; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.03em; margin-bottom: 3px;
}
.ai-block ul { margin: 0; padding-left: 18px; }
.ai-block li { font-size: 12.5px; line-height: 1.5; margin-bottom: 3px; }
.ai-block--critical .ai-block__label { color: #c5221f; }
.ai-block--critical li { color: #7f1d1d; }
.ai-block--warning  .ai-block__label { color: #b26a00; }
.ai-block--warning  li { color: #7c4a03; }
.ai-block--action   .ai-block__label { color: #1d4ed8; }
.ai-block--action   li { color: #1e3a8a; }
.ai-block--positive .ai-block__label { color: #1e7e34; }
.ai-block--positive li { color: #14532d; }
</style>
