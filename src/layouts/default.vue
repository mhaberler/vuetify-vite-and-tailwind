<template>
  <v-app-bar
    v-if="showBar"
    :collapse="false"
    :density="isCompactScreen ? 'compact' : 'default'"
    flat
    title="Flight Review"
  >
    <template #append>
      <v-btn
        :icon="appStore.is3D ? 'mdi-map' : 'mdi-earth'"
        :size="isCompactScreen ? 'small' : 'default'"
        variant="text"
        @click="appStore.requestModeToggle()"
      />
      <v-btn
        icon="mdi-chart-line"
        :size="isCompactScreen ? 'small' : 'default'"
        variant="text"
        @click="showGraph = !showGraph"
      />
      <v-btn
        v-if="!isIOS"
        icon="mdi-fullscreen"
        :size="isCompactScreen ? 'small' : 'default'"
        variant="text"
        @click="toggleFullscreen"
      />
      <v-btn
        icon="mdi-menu"
        :size="isCompactScreen ? 'small' : 'default'"
        variant="text"
        @click="showBar = false"
      />
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
</template>

<script lang="ts" setup>
  import { Pane, Splitpanes } from 'splitpanes'
  import TimeSeries from '@/components/TimeSeries.vue'
  import { useAppStore } from '@/stores/app'
  import 'splitpanes/dist/splitpanes.css'

  const appStore = useAppStore()

  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent)
  const compactScreenQuery = window.matchMedia('(max-width: 768px)')

  const showBar = ref(true)
  const showGraph = ref(false)
  const isCompactScreen = ref(compactScreenQuery.matches)

  function updateCompactScreen (event: MediaQueryListEvent) {
    isCompactScreen.value = event.matches
  }

  onMounted(() => {
    compactScreenQuery.addEventListener('change', updateCompactScreen)
  })

  onUnmounted(() => {
    compactScreenQuery.removeEventListener('change', updateCompactScreen)
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
