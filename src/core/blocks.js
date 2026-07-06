// Block type registry. IDs are stored per-voxel in a Uint8Array, so keep
// them small integers. AIR must stay 0 (new chunks are zero-filled).

export const BLOCK = {
  AIR: 0,
  GRASS: 1,
  DIRT: 2,
  STONE: 3,
  SAND: 4,
  WOOD: 5,
  LEAVES: 6,
  WATER: 7,
  PLANK: 8,
  BRICK: 9,
};

// Per-block properties.
//   solid:       participates in collision and hides neighbouring faces
//   transparent: rendered but does not fully hide neighbour faces
//   hardness:    bare-hand break time in seconds (Infinity = unbreakable)
//   toolClass:   tool type that mines this block faster ('pickaxe' | 'axe'
//                | 'shovel' | null)
export const BLOCK_INFO = {
  [BLOCK.AIR]: { name: 'air', solid: false, transparent: true, hardness: Infinity, toolClass: null },
  [BLOCK.GRASS]: { name: 'grass', solid: true, transparent: false, hardness: 0.9, toolClass: 'shovel' },
  [BLOCK.DIRT]: { name: 'dirt', solid: true, transparent: false, hardness: 0.75, toolClass: 'shovel' },
  [BLOCK.STONE]: { name: 'stone', solid: true, transparent: false, hardness: 4.0, toolClass: 'pickaxe' },
  [BLOCK.SAND]: { name: 'sand', solid: true, transparent: false, hardness: 0.75, toolClass: 'shovel' },
  [BLOCK.WOOD]: { name: 'wood', solid: true, transparent: false, hardness: 2.5, toolClass: 'axe' },
  [BLOCK.LEAVES]: { name: 'leaves', solid: true, transparent: true, hardness: 0.3, toolClass: null },
  [BLOCK.WATER]: { name: 'water', solid: false, transparent: true, hardness: Infinity, toolClass: null },
  [BLOCK.PLANK]: { name: 'plank', solid: true, transparent: false, hardness: 2.5, toolClass: 'axe' },
  [BLOCK.BRICK]: { name: 'brick', solid: true, transparent: false, hardness: 4.5, toolClass: 'pickaxe' },
};

export function isSolid(id) {
  const info = BLOCK_INFO[id];
  return info ? info.solid : false;
}

export function isTransparent(id) {
  const info = BLOCK_INFO[id];
  return info ? info.transparent : true;
}
