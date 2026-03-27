import { storeToRefs } from 'pinia'
import { Ion } from 'cesium'
import { useCesiumTokenStore } from '@/stores/cesiumToken'

export function useCesiumToken () {
  const store = useCesiumTokenStore()
  const { token, hasToken, isCustomToken } = storeToRefs(store)

  watch(token, (newToken) => {
    Ion.defaultAccessToken = newToken
  }, { immediate: true })

  return {
    token,
    hasToken,
    isCustomToken,
    setToken: store.setToken,
    clearToken: store.clearToken,
    initializeCesium: store.initializeCesium,
  }
}
