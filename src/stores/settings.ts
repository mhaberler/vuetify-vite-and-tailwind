import { defineStore } from 'pinia'

const LS_KEY = 'app_settings'

function loadSettings () {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) ?? '{}')
  } catch { return {} }
}

export const useSettingsStore = defineStore('settings', {
  state: () => ({
    useCustomLayerSwitcher: false as boolean,
    bingMapsKey: '' as string,
    ...loadSettings(),
  }),
  actions: {
    save () {
      localStorage.setItem(LS_KEY, JSON.stringify({
        useCustomLayerSwitcher: this.useCustomLayerSwitcher,
        bingMapsKey: this.bingMapsKey,
      }))
    },
  },
})
