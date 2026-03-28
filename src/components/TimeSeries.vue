<template>
  <div ref="container" style="width: 100%; height: 100%;">
    <UplotVue v-if="width && height" :data="data" :options="options" />
  </div>
</template>

<script setup>
  import UplotVue from 'uplot-vue'
  import 'uplot/dist/uPlot.min.css'

  const container = ref(null)
  const width = ref(0)
  const height = ref(0)

  const options = computed(() => ({
    width: width.value,
    height: height.value,
    series: [
      {},
      { label: 'Line 1', stroke: '#f66' },
    ],
  }))

  const data = [
    [0, 1, 2, 3, 4, 5], // x
    [10, 25, 15, 35, 20, 40], // y
  ]

  onMounted(() => {
    const ro = new ResizeObserver(([entry]) => {
      width.value = Math.floor(entry.contentRect.width)
      height.value = Math.floor(entry.contentRect.height)
    })
    ro.observe(container.value)
    onUnmounted(() => ro.disconnect())
  })
</script>
