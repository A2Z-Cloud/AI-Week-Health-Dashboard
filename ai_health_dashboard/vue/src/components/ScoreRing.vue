<template>
  <div class="score-ring" :style="container_style">
    <!-- SVG track + progress arc -->
    <svg
      :width="size"
      :height="size"
      :viewBox="`0 0 ${size} ${size}`"
      role="img"
      :aria-label="aria_label"
    >
      <!-- Track circle -->
      <circle
        class="score-ring__track"
        :cx="center"
        :cy="center"
        :r="radius"
        fill="none"
        stroke="#e2e8f0"
        :stroke-width="stroke_width"
      />
      <!-- Progress arc -->
      <circle
        v-if="score !== null"
        class="score-ring__arc"
        :cx="center"
        :cy="center"
        :r="radius"
        fill="none"
        :stroke="arc_colour"
        :stroke-width="stroke_width"
        stroke-linecap="round"
        :stroke-dasharray="circumference"
        :stroke-dashoffset="dash_offset"
        transform="rotate(-90)"
        :transform-origin="`${center} ${center}`"
      />
    </svg>

    <!-- Centred text overlay -->
    <div class="score-ring__overlay">
      <span class="score-ring__value" :style="{ color: arc_colour }">
        {{ display_score }}
      </span>
      <span v-if="label" class="score-ring__label">{{ label }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  score: {
    type: Number,
    default: null,
  },
  size: {
    type: Number,
    default: 72,
  },
  label: {
    type: String,
    default: '',
  },
})

const stroke_width = 7

const center = computed(() => props.size / 2)

const radius = computed(() => props.size / 2 - stroke_width)

const circumference = computed(() => 2 * Math.PI * radius.value)

const dash_offset = computed(() => {
  if (props.score === null) return circumference.value
  const clamped = Math.min(100, Math.max(0, props.score))
  return circumference.value * (1 - clamped / 100)
})

const arc_colour = computed(() => {
  if (props.score === null) return '#94a3b8'
  if (props.score >= 80) return '#1e7e34'
  if (props.score >= 50) return '#b26a00'
  return '#c5221f'
})

const display_score = computed(() => (props.score === null ? '—' : props.score))

const container_style = computed(() => ({
  width: `${props.size}px`,
  height: `${props.size}px`,
}))

const aria_label = computed(() =>
  props.score === null
    ? 'Health score unknown'
    : `Health score ${props.score} out of 100`
)
</script>

<style scoped>
.score-ring {
  position: relative;
  display: inline-block;
  flex-shrink: 0;
}

.score-ring__overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.score-ring__value {
  font-size: 16px;
  font-weight: 700;
  line-height: 1;
}

.score-ring__label {
  font-size: 10px;
  color: #94a3b8;
  margin-top: 2px;
  text-align: center;
  line-height: 1.2;
}
</style>
