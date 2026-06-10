import { createApp } from 'vue'
import App from './App.vue'
import { store } from './store/store.js'

// Register ALL listeners BEFORE init()
// PageLoad is the signal that the embedded-app handshake is complete — only
// AFTER this fires is it safe to call ZOHO.CRM.* APIs. Calling earlier throws
// "Parentwindow reference not found".
ZOHO.embeddedApp.on("PageLoad", function(data) {
    store.commit('set_module', data.Entity)
    store.commit('set_record_id', data.EntityId)
    store.commit('set_button_position', data.ButtonPosition)
    store.commit('set_sdk_ready', true)
    // Run the health check now that the SDK is genuinely ready.
    store.dispatch('run_health_check')
})

ZOHO.embeddedApp.init()

createApp(App).use(store).mount('#app')
