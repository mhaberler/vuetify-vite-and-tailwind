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
      <v-btn icon="mdi-fullscreen" variant="text" @click="toggleFullscreen" />
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

  <v-main style="height: calc(100vh - 16px);">
    <Splitpanes horizontal style="height: 100%;">
      <Pane>
        <router-view />
      </Pane>
      <Pane v-if="showGraph" min-size="10" :size="50" style="background: rgb(var(--v-theme-surface));" />
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
  import { useAppStore } from '@/stores/app'
  import 'splitpanes/dist/splitpanes.css'

  const appStore = useAppStore()

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
