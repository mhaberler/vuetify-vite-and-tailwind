<template>
  <UplotVue :data="data" :options="options" />
</template>

<script setup>
  import UplotVue from 'uplot-vue'
  import 'uplot/dist/uPlot.min.css'

  const options = {
    width: 600,
    height: 300,
    series: [
      {},
      { label: 'Line 1', stroke: '#f66' },
    ],
  }

  const data = [
    [0, 1, 2, 3, 4, 5], // x
    [10, 25, 15, 35, 20, 40], // y
  ]
</script>
