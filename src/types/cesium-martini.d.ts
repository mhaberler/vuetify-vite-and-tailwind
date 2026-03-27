declare module '@macrostrat/cesium-martini' {
  import type { Credit, TerrainProvider } from 'cesium'
  import type { NdArray } from 'ndarray'

  export interface TileCoordinates {
    z: number
    x: number
    y: number
  }

  export interface HeightmapResource {
    tileSize: number
    maxZoom: number
    credit?: Credit
    getTilePixels: (coords: TileCoordinates) => Promise<ImageData | undefined>
    getTileDataAvailable: (coords: TileCoordinates) => boolean
  }

  export interface WorkerFarmTerrainDecoderOptions {
    worker: Worker
  }

  export class WorkerFarmTerrainDecoder {
    constructor (options: WorkerFarmTerrainDecoderOptions)
  }

  export interface MartiniTerrainProviderOptions {
    resource: HeightmapResource
    decoder: WorkerFarmTerrainDecoder
  }

  export class MartiniTerrainProvider extends TerrainProvider {
    constructor (options: MartiniTerrainProviderOptions)
  }

  export type DecodeRgbFunction = (r: number, g: number, b: number, a: number) => number

  export interface TerrainWorkerInput extends QuantizedMeshOptions {
    imageData: Uint8ClampedArray
    maxVertexDistance: number | null
    x: number
    y: number
    z: number
  }

  export interface QuantizedMeshOptions {
    errorLevel: number
    tileSize: number
    ellipsoidRadius: number
  }

  export interface QuantizedMeshResult {
    minimumHeight: number
    maximumHeight: number
    quantizedVertices: Uint16Array
    indices: Uint16Array
    westIndices: number[]
    southIndices: number[]
    eastIndices: number[]
    northIndices: number[]
    quantizedHeights?: Float32Array | null
  }

  export function rgbTerrainToGrid (png: NdArray, decodeRgb?: DecodeRgbFunction): Float32Array
  export function createQuantizedMeshData (
    tile: { terrain: Float32Array },
    mesh: { vertices: Int32Array, triangles: Int32Array },
    tileSize: number,
    terrain: Float32Array | null,
  ): QuantizedMeshResult
}

declare module '@mapbox/martini' {
  class Martini {
    constructor (gridSize: number)
    createTile (terrain: Float32Array): MartiniTile
  }

  interface MartiniTile {
    terrain: Float32Array
    getMesh: (maxError: number, maxLength: number) => { vertices: Int32Array, triangles: Int32Array }
  }

  export default Martini
}

declare module '@macrostrat/cesium-martini/src/worker/worker-util' {
  import type { NdArray } from 'ndarray'

  export type DecodeRgbFunction = (r: number, g: number, b: number, a: number) => number

  export interface QuantizedMeshOptions {
    errorLevel: number
    tileSize: number
    ellipsoidRadius: number
  }

  export interface TerrainWorkerInput extends QuantizedMeshOptions {
    imageData: Uint8ClampedArray
    maxVertexDistance: number | null
    x: number
    y: number
    z: number
  }

  export interface QuantizedMeshResult {
    minimumHeight: number
    maximumHeight: number
    quantizedVertices: Uint16Array
    indices: Uint16Array
    westIndices: number[]
    southIndices: number[]
    eastIndices: number[]
    northIndices: number[]
    quantizedHeights?: Float32Array | null
  }

  export function rgbTerrainToGrid (png: NdArray, decodeRgb?: DecodeRgbFunction): Float32Array
  export function createQuantizedMeshData (
    tile: { terrain: Float32Array },
    mesh: { vertices: Int32Array, triangles: Int32Array },
    tileSize: number,
    terrain: Float32Array | null,
  ): QuantizedMeshResult
}
