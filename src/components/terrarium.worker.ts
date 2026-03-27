import type { NdArray } from 'ndarray'
import Martini from '@mapbox/martini'
import ndarray from 'ndarray'

// --- Types (from @macrostrat/cesium-martini worker-util) ---

interface TerrainWorkerInput {
  imageData: Uint8ClampedArray
  maxVertexDistance: number | null
  errorLevel: number
  tileSize: number
  ellipsoidRadius: number
  x: number
  y: number
  z: number
}

interface QuantizedMeshResult {
  minimumHeight: number
  maximumHeight: number
  quantizedVertices: Uint16Array
  indices: Uint16Array
  westIndices: number[]
  southIndices: number[]
  eastIndices: number[]
  northIndices: number[]
  quantizedHeights: Float32Array | null
}

// --- Inlined functions (from @macrostrat/cesium-martini worker-util) ---

type DecodeRgbFunction = (r: number, g: number, b: number, a: number) => number

/** Terrarium RGB decode: height = (r * 256 + g + b / 256) - 32768 */
const terrariumDecodeRgb: DecodeRgbFunction = (r, g, b, _a) =>
  r * 256 + g + b / 256 - 32_768

function rgbTerrainToGrid (png: NdArray, decodeRgb: DecodeRgbFunction): Float32Array {
  const gridSize = png.shape[0] + 1
  const terrain = new Float32Array(gridSize * gridSize)
  const tileSize = png.shape[0]

  for (let y = 0; y < tileSize; y++) {
    for (let x = 0; x < tileSize; x++) {
      const r = png.get(x, y, 0)
      const g = png.get(x, y, 1)
      const b = png.get(x, y, 2)
      const a = png.get(x, y, 3)
      terrain[y * gridSize + x] = decodeRgb(r, g, b, a)
    }
  }
  // backfill right and bottom borders
  for (let x = 0; x < gridSize - 1; x++) {
    terrain[gridSize * (gridSize - 1) + x] = terrain[gridSize * (gridSize - 2) + x]
  }
  for (let y = 0; y < gridSize; y++) {
    terrain[gridSize * y + gridSize - 1] = terrain[gridSize * y + gridSize - 2]
  }
  return terrain
}

function createQuantizedMeshData (
  tile: { terrain: Float32Array },
  mesh: { vertices: Int32Array, triangles: Int32Array },
  tileSize: number,
  terrain: Float32Array | null,
): QuantizedMeshResult {
  const xvals: number[] = []
  const yvals: number[] = []
  const heightMeters: number[] = []
  const northIndices: number[] = []
  const southIndices: number[] = []
  const eastIndices: number[] = []
  const westIndices: number[] = []

  let minimumHeight = Infinity
  let maximumHeight = -Infinity
  const scalar = 32_768 / tileSize

  for (let ix = 0; ix < mesh.vertices.length / 2; ix++) {
    const px = mesh.vertices[ix * 2]
    const py = mesh.vertices[ix * 2 + 1]
    const height = tile.terrain[py * (tileSize + 1) + px]
    if (height > maximumHeight) {
      maximumHeight = height
    }
    if (height < minimumHeight) {
      minimumHeight = height
    }

    heightMeters.push(height)

    if (py === 0) {
      northIndices.push(ix)
    }
    if (py === tileSize) {
      southIndices.push(ix)
    }
    if (px === 0) {
      westIndices.push(ix)
    }
    if (px === tileSize) {
      eastIndices.push(ix)
    }

    xvals.push(px * scalar)
    yvals.push((tileSize - py) * scalar)
  }

  const heightRange = maximumHeight - minimumHeight
  const heights = heightMeters.map(d =>
    heightRange < 1 ? 0 : (d - minimumHeight) * (32_768 / heightRange),
  )

  return {
    minimumHeight,
    maximumHeight,
    quantizedVertices: new Uint16Array([...xvals, ...yvals, ...heights]),
    indices: new Uint16Array(mesh.triangles),
    westIndices,
    southIndices,
    eastIndices,
    northIndices,
    quantizedHeights: terrain,
  }
}

// --- Worker entry ---

const martiniCache: Record<number, InstanceType<typeof Martini>> = {}

function decodeTerrain (
  parameters: TerrainWorkerInput,
  transferableObjects: Transferable[],
): QuantizedMeshResult {
  const {
    imageData,
    tileSize = 256,
    errorLevel,
    maxVertexDistance,
  } = parameters

  const pixels = ndarray(
    new Uint8Array(imageData),
    [tileSize, tileSize, 4],
    [4, 4 * tileSize, 1],
    0,
  )
  const terrain = rgbTerrainToGrid(pixels, terrariumDecodeRgb)

  martiniCache[tileSize] ??= new Martini(tileSize + 1)

  const tile = martiniCache[tileSize].createTile(terrain)
  const mesh = tile.getMesh(errorLevel, Math.min(maxVertexDistance ?? tileSize, tileSize))
  const res = createQuantizedMeshData(tile, mesh, tileSize, terrain)

  transferableObjects.push(res.indices.buffer, res.quantizedVertices.buffer)
  if (res.quantizedHeights) {
    transferableObjects.push(res.quantizedHeights.buffer)
  }
  return res
}

addEventListener('message', (msg: MessageEvent) => {
  const { id, payload } = msg.data
  if (id == null) {
    return
  }
  const objects: Transferable[] = []
  try {
    const res = decodeTerrain(payload, objects)
    // @ts-expect-error postMessage with transferable objects
    self.postMessage({ id, payload: res }, objects)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    self.postMessage({ id, err: message })
  }
})
