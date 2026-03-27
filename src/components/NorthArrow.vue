<script setup lang="ts">
  import * as Cesium from 'cesium'

  const props = defineProps<{ viewer: Cesium.Viewer }>()

  const heading = ref(0)
  const visible = computed(() => Math.abs(heading.value) > 0.05)

  let removeListener: Cesium.Event.RemoveCallback | null = null

  onMounted(() => {
    removeListener = props.viewer.scene.postRender.addEventListener(() => {
      heading.value = props.viewer.camera.heading
    })
  })

  onUnmounted(() => {
    removeListener?.()
  })

  function resetNorth () {
    props.viewer.camera.flyTo({
      destination: props.viewer.camera.position,
      orientation: {
        heading: 0,
        pitch: props.viewer.camera.pitch,
        roll: 0,
      },
      duration: 0.5,
    })
  }
</script>

<template>
  <v-btn
    class="north-arrow"
    :class="{ 'north-visible': visible }"
    icon
    size="small"
    @click="resetNorth"
  >
    <v-icon :style="{ transform: `rotate(${-Cesium.Math.toDegrees(heading)}deg)` }">
      mdi-navigation
    </v-icon>
  </v-btn>
</template>

<style scoped>
.north-arrow {
  position: absolute;
  bottom: 72px;
  right: 8px;
  z-index: 10;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s ease;
}
.north-visible {
  opacity: 1;
  pointer-events: auto;
}
</style>
