<template>
  <v-app-bar :collapse="false" flat title="Flight Review">
    <template #append>
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
      :style="{ userSelect: isDragging ? 'none' : undefined }"
      style="display: flex; flex-direction: column; height: 100%;"
    >
      <div :style="{ flex: showGraph ? `0 0 ${topHeightPct}%` : '1', overflow: 'hidden' }">
        <router-view />
      </div>

      <div
        v-if="showGraph"
        style="flex: 0 0 5px; cursor: ns-resize; display: flex; align-items: center; justify-content: center; background: rgb(var(--v-theme-surface));"
        @mousedown="onSeparatorMousedown"
      >
        <div style="width: 32px; height: 3px; border-radius: 2px; background: currentColor; opacity: 0.3;" />
      </div>

      <div
        v-if="showGraph"
        :style="{ flex: `0 0 calc(${100 - topHeightPct}% - 5px)`, overflow: 'hidden', background: 'rgb(var(--v-theme-surface))' }"
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
          :min="1"
          :max="20"
          :step="1"
          thumb-label
          hide-details
          class="mb-4"
        />
        <v-select
          v-model="settings.imagerySource"
          :items="imagerySources"
          label="Imagery source"
          hide-details
          class="mb-4"
        />
        <v-switch
          v-model="darkMode"
          label="Dark mode"
          hide-details
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

  const showGraph = ref(false)
  const settingsOpen = ref(false)
  const topHeightPct = ref(50)
  const isDragging = ref(false)
  const containerRef = ref<HTMLElement>()

  function onSeparatorMousedown (e: MouseEvent) {
    isDragging.value = true
    e.preventDefault()

    const onMousemove = (ev: MouseEvent) => {
      if (!containerRef.value) return
      const rect = containerRef.value.getBoundingClientRect()
      const pct = ((ev.clientY - rect.top) / rect.height) * 100
      topHeightPct.value = Math.max(10, Math.min(90, pct))
    }

    const onMouseup = () => {
      isDragging.value = false
      document.removeEventListener('mousemove', onMousemove)
      document.removeEventListener('mouseup', onMouseup)
    }

    document.addEventListener('mousemove', onMousemove)
    document.addEventListener('mouseup', onMouseup)
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
    set: (val: boolean) => { theme.global.name.value = val ? 'dark' : 'light' },
  })
</script>
