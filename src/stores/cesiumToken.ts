import { defineStore } from 'pinia'
import Cookies from 'js-cookie'
import { Ion } from 'cesium'

const COOKIE_KEY = 'cesium_ion_token'
const COOKIE_EXPIRY_DAYS = 365

export const useCesiumTokenStore = defineStore('cesiumToken', {
  state: () => ({
    token: Cookies.get(COOKIE_KEY) || import.meta.env.VITE_CESIUM_ION_TOKEN as string || '',
  }),
  getters: {
    hasToken: (state) => !!state.token,
    isCustomToken: () => !!Cookies.get(COOKIE_KEY),
  },
  actions: {
    setToken (token: string) {
      this.token = token
      Cookies.set(COOKIE_KEY, token, {
        expires: COOKIE_EXPIRY_DAYS,
        sameSite: 'Strict',
        secure: window.location.protocol === 'https:',
      })
      Ion.defaultAccessToken = token
    },
    clearToken () {
      Cookies.remove(COOKIE_KEY)
      const fallback = import.meta.env.VITE_CESIUM_ION_TOKEN as string || ''
      this.token = fallback
      Ion.defaultAccessToken = fallback
    },
    initializeCesium () {
      if (this.token) {
        Ion.defaultAccessToken = this.token
      }
    },
  },
})
