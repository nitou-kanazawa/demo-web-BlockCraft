import { BLOCK, isSolid } from './blocks.js';
import { Chunk, CHUNK_SIZE, CHUNK_HEIGHT } from './chunk.js';
import { ValueNoise2D } from './noise.js';
import { generateChunk } from './worldgen.js';
import { mod } from './math.js';

/**
 * The voxel world: a sparse map of generated chunks, addressed in world
 * coordinates. Chunk generation is lazy — chunks come into existence the
 * first time they are needed.
 */
export class World {
  constructor(seed = 1337) {
    this.seed = seed;
    this.noise = new ValueNoise2D(seed);
    this.chunks = new Map();
  }

  static key(cx, cz) {
    return `${cx},${cz}`;
  }

  static toChunkCoord(w) {
    return Math.floor(w / CHUNK_SIZE);
  }

  getChunk(cx, cz) {
    return this.chunks.get(World.key(cx, cz));
  }

  /** Get the chunk at (cx, cz), generating it if it does not exist yet. */
  ensureChunk(cx, cz) {
    const key = World.key(cx, cz);
    let chunk = this.chunks.get(key);
    if (!chunk) {
      chunk = new Chunk(cx, cz);
      generateChunk(chunk, this.seed, this.noise);
      this.chunks.set(key, chunk);
      // Existing neighbours meshed against AIR where this chunk now stands;
      // they need remeshing to drop those now-hidden border faces.
      for (const [dx, dz] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        const n = this.getChunk(cx + dx, cz + dz);
        if (n) n.dirty = true;
      }
    }
    return chunk;
  }

  /** Block ID at world coords. AIR outside vertical bounds or ungenerated chunks. */
  getBlock(wx, wy, wz) {
    if (wy < 0 || wy >= CHUNK_HEIGHT) return BLOCK.AIR;
    const chunk = this.getChunk(World.toChunkCoord(wx), World.toChunkCoord(wz));
    if (!chunk) return BLOCK.AIR;
    return chunk.get(mod(wx, CHUNK_SIZE), wy, mod(wz, CHUNK_SIZE));
  }

  isSolidAt(wx, wy, wz) {
    return isSolid(this.getBlock(wx, wy, wz));
  }

  /**
   * Set a block at world coords (generates the chunk if needed).
   * Marks the containing chunk dirty, plus adjacent chunks when the block
   * sits on a border — their meshes show this block's faces too.
   */
  setBlock(wx, wy, wz, id) {
    if (wy < 0 || wy >= CHUNK_HEIGHT) return;
    const cx = World.toChunkCoord(wx);
    const cz = World.toChunkCoord(wz);
    const lx = mod(wx, CHUNK_SIZE);
    const lz = mod(wz, CHUNK_SIZE);
    this.ensureChunk(cx, cz).set(lx, wy, lz, id);
    const markDirty = (ncx, ncz) => {
      const n = this.getChunk(ncx, ncz);
      if (n) n.dirty = true;
    };
    if (lx === 0) markDirty(cx - 1, cz);
    if (lx === CHUNK_SIZE - 1) markDirty(cx + 1, cz);
    if (lz === 0) markDirty(cx, cz - 1);
    if (lz === CHUNK_SIZE - 1) markDirty(cx, cz + 1);
  }

  /** Y of the highest solid block in the column, or -1 if none. */
  surfaceHeight(wx, wz) {
    for (let y = CHUNK_HEIGHT - 1; y >= 0; y--) {
      if (this.isSolidAt(wx, y, wz)) return y;
    }
    return -1;
  }
}
