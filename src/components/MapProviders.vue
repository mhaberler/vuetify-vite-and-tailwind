<script setup lang="ts">
  import type { MartiniTerrainProvider } from '@macrostrat/cesium-martini'
  import * as Cesium from 'cesium'
  import { useVueCesium } from 'vue-cesium'

  interface Props {
    martiniTerrainProvider: MartiniTerrainProvider
  }

  const props = defineProps<Props>()
  const $vc = useVueCesium()

  // ---- Imagery provider view models ----------------------------------------

  // const defaultImageryVMs = Cesium.createDefaultImageryProviderViewModels()

  const customImageryVMs = [
    new Cesium.ProviderViewModel({
      name: 'VersaTiles Satellite',
      tooltip: 'Global Sentinel-2 imagery (no stretching)',
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
      tooltip: 'Tirol orthophoto',
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
      tooltip: 'Austrian OGD Basemap orthophoto',
      iconUrl: 'https://www.geoland.at/assets/images/IndexGrid/basemap_hover_en.png',
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

  // const allImageryVMs = [...defaultImageryVMs, ...customImageryVMs]
  const allImageryVMs = [...customImageryVMs]

  // ---- Terrain provider view models ----------------------------------------

  // const defaultTerrainVMs = Cesium.createDefaultTerrainProviderViewModels()

  const customTerrainVMs = [
    new Cesium.ProviderViewModel({
      name: 'swisstopo Terrain',
      tooltip: 'High-precision Swiss terrain (Quantized Mesh, vertex normals)',
      iconUrl: 'https://www.swisstopo.admin.ch/favicon.ico',
      creationFunction: () => Cesium.CesiumTerrainProvider.fromUrl(
        'https://3d.geo.admin.ch/ch.swisstopo.terrain.3d/v1/',
        { requestVertexNormals: true },
      ),
    }),
    new Cesium.ProviderViewModel({
      name: 'Mapterhorn Terrarium',
      tooltip: 'Global elevation via PMTiles (free, no auth)',
      iconUrl: '/mapterhorn-icon.png',
      creationFunction: () => props.martiniTerrainProvider,
    }),
  ]

  // const allTerrainVMs = [...defaultTerrainVMs, ...customTerrainVMs]
  const allTerrainVMs = [...customTerrainVMs]

  // ---- Active selection ----------------------------------------------------

  // shallowRef prevents Vue from deep-proxying ProviderViewModel, which breaks
  // Cesium's Command-based creationFunction getter.
  // Default to VersaTiles (no Ion token needed) rather than Bing Maps
  const activeImageryVM = shallowRef<Cesium.ProviderViewModel>(customImageryVMs[0])
  const activeTerrainVM = shallowRef<Cesium.ProviderViewModel>(allTerrainVMs[0])

  function applyImagery (vm: Cesium.ProviderViewModel) {
    const viewer: Cesium.Viewer | undefined = $vc?.viewer
    if (!viewer) return
    // Use the global Cesium instance (loaded by vue-cesium from unpkg) for ImageryLayer.
    // The viewer's rendering loop belongs to the global Cesium; mixing it with the
    // vite-bundled Cesium's ImageryLayer causes WebGL context incompatibility
    // (context.maximumTextureSize = 0) when the two instances intersect during texture
    // creation. Access lazily — the CDN script may not be loaded during setup().
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const CesiumGlobal = (window as any).Cesium
    try {
      // Add new layer first, then remove old — avoids destroying an actively-loading
      // layer mid-frame before its GPU resources are safely flushed.
      const layer = CesiumGlobal.ImageryLayer.fromProviderAsync(
        Promise.resolve((vm as any).creationCommand()),
      )
      viewer.imageryLayers.add(layer)
      // Remove any previously active layers (they're below the new one in the stack)
      while (viewer.imageryLayers.length > 1) {
        viewer.imageryLayers.remove(viewer.imageryLayers.get(0), true)
      }
    } catch (error) {
      console.warn('[MapProviders] Failed to apply imagery provider:', error)
    }
  }

  async function applyTerrain (vm: Cesium.ProviderViewModel) {
    const viewer: Cesium.Viewer | undefined = $vc?.viewer
    if (!viewer) return
    try {
      const provider = await Promise.resolve((vm as any).creationCommand())
      viewer.terrainProvider = provider as Cesium.TerrainProvider
    } catch (error) {
      console.warn('[MapProviders] Failed to load terrain provider:', error)
    }
  }

  onMounted(() => {
    applyImagery(activeImageryVM.value)
    applyTerrain(activeTerrainVM.value)
  })

  watch(activeImageryVM, applyImagery)
  watch(activeTerrainVM, applyTerrain)
</script>

<template>
  <div class="map-switcher">
    <v-card elevation="2" rounded="lg" class="pa-2" min-width="180">

      <div class="text-caption font-weight-bold mb-1">Imagery</div>
      <v-menu>
        <template #activator="{ props: menuProps }">
          <v-btn v-bind="menuProps" size="small" variant="tonal" block>
            <v-avatar
              v-if="activeImageryVM.iconUrl"
              :image="activeImageryVM.iconUrl"
              class="mr-1"
              size="16"
            />
            {{ activeImageryVM.name }}
            <v-icon end>mdi-chevron-down</v-icon>
          </v-btn>
        </template>
        <v-list density="compact" max-height="320" style="overflow-y: auto;">
          <v-list-item
            v-for="vm in allImageryVMs"
            :key="vm.name"
            :active="vm === activeImageryVM"
            :prepend-avatar="vm.iconUrl || undefined"
            :title="vm.name"
            @click="activeImageryVM = vm"
          />
        </v-list>
      </v-menu>

      <div class="text-caption font-weight-bold mt-3 mb-1">Terrain</div>
      <v-menu>
        <template #activator="{ props: menuProps }">
          <v-btn v-bind="menuProps" size="small" variant="tonal" block>
            <v-avatar
              v-if="activeTerrainVM.iconUrl"
              :image="activeTerrainVM.iconUrl"
              class="mr-1"
              size="16"
            />
            {{ activeTerrainVM.name }}
            <v-icon end>mdi-chevron-down</v-icon>
          </v-btn>
        </template>
        <v-list density="compact">
          <v-list-item
            v-for="vm in allTerrainVMs"
            :key="vm.name"
            :active="vm === activeTerrainVM"
            :prepend-avatar="vm.iconUrl || undefined"
            :title="vm.name"
            @click="activeTerrainVM = vm"
          />
        </v-list>
      </v-menu>

    </v-card>
  </div>
</template>

<style scoped>
.map-switcher {
  position: absolute;
  bottom: 40px;
  left: 8px;
  z-index: 10;
}
</style>
