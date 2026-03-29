import { defineStore } from 'pinia'

const LS_KEY = 'app_settings'

function loadSettings () {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) ?? '{}')
  } catch {
    return {}
  }
}

export const useSettingsStore = defineStore('settings', {
  state: () => ({
    bingMapsKey: '' as string,
    showZoom: true as boolean,
    showNorth: true as boolean,
    showCompass: true as boolean,
    showZoomControl: true as boolean,
    show3DBuildings: false as boolean,
    ...loadSettings(),
  }),
  actions: {
    save () {
      localStorage.setItem(LS_KEY, JSON.stringify({
        bingMapsKey: this.bingMapsKey,
        showZoom: this.showZoom,
        showNorth: this.showNorth,
        showCompass: this.showCompass,
        showZoomControl: this.showZoomControl,
        show3DBuildings: this.show3DBuildings,
      }))
    },
  },
})
