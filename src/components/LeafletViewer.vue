<template>
  <l-map
    style="width: 100%; height: 100%;"
    :center="center"
    :zoom="zoom"
    :use-global-leaflet="false"
  >
    <l-tile-layer
      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      attribution="&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors"
      layer-type="base"
    />
  </l-map>
</template>

<script lang="ts" setup>
  import 'leaflet/dist/leaflet.css'
  import { LMap, LTileLayer } from '@vue-leaflet/vue-leaflet'

  const zoom = ref(2)
  const center = ref<[number, number]>([20, 0])
</script>
