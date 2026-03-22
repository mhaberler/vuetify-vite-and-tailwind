<script setup lang="ts">
  import type { VcReadyObject } from 'vue-cesium/es/utils/types'
  import { CesiumBridge } from 'cesium-mcp-bridge'

  const accessToken = import.meta.env.VITE_CESIUM_ION_TOKEN as string
  let ws: WebSocket

  function onViewerReady ({ viewer }: VcReadyObject) {
    const bridge = new CesiumBridge(viewer)

    ws = new WebSocket('ws://localhost:9100?session=default')
    ws.addEventListener('message', async event => {
      const { id, method, params } = JSON.parse(event.data)
      const result = await bridge.execute({ action: method, params })
      ws.send(JSON.stringify({ id, result }))
    })
  }

  function onDestroy () {
    ws?.close()
  }
</script>

<template>
  <vc-viewer
    :access-token="accessToken"
    :animation="false"
    :base-layer-picker="false"
    style="width: 100%; height: 100%;"
    :timeline="false"
    @destroyed="onDestroy"
    @ready="onViewerReady"
  />
</template>
