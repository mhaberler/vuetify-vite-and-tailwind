<template>
  <l-map
    ref="mapRef"
    :center="center"
    style="width: 100%; height: 100%;"
    :use-global-leaflet="false"
    :zoom="zoom"
  >
    <l-control-layers />
    <l-tile-layer
      v-for="(layer, key) in BASEMAPS"
      :key="key"
      :attribution="layer.attr"
      layer-type="base"
      :max-zoom="layer.maxZoom"
      :name="layer.name"
      :url="layer.url"
      :visible="key === 'osm'"
    />
  </l-map>
</template>

<script lang="ts" setup>
  import { LControlLayers, LMap, LTileLayer } from '@vue-leaflet/vue-leaflet'
  import { useAppStore } from '@/stores/app'
  import 'leaflet/dist/leaflet.css'

  const BASEMAPS = {
    osm: {
      name: 'OpenStreetMap', url: 'https://tile.openstreetmap.de/{z}/{x}/{y}.png',
      attr: '&copy; OpenStreetMap contributors', maxZoom: 19,
    },
    topo: {
      name: 'OpenTopoMap', url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
      attr: '&copy; OpenTopoMap contributors', maxZoom: 17,
    },
    austria: {
      name: 'Austria Map', url: 'https://mapsneu.wien.gv.at/basemap/geolandbasemap/normal/google3857/{z}/{y}/{x}.png',
      attr: '&copy; basemap.at', maxZoom: 20,
    },
    ortho: {
      name: 'Austria Orthophoto', url: 'https://mapsneu.wien.gv.at/basemap/bmaporthofoto30cm/normal/google3857/{z}/{y}/{x}.jpeg',
      attr: '&copy; basemap.at', maxZoom: 20,
    },
  }

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
