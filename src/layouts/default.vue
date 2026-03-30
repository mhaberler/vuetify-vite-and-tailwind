<template>
  <v-app-bar v-if="showBar" :collapse="false" flat title="Flight Review">
    <template #append>
      <v-btn
        :icon="appStore.is3D ? 'mdi-map' : 'mdi-earth'"
        variant="text"
        @click="appStore.is3D = !appStore.is3D"
      />
      <v-btn
        v-if="appStore.is3D && settingsStore.retainStartupView"
        :color="startupViewSaved ? 'success' : undefined"
        :icon="startupViewSaved ? 'mdi-check' : 'mdi-content-save'"
        :title="startupViewSaved ? 'Startup view saved' : 'Save startup view'"
        variant="text"
        @click="appStore.requestStartupViewSave()"
      />
      <v-btn
        icon="mdi-chart-line"
        variant="text"
        @click="showGraph = !showGraph"
      />
      <v-btn
        v-if="!isIOS"
        icon="mdi-fullscreen"
        variant="text"
        @click="toggleFullscreen"
      />
      <v-btn
        icon="mdi-cog-outline"
        variant="text"
        @click="settingsOpen = true"
      />
      <v-btn icon="mdi-menu" variant="text" @click="showBar = false" />
    </template>
  </v-app-bar>

  <v-btn
    v-show="!showBar"
    icon="mdi-menu"
    size="x-small"
    style="position: fixed; top: 8px; right: 8px; z-index: 1000; opacity: 0.7"
    @click="showBar = true"
  />

  <v-main
    :class="{ 'bar-hidden': !showBar }"
    style="height: calc(100vh - 16px)"
  >
    <Splitpanes horizontal style="height: 100%">
      <Pane>
        <router-view />
      </Pane>
      <Pane
        v-if="showGraph"
        min-size="10"
        :size="50"
        style="background: rgb(var(--v-theme-surface))"
      >
        <TimeSeries />
      </Pane>
    </Splitpanes>
  </v-main>

  <v-dialog v-model="settingsOpen" max-width="480">
    <v-card title="Settings">
      <v-card-text>
        <div class="text-subtitle-2 mb-2">Viewer Behavior</div>
        <v-switch
          v-model="settingsStore.retainImagery"
          hide-details
          label="Retain imagery selection"
          @update:model-value="updateRetainImagery"
        />
        <v-switch
          v-model="settingsStore.retainStartupView"
          hide-details
          label="Retain startup position and orientation"
          @update:model-value="updateRetainStartupView"
        />
        <div
          v-if="hasSavedStartupView"
          class="text-caption text-medium-emphasis"
        >
          Saved startup view available
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
  import TimeSeries from '@/components/TimeSeries.vue'
  import { useAppStore } from '@/stores/app'
  import { useSettingsStore } from '@/stores/settings'
  import 'splitpanes/dist/splitpanes.css'

  const appStore = useAppStore()
  const settingsStore = useSettingsStore()
  const startupViewSaved = ref(false)
  let startupViewSavedTimer: number | null = null

  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent)

  const showBar = ref(true)
  const showGraph = ref(false)
  const settingsOpen = ref(false)
  const hasSavedStartupView = computed(
    () =>
      settingsStore.startupLongitude != null
      && settingsStore.startupLatitude != null
      && settingsStore.startupHeight != null
      && settingsStore.startupHeading != null
      && settingsStore.startupPitch != null
      && settingsStore.startupRoll != null,
  )

  async function toggleFullscreen () {
    await (document.fullscreenElement
      ? document.exitFullscreen()
      : document.documentElement.requestFullscreen())
  }

  function updateRetainImagery (enabled: boolean | null) {
    if (!enabled) {
      settingsStore.clearRetainedImagery()
    }
    settingsStore.save()
  }

  function updateRetainStartupView (enabled: boolean | null) {
    if (!enabled) {
      settingsStore.clearRetainedStartupView()
    }
    settingsStore.save()
  }

  watch(
    () => appStore.startupViewSaveSuccessId,
    saveSuccessId => {
      if (saveSuccessId === 0) return

      startupViewSaved.value = true

      if (startupViewSavedTimer != null) {
        window.clearTimeout(startupViewSavedTimer)
      }

      startupViewSavedTimer = window.setTimeout(() => {
        startupViewSaved.value = false
        startupViewSavedTimer = null
      }, 2000)
    },
  )

  onUnmounted(() => {
    if (startupViewSavedTimer != null) {
      window.clearTimeout(startupViewSavedTimer)
    }
  })
</script>

<style scoped>
.bar-hidden :deep(.cesium-viewer-toolbar) {
  top: 44px;
}
</style>
