<template>
  <v-app-bar :collapse="false" flat title="Flight Review">
    <template #append>
      <v-btn
        :color="appStore.is3D ? 'primary' : undefined"
        :icon="appStore.is3D ? 'mdi-earth' : 'mdi-map'"
        :variant="appStore.is3D ? 'tonal' : 'text'"
        @click="appStore.is3D = !appStore.is3D"
      />
      <v-btn
        :color="showGraph ? 'primary' : undefined"
        :icon="showGraph ? 'mdi-chart-line' : 'mdi-chart-line'"
        :variant="showGraph ? 'tonal' : 'text'"
        @click="showGraph = !showGraph"
      />
      <v-btn icon="mdi-cog-outline" @click="settingsOpen = true" />
    </template>
  </v-app-bar>

  <v-main style="height: calc(100vh - 16px);">
    <div
      ref="containerRef"
      style="display: flex; flex-direction: column; height: 100%;"
      :style="{ userSelect: isDragging ? 'none' : undefined }"
    >
      <div :style="{ flex: showGraph ? `0 0 ${topHeightPct}%` : '1', overflow: 'hidden' }">
        <router-view />
      </div>

      <div
        v-if="showGraph"
        style="flex: 0 0 10px; cursor: ns-resize; display: flex; align-items: center; justify-content: center; background: rgb(var(--v-theme-surface)); touch-action: none;"
        @mousedown="onSeparatorMousedown"
        @touchstart.passive="onSeparatorTouchstart"
      >
        <div style="width: 32px; height: 3px; border-radius: 2px; background: currentColor; opacity: 0.3;" />
      </div>

      <div
        v-if="showGraph"
        :style="{ flex: `0 0 calc(${100 - topHeightPct}% - 10px)`, overflow: 'hidden', background: 'rgb(var(--v-theme-surface))' }"
      />
    </div>
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
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn @click="settingsOpen = false">Close</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts" setup>
  import { useTheme } from 'vuetify'
  import { useAppStore } from '@/stores/app'

  const appStore = useAppStore()

  const showGraph = ref(false)
  const settingsOpen = ref(false)
  const topHeightPct = ref(50)
  const isDragging = ref(false)
  const containerRef = ref<HTMLElement>()

  function updateTopHeight (clientY: number) {
    if (!containerRef.value) return
    const rect = containerRef.value.getBoundingClientRect()
    const pct = ((clientY - rect.top) / rect.height) * 100
    topHeightPct.value = Math.max(10, Math.min(90, pct))
  }

  function onSeparatorMousedown (e: MouseEvent) {
    isDragging.value = true
    e.preventDefault()

    const onMousemove = (ev: MouseEvent) => updateTopHeight(ev.clientY)
    const onMouseup = () => {
      isDragging.value = false
      document.removeEventListener('mousemove', onMousemove)
      document.removeEventListener('mouseup', onMouseup)
    }

    document.addEventListener('mousemove', onMousemove)
    document.addEventListener('mouseup', onMouseup)
  }

  function onSeparatorTouchstart (e: TouchEvent) {
    isDragging.value = true

    const onTouchmove = (ev: TouchEvent) => updateTopHeight(ev.touches[0].clientY)
    const onTouchend = () => {
      isDragging.value = false
      document.removeEventListener('touchmove', onTouchmove)
      document.removeEventListener('touchend', onTouchend)
    }

    document.addEventListener('touchmove', onTouchmove, { passive: true })
    document.addEventListener('touchend', onTouchend)
  }

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
</script>
