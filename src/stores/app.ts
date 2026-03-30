// Utilities
import { defineStore } from 'pinia'

export type ViewerMode = 'cesium' | 'leaflet'

export type SyncedViewState = {
  latitude: number
  longitude: number
  height: number | null
  zoom: number | null
  heading: number | null
  pitch: number | null
  roll: number | null
  source: ViewerMode
  revision: number
}

export const useAppStore = defineStore('app', {
  state: () => ({
    is3D: true,
    startupViewSaveRequestId: 0,
    startupViewSaveSuccessId: 0,
    switchViewRequestId: 0,
    pendingMode: null as boolean | null,
    syncedView: null as SyncedViewState | null,
    syncedViewRevision: 0,
  }),
  actions: {
    requestStartupViewSave () {
      this.startupViewSaveRequestId += 1
    },
    acknowledgeStartupViewSave () {
      this.startupViewSaveSuccessId += 1
    },
    requestModeToggle () {
      if (this.pendingMode != null) {
        return
      }

      this.pendingMode = !this.is3D
      this.switchViewRequestId += 1
    },
    publishSyncedView (
      view: Omit<SyncedViewState, 'revision'>,
    ) {
      this.syncedViewRevision += 1
      this.syncedView = {
        ...view,
        revision: this.syncedViewRevision,
      }
    },
    completePendingModeToggle () {
      if (this.pendingMode == null) {
        return
      }

      this.is3D = this.pendingMode
      this.pendingMode = null
    },
  },
})
