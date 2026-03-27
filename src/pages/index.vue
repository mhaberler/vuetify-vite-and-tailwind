<template>
  <div v-show="appStore.is3D" style="width: 100%; height: 100%;">
    <CesiumViewer />
  </div>
  <div v-show="!appStore.is3D" style="width: 100%; height: 100%;">
    <LeafletViewer />
  </div>
</template>

<script lang="ts" setup>
  import CesiumViewer from '@/components/CesiumViewer.vue'
  import LeafletViewer from '@/components/LeafletViewer.vue'
  import { useAppStore } from '@/stores/app'

  const appStore = useAppStore()
</script>
