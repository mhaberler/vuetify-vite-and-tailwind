<template>
  <l-map
    ref="mapRef"
    :center="center"
    style="width: 100%; height: 100%"
    :use-global-leaflet="false"
    :zoom="zoom"
  >
    <l-control-layers />
    <l-tile-layer
      v-for="layer in basemaps"
      :key="layer.key"
      :attribution="layer.attr"
      layer-type="base"
      :max-zoom="layer.maxZoom"
      :name="layer.name"
      :subdomains="layer.subdomains"
      :url="layer.url"
      :visible="layer.key === 'osm'"
    />
  </l-map>
</template>

<script lang="ts" setup>
  import { LControlLayers, LMap, LTileLayer } from '@vue-leaflet/vue-leaflet'
  import { useAppStore } from '@/stores/app'
  import 'leaflet/dist/leaflet.css'

  const openAipApiKey = import.meta.env.VITE_OPENAIP_API_KEY?.trim()

  type BasemapLayer = {
    key: string
    name: string
    url: string
    attr: string
    maxZoom?: number
    subdomains?: string
  }

  const basemaps: BasemapLayer[] = [
    {
      key: 'osm',
      name: 'OpenStreetMap',
      url: 'https://tile.openstreetmap.de/{z}/{x}/{y}.png',
      attr: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    },
    {
      key: 'topo',
      name: 'OpenTopoMap',
      url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
      attr: '&copy; OpenTopoMap contributors',
      maxZoom: 17,
    },
    ...(openAipApiKey
      ? [
        {
          key: 'openaip',
          name: 'OpenAIP',
          url: `https://{s}.api.tiles.openaip.net/api/data/openaip/{z}/{x}/{y}.png?apiKey=${encodeURIComponent(openAipApiKey)}`,
          attr: '&copy; <a href="https://www.openaip.net" target="_blank">OpenAIP</a> (CC BY-NC 4.0)',
          subdomains: 'abc',
        },
      ]
      : []),
    {
      key: 'ortho',
      name: 'Austria Orthophoto',
      url: 'https://mapsneu.wien.gv.at/basemap/bmaporthofoto30cm/normal/google3857/{z}/{y}/{x}.jpeg',
      attr: '&copy; basemap.at',
      maxZoom: 18,
    },
  ]

  const appStore = useAppStore()
  const zoom = ref(2)
  const center = ref<[number, number]>([20, 0])
  const mapRef = ref()

  watch(
    () => appStore.is3D,
    async is3D => {
      if (!is3D) {
        await nextTick()
        mapRef.value?.leafletObject?.invalidateSize()
      }
    },
  )
</script>
