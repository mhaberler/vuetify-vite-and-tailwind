# Cesium  Viewer

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
bun run compress  # production build with Brotli sidecar files
bun run preview   # preview production build
```

## Configuration

The app runs against open-data imagery and terrain sources without any proprietary API keys.

Production builds derive their public base path from the deploy environment. The current deploy flow expects values such as `DEPLOY_PREFIX`, `DEPLOY_HOST`, `DEPLOY_USER`, and `DEPLOY_PATH` in `.env.production`.

Example `.env.production`:

```dotenv
DEPLOY_PREFIX=/apps/
DEPLOY_HOST=example.com
DEPLOY_USER=joeblow
DEPLOY_PATH=/var/www/example/apps/cesium-opendata-viewer
```

## Tech Stack

| Component        | Library                                                        |
| ---------------- | -------------------------------------------------------------- |
| Framework        | Vue 3 + TypeScript + Vite                                      |
| 3D mapping       | CesiumJS + vue-cesium                                          |
| 2D mapping       | Leaflet + vue-leaflet                                          |
| Terrain decoding | @macrostrat/cesium-martini (Martini mesh from terrarium tiles) |
| Tile format      | PMTiles (Mapterhorn global elevation)                          |
| UI               | Vuetify 4 + TailwindCSS                                        |
| State            | Pinia                                                          |
| Charts           | uplot                                                          |

## Scripts

```bash
bun run dev            # start dev server
bun run build          # type-check + build
bun run build-only     # build without type-check
bun run compress       # build with Brotli-compressed sidecar files (.br)
bun run deploy         # build, generate compressed assets, then rsync to DEPLOY_PATH
bun run type-check     # vue-tsc type check
bun run lint           # ESLint with auto-fix
bun run prettier       # format all files
bun run clean          # remove dist/
```

## Compression And Deploy

`bun run compress` runs a production build with `vite-plugin-compression` enabled and emits Brotli sidecar files next to the built assets in `dist/`.

`bun run deploy` performs three steps:

1. Type-check and build the app.
2. Generate Brotli-compressed sidecar assets.
3. Rsync the `dist/` directory to the configured VPS path.

The Vite output uses hashed filenames for JS, CSS, and other assets so they can be cached aggressively by the web server.

Note: the current repo generates `.br` sidecar files. The Caddy config below enables both `br` and `gzip` precompressed lookup, which is fine, but only Brotli sidecars are produced unless gzip generation is added later.

## Caddy

For deployment under `/var/www/vps`, the server can be configured like this:

```caddyfile
example.com {
  # Set this path to your site's directory.
  root * /var/www/example

  # Enable the static file server.
  file_server {
    precompressed br gzip
  }

  # Set Cache-Control for Vite's hashed assets
  # This matches files in /assets/ or any file with a hash-like suffix
  @static {
    path /assets/*
    path *.js
    path *.css
    path *.png
    path *.woff2
  }

  header @static {
    # Cache for 1 year (31536000 seconds)
    Cache-Control "public, max-age=31536000, immutable"
  }

  # IMPORTANT: Do NOT cache index.html
  # This ensures users always get the latest version of your app entry point
  header /index.html Cache-Control "no-cache"
}
```

This setup pairs well with Vite's hashed asset names: `index.html` stays fresh, while `/assets/*` can be cached long-term.