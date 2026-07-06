import { BLOCK } from './blocks.js';

// Item registry. Block items share their block's numeric ID (< 100);
// non-block items (tools etc.) live at 100+.

export const ITEM = {
  // Block items
  GRASS: BLOCK.GRASS,
  DIRT: BLOCK.DIRT,
  STONE: BLOCK.STONE,
  SAND: BLOCK.SAND,
  WOOD: BLOCK.WOOD,
  LEAVES: BLOCK.LEAVES,
  PLANK: BLOCK.PLANK,
  BRICK: BLOCK.BRICK,
};

export const ITEM_INFO = {
  [ITEM.GRASS]: { name: 'grass', kind: 'block', block: BLOCK.GRASS, maxStack: 64 },
  [ITEM.DIRT]: { name: 'dirt', kind: 'block', block: BLOCK.DIRT, maxStack: 64 },
  [ITEM.STONE]: { name: 'stone', kind: 'block', block: BLOCK.STONE, maxStack: 64 },
  [ITEM.SAND]: { name: 'sand', kind: 'block', block: BLOCK.SAND, maxStack: 64 },
  [ITEM.WOOD]: { name: 'wood', kind: 'block', block: BLOCK.WOOD, maxStack: 64 },
  [ITEM.LEAVES]: { name: 'leaves', kind: 'block', block: BLOCK.LEAVES, maxStack: 64 },
  [ITEM.PLANK]: { name: 'plank', kind: 'block', block: BLOCK.PLANK, maxStack: 64 },
  [ITEM.BRICK]: { name: 'brick', kind: 'block', block: BLOCK.BRICK, maxStack: 64 },
};

export function itemInfo(id) {
  return ITEM_INFO[id] ?? null;
}

export function isBlockItem(id) {
  return ITEM_INFO[id]?.kind === 'block';
}

export function maxStackOf(id) {
  return ITEM_INFO[id]?.maxStack ?? 64;
}

/** Item dropped when a block is broken; null for no drop. */
export function blockDrop(blockId) {
  switch (blockId) {
    case BLOCK.AIR:
    case BLOCK.WATER:
      return null;
    case BLOCK.GRASS:
      return ITEM.DIRT; // grass blocks drop dirt
    case BLOCK.LEAVES:
      return null; // leaves drop nothing
    default:
      return ITEM_INFO[blockId] ? blockId : null;
  }
}
