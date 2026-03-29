<script setup lang="ts">
  import type { VcReadyObject } from 'vue-cesium/es/utils/types'
  import { MartiniTerrainProvider, WorkerFarmTerrainDecoder } from '@macrostrat/cesium-martini'
  import * as Cesium from 'cesium'
  import enUS from 'vue-cesium/es/locale/lang/en-us'
  import { useCesiumToken } from '@/composables/useCesiumToken'
  import { PMTilesHeightmapResource } from '../resources/pmtiles-resource'
  import NorthArrow from './NorthArrow.vue'

  const { token: accessToken, hasToken } = useCesiumToken()
  const viewerRef = shallowRef<Cesium.Viewer | null>(null)

  // Hoist Mapterhorn construction to setup scope so it can be passed as a prop.
  // markRaw prevents Vue from proxying the Cesium object.
  const terrariumWorker = new Worker(
    new URL('terrarium.worker.ts', import.meta.url),
    { type: 'module' },
  )
  const terrainResource = new PMTilesHeightmapResource({
    url: 'https://download.mapterhorn.com/planet.pmtiles',
    tileSize: 512,
    maxZoom: 12,
  })

  const terrainDecoder = new WorkerFarmTerrainDecoder({ worker: terrariumWorker })
  const martiniTerrainProvider = markRaw(new MartiniTerrainProvider({
    resource: terrainResource,
    decoder: terrainDecoder,
  }))

  onUnmounted(() => terrariumWorker.terminate())

  function onViewerReady ({ viewer }: VcReadyObject) {
    const controller = viewer.scene.screenSpaceCameraController
    controller.enableTilt = true
    controller.enableLook = true
    controller.inertiaSpin = 0.1
    controller.inertiaTranslate = 0.1

    viewerRef.value = viewer

    const vm = viewer.baseLayerPicker.viewModel

    const imageryModels = [
      new Cesium.ProviderViewModel({
        name: 'VersaTiles Satellite',
        tooltip: 'Global Sentinel-2 imagery (No stretching)',
        iconUrl: '/versatiles-logo.png',
        creationFunction: () => new Cesium.UrlTemplateImageryProvider({
          url: 'https://tiles.versatiles.org/tiles/satellite/{z}/{x}/{y}',
          maximumLevel: 12,
          tilingScheme: new Cesium.WebMercatorTilingScheme(),
          credit: new Cesium.Credit('Copernicus Sentinel-2 via VersaTiles', true),
        }),
      }),
      new Cesium.ProviderViewModel({
        name: 'France IGN Orthophoto',
        tooltip: 'IGN BD ORTHO — 20 cm',
        iconUrl: 'https://www.ign.fr/publications-de-l-ign/institut/kiosque/kit-communication/cartes-ign/logo-cartes-ign-couleurs.png',
        creationFunction: () => new Cesium.WebMapTileServiceImageryProvider({
          url: 'https://data.geopf.fr/wmts',
          layer: 'ORTHOIMAGERY.ORTHOPHOTOS',
          style: 'normal',
          format: 'image/jpeg',
          tileMatrixSetID: 'PM',
          maximumLevel: 19,
          tilingScheme: new Cesium.WebMercatorTilingScheme(),
          rectangle: Cesium.Rectangle.fromDegrees(-5.5, 41.3, 9.6, 51.1),
          credit: new Cesium.Credit('© <a href="https://geopf.fr" target="_blank">IGN France</a>', true),
        }),
      }),
      new Cesium.ProviderViewModel({
        name: 'Karte Tirol Orthofoto',
        tooltip: 'Tirol Orthophoto',
        iconUrl: 'https://www.tirol.gv.at/favicon.ico',
        creationFunction: () => new Cesium.UrlTemplateImageryProvider({
          url: 'https://wmts.kartetirol.at/wmts/gdi_ortho/{z}/{x}/{y}.png',
          tilingScheme: new Cesium.WebMercatorTilingScheme(),
          maximumLevel: 18,
        }),
      }),
      new Cesium.ProviderViewModel({
        name: 'SWISSIMAGE',
        tooltip: 'swisstopo SWISSIMAGE (10 cm / 25 cm)',
        iconUrl: 'https://www.swisstopo.admin.ch/favicon.ico',
        creationFunction: () => new Cesium.WebMapTileServiceImageryProvider({
          url: 'https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.swissimage/default/current/3857/{TileMatrix}/{TileCol}/{TileRow}.jpeg',
          layer: 'ch.swisstopo.swissimage',
          style: 'default',
          format: 'image/jpeg',
          tileMatrixSetID: '3857',
          maximumLevel: 20,
          tilingScheme: new Cesium.WebMercatorTilingScheme(),
          credit: new Cesium.Credit('© swisstopo', true),
        }),
      }),
      new Cesium.ProviderViewModel({
        name: 'Austria Basemap',
        iconUrl: 'https://www.geoland.at/assets/images/IndexGrid/basemap_hover_en.png',
        tooltip: 'Austrian OGD Basemap Ortho',
        creationFunction: () => new Cesium.WebMapTileServiceImageryProvider({
          url: 'https://mapsneu.wien.gv.at/basemap/bmaporthofoto30cm/normal/google3857/{TileMatrix}/{TileRow}/{TileCol}.jpeg',
          layer: 'bmaporthofoto30cm',
          style: 'normal',
          format: 'image/jpeg',
          tileMatrixSetID: 'google3857',
          maximumLevel: 19,
          tilingScheme: new Cesium.WebMercatorTilingScheme(),
          rectangle: Cesium.Rectangle.fromDegrees(8.78, 46.35, 17.5, 49.03),
          credit: new Cesium.Credit('© basemap.at', true),
        }),
      }),
    ]

    const terrainModels = [
      new Cesium.ProviderViewModel({
        name: 'swisstopo Terrain',
        tooltip: 'High-precision Swiss terrain from swisstopo (Quantized Mesh, vertex normals)',
        iconUrl: 'https://www.swisstopo.admin.ch/favicon.ico',
        creationFunction: () => Cesium.CesiumTerrainProvider.fromUrl(
          'https://3d.geo.admin.ch/ch.swisstopo.terrain.3d/v1/',
          { requestVertexNormals: true },
        ),
      }),
      new Cesium.ProviderViewModel({
        name: 'Mapterhorn Terrarium',
        tooltip: 'Mapterhorn global elevation dataset encoded in Terrarium format via PMTiles (free, no auth)',
        iconUrl: '/mapterhorn-icon.png',
        creationFunction: () => martiniTerrainProvider,
      }),
    ]

    if (hasToken.value) {
      // Valid Ion token — append custom providers alongside Ion defaults
      vm.imageryProviderViewModels.push(...imageryModels)
      vm.terrainProviderViewModels.push(...terrainModels)
    } else {
      // No Ion token — replace defaults entirely with custom providers
      vm.imageryProviderViewModels = imageryModels
      vm.terrainProviderViewModels = terrainModels
      vm.selectedImagery = vm.imageryProviderViewModels[0]
      vm.selectedTerrain = vm.terrainProviderViewModels[1]
    }
  }
</script>

<template>
  <div style="position: relative; width: 100%; height: 100%;">
    <vc-config-provider :locale="enUS">
      <vc-viewer
        :access-token="accessToken"
        :animation="true"
        base-layer-picker
        style="width: 100%; height: 100%;"
        :timeline="true"
        @ready="onViewerReady"
      />
      <NorthArrow v-if="viewerRef" :viewer="viewerRef" />
    </vc-config-provider>
  </div>
</template>
