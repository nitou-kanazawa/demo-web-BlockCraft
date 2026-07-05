import { BLOCK } from './blocks.js';
import { CHUNK_SIZE, CHUNK_HEIGHT } from './chunk.js';
import { ValueNoise2D, mulberry32 } from './noise.js';

export const WATER_LEVEL = 20;
const TREE_PROBABILITY = 0.008;
const TREE_MARGIN = 3; // trees up to this many blocks outside a chunk can reach into it

/** Deterministic per-column random in [0,1), independent of chunk borders. */
export function columnRand(seed, wx, wz) {
  const h = (seed ^ Math.imul(wx, 374761393) ^ Math.imul(wz, 668265263)) | 0;
  return mulberry32(h)();
}

/** Terrain surface height (top solid block Y) at world column (wx, wz). */
export function terrainHeight(noise, wx, wz) {
  const base = noise.fbm(wx, wz, 4, 0.5, 1 / 96);
  const h = Math.floor(10 + base * 28);
  return Math.max(1, Math.min(CHUNK_HEIGHT - 8, h));
}

function treeHeightAt(seed, wx, wz) {
  // Second draw decides the trunk height so it is independent of the
  // placement probability draw.
  const r = columnRand(seed ^ 0x9e3779b9, wx, wz);
  return 4 + Math.floor(r * 3); // 4..6
}

/**
 * Fill `chunk` with procedurally generated terrain.
 * Fully deterministic in (seed, chunk.cx, chunk.cz): the same chunk is
 * always regenerated identically, and features that straddle chunk borders
 * (trees) agree between neighbouring chunks.
 */
export function generateChunk(chunk, seed, noise = new ValueNoise2D(seed)) {
  const ox = chunk.cx * CHUNK_SIZE;
  const oz = chunk.cz * CHUNK_SIZE;

  // Terrain columns.
  for (let x = 0; x < CHUNK_SIZE; x++) {
    for (let z = 0; z < CHUNK_SIZE; z++) {
      const wx = ox + x;
      const wz = oz + z;
      const h = terrainHeight(noise, wx, wz);
      const beach = h <= WATER_LEVEL + 1;
      for (let y = 0; y <= h; y++) {
        let id;
        if (y === h) id = beach ? BLOCK.SAND : BLOCK.GRASS;
        else if (y >= h - 3) id = beach ? BLOCK.SAND : BLOCK.DIRT;
        else id = BLOCK.STONE;
        chunk.set(x, y, z, id);
      }
      for (let y = h + 1; y <= WATER_LEVEL; y++) {
        chunk.set(x, y, z, BLOCK.WATER);
      }
    }
  }

  // Trees. Scan a margin around the chunk so canopies reaching across the
  // border are drawn identically by both neighbouring chunks.
  for (let x = -TREE_MARGIN; x < CHUNK_SIZE + TREE_MARGIN; x++) {
    for (let z = -TREE_MARGIN; z < CHUNK_SIZE + TREE_MARGIN; z++) {
      const wx = ox + x;
      const wz = oz + z;
      if (columnRand(seed, wx, wz) >= TREE_PROBABILITY) continue;
      const h = terrainHeight(noise, wx, wz);
      if (h <= WATER_LEVEL + 1) continue; // no trees on beaches / under water
      placeTree(chunk, x, h + 1, z, treeHeightAt(seed, wx, wz));
    }
  }
}

/** Draw a tree with trunk base at chunk-local (x, y, z), clipped to the chunk. */
function placeTree(chunk, x, y, z, trunkHeight) {
  // Canopy: two 5x5-ish layers below the top, a 3x3 cap, and a plus-shaped tip.
  const topY = y + trunkHeight - 1;
  for (let dy = -2; dy <= 1; dy++) {
    const ly = topY + dy;
    if (ly < 0 || ly >= CHUNK_HEIGHT) continue;
    const radius = dy < 0 ? 2 : 1;
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dz = -radius; dz <= radius; dz++) {
        // Trim the four corners of the wide layers for a rounder look,
        // and keep only a plus shape on the very top layer.
        if (radius === 2 && Math.abs(dx) === 2 && Math.abs(dz) === 2) continue;
        if (dy === 1 && Math.abs(dx) + Math.abs(dz) > 1) continue;
        const lx = x + dx;
        const lz = z + dz;
        if (chunk.get(lx, ly, lz) === BLOCK.AIR) {
          chunk.set(lx, ly, lz, BLOCK.LEAVES);
        }
      }
    }
  }
  // Trunk last so it overwrites leaves at the column.
  for (let dy = 0; dy < trunkHeight; dy++) {
    chunk.set(x, y + dy, z, BLOCK.WOOD);
  }
}
