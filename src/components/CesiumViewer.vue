<script setup lang="ts">
  import type { SyncedViewState } from '@/stores/app'
  import type { VcReadyObject } from 'vue-cesium/es/utils/types'
  import {
    MartiniTerrainProvider,
    WorkerFarmTerrainDecoder,
  } from '@macrostrat/cesium-martini'
  import * as Cesium from 'cesium'
  import enUS from 'vue-cesium/es/locale/lang/en-us'
  import { useAppStore } from '@/stores/app'
  import { useSettingsStore } from '@/stores/settings'
  import { PMTilesHeightmapResource } from '../resources/pmtiles-resource'

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
  const settingsStore = useSettingsStore()
  const versaTilesIconUrl = `${import.meta.env.BASE_URL}versatiles-logo.png`
  const mapterhornIconUrl = `${import.meta.env.BASE_URL}mapterhorn-icon.png`
  const viewerRef = shallowRef<Cesium.Viewer | null>(null)
  const imagerySelectionSubscription = shallowRef<SubscriptionHandle | null>(
    null,
  )
  const terrainSelectionSubscription = shallowRef<SubscriptionHandle | null>(
    null,
  )
  const cameraListenerRemovers = shallowRef<Cesium.Event.RemoveCallback[]>([])
  const lastAppliedSyncRevision = ref(0)
  let autosaveTimer: number | null = null
  const defaultHomeDestination = Cesium.Cartesian3.fromDegrees(
    15.4395,
    47.0707,
    3500,
  )
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
  const roughViewScale = 20_000_000
  const terrainResource = new PMTilesHeightmapResource({
    url: 'https://download.mapterhorn.com/planet.pmtiles',
    tileSize: 512,
    maxZoom: 12,
    skipZoomLevels (z: number) {
      return z % 3 != 0
    },
  })

  const terrainDecoder = new WorkerFarmTerrainDecoder({
    worker: terrariumWorker,
  })
  const martiniTerrainProvider = markRaw(
    new MartiniTerrainProvider({
      resource: terrainResource,
      decoder: terrainDecoder,
    }),
  )

  function getCesiumRuntime () {
    return (window as Window & { Cesium?: typeof Cesium }).Cesium ?? Cesium
  }

  function clearProviderSelectionSubscriptions () {
    imagerySelectionSubscription.value?.dispose()
    imagerySelectionSubscription.value = null
    terrainSelectionSubscription.value?.dispose()
    terrainSelectionSubscription.value = null
  }

  function clearAutosaveTimer () {
    if (autosaveTimer != null) {
      window.clearTimeout(autosaveTimer)
      autosaveTimer = null
    }
  }

  function scheduleAutosave () {
    clearAutosaveTimer()
    autosaveTimer = window.setTimeout(() => {
      saveCurrentStartupView()
      autosaveTimer = null
    }, 2000)
  }

  function clearCameraListeners () {
    for (const removeListener of cameraListenerRemovers.value) {
      removeListener()
    }
    cameraListenerRemovers.value = []
  }

  function approximateLeafletZoomToHeight (zoom: number | null) {
    if (zoom == null) return 3500

    const clampedZoom = Cesium.Math.clamp(zoom, 0, 18)
    const height = roughViewScale / Math.pow(2, clampedZoom)

    return height
  }

  function captureCesiumViewState (): Omit<SyncedViewState, 'revision'> | null {
    if (!viewerRef.value) return null

    const { camera } = viewerRef.value
    const { positionCartographic } = camera

    return {
      latitude: Cesium.Math.toDegrees(positionCartographic.latitude),
      longitude: Cesium.Math.toDegrees(positionCartographic.longitude),
      height: positionCartographic.height,
      zoom: null,
      heading: camera.heading,
      pitch: camera.pitch,
      roll: camera.roll,
      source: 'cesium',
    }
  }

  function applySyncedView (view: SyncedViewState) {
    if (!viewerRef.value || view.source === 'cesium') return

    const targetHeight = view.height ?? approximateLeafletZoomToHeight(view.zoom)
    viewerRef.value.camera.setView({
      destination: Cesium.Cartesian3.fromDegrees(
        view.longitude,
        view.latitude,
        targetHeight,
      ),
      orientation: {
        heading: view.heading ?? defaultHomeOrientation.heading,
        pitch: view.pitch ?? defaultHomeOrientation.pitch,
        roll: view.roll ?? defaultHomeOrientation.roll,
      },
    })
    lastAppliedSyncRevision.value = view.revision
  }

  function getStartupCameraState (): CameraState {
    const hasSavedStartupView
      = settingsStore.startupLongitude != null
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
        destination: Cesium.Cartesian3.fromDegrees(longitude, latitude, height),
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

    return providers.findIndex(
      provider => provider.name === selectedProvider.name,
    )
  }

  function saveSelectedProviders (viewModel: Cesium.BaseLayerPickerViewModel) {
    const imageryIndex = getProviderIndex(
      viewModel.imageryProviderViewModels,
      viewModel.selectedImagery,
    )
    const terrainIndex = getProviderIndex(
      viewModel.terrainProviderViewModels,
      viewModel.selectedTerrain,
    )

    settingsStore.startupImageryIndex = imageryIndex >= 0 ? imageryIndex : null
    settingsStore.startupTerrainIndex = terrainIndex >= 0 ? terrainIndex : null
    settingsStore.save()
  }

  function saveCurrentStartupView () {
    if (!viewerRef.value) return

    const { camera } = viewerRef.value
    const { positionCartographic } = camera

    settingsStore.startupLongitude = Cesium.Math.toDegrees(
      positionCartographic.longitude,
    )
    settingsStore.startupLatitude = Cesium.Math.toDegrees(
      positionCartographic.latitude,
    )
    settingsStore.startupHeight = positionCartographic.height
    settingsStore.startupHeading = camera.heading
    settingsStore.startupPitch = camera.pitch
    settingsStore.startupRoll = camera.roll

    saveSelectedProviders(viewerRef.value.baseLayerPicker.viewModel)

    settingsStore.save()
  }

  function watchCameraIdle (viewer: Cesium.Viewer) {
    clearCameraListeners()

    cameraListenerRemovers.value = [
      viewer.camera.moveStart.addEventListener(() => {
        clearAutosaveTimer()
      }),
      viewer.camera.moveEnd.addEventListener(() => {
        scheduleAutosave()
      }),
    ]
  }

  function watchProviderSelections (viewModel: Cesium.BaseLayerPickerViewModel) {
    clearProviderSelectionSubscriptions()

    const cesiumRuntime = getCesiumRuntime() as typeof Cesium & {
      knockout?: {
        getObservable: (
          target: object,
          propertyName: string,
        ) => {
          subscribe: (callback: () => void) => SubscriptionHandle
        }
      }
    }

    const knockout = cesiumRuntime.knockout
    if (!knockout?.getObservable) return

    imagerySelectionSubscription.value = knockout
      .getObservable(viewModel, 'selectedImagery')
      .subscribe(() => {
        saveSelectedProviders(viewModel)
      })
    terrainSelectionSubscription.value = knockout
      .getObservable(viewModel, 'selectedTerrain')
      .subscribe(() => {
        saveSelectedProviders(viewModel)
      })
  }

  onUnmounted(() => {
    try {
      terrariumWorker.terminate()
    } catch {
    // noop
    }
    clearAutosaveTimer()
    clearCameraListeners()
    viewerRef.value = null
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

    const vm = viewer.baseLayerPicker.viewModel

    const imageryModels = [
      new Cesium.ProviderViewModel({
        name: 'VersaTiles Satellite',
        tooltip: 'Global Sentinel-2 imagery (No stretching)',
        iconUrl: versaTilesIconUrl,
        creationFunction: () =>
          new Cesium.UrlTemplateImageryProvider({
            url: 'https://tiles.versatiles.org/tiles/satellite/{z}/{x}/{y}',
            maximumLevel: 12,
            tilingScheme: new Cesium.WebMercatorTilingScheme(),
            credit: new Cesium.Credit(
              'Copernicus Sentinel-2 via VersaTiles',
              true,
            ),
          }),
      }),
      new Cesium.ProviderViewModel({
        name: 'OpenStreetMap',
        tooltip: 'OpenStreetMap standard tiles',
        iconUrl: 'https://www.openstreetmap.org/favicon.ico',
        creationFunction: () =>
          new Cesium.UrlTemplateImageryProvider({
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
        creationFunction: () =>
          new Cesium.UrlTemplateImageryProvider({
            url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
            subdomains: ['a', 'b', 'c'],
            maximumLevel: 17,
            tilingScheme: new Cesium.WebMercatorTilingScheme(),
            credit: new Cesium.Credit('© OpenTopoMap contributors', true),
          }),
      }),
      new Cesium.ProviderViewModel({
        name: 'OpenFlightMaps',
        tooltip: 'OpenFlightMaps aeronautical chart tiles',
        iconUrl: 'https://openflightmaps.org/favicon.ico',
        creationFunction: () =>
          new Cesium.UrlTemplateImageryProvider({
            url: 'https://nwy-tiles-api.prod.newaydata.com/tiles/{z}/{x}/{y}.png?path=latest/aero/latest',
            tileWidth: 512,
            tileHeight: 512,
            maximumLevel: 11,
            enablePickFeatures: false,
            tilingScheme: new Cesium.WebMercatorTilingScheme(),
            credit: new Cesium.Credit(
              '(c) <a href="https://openflightmaps.org/" target="_blank">Open Flightmaps association</a>, (c) OpenStreetMap contributors, NASA elevation data',
              true,
            ),
          }),
      }),
      new Cesium.ProviderViewModel({
        name: 'Austria Basemap',
        iconUrl:
          'https://www.geoland.at/assets/images/IndexGrid/basemap_hover_en.png',
        tooltip: 'Austrian OGD Basemap Ortho',
        creationFunction: () =>
          new Cesium.WebMapTileServiceImageryProvider({
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

      new Cesium.ProviderViewModel({
        name: 'Karte Tirol Orthofoto',
        tooltip: 'Tirol Orthophoto',
        iconUrl: 'https://www.tirol.gv.at/favicon.ico',
        creationFunction: () =>
          new Cesium.UrlTemplateImageryProvider({
            url: 'https://wmts.kartetirol.at/wmts/gdi_ortho/{z}/{x}/{y}.png',
            tilingScheme: new Cesium.WebMercatorTilingScheme(),
            maximumLevel: 18,
          }),
      }),
      new Cesium.ProviderViewModel({
        name: 'SWISSIMAGE',
        tooltip: 'swisstopo SWISSIMAGE (10 cm / 25 cm)',
        iconUrl: 'https://www.swisstopo.admin.ch/favicon.ico',
        creationFunction: () =>
          new Cesium.WebMapTileServiceImageryProvider({
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
        name: 'France IGN Ortho',
        tooltip: 'IGN BD ORTHO — 20 cm',
        iconUrl:
          'https://www.ign.fr/publications-de-l-ign/institut/kiosque/kit-communication/cartes-ign/logo-cartes-ign-couleurs.png',
        creationFunction: () =>
          new Cesium.WebMapTileServiceImageryProvider({
            url: 'https://data.geopf.fr/wmts',
            layer: 'ORTHOIMAGERY.ORTHOPHOTOS',
            style: 'normal',
            format: 'image/jpeg',
            tileMatrixSetID: 'PM',
            maximumLevel: 19,
            tilingScheme: new Cesium.WebMercatorTilingScheme(),
            rectangle: Cesium.Rectangle.fromDegrees(-5.5, 41.3, 9.6, 51.1),
            credit: new Cesium.Credit(
              '© <a href="https://geopf.fr" target="_blank">IGN France</a>',
              true,
            ),
          }),
      }),
    ]

    const terrainModels = [
      new Cesium.ProviderViewModel({
        name: 'Mapterhorn Terrarium',
        tooltip:
          'Mapterhorn global elevation dataset encoded in Terrarium format via PMTiles (free, no auth)',
        iconUrl: mapterhornIconUrl,
        creationFunction: () => martiniTerrainProvider,
      }),
      new Cesium.ProviderViewModel({
        name: 'swisstopo Terrain',
        tooltip:
          'High-precision Swiss terrain from swisstopo (Quantized Mesh, vertex normals)',
        iconUrl: 'https://www.swisstopo.admin.ch/favicon.ico',
        creationFunction: () =>
          Cesium.CesiumTerrainProvider.fromUrl(
            'https://3d.geo.admin.ch/ch.swisstopo.terrain.3d/v1/',
            { requestVertexNormals: true },
          ),
      }),
    ]

    vm.imageryProviderViewModels = imageryModels
    vm.terrainProviderViewModels = terrainModels
    vm.selectedImagery
      = vm.imageryProviderViewModels[settingsStore.startupImageryIndex ?? -1]
        ?? vm.imageryProviderViewModels[0]
    vm.selectedTerrain
      = vm.terrainProviderViewModels[settingsStore.startupTerrainIndex ?? -1]
        ?? vm.terrainProviderViewModels[1]

    watchProviderSelections(vm)
    watchCameraIdle(viewer)

    saveSelectedProviders(vm)
  }

  watch(
    () => appStore.switchViewRequestId,
    requestId => {
      if (requestId === 0 || !appStore.is3D || appStore.pendingMode !== false)
        return

      const view = captureCesiumViewState()
      if (view) {
        appStore.publishSyncedView(view)
      }
      appStore.completePendingModeToggle()
    },
  )

  watch(
    () => appStore.is3D,
    is3D => {
      if (!is3D) return

      const view = appStore.syncedView
      if (!view || view.revision === lastAppliedSyncRevision.value) return

      applySyncedView(view)
    },
  )
</script>

<template>
  <div style="position: relative; width: 100%; height: 100%">
    <vc-config-provider :locale="enUS">
      <vc-viewer
        :animation="true"
        base-layer-picker
        style="width: 100%; height: 100%"
        :timeline="true"
        @ready="onViewerReady"
      />
    </vc-config-provider>
  </div>
</template>
