/**
 * plugins/index.ts
 *
 * Automatically included in `./src/main.ts`
 */

// Types
import type { App } from 'vue'
import VueCesium from 'vue-cesium'
import router from '../router'
import pinia from '../stores'
// Plugins
import vuetify from './vuetify'

import 'vue-cesium/dist/index.css'

export function registerPlugins (app: App) {
  app
    .use(vuetify)
    .use(router)
    .use(pinia)
    .use(VueCesium)
}
