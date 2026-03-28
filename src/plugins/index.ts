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
import { useCesiumTokenStore } from '../stores/cesiumToken'
// Plugins
import vuetify from './vuetify'

import 'vue-cesium/dist/index.css'

export function registerPlugins (app: App) {
  app
    .use(vuetify)
    .use(router)
    .use(pinia)
    .use(VueCesium)

  // Initialize Cesium Ion token from cookie/env before first render
  useCesiumTokenStore().initializeCesium()
}
