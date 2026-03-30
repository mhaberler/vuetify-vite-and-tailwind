import { Ion } from 'cesium'
import Cookies from 'js-cookie'
import { defineStore } from 'pinia'

const COOKIE_KEY = 'cesium_ion_token'
const COOKIE_EXPIRY_DAYS = 365

function getDefaultToken () {
  return import.meta.env.VITE_OPENDATA_ION_TOKEN as string
    || ''
}

export const useCesiumTokenStore = defineStore('cesiumToken', {
  state: () => ({
    token: Cookies.get(COOKIE_KEY) || getDefaultToken(),
  }),
  getters: {
    hasToken: state => !!state.token,
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
    async validateAndSetToken (token: string): Promise<boolean> {
      try {
        const res = await fetch('https://api.cesium.com/v1/me', {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        })
        if (res.ok) {
          this.setToken(token)
          return true
        }
        return false
      } catch {
        return false
      }
    },
    clearToken () {
      Cookies.remove(COOKIE_KEY)
      const fallback = getDefaultToken()
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
