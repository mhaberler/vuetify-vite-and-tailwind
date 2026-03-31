<template>
  <l-map
    ref="mapRef"
    :center="center"
    style="width: 100%; height: 100%"
    :use-global-leaflet="false"
    :zoom="zoom"
  >
    <l-control-layers />
    <div
      v-if="overlayWarning"
      class="leaflet-overlay-warning"
    >
      {{ overlayWarning }}
    </div>
    <l-tile-layer
      v-for="layer in basemaps"
      :key="layer.key"
      :attribution="layer.attr"
      layer-type="base"
      :max-native-zoom="layer.maxNativeZoom"
      :max-zoom="layer.maxZoom"
      :min-zoom="layer.minZoom"
      :name="layer.name"
      :opacity="layer.opacity"
      :subdomains="layer.subdomains"
      :tile-size="layer.tileSize"
      :tms="layer.tms"
      :url="layer.url"
      :visible="layer.key === 'osm'"
      :z-index="layer.zIndex"
    />
    <l-tile-layer
      v-for="layer in overlays"
      :key="layer.key"
      :attribution="layer.attr"
      layer-type="overlay"
      :max-native-zoom="layer.maxNativeZoom"
      :max-zoom="layer.maxZoom"
      :min-zoom="layer.minZoom"
      :name="layer.name"
      :opacity="layer.opacity"
      :subdomains="layer.subdomains"
      :tile-size="layer.tileSize"
      :tms="layer.tms"
      :url="layer.url"
      :visible="layer.visible ?? false"
      :z-index="layer.zIndex"
      @tileerror="handleOverlayTileError(layer)"
      @tileload="handleOverlayTileLoad(layer)"
    />
  </l-map>
</template>

<script lang="ts" setup>
  import type { SyncedViewState } from '@/stores/app'
  import type { Map as LeafletMap } from 'leaflet'
  import {
    LControlLayers,
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
    minZoom?: number
    maxNativeZoom?: number
    maxZoom?: number
    opacity?: number
    subdomains?: string | string[]
    tileSize?: number
    tms?: boolean
    visible?: boolean
    zIndex?: number
  }

  const openAipToken = import.meta.env.VITE_OPENAIP_TOKEN?.trim() ?? ''
  const hasOpenAipToken = openAipToken.length > 0

  const skywaysOverlay: TileLayerDefinition = {
    key: 'skyways-all',
    name: 'Skyways',
    url: `https://thermal.kk7.ch/tiles/skyways_all_all/{z}/{x}/{y}.png?src=mah.priv.at`,
    attr: 'thermal.kk7.ch <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/" target="_blank">CC-BY-NC-SA</a>',
    maxNativeZoom: 13,
    maxZoom: 18,
    tms: true,
    visible: false,
    zIndex: 3,
  }

  const thermalsOverlay: TileLayerDefinition = {
    key: 'thermals-jul-07',
    name: 'Thermals Jul 07',
    url: `https://thermal.kk7.ch/tiles/thermals_jul_07/{z}/{x}/{y}.png?src=mah.priv.at`,
    attr: 'thermal.kk7.ch <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/" target="_blank">CC-BY-NC-SA</a>',
    maxNativeZoom: 12,
    maxZoom: 18,
    tms: true,
    visible: false,
    zIndex: 4,
  }

  const openTopoBasemap: TileLayerDefinition = {
    key: 'topo',
    name: 'OpenTopoMap',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attr: '&copy; OpenTopoMap contributors',
    maxZoom: 17,
  }

  const openFlightMapsLayer: TileLayerDefinition = {
    key: 'openflightmaps-overlay',
    name: 'OpenFlightMaps',
    url: 'https://nwy-tiles-api.prod.newaydata.com/tiles/{z}/{x}/{y}.png?path=latest/aero/latest',
    attr: '(c) <a href="https://openflightmaps.org/" target="_blank">Open Flightmaps association</a>, (c) OpenStreetMap contributors, NASA elevation data',
    maxZoom: 16,
    opacity: 0.9,
    zIndex: 2,
  }

  const openAipLayer: TileLayerDefinition | null = hasOpenAipToken
    ? {
      key: 'openaip-overlay',
      name: 'openAIP',
      url: `https://{s}.api.tiles.openaip.net/api/data/openaip/{z}/{x}/{y}.png?apiKey=${openAipToken}`,
      attr: '&copy; <a href="https://www.openaip.net/" target="_blank">openAIP</a>',
      minZoom: 4,
      maxZoom: 14,
      opacity: 0.9,
    }
    : null

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

  const overlays: TileLayerDefinition[] = [
    openFlightMapsLayer,
    ...(openAipLayer ? [openAipLayer] : []),
    skywaysOverlay,
    thermalsOverlay,
  ]

  const appStore = useAppStore()
  const roughViewScale = 20_000_000
  const zoom = ref(2)
  const center = ref<[number, number]>([20, 0])
  const mapRef = ref<{ leafletObject?: LeafletMap } | null>(null)
  const lastAppliedSyncRevision = ref(0)
  const overlayLoadFailures = reactive<Record<string, boolean>>({})
  const overlayWarning = computed(() => {
    const failingNames = overlays
      .filter(layer => overlayLoadFailures[layer.key] === true)
      .map(layer => layer.name)

    if (failingNames.length === 0) return null

    return `${failingNames.join(', ')} tiles failed to load. Check overlay access, network reachability, or configured API credentials.`
  })

  function handleOverlayTileError (layer: TileLayerDefinition) {
    overlayLoadFailures[layer.key] = true
  }

  function handleOverlayTileLoad (layer: TileLayerDefinition) {
    overlayLoadFailures[layer.key] = false
  }

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

<style scoped>
  .leaflet-overlay-warning {
    position: absolute;
    top: 48px;
    left: 48px;
    z-index: 1000;
    max-width: min(28rem, calc(100% - 96px));
    padding: 0.625rem 0.875rem;
    border: 1px solid rgba(145, 92, 0, 0.35);
    border-radius: 0.5rem;
    background: rgba(255, 244, 214, 0.95);
    color: rgb(94, 58, 0);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.16);
    font-size: 0.875rem;
    line-height: 1.4;
    pointer-events: none;
  }
</style>
