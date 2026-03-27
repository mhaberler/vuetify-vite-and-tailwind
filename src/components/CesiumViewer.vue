<script setup lang="ts">
  import type { VcReadyObject } from 'vue-cesium/es/utils/types'
  import { MartiniTerrainProvider, WorkerFarmTerrainDecoder } from '@macrostrat/cesium-martini'
  import * as Cesium from 'cesium'
  // import { CesiumBridge } from 'cesium-mcp-bridge'

  import { PMTilesHeightmapResource } from '../resources/pmtiles-resource'

  const accessToken = import.meta.env.VITE_CESIUM_ION_TOKEN as string
  // let ws: WebSocket

  function onViewerReady ({ viewer }: VcReadyObject) {
    // const bridge = new CesiumBridge(viewer)

    if (viewer.baseLayerPicker) {
      const versatiles = new Cesium.ProviderViewModel({
        name: 'VersaTiles Satellite',
        tooltip: 'Copernicus Sentinel-2 satellite imagery via VersaTiles (free, no auth)',
        iconUrl: '/versatiles-logo.png',
        creationFunction: () => new Cesium.UrlTemplateImageryProvider({
          url: 'https://tiles.versatiles.org/tiles/satellite/{z}/{x}/{y}',
          maximumLevel: 12,
          credit: new Cesium.Credit('Copernicus Sentinel-2 via VersaTiles', true),
        }),
      })
      viewer.baseLayerPicker.viewModel.imageryProviderViewModels.push(versatiles)

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

      // viewer.baseLayerPicker.viewModel.imageryProviderViewModels.push(versatiles)
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
  <vc-viewer
    :access-token="accessToken"
    :animation="false"
    :base-layer-picker="true"
    style="width: 100%; height: 100%;"
    :timeline="false"
    @ready="onViewerReady"
  />
</template>
