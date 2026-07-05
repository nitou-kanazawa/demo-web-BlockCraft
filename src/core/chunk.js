import { BLOCK } from './blocks.js';

export const CHUNK_SIZE = 16; // X and Z extent of a chunk
export const CHUNK_HEIGHT = 64; // Y extent of the world

/**
 * A CHUNK_SIZE x CHUNK_HEIGHT x CHUNK_SIZE column of voxels.
 * Storage is a flat Uint8Array indexed as (x, z, y) -> x + z*S + y*S*S,
 * so horizontal slices at the same height stay contiguous.
 */
export class Chunk {
  constructor(cx, cz) {
    this.cx = cx;
    this.cz = cz;
    this.blocks = new Uint8Array(CHUNK_SIZE * CHUNK_SIZE * CHUNK_HEIGHT);
    this.dirty = true; // needs (re)meshing
  }

  static inBounds(x, y, z) {
    return (
      x >= 0 && x < CHUNK_SIZE &&
      y >= 0 && y < CHUNK_HEIGHT &&
      z >= 0 && z < CHUNK_SIZE
    );
  }

  static index(x, y, z) {
    return x + z * CHUNK_SIZE + y * CHUNK_SIZE * CHUNK_SIZE;
  }

  /** Block ID at chunk-local coords; AIR when out of bounds. */
  get(x, y, z) {
    if (!Chunk.inBounds(x, y, z)) return BLOCK.AIR;
    return this.blocks[Chunk.index(x, y, z)];
  }

  /** Set block at chunk-local coords. Out-of-bounds writes are ignored. */
  set(x, y, z, id) {
    if (!Chunk.inBounds(x, y, z)) return;
    this.blocks[Chunk.index(x, y, z)] = id;
    this.dirty = true;
  }
}
