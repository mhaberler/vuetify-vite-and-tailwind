import { fileURLToPath, URL } from 'node:url'
// Plugins
import tailwindcss from '@tailwindcss/vite'
import Vue from '@vitejs/plugin-vue'
import VueJsx from '@vitejs/plugin-vue-jsx'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { VueRouterAutoImports } from 'unplugin-vue-router'
import VueRouter from 'unplugin-vue-router/vite'
// Utilities
import { defineConfig } from 'vite'
import Cesium from 'vite-plugin-cesium'
import DevtoolsJson from 'vite-plugin-devtools-json'
import VueDevTools from 'vite-plugin-vue-devtools'
import Layouts from 'vite-plugin-vue-layouts-next'
import Vuetify, { transformAssetUrls } from 'vite-plugin-vuetify'

// Fix for vue-leaflet ES module bug (duplicate 'h' identifier)
const vueLeafletFix = {
  name: 'vue-leaflet-fix',
  transform (code: string, id: string) {
    if (id.includes('@vue-leaflet/vue-leaflet') && id.includes('.js')) {
      return code.replace(/\bh\s*=\s*Symbol\(/, 'vleafletSymbol = Symbol(')
    }
  },
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    vueLeafletFix,
    Vue({
      template: { transformAssetUrls },
    }),
    VueJsx(),
    Cesium(),
    tailwindcss(),
    ...(mode === 'development' ? [DevtoolsJson(), VueDevTools()] : []),
    VueRouter({
      dts: 'src/typed-router.d.ts',
    }),
    Layouts(),
    AutoImport({
      imports: [
        'vue',
        VueRouterAutoImports,
        {
          pinia: ['defineStore', 'storeToRefs'],
        },
      ],
      exclude: [/\.worker\.[tj]s$/],
      dts: 'src/auto-imports.d.ts',
      eslintrc: {
        enabled: true,
      },
      vueTemplate: true,
    }),
    Components({
      dts: 'src/components.d.ts',
    }),
    // https://github.com/vuetifyjs/vuetify-loader/tree/master/packages/vite-plugin#readme
    Vuetify({
      autoImport: true,
      styles: {
        configFile: 'src/styles/settings.scss',
      },
    }),
  ],
  optimizeDeps: {
    exclude: [
      'vuetify',
      'vue-router',
      'vue-leaflet',
      'unplugin-vue-router/runtime',
      'unplugin-vue-router/data-loaders',
      'unplugin-vue-router/data-loaders/basic',
    ],
  },
  define: { 'process.env': {} },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('src', import.meta.url)),
    },
    extensions: [
      '.js',
      '.json',
      '.jsx',
      '.mjs',
      '.ts',
      '.tsx',
      '.vue',
    ],
  },
  server: {
    port: 3000,
  },
}))
