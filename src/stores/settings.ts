import { defineStore } from 'pinia'

const LS_KEY = 'app_settings'

type PersistedSettings = {
  retainImagery?: boolean
  retainStartupView?: boolean
  startupImageryIndex?: number | null
  startupTerrainIndex?: number | null
  startupLongitude?: number | null
  startupLatitude?: number | null
  startupHeight?: number | null
  startupHeading?: number | null
  startupPitch?: number | null
  startupRoll?: number | null
}

function loadSettings () {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) ?? '{}') as PersistedSettings
  } catch {
    return {}
  }
}

export const useSettingsStore = defineStore('settings', {
  state: () => ({
    retainImagery: false as boolean,
    retainStartupView: false as boolean,
    startupImageryIndex: null as number | null,
    startupTerrainIndex: null as number | null,
    startupLongitude: null as number | null,
    startupLatitude: null as number | null,
    startupHeight: null as number | null,
    startupHeading: null as number | null,
    startupPitch: null as number | null,
    startupRoll: null as number | null,
    ...loadSettings(),
  }),
  actions: {
    clearRetainedImagery () {
      this.startupImageryIndex = null
      this.startupTerrainIndex = null
    },
    clearRetainedStartupView () {
      this.startupLongitude = null
      this.startupLatitude = null
      this.startupHeight = null
      this.startupHeading = null
      this.startupPitch = null
      this.startupRoll = null
    },
    save () {
      localStorage.setItem(LS_KEY, JSON.stringify({
        retainImagery: this.retainImagery,
        retainStartupView: this.retainStartupView,
        startupImageryIndex: this.startupImageryIndex,
        startupTerrainIndex: this.startupTerrainIndex,
        startupLongitude: this.startupLongitude,
        startupLatitude: this.startupLatitude,
        startupHeight: this.startupHeight,
        startupHeading: this.startupHeading,
        startupPitch: this.startupPitch,
        startupRoll: this.startupRoll,
      }))
    },
  },
})
