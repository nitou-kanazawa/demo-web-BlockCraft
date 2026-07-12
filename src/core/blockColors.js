import { BLOCK } from './blocks.js';

// Representative block colors (roughly matching the texture atlas), shared
// by the inventory UI swatches and the particle system.

export const BLOCK_COLORS = {
  [BLOCK.GRASS]: '#4c9e3d',
  [BLOCK.DIRT]: '#8a6244',
  [BLOCK.STONE]: '#8d8d8d',
  [BLOCK.SAND]: '#dbc681',
  [BLOCK.WOOD]: '#6b4a2b',
  [BLOCK.LEAVES]: '#2d6b1f',
  [BLOCK.WATER]: '#3a6fd8',
  [BLOCK.PLANK]: '#b08d55',
  [BLOCK.BRICK]: '#9c4a38',
  [BLOCK.CRAFTING_TABLE]: '#8a6a3a',
  [BLOCK.WOOL]: '#e8e6e0',
};

/** '#rrggbb' -> [r, g, b] in [0, 1]. */
export function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}
