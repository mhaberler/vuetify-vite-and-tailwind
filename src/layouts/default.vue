<template>
  <v-app-bar :collapse="false" flat title="Flight Review">
    <!-- <template #append>
      <v-btn icon="mdi-theme-light-dark" @click="$vuetify.theme.cycle()" />
    </template> -->
  </v-app-bar>

  <v-main style="height: calc(100vh - 16px);">
  <!-- <v-main style="height: 0vh;"> -->
    <router-view />
  </v-main>
</template>

<script lang="ts" setup>
  //
</script>
