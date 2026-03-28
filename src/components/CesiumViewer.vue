<script setup lang="ts">
  import type { VcReadyObject } from 'vue-cesium/es/utils/types'
  import { MartiniTerrainProvider, WorkerFarmTerrainDecoder } from '@macrostrat/cesium-martini'
  import * as Cesium from 'cesium'
  import enUS from 'vue-cesium/es/locale/lang/en-us'
  // import { CesiumBridge } from 'cesium-mcp-bridge'
  import { useCesiumToken } from '@/composables/useCesiumToken'
  import { PMTilesHeightmapResource } from '../resources/pmtiles-resource'
  import NorthArrow from './NorthArrow.vue'

  const { token: accessToken } = useCesiumToken()
  const viewerRef = shallowRef<Cesium.Viewer | null>(null)
  // let ws: WebSocket

  function onViewerReady ({ viewer }: VcReadyObject) {
    // const bridge = new CesiumBridge(viewer)

    // Tune camera controller for better touch/trackpad interaction
    const controller = viewer.scene.screenSpaceCameraController
    controller.enableTilt = true
    controller.enableLook = true
    controller.inertiaSpin = 0.1
    controller.inertiaTranslate = 0.1

    viewerRef.value = viewer

    if (viewer.baseLayerPicker) {
      viewer.baseLayerPicker.viewModel.imageryProviderViewModels.push(
        new Cesium.ProviderViewModel({
          name: 'VersaTiles Satellite',
          tooltip: 'Copernicus Sentinel-2 satellite imagery via VersaTiles (free, no auth)',
          iconUrl: '/versatiles-logo.png',
          creationFunction: () => new Cesium.UrlTemplateImageryProvider({
            url: 'https://tiles.versatiles.org/tiles/satellite/{z}/{x}/{y}',
            maximumLevel: 12,
            credit: new Cesium.Credit('Copernicus Sentinel-2 via VersaTiles', true),
          }),
        }),
        new Cesium.ProviderViewModel({
          name: 'Austria Basemap',
          iconUrl: 'https://www.geoland.at/assets/images/IndexGrid/basemap_hover_en.png',
          tooltip: 'Austrian OGD Basemap.\nhttps://www.basemap.at/index_en.html',
          creationFunction () {
            return new Cesium.WebMapTileServiceImageryProvider({
              url: 'https://mapsneu.wien.gv.at/basemap/bmaporthofoto30cm/{Style}/{TileMatrixSet}/{TileMatrix}/{TileRow}/{TileCol}.jpeg',
              layer: 'bmaporthofoto30cm',
              style: 'normal',
              format: 'image/jpeg',
              tileMatrixSetID: 'google3857',
              subdomains: '1234',
              maximumLevel: 19,
              rectangle: Cesium.Rectangle.fromDegrees(8.782_379, 46.358_77, 17.5, 49.037_872),
              credit: new Cesium.Credit(
                '<a href="https://www.basemap.at/" target="_blank">Datenquelle: basemap.at</a>',
                true,
              ),
            })
          },
        }))

      const terrariumWorker = new Worker(
        new URL('terrarium.worker.ts', import.meta.url),
        { type: 'module' },
      )

      // Mapterhorn Terrarium-encoded elevation tiles via PMTiles
      const terrainResource = new PMTilesHeightmapResource({
        url: 'https://download.mapterhorn.com/planet.pmtiles',
        tileSize: 512,
        maxZoom: 12,
      })

      // Terrarium format uses a different encoding scheme to Mapbox Terrain-RGB
      // @ts-ignore
      const terrainDecoder = new WorkerFarmTerrainDecoder({
        worker: terrariumWorker,
      })

      // Construct terrain provider with Mapterhorn PMTiles datasource and Terrarium RGB decoding
      // @ts-ignore
      const terrainProvider = new MartiniTerrainProvider({
        resource: terrainResource,
        decoder: terrainDecoder,
      })

      viewer.baseLayerPicker.viewModel.terrainProviderViewModels.push(new Cesium.ProviderViewModel({
        name: 'Mapterhorn Terrarium',
        tooltip: 'Mapterhorn global elevation dataset encoded in Terrarium format via PMTiles (free, no auth)',
        iconUrl: '/mapterhorn-icon.png',
        creationFunction: () => terrainProvider,
      }))
    }

  // ws = new WebSocket('ws://localhost:9100?session=default')
  // ws.addEventListener('message', async event => {
  //   const { id, method, params } = JSON.parse(event.data)
  //   const result = await bridge.execute({ action: method, params })
  //   ws.send(JSON.stringify({ id, result }))
  // })
  }
</script>

<template>
  <div style="position: relative; width: 100%; height: 100%;">
    <vc-config-provider :locale="enUS">

      <vc-viewer
        :access-token="accessToken"
        :animation="true"
        :base-layer-picker="true"
        style="width: 100%; height: 100%;"
        :timeline="true"
        @ready="onViewerReady"
      />
      <NorthArrow v-if="viewerRef" :viewer="viewerRef" />
    </vc-config-provider>

  </div>
</template>
