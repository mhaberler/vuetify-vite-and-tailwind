<template>
  <v-app-bar
    v-if="showBar"
    :collapse="false"
    flat
    title="Flight Review"
  >
    <template #append>
      <v-btn
        :icon="appStore.is3D ? 'mdi-map' : 'mdi-earth'"
        variant="text"
        @click="appStore.is3D = !appStore.is3D"
      />
      <v-btn
        icon="mdi-chart-line"
        variant="text"
        @click="showGraph = !showGraph"
      />
      <v-btn v-if="!isIOS" icon="mdi-fullscreen" variant="text" @click="toggleFullscreen" />
      <v-btn icon="mdi-cog-outline" variant="text" @click="settingsOpen = true" />
      <v-btn icon="mdi-menu" variant="text" @click="showBar = false" />
    </template>
  </v-app-bar>

  <v-btn
    v-show="!showBar"
    icon="mdi-menu"
    size="x-small"
    style="position: fixed; top: 8px; right: 8px; z-index: 1000; opacity: 0.7;"
    @click="showBar = true"
  />

  <v-main :class="{ 'bar-hidden': !showBar }" style="height: calc(100vh - 16px);">
    <Splitpanes horizontal style="height: 100%;">
      <Pane>
        <router-view />
      </Pane>
      <Pane v-if="showGraph" min-size="10" :size="50" style="background: rgb(var(--v-theme-surface));">
        <TimeSeries />
      </Pane>
    </Splitpanes>
  </v-main>

  <v-dialog v-model="settingsOpen" max-width="480">
    <v-card title="Settings">
      <v-card-text>
        <v-switch
          v-model="settings.showTerrain"
          class="mb-4"
          hide-details
          label="Show terrain"
        />
        <div class="text-body-2 mb-1">Terrain error level: {{ settings.terrainErrorLevel }}</div>
        <v-slider
          v-model="settings.terrainErrorLevel"
          class="mb-4"
          hide-details
          :max="20"
          :min="1"
          :step="1"
          thumb-label
        />
        <v-select
          v-model="settings.imagerySource"
          class="mb-4"
          hide-details
          :items="imagerySources"
          label="Imagery source"
        />
        <v-switch
          v-model="darkMode"
          hide-details
          label="Dark mode"
        />
        <v-divider class="my-4" />
        <div class="text-subtitle-2 mb-2">Cesium Ion Token</div>
        <v-text-field
          v-model="cesiumTokenInput"
          :append-inner-icon="showTokenText ? 'mdi-eye-off' : 'mdi-eye'"
          clearable
          density="compact"
          hint="Leave empty to use the default token"
          label="Access Token"
          persistent-hint
          :type="showTokenText ? 'text' : 'password'"
          @click:append-inner="showTokenText = !showTokenText"
          @click:clear="cesiumTokenStore.clearToken(); cesiumTokenInput = cesiumTokenStore.token"
        />
        <v-btn
          class="mt-2"
          color="primary"
          :disabled="!cesiumTokenInput || cesiumTokenInput === cesiumTokenStore.token"
          size="small"
          @click="cesiumTokenStore.setToken(cesiumTokenInput)"
        >
          Save Token
        </v-btn>
        <div v-if="cesiumTokenStore.isCustomToken" class="text-caption mt-1 text-medium-emphasis">
          Using custom token (saved in cookie)
        </div>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn @click="settingsOpen = false">Close</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts" setup>
  import { Pane, Splitpanes } from 'splitpanes'
  import { useTheme } from 'vuetify'
  import TimeSeries from '@/components/TimeSeries.vue'
  import { useAppStore } from '@/stores/app'
  import { useCesiumTokenStore } from '@/stores/cesiumToken'
  import 'splitpanes/dist/splitpanes.css'

  const appStore = useAppStore()
  const cesiumTokenStore = useCesiumTokenStore()
  const cesiumTokenInput = ref(cesiumTokenStore.token)
  const showTokenText = ref(false)

  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent)

  const showBar = ref(true)
  const showGraph = ref(false)
  const settingsOpen = ref(false)

  const settings = reactive({
    showTerrain: true,
    terrainErrorLevel: 8,
    imagerySource: 'VersaTiles Satellite',
  })

  const imagerySources = ['VersaTiles Satellite']

  const theme = useTheme()
  const darkMode = computed({
    get: () => theme.global.name.value === 'dark',
    set: (val: boolean) => {
      theme.global.name.value = val ? 'dark' : 'light'
    },
  })

  async function toggleFullscreen () {
    await (document.fullscreenElement
      ? document.exitFullscreen()
      : document.documentElement.requestFullscreen())
  }
</script>

<style scoped>
.bar-hidden :deep(.cesium-viewer-toolbar) {
  top: 44px;
}
</style>
