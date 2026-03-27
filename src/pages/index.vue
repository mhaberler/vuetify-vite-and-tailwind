<template>
  <CesiumViewer v-if="appStore.is3D" />
  <LeafletViewer v-else />
</template>

<script lang="ts" setup>
  import LeafletViewer from '@/components/LeafletViewer.vue'
  import { useAppStore } from '@/stores/app'

  const appStore = useAppStore()
</script>
