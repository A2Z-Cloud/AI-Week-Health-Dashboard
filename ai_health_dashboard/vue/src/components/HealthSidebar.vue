<template>
  <aside class="health-sidebar">
    <!-- Overall score header -->
    <div class="health-sidebar__header">
      <p class="health-sidebar__crm-title">CRM Health</p>
      <ScoreRing :score="overallScore" :size="96" label="overall" />
      <span
        class="health-sidebar__band-label"
        :style="{ color: band_colour(score_band(overallScore)) }"
      >
        {{ score_band(overallScore) }}
      </span>
    </div>

    <!-- Section nav list -->
    <nav class="health-sidebar__nav">
      <button
        v-for="s in sections"
        :key="s.key"
        class="health-sidebar__item"
        :class="{ 'health-sidebar__item--active': s.key === activeKey }"
        @click="emit('select', s.key)"
      >
        <span class="health-sidebar__item-title">{{ s.title }}</span>

        <!-- Loading state -->
        <span v-if="s.fetch_state === 'loading'" class="health-sidebar__loading-dot" aria-label="Loading" />

        <!-- Score badge -->
        <span
          v-else
          class="health-sidebar__badge"
          :style="{ color: band_colour(score_band(s.score)), borderColor: band_colour(score_band(s.score)) }"
        >
          {{ s.score !== null && s.score !== undefined ? s.score : '—' }}
        </span>
      </button>
    </nav>
  </aside>
</template>

<script setup>
import { computed } from 'vue'
import ScoreRing from './ScoreRing.vue'
import { score_band } from '@/javascript/Util.js'

const props = defineProps({
  sections: {
    type: Array,
    required: true,
  },
  activeKey: {
    type: String,
    required: true,
  },
  overallScore: {
    type: Number,
    default: null,
  },
})

const emit = defineEmits(['select'])

function band_colour(band) {
  const colour_map = {
    healthy: '#1e7e34',
    attention: '#b26a00',
    critical: '#c5221f',
    unknown: '#94a3b8',
  }
  return colour_map[band] ?? '#94a3b8'
}
</script>

<style scoped>
.health-sidebar {
  width: 230px;
  min-width: 230px;
  height: 100%;
  overflow-y: auto;
  border-right: 1px solid #e5e9f0;
  background: #fafbfc;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  box-sizing: border-box;
}

/* Header */
.health-sidebar__header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding-bottom: 14px;
  border-bottom: 1px solid #e5e9f0;
}

.health-sidebar__crm-title {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: #64748b;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.health-sidebar__band-label {
  font-size: 13px;
  font-weight: 600;
  text-transform: capitalize;
  line-height: 1;
}

/* Nav list */
.health-sidebar__nav {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.health-sidebar__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 9px 10px;
  border-radius: 7px;
  cursor: pointer;
  background: transparent;
  border: none;
  text-align: left;
  transition: background 0.15s ease;
  border-left: 3px solid transparent;
  box-sizing: border-box;
}

.health-sidebar__item:hover {
  background: #eef1f6;
}

.health-sidebar__item--active {
  background: #eef1f6;
  border-left-color: #4f6ef7;
}

.health-sidebar__item-title {
  font-size: 14px;
  color: #1e293b;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-right: 8px;
}

/* Score badge */
.health-sidebar__badge {
  font-size: 12px;
  font-weight: 600;
  min-width: 28px;
  text-align: center;
  padding: 2px 5px;
  border-radius: 4px;
  border: 1px solid currentColor;
  line-height: 1.4;
  flex-shrink: 0;
}

/* Loading pulsing dot */
.health-sidebar__loading-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #94a3b8;
  flex-shrink: 0;
  animation: sidebar-pulse 1.2s ease-in-out infinite;
}

@keyframes sidebar-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}
</style>
