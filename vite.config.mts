import { rename } from 'node:fs/promises'
import path from 'node:path'
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
import { defineConfig, loadEnv, type Plugin, type ResolvedConfig } from 'vite'
import Cesium from 'vite-plugin-cesium'
import DevtoolsJson from 'vite-plugin-devtools-json'
import { run } from 'vite-plugin-run'
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

function flattenCesiumOutput (): Plugin {
  let resolvedConfig: ResolvedConfig | null = null

  return {
    name: 'flatten-cesium-output',
    apply: 'build',
    configResolved (config) {
      resolvedConfig = config
    },
    async closeBundle () {
      if (!resolvedConfig) {
        return
      }

      const baseSegments = resolvedConfig.base.split('/').filter(Boolean)
      if (baseSegments.length === 0) {
        return
      }

      const outDir = path.resolve(resolvedConfig.root, resolvedConfig.build.outDir)
      const nestedCesiumDir = path.join(outDir, ...baseSegments, 'cesium')
      const targetCesiumDir = path.join(outDir, 'cesium')

      if (nestedCesiumDir === targetCesiumDir) {
        return
      }

      try {
        await rename(nestedCesiumDir, targetCesiumDir)
      } catch (error) {
        const err = error as NodeJS.ErrnoException
        if (err.code !== 'ENOENT') {
          throw error
        }
      }
    },
  }
}

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  const shouldRsync = process.argv.includes('--rsync')
  const env = loadEnv(mode, process.cwd(), '')
  const deployPrefix = env.DEPLOY_PREFIX ?? '/apps/'

  if (env.DEPLOY_USER && env.DEPLOY_PATH && env.DEPLOY_HOST && shouldRsync) {
    console.log(`rsync deploy to:  ${env.DEPLOY_USER}@${env.DEPLOY_HOST}:${env.DEPLOY_PATH}`)
  }

  return {
    plugins: [
      vueLeafletFix,
      Vue({
        template: { transformAssetUrls },
      }),
      VueJsx(),
      Cesium(),
      flattenCesiumOutput(),
      tailwindcss(),
      ...(mode === 'development' ? [DevtoolsJson(), VueDevTools()] : []),
      ...(env.DEPLOY_USER && env.DEPLOY_PATH && env.DEPLOY_HOST && shouldRsync
        ? [
            run([{
              name: 'Deploy via Rsync',
              run: ['rsync', '-avz', '--delete', './dist/',
                `${env.DEPLOY_USER}@${env.DEPLOY_HOST}:${env.DEPLOY_PATH}`],
              build: true,
              condition: file => file.includes('dist'),
            }]),
          ]
        : []),
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
    ].filter(Boolean),
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
  }
})
