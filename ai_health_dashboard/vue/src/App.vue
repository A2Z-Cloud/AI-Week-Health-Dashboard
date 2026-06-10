<script setup>
import { computed } from 'vue'
import { useStore } from 'vuex'
import HealthSidebar from './components/HealthSidebar.vue'
import SectionCard from './components/SectionCard.vue'

const store = useStore()

const sections       = computed(() => store.getters.sections)
const active_section  = computed(() => store.getters.active_section)
const active_key      = computed(() => store.getters.active_section_key)
const overall_score   = computed(() => store.getters.overall_score)
const running         = computed(() => store.getters.running)
const has_api_error   = computed(() => store.getters.has_api_error)
const api_error       = computed(() => store.getters.api_error)

function on_select(key) {
    store.dispatch('set_active_section', key)
}

function on_refresh(section_key) {
    store.dispatch('refresh_section', section_key)
}

function on_update_check(payload) {
    store.dispatch('update_check', payload)
}

function run_check() {
    store.dispatch('run_health_check')
}

// Run is triggered by PageLoad in main.js — that is the only safe entry point.
</script>

<template>
  <main role="main" aria-label="CRM Health Check Dashboard">

    <!-- Top bar -->
    <header class="topbar">
      <div class="topbar-brand">
        <span class="brand-mark">A2Z</span>
        <span class="brand-title">CRM Health Check</span>
      </div>
      <button
        class="run-btn"
        :disabled="running"
        @click="run_check"
      >
        {{ running ? 'Running checks…' : 'Run full health check' }}
      </button>
    </header>

    <!-- Error banner -->
    <div v-if="has_api_error" class="error-banner" role="alert" aria-live="assertive">
      <span>{{ api_error }}</span>
      <button class="error-dismiss" @click="store.dispatch('clear_error')" aria-label="Dismiss">×</button>
    </div>

    <!-- Body: sidebar + active section -->
    <div class="body">
      <HealthSidebar
        :sections="sections"
        :active-key="active_key"
        :overall-score="overall_score"
        @select="on_select"
      />

      <section class="content">
        <SectionCard
          v-if="active_section"
          :key="active_section.key"
          :section="active_section"
          @refresh="on_refresh"
          @update-check="on_update_check"
        />
        <p v-else class="empty">Select a section.</p>
      </section>
    </div>

  </main>
</template>

<style scoped>
* { box-sizing: border-box; margin: 0; padding: 0; }

/* Fill the CRM iframe exactly — no scrollbar overflow */
:global(html), :global(body), :global(#app) { height: 100%; overflow: hidden; }

main {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    color: #1a2233;
    background: #f4f6fa;
    height: 100%;
    display: flex;
    flex-direction: column;
}

/* Top bar */
.topbar {
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 18px;
    background: #fff;
    border-bottom: 1px solid #e5e9f0;
}
.topbar-brand { display: flex; align-items: center; gap: 10px; }
.brand-mark {
    font-weight: 800; font-size: 13px; letter-spacing: 0.02em;
    color: #fff; background: #1a73e8;
    padding: 3px 8px; border-radius: 6px;
}
.brand-title { font-size: 16px; font-weight: 700; color: #0f172a; }

.run-btn {
    font: inherit; font-size: 14px; font-weight: 600;
    color: #fff; background: #1a73e8;
    border: none; border-radius: 7px;
    padding: 9px 18px; cursor: pointer;
    transition: background 0.15s;
}
.run-btn:hover:not(:disabled) { background: #1558b0; }
.run-btn:disabled { opacity: 0.6; cursor: not-allowed; }

/* Error banner */
.error-banner {
    flex: 0 0 auto;
    display: flex; align-items: center; justify-content: space-between;
    gap: 12px;
    padding: 10px 18px;
    background: #fdecea; color: #c5221f;
    border-bottom: 1px solid #f6c9c4;
    font-size: 13px;
}
.error-dismiss {
    background: none; border: none; color: #c5221f;
    font-size: 18px; line-height: 1; cursor: pointer; padding: 0 4px;
}

/* Body */
.body {
    flex: 1 1 auto;
    display: flex;
    min-height: 0;          /* allow children to scroll, not the page */
}
.content {
    flex: 1 1 auto;
    overflow-y: auto;
    padding: 18px;
    min-width: 0;
}
.empty { color: #94a3b8; padding: 24px; }
</style>
