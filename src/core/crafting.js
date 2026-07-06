import { ITEM } from './items.js';

// Shaped crafting. A recipe pattern is a 2D array of item ids (null =
// empty). Matching is position-independent: both the pattern and the
// crafting grid are trimmed to their bounding box and compared, so a 2x2
// recipe works anywhere in a 3x3 grid.

const P = ITEM.PLANK;
const S = ITEM.STICK;
const W = ITEM.WOOD;
const ST = ITEM.STONE;

export const RECIPES = [
  { pattern: [[W]], result: { id: ITEM.PLANK, count: 4 } },
  { pattern: [[P], [P]], result: { id: ITEM.STICK, count: 4 } },
  { pattern: [[P, P], [P, P]], result: { id: ITEM.CRAFTING_TABLE, count: 1 } },
  { pattern: [[ST, ST], [ST, ST]], result: { id: ITEM.BRICK, count: 4 } },
  // Tools (3x3 crafting table only, by their bounding-box size)
  { pattern: [[P, P, P], [null, S, null], [null, S, null]], result: { id: ITEM.WOOD_PICKAXE, count: 1 } },
  { pattern: [[ST, ST, ST], [null, S, null], [null, S, null]], result: { id: ITEM.STONE_PICKAXE, count: 1 } },
  { pattern: [[P, P], [P, S], [null, S]], result: { id: ITEM.WOOD_AXE, count: 1 } },
  { pattern: [[ST, ST], [ST, S], [null, S]], result: { id: ITEM.STONE_AXE, count: 1 } },
  { pattern: [[P], [S], [S]], result: { id: ITEM.WOOD_SHOVEL, count: 1 } },
  { pattern: [[ST], [S], [S]], result: { id: ITEM.STONE_SHOVEL, count: 1 } },
];

/** Trim a 2D id grid to the bounding box of its non-null cells. */
export function trimGrid(rows) {
  let minR = Infinity;
  let maxR = -1;
  let minC = Infinity;
  let maxC = -1;
  rows.forEach((row, r) => row.forEach((cell, c) => {
    if (cell !== null && cell !== undefined) {
      minR = Math.min(minR, r);
      maxR = Math.max(maxR, r);
      minC = Math.min(minC, c);
      maxC = Math.max(maxC, c);
    }
  }));
  if (maxR < 0) return null; // empty grid
  const out = [];
  for (let r = minR; r <= maxR; r++) {
    out.push(rows[r].slice(minC, maxC + 1).map((v) => v ?? null));
  }
  return out;
}

function gridsEqual(a, b) {
  if (a.length !== b.length || a[0].length !== b[0].length) return false;
  return a.every((row, r) => row.every((cell, c) => cell === b[r][c]));
}

/**
 * Match the crafting grid against all recipes.
 * @param cells flat array of item ids (null = empty), row-major
 * @param width grid width (2 for inventory crafting, 3 for the table)
 * @returns { id, count } of the crafted result, or null
 */
export function matchRecipe(cells, width) {
  const rows = [];
  for (let i = 0; i < cells.length; i += width) {
    rows.push(cells.slice(i, i + width).map((v) => v ?? null));
  }
  const trimmed = trimGrid(rows);
  if (!trimmed) return null;
  for (const recipe of RECIPES) {
    if (gridsEqual(trimmed, trimGrid(recipe.pattern))) return { ...recipe.result };
  }
  return null;
}

/**
 * Consume one item from every occupied cell of a crafting grid
 * (an Inventory instance used as the grid). Call after taking the result.
 */
export function consumeGrid(gridInventory) {
  for (let i = 0; i < gridInventory.slots.length; i++) {
    gridInventory.removeAt(i, 1);
  }
}
