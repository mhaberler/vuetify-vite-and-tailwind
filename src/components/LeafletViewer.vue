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
      :opacity="layer.opacity"
      :subdomains="layer.subdomains"
      :tile-size="layer.tileSize"
      :url="layer.url"
      :visible="layer.key === 'osm'"
      :z-index="layer.zIndex"
    />
    <l-layer-group
      layer-type="base"
      :name="openflightmapsBasemap.name"
      :visible="false"
    >
      <l-tile-layer
        v-for="layer in openflightmapsBasemap.layers"
        :key="layer.key"
        :attribution="layer.attr"
        :max-zoom="layer.maxZoom"
        :opacity="layer.opacity"
        :subdomains="layer.subdomains"
        :tile-size="layer.tileSize"
        :url="layer.url"
        :z-index="layer.zIndex"
      />
    </l-layer-group>
  </l-map>
</template>

<script lang="ts" setup>
  import { LControlLayers, LLayerGroup, LMap, LTileLayer } from '@vue-leaflet/vue-leaflet'
  import { useAppStore } from '@/stores/app'
  import 'leaflet/dist/leaflet.css'

  const openAipApiKey = import.meta.env.VITE_OPENAIP_API_KEY?.trim()

  type TileLayerDefinition = {
    key: string
    name: string
    url: string
    attr: string
    maxZoom?: number
    opacity?: number
    subdomains?: string | string[]
    tileSize?: number
    zIndex?: number
  }

  const openTopoLayer: TileLayerDefinition = {
    key: 'topo',
    name: 'OpenTopoMap',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attr: '&copy; OpenTopoMap contributors',
    maxZoom: 17,
    opacity: 0.4,
  }

  const openFlightMapsLayer: TileLayerDefinition = {
    key: 'openflightmaps-overlay',
    name: 'OpenFlightMaps',
    url: 'https://nwy-tiles-api.prod.newaydata.com/tiles/{z}/{x}/{y}.png?path=latest/aero/latest',
    attr: '(c) <a href="https://openflightmaps.org/" target="_blank">Open Flightmaps association</a>, (c) OpenStreetMap contributors, NASA elevation data',
    maxZoom: 19,
    opacity: 0.9,
    zIndex: 2,
  }

  const basemaps: TileLayerDefinition[] = [
    {
      key: 'osm',
      name: 'OpenStreetMap',
      url: 'https://tile.openstreetmap.de/{z}/{x}/{y}.png',
      attr: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
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

  const openflightmapsBasemap = {
    key: 'openflightmaps',
    name: 'openflightmaps',
    layers: [openTopoLayer, openFlightMapsLayer],
  }

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
