<script setup lang="ts">
  import type { VcReadyObject } from 'vue-cesium/es/utils/types'
  import { MartiniTerrainProvider, WorkerFarmTerrainDecoder } from '@macrostrat/cesium-martini'
  import * as Cesium from 'cesium'
  import enUS from 'vue-cesium/es/locale/lang/en-us'
  import { useCesiumToken } from '@/composables/useCesiumToken'
  import { useAppStore } from '@/stores/app'
  import { useSettingsStore } from '@/stores/settings'
  import { PMTilesHeightmapResource } from '../resources/pmtiles-resource'
  import NorthArrow from './NorthArrow.vue'

  type CameraOrientation = {
    heading: number
    pitch: number
    roll: number
  }

  type CameraState = {
    destination: Cesium.Cartesian3
    orientation: CameraOrientation
  }

  type SubscriptionHandle = {
    dispose: () => void
  }

  const appStore = useAppStore()
  const { token: accessToken, hasToken } = useCesiumToken()
  const settingsStore = useSettingsStore()
  const versaTilesIconUrl = `${import.meta.env.BASE_URL}versatiles-logo.png`
  const mapterhornIconUrl = `${import.meta.env.BASE_URL}mapterhorn-icon.png`
  const osmBuildingsAssetId = Number.parseInt('96188', 10)
  const viewerRef = shallowRef<Cesium.Viewer | null>(null)
  const buildingsTileset = shallowRef<Cesium.Cesium3DTileset | null>(null)
  const buildingsLoadPromise = shallowRef<Promise<void> | null>(null)
  const compassWidget = shallowRef<{ destroy: () => void } | null>(null)
  const zoomControlWidget = shallowRef<{ destroy: () => void } | null>(null)
  const imagerySelectionSubscription = shallowRef<SubscriptionHandle | null>(null)
  const terrainSelectionSubscription = shallowRef<SubscriptionHandle | null>(null)
  const defaultHomeDestination = Cesium.Cartesian3.fromDegrees(15.4395, 47.0707, 3500)
  const defaultHomeOrientation = {
    heading: 0,
    pitch: Cesium.Math.toRadians(-65),
    roll: 0,
  }

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
    skipZoomLevels (z: number) {
      return z % 3 != 0
    },
  })

  const terrainDecoder = new WorkerFarmTerrainDecoder({ worker: terrariumWorker })
  const martiniTerrainProvider = markRaw(new MartiniTerrainProvider({
    resource: terrainResource,
    decoder: terrainDecoder,
  }))

  let mounted = true
  let buildingsLoadVersion = 0

  function getCesiumRuntime () {
    return (window as Window & { Cesium?: typeof Cesium }).Cesium ?? Cesium
  }

  function clearProviderSelectionSubscriptions () {
    imagerySelectionSubscription.value?.dispose()
    imagerySelectionSubscription.value = null
    terrainSelectionSubscription.value?.dispose()
    terrainSelectionSubscription.value = null
  }

  function getStartupCameraState (): CameraState {
    const hasSavedStartupView = settingsStore.retainStartupView
      && settingsStore.startupLongitude != null
      && settingsStore.startupLatitude != null
      && settingsStore.startupHeight != null
      && settingsStore.startupHeading != null
      && settingsStore.startupPitch != null
      && settingsStore.startupRoll != null

    if (hasSavedStartupView) {
      const longitude = settingsStore.startupLongitude as number
      const latitude = settingsStore.startupLatitude as number
      const height = settingsStore.startupHeight as number
      const heading = settingsStore.startupHeading as number
      const pitch = settingsStore.startupPitch as number
      const roll = settingsStore.startupRoll as number

      return {
        destination: Cesium.Cartesian3.fromDegrees(
          longitude,
          latitude,
          height,
        ),
        orientation: {
          heading,
          pitch,
          roll,
        },
      }
    }

    return {
      destination: defaultHomeDestination,
      orientation: defaultHomeOrientation,
    }
  }

  function getProviderIndex (
    providers: Cesium.ProviderViewModel[],
    selectedProvider: Cesium.ProviderViewModel | undefined,
  ) {
    if (!selectedProvider) return -1

    const directIndex = providers.indexOf(selectedProvider)
    if (directIndex !== -1) return directIndex

    return providers.findIndex(provider => provider.name === selectedProvider.name)
  }

  function saveSelectedProviders (viewModel: Cesium.BaseLayerPickerViewModel) {
    if (!settingsStore.retainImagery) return

    const imageryIndex = getProviderIndex(viewModel.imageryProviderViewModels, viewModel.selectedImagery)
    const terrainIndex = getProviderIndex(viewModel.terrainProviderViewModels, viewModel.selectedTerrain)

    settingsStore.startupImageryIndex = imageryIndex >= 0 ? imageryIndex : null
    settingsStore.startupTerrainIndex = terrainIndex >= 0 ? terrainIndex : null
    settingsStore.save()
  }

  function saveCurrentStartupView () {
    if (!settingsStore.retainStartupView || !viewerRef.value) return

    const { camera } = viewerRef.value
    const { positionCartographic } = camera

    settingsStore.startupLongitude = Cesium.Math.toDegrees(positionCartographic.longitude)
    settingsStore.startupLatitude = Cesium.Math.toDegrees(positionCartographic.latitude)
    settingsStore.startupHeight = positionCartographic.height
    settingsStore.startupHeading = camera.heading
    settingsStore.startupPitch = camera.pitch
    settingsStore.startupRoll = camera.roll

    if (settingsStore.retainImagery) {
      saveSelectedProviders(viewerRef.value.baseLayerPicker.viewModel)
      appStore.acknowledgeStartupViewSave()
      return
    }

    settingsStore.save()
    appStore.acknowledgeStartupViewSave()
  }

  function watchProviderSelections (viewModel: Cesium.BaseLayerPickerViewModel) {
    clearProviderSelectionSubscriptions()

    const cesiumRuntime = getCesiumRuntime() as typeof Cesium & {
      knockout?: {
        getObservable: (target: object, propertyName: string) => {
          subscribe: (callback: () => void) => SubscriptionHandle
        }
      }
    }

    const knockout = cesiumRuntime.knockout
    if (!knockout?.getObservable) return

    imagerySelectionSubscription.value = knockout.getObservable(viewModel, 'selectedImagery').subscribe(() => {
      saveSelectedProviders(viewModel)
    })
    terrainSelectionSubscription.value = knockout.getObservable(viewModel, 'selectedTerrain').subscribe(() => {
      saveSelectedProviders(viewModel)
    })
  }

  onUnmounted(() => {
    mounted = false
    try {
      terrariumWorker.terminate()
    } catch {
      // noop
    }
    buildingsLoadVersion += 1
    buildingsLoadPromise.value = null
    buildingsTileset.value = null
    viewerRef.value = null
    try {
      destroyCompass()
    } catch {
      // noop
    }
    try {
      destroyZoomControl()
    } catch {
      // noop
    }
    clearProviderSelectionSubscriptions()
  })

  function onViewerReady ({ viewer }: VcReadyObject) {
    const controller = viewer.scene.screenSpaceCameraController
    controller.enableTilt = true
    controller.enableLook = true
    controller.inertiaSpin = 0.1
    controller.inertiaTranslate = 0.1

    viewerRef.value = viewer
    const startupCameraState = getStartupCameraState()
    viewer.camera.setView({
      destination: startupCameraState.destination,
      orientation: startupCameraState.orientation,
    })

    if (settingsStore.showCompass) createCompass(viewer)
    if (settingsStore.showZoomControl) createZoomControl(viewer)
    if (settingsStore.show3DBuildings) loadBuildings(viewer)

    const vm = viewer.baseLayerPicker.viewModel

    const imageryModels = [
      new Cesium.ProviderViewModel({
        name: 'VersaTiles Satellite',
        tooltip: 'Global Sentinel-2 imagery (No stretching)',
        iconUrl: versaTilesIconUrl,
        creationFunction: () => new Cesium.UrlTemplateImageryProvider({
          url: 'https://tiles.versatiles.org/tiles/satellite/{z}/{x}/{y}',
          maximumLevel: 12,
          tilingScheme: new Cesium.WebMercatorTilingScheme(),
          credit: new Cesium.Credit('Copernicus Sentinel-2 via VersaTiles', true),
        }),
      }),
      new Cesium.ProviderViewModel({
        name: 'OpenStreetMap',
        tooltip: 'OpenStreetMap standard tiles',
        iconUrl: 'https://www.openstreetmap.org/favicon.ico',
        creationFunction: () => new Cesium.UrlTemplateImageryProvider({
          url: 'https://tile.openstreetmap.de/{z}/{x}/{y}.png',
          maximumLevel: 19,
          tilingScheme: new Cesium.WebMercatorTilingScheme(),
          credit: new Cesium.Credit('© OpenStreetMap contributors', true),
        }),
      }),
      new Cesium.ProviderViewModel({
        name: 'OpenTopoMap',
        tooltip: 'OpenTopoMap standard tiles',
        iconUrl: 'https://opentopomap.org/favicon.ico',
        creationFunction: () => new Cesium.UrlTemplateImageryProvider({
          url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
          subdomains: ['a', 'b', 'c'],
          maximumLevel: 17,
          tilingScheme: new Cesium.WebMercatorTilingScheme(),
          credit: new Cesium.Credit('© OpenTopoMap contributors', true),
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
        iconUrl: mapterhornIconUrl,
        creationFunction: () => martiniTerrainProvider,
      }),
    ]

    if (hasToken.value) {
      // Valid Ion token — append custom providers alongside Ion defaults
      vm.imageryProviderViewModels.push(...imageryModels)
      vm.terrainProviderViewModels.push(...terrainModels)
      const defaultTerrain = vm.terrainProviderViewModels.find((model: Cesium.ProviderViewModel) => model.name === 'Cesium World Terrain') ?? terrainModels[1]
      vm.selectedImagery = vm.imageryProviderViewModels[settingsStore.startupImageryIndex ?? -1] ?? imageryModels[0]
      vm.selectedTerrain = vm.terrainProviderViewModels[settingsStore.startupTerrainIndex ?? -1] ?? defaultTerrain
    } else {
      // No Ion token — replace defaults entirely with custom providers
      vm.imageryProviderViewModels = imageryModels
      vm.terrainProviderViewModels = terrainModels
      vm.selectedImagery = vm.imageryProviderViewModels[settingsStore.startupImageryIndex ?? -1] ?? vm.imageryProviderViewModels[0]
      vm.selectedTerrain = vm.terrainProviderViewModels[settingsStore.startupTerrainIndex ?? -1] ?? vm.terrainProviderViewModels[1]
    }

    watchProviderSelections(vm)

    if (settingsStore.retainImagery) {
      saveSelectedProviders(vm)
    }
  }

  async function loadBuildings (viewer: Cesium.Viewer) {
    if (!hasToken.value || buildingsTileset.value || buildingsLoadPromise.value) return

    const startupCameraState = getStartupCameraState()

    if (viewer.camera.positionCartographic.height > 100_000) {
      viewer.camera.flyTo({
        destination: startupCameraState.destination,
        orientation: startupCameraState.orientation,
        duration: 1.5,
      })
    }

    const loadVersion = ++buildingsLoadVersion
    buildingsLoadPromise.value = (async () => {
      try {
        const cesiumRuntime = getCesiumRuntime()
        const resource = await cesiumRuntime.IonResource.fromAssetId(osmBuildingsAssetId, {
          accessToken: accessToken.value,
        })
        const tileset = await cesiumRuntime.Cesium3DTileset.fromUrl(resource, {
          maximumScreenSpaceError: 8,
        })
        tileset.style = new cesiumRuntime.Cesium3DTileStyle({
          color: 'rgb(255, 255, 255)',
        })
        ;(tileset as Cesium.Cesium3DTileset & { showOutline?: boolean, enableShowOutline?: boolean }).showOutline = false
        ;(tileset as Cesium.Cesium3DTileset & { showOutline?: boolean, enableShowOutline?: boolean }).enableShowOutline = false

        // Drop stale results if the toggle changed, token disappeared, or a newer load started.
        if (!mounted || !settingsStore.show3DBuildings || !hasToken.value || loadVersion !== buildingsLoadVersion) {
          tileset.destroy()
          return
        }

        buildingsTileset.value = tileset
        viewer.scene.primitives.add(tileset)
      } catch (error) {
        console.error('Failed to load OSM buildings:', error)
      } finally {
        if (loadVersion === buildingsLoadVersion) {
          buildingsLoadPromise.value = null
        }
      }
    })()

    await buildingsLoadPromise.value
  }

  function unloadBuildings (viewer: Cesium.Viewer) {
    buildingsLoadVersion += 1
    buildingsLoadPromise.value = null
    if (buildingsTileset.value) {
      try {
        if (!viewer.isDestroyed()) {
          viewer.scene.primitives.remove(buildingsTileset.value)
        }
      } catch {
        // noop
      }
      buildingsTileset.value = null
    }
  }

  watch(() => settingsStore.show3DBuildings, enabled => {
    if (!viewerRef.value) return
    if (enabled) loadBuildings(viewerRef.value)
    else unloadBuildings(viewerRef.value)
  })

  watch(hasToken, hasValidToken => {
    if (!viewerRef.value || !settingsStore.show3DBuildings) return
    if (hasValidToken) loadBuildings(viewerRef.value)
    else unloadBuildings(viewerRef.value)
  })

  async function createCompass (viewer: Cesium.Viewer) {
    const { default: Compass } = await import('@cesium-extends/compass')
    if (!mounted) return
    compassWidget.value = new Compass(viewer, {})
  }

  function destroyCompass () {
    compassWidget.value?.destroy()
    compassWidget.value = null
  }

  async function createZoomControl (viewer: Cesium.Viewer) {
    const { default: ZoomController } = await import('@cesium-extends/zoom-control')
    if (!mounted) return
    const startupCameraState = getStartupCameraState()
    zoomControlWidget.value = new ZoomController(viewer, {
      home: startupCameraState.destination,
    })
  }

  function destroyZoomControl () {
    zoomControlWidget.value?.destroy()
    zoomControlWidget.value = null
  }

  watch(() => settingsStore.showCompass, enabled => {
    if (!viewerRef.value) return
    if (enabled) createCompass(viewerRef.value)
    else destroyCompass()
  })

  watch(() => settingsStore.showZoomControl, enabled => {
    if (!viewerRef.value) return
    if (enabled) createZoomControl(viewerRef.value)
    else destroyZoomControl()
  })

  watch(() => settingsStore.retainImagery, enabled => {
    if (!enabled || !viewerRef.value) return
    saveSelectedProviders(viewerRef.value.baseLayerPicker.viewModel)
  })

  watch(() => appStore.startupViewSaveRequestId, requestId => {
    if (requestId === 0 || !appStore.is3D) return
    saveCurrentStartupView()
  })

  function zoomIn () {
    viewerRef.value?.camera.zoomIn(viewerRef.value.camera.positionCartographic.height * 0.4)
  }

  function zoomOut () {
    viewerRef.value?.camera.zoomOut(viewerRef.value.camera.positionCartographic.height * 0.6)
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
      <NorthArrow v-if="viewerRef && settingsStore.showNorth" :viewer="viewerRef" />
    </vc-config-provider>
    <div
      v-if="settingsStore.showZoom"
      style="position: absolute; bottom: 180px; right: 12px; display: flex; flex-direction: column; gap: 20px;"
    >
      <v-btn density="compact" icon="mdi-plus" size="large" @click="zoomIn" />
      <v-btn density="compact" icon="mdi-minus" size="large" @click="zoomOut" />
    </div>
  </div>
</template>

<style>
</style>
