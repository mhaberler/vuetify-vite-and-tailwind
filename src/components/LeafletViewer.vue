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
    <l-tile-layer
      v-for="layer in overlays"
      :key="layer.key"
      :attribution="layer.attr"
      layer-type="overlay"
      :max-zoom="layer.maxZoom"
      :name="layer.name"
      :opacity="layer.opacity"
      :subdomains="layer.subdomains"
      :tile-size="layer.tileSize"
      :url="layer.url"
      :visible="layer.visible ?? false"
      :z-index="layer.zIndex"
    />
  </l-map>
</template>

<script lang="ts" setup>
  import type { SyncedViewState } from '@/stores/app'
  import type { Map as LeafletMap } from 'leaflet'
  import {
    LControlLayers,
    LLayerGroup,
    LMap,
    LTileLayer,
  } from '@vue-leaflet/vue-leaflet'
  import { useAppStore } from '@/stores/app'
  import 'leaflet/dist/leaflet.css'

  type TileLayerDefinition = {
    key: string
    name: string
    url: string
    attr: string
    maxZoom?: number
    opacity?: number
    subdomains?: string | string[]
    tileSize?: number
    visible?: boolean
    zIndex?: number
  }

  const skywaysOverlay: TileLayerDefinition = {
    key: 'skyways-all',
    name: 'Skyways',
    url: `https://thermal.kk7.ch/tiles/skyways_all/{z}/{x}/{-y}.png?src=mah.priv.at`,
    attr: 'Skyways &copy; <a href="https://thermal.kk7.ch/" target="_blank">thermal.kk7.ch</a>',
    maxZoom: 18,
    visible: false,
    zIndex: 3,
  }

  const openTopoBasemap: TileLayerDefinition = {
    key: 'topo',
    name: 'OpenTopoMap',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attr: '&copy; OpenTopoMap contributors',
    maxZoom: 17,
  }

  const openTopoFlightLayer: TileLayerDefinition = {
    ...openTopoBasemap,
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
    {
      key: 'ortho',
      name: 'Austria Orthophoto',
      url: 'https://mapsneu.wien.gv.at/basemap/bmaporthofoto30cm/normal/google3857/{z}/{y}/{x}.jpeg',
      attr: '&copy; basemap.at',
      maxZoom: 18,
    },
    openTopoBasemap,
  ]

  const overlays: TileLayerDefinition[] = [skywaysOverlay]

  const openflightmapsBasemap = {
    key: 'openflightmaps',
    name: 'OpenFlightMaps',
    layers: [openTopoFlightLayer, openFlightMapsLayer],
  }

  const appStore = useAppStore()
  const roughViewScale = 20_000_000
  const zoom = ref(2)
  const center = ref<[number, number]>([20, 0])
  const mapRef = ref<{ leafletObject?: LeafletMap } | null>(null)
  const lastAppliedSyncRevision = ref(0)

  function approximateCesiumHeightToZoom (height: number | null) {
    if (height == null) return 8

    const safeHeight = Math.max(height, 1)
    const rawZoom = Math.log2(roughViewScale / safeHeight)

    return Math.max(0, Math.min(18, Math.round(rawZoom)))
  }

  function captureLeafletViewState (): Omit<SyncedViewState, 'revision'> | null {
    const map = mapRef.value?.leafletObject
    if (!map) return null

    const mapCenter = map.getCenter()

    return {
      latitude: mapCenter.lat,
      longitude: mapCenter.lng,
      height: null,
      zoom: map.getZoom(),
      heading: null,
      pitch: null,
      roll: null,
      source: 'leaflet',
    }
  }

  function applySyncedView (view: SyncedViewState) {
    const map = mapRef.value?.leafletObject
    if (!map || view.source === 'leaflet') return

    const targetZoom = view.zoom ?? approximateCesiumHeightToZoom(view.height)
    map.setView([view.latitude, view.longitude], targetZoom, {
      animate: false,
    })
    center.value = [view.latitude, view.longitude]
    zoom.value = targetZoom
    lastAppliedSyncRevision.value = view.revision
  }

  watch(
    () => appStore.is3D,
    async is3D => {
      if (!is3D) {
        await nextTick()
        mapRef.value?.leafletObject?.invalidateSize()

        const view = appStore.syncedView
        if (!view || view.revision === lastAppliedSyncRevision.value) return

        applySyncedView(view)
      }
    },
  )

  watch(
    () => appStore.switchViewRequestId,
    requestId => {
      if (requestId === 0 || appStore.is3D || appStore.pendingMode !== true)
        return

      const view = captureLeafletViewState()
      if (view) {
        appStore.publishSyncedView(view)
      }
      appStore.completePendingModeToggle()
    },
  )
</script>
