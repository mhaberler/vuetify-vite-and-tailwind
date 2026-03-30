# Cesium OpenData Viewer

A flight review and 3D/2D geospatial visualization app built with Vue 3 and CesiumJS. Displays flight paths and telemetry against high-resolution open-data imagery and terrain, with no proprietary tile services required.

## Features

- Toggle between **3D globe** (Cesium) and **2D map** (Leaflet)
- Multiple open-data **imagery providers**: VersaTiles Satellite (Sentinel-2), swisstopo SWISSIMAGE, France IGN orthophoto, Austria Basemap, Tirol orthophoto
- Multiple **terrain providers**: swisstopo (Switzerland), Mapterhorn global elevation via PMTiles
- **Time series panel** for telemetry data, resizable via splitpanes
- Fullscreen plus automatic startup view and imagery persistence

## Getting Started

```bash
bun install
bun run dev       # dev server at http://localhost:3000
bun run build     # type-check + production build
bun run preview   # preview production build
```

## Configuration

The app runs against open-data imagery and terrain sources without any proprietary API keys.

## Tech Stack

| Component         | Library                                                        |
| ----------------- | -------------------------------------------------------------- |
| Framework         | Vue 3 + TypeScript + Vite                                      |
| 3D mapping        | CesiumJS + vue-cesium                                          |
| 2D mapping        | Leaflet + vue-leaflet                                          |
| Terrain decoding  | @macrostrat/cesium-martini (Martini mesh from terrarium tiles) |
| Tile format       | PMTiles (Mapterhorn global elevation)                          |
| UI                | Vuetify 4 + TailwindCSS                                        |
| State             | Pinia                                                          |
| Charts            | uplot                                                          |

## Scripts

```bash
bun run dev            # start dev server
bun run build          # type-check + build
bun run build-only     # build without type-check
bun run type-check     # vue-tsc type check
bun run lint           # ESLint with auto-fix
bun run prettier       # format all files
bun run clean          # remove dist/
```
