// Utilities
import { defineStore } from 'pinia'

export const useAppStore = defineStore('app', {
  state: () => ({
    is3D: true,
    startupViewSaveRequestId: 0,
    startupViewSaveSuccessId: 0,
  }),
  actions: {
    requestStartupViewSave () {
      this.startupViewSaveRequestId += 1
    },
    acknowledgeStartupViewSave () {
      this.startupViewSaveSuccessId += 1
    },
  },
})
