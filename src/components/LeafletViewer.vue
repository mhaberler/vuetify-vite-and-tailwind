<template>
  <l-map
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
  import 'leaflet/dist/leaflet.css'

  const zoom = ref(2)
  const center = ref<[number, number]>([20, 0])
</script>
