<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import * as Cesium from 'cesium'
import 'cesium/Build/Cesium/Widgets/widgets.css'
import { CesiumBridge } from 'cesium-mcp-bridge'

const container = ref<HTMLDivElement>()
let viewer: Cesium.Viewer
let ws: WebSocket

onMounted(() => {
  Cesium.Ion.defaultAccessToken = import.meta.env.VITE_CESIUM_ION_TOKEN

  viewer = new Cesium.Viewer(container.value!, {
    timeline: false,
    animation: false,
    baseLayerPicker: false,
  })

  const bridge = new CesiumBridge(viewer)

  ws = new WebSocket('ws://localhost:9100?session=default')
  ws.onmessage = async (event) => {
    const { id, method, params } = JSON.parse(event.data)
    const result = await bridge.execute({ action: method, params })
    ws.send(JSON.stringify({ id, result }))
  }
})

onUnmounted(() => {
  ws?.close()
  viewer?.destroy()
})
</script>

<template>
  <div ref="container" style="width: 100%; height: 100%;" />
</template>
