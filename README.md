# Cesium OpenData Viewer

A flight review and 3D/2D geospatial visualization app built with Vue 3 and CesiumJS. Displays flight paths and telemetry against high-resolution open-data imagery and terrain, with no proprietary tile services required.

## Features

- Toggle between **3D globe** (Cesium) and **2D map** (Leaflet)
- Multiple open-data **imagery providers**: VersaTiles Satellite (Sentinel-2), swisstopo SWISSIMAGE, France IGN orthophoto, Austria Basemap, Tirol orthophoto
- Multiple **terrain providers**: swisstopo (Switzerland), Mapterhorn global elevation via PMTiles
- **Time series panel** for telemetry data, resizable via splitpanes
- Dark mode, fullscreen, configurable terrain error level
- Optional Cesium Ion token and Bing Maps key via Settings UI (persisted in cookie / localStorage)

## Getting Started

```bash
npm install
npm run dev       # dev server at http://localhost:3000
npm run build     # type-check + production build
npm run preview   # preview production build
```

## Configuration

All configuration is optional — the app runs without any API keys using open-data sources.

| Variable                 | Description                                    |
| ------------------------ | ---------------------------------------------- |
| `VITE_OPENDATA_ION_TOKEN`  | Cesium Ion access token for Ion-hosted layers  |

Runtime settings can also be entered in the **Settings** dialog:

- **Cesium Ion Token** — validated against the Cesium API and stored in a secure cookie
- **Bing Maps Key** — optional, stored in localStorage; Bing layers work via Ion without it

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
npm run dev            # start dev server
npm run build          # type-check + build
npm run build-only     # build without type-check
npm run type-check     # vue-tsc type check
npm run lint           # ESLint with auto-fix
npm run prettier       # format all files
npm run clean          # remove dist/
```
