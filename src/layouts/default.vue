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

        <v-divider class="my-4" />
        <div class="text-subtitle-2 mb-2">API Keys</div>
        <div class="text-caption font-weight-medium mb-1">Cesium Ion Token</div>
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
          class="mt-2 mr-2"
          :color="tokenSaved ? 'success' : 'primary'"
          :disabled="!cesiumTokenInput || cesiumTokenInput === cesiumTokenStore.token || tokenValidating"
          :loading="tokenValidating"
          size="small"
          @click="saveToken"
        >
          {{ tokenSaved ? 'Saved!' : 'Save Token' }}
        </v-btn>
        <v-btn
          class="mt-2"
          color="error"
          :disabled="!cesiumTokenStore.isCustomToken"
          size="small"
          variant="outlined"
          @click="cesiumTokenStore.clearToken(); cesiumTokenInput = cesiumTokenStore.token"
        >
          Clear Token
        </v-btn>
        <div v-if="tokenValidationFailed" class="text-caption mt-1 text-error">
          Invalid token
        </div>
        <div v-else-if="cesiumTokenStore.isCustomToken" class="text-caption mt-1 text-medium-emphasis">
          Using custom token (saved in cookie)
        </div>

        <div class="text-caption font-weight-medium mb-1 mt-4">
          Bing Maps Key
          <span class="font-italic text-medium-emphasis"> — optional, Bing layers work via Ion without this</span>
        </div>
        <v-text-field
          v-model="bingKeyInput"
          :append-inner-icon="showBingKey ? 'mdi-eye-off' : 'mdi-eye'"
          clearable
          density="compact"
          label="Bing Maps Key"
          :type="showBingKey ? 'text' : 'password'"
          @click:append-inner="showBingKey = !showBingKey"
          @click:clear="settingsStore.bingMapsKey = ''; settingsStore.save()"
        />
        <v-btn
          class="mt-2"
          color="primary"
          :disabled="!bingKeyInput || bingKeyInput === settingsStore.bingMapsKey"
          size="small"
          @click="settingsStore.bingMapsKey = bingKeyInput; settingsStore.save()"
        >
          Save Key
        </v-btn>
        <div v-if="settingsStore.bingMapsKey" class="text-caption mt-1 text-medium-emphasis">
          Custom Bing key saved
        </div>

        <div class="text-subtitle-2 mb-2">Viewer Controls</div>
        <v-switch
          v-model="settingsStore.showZoom"
          hide-details
          label="Zoom buttons"
          @update:model-value="settingsStore.save()"
        />
        <v-switch
          v-model="settingsStore.showNorth"
          hide-details
          label="North arrow"
          @update:model-value="settingsStore.save()"
        />
        <v-switch
          v-model="settingsStore.show3DBuildings"
          class="mb-4"
          hide-details
          label="3D Buildings"
          @update:model-value="settingsStore.save()"
        />
        <v-switch
          v-model="darkMode"
          hide-details
          label="Dark mode"
        />
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
  import { useSettingsStore } from '@/stores/settings'
  import 'splitpanes/dist/splitpanes.css'

  const appStore = useAppStore()
  const cesiumTokenStore = useCesiumTokenStore()
  const settingsStore = useSettingsStore()
  const cesiumTokenInput = ref(cesiumTokenStore.token)
  const showTokenText = ref(false)
  const tokenValidating = ref(false)
  const tokenValidationFailed = ref(false)
  const tokenSaved = ref(false)

  async function saveToken () {
    tokenValidating.value = true
    tokenValidationFailed.value = false
    tokenSaved.value = false
    const ok = await cesiumTokenStore.validateAndSetToken(cesiumTokenInput.value)
    tokenValidating.value = false
    if (ok) {
      tokenSaved.value = true
      setTimeout(() => {
        tokenSaved.value = false
      }, 2000)
    } else {
      tokenValidationFailed.value = true
    }
  }
  const bingKeyInput = ref(settingsStore.bingMapsKey)
  const showBingKey = ref(false)

  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent)

  const showBar = ref(true)
  const showGraph = ref(false)
  const settingsOpen = ref(false)

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
