# VersaTiles Imagery Provider

Added free, unauthenticated VersaTiles satellite imagery (Copernicus Sentinel-2) to the Cesium base layer picker.

## Changes

- **`src/components/CesiumViewer.vue`**: Added a `Cesium.ProviderViewModel` in `onViewerReady` that registers VersaTiles Satellite as a selectable imagery layer in Cesium's base layer picker. Uses `UrlTemplateImageryProvider` with `tiles.versatiles.org` tile endpoint (max zoom 12). Guarded with `if (viewer.baseLayerPicker)` for safety.
- **`public/versatiles-logo.png`**: 64x64 VersaTiles logo from [versatiles-org.github.io](https://github.com/versatiles-org/versatiles-org.github.io), used as the picker icon.
- **`.gitignore`**: Added `.env` entry.

## Tile source

- URL: `https://tiles.versatiles.org/tiles/satellite/{z}/{x}/{y}`
- Max zoom: 12 (tiles stretch beyond)
- Credit: Copernicus Sentinel-2 via VersaTiles
- No API key or authentication required
