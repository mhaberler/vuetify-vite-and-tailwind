<template>
  <l-map
    ref="mapRef"
    :center="center"
    style="width: 100%; height: 100%;"
    :use-global-leaflet="false"
    :zoom="zoom"
  >
    <l-tile-layer
      attribution="&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors"
      layer-type="base"
      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
    />
  </l-map>
</template>

<script lang="ts" setup>
  import { LMap, LTileLayer } from '@vue-leaflet/vue-leaflet'
  import { useAppStore } from '@/stores/app'
  import 'leaflet/dist/leaflet.css'

  const appStore = useAppStore()
  const zoom = ref(2)
  const center = ref<[number, number]>([20, 0])
  const mapRef = ref()

  watch(() => appStore.is3D, async is3D => {
    if (!is3D) {
      await nextTick()
      mapRef.value?.leafletObject?.invalidateSize()
    }
  })
</script>
