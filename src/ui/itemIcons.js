import { ITEM } from '../core/items.js';

// Procedural pixel-art icons for non-block items, rendered once to data
// URLs. 16x16 maps: '.' transparent, 'H' handle color, 'M' head/material.

const PICKAXE = [
  '................',
  '..MMMMMMMMMM....',
  '.MM....H...MM...',
  '.M.....H.....M..',
  '.M.....H......M.',
  '.......H......M.',
  '.......H........',
  '.......H........',
  '.......H........',
  '.......H........',
  '.......H........',
  '.......H........',
  '.......H........',
  '.......H........',
  '................',
  '................',
];

const AXE = [
  '................',
  '....MMMM........',
  '...MMMMMM.......',
  '...MMMMMM.......',
  '...MM..HH.......',
  '.......H........',
  '.......H........',
  '.......H........',
  '.......H........',
  '.......H........',
  '.......H........',
  '.......H........',
  '.......H........',
  '.......H........',
  '................',
  '................',
];

const SHOVEL = [
  '................',
  '......MMM.......',
  '.....MMMMM......',
  '.....MMMMM......',
  '.....MMMMM......',
  '......MHM.......',
  '.......H........',
  '.......H........',
  '.......H........',
  '.......H........',
  '.......H........',
  '.......H........',
  '.......H........',
  '.......H........',
  '................',
  '................',
];

const STICK = [
  '................',
  '................',
  '............HH..',
  '...........HH...',
  '..........HH....',
  '.........HH.....',
  '........HH......',
  '.......HH.......',
  '......HH........',
  '.....HH.........',
  '....HH..........',
  '...HH...........',
  '..HH............',
  '................',
  '................',
  '................',
];

const PORKCHOP = [
  '................',
  '................',
  '......MMMM......',
  '....MMMMMMMM....',
  '...MMMMMMMMMM...',
  '...MMMMMMMMMM...',
  '...MMMMMMMMM....',
  '....MMMMMMM.....',
  '.....MMMMM......',
  '......MMM.......',
  '.......HH.......',
  '.......HH.......',
  '......HHH.......',
  '................',
  '................',
  '................',
];

const WOOD_COLORS = { H: '#6b4a2b', M: '#b08d55' };
const STONE_COLORS = { H: '#6b4a2b', M: '#8d8d8d' };
const MEAT_COLORS = { H: '#f2e9dc', M: '#e88a8a' }; // bone + meat

function drawIcon(map, colors) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 16;
  const ctx = canvas.getContext('2d');
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const c = colors[map[y][x]];
      if (!c) continue;
      ctx.fillStyle = c;
      ctx.fillRect(x, y, 1, 1);
    }
  }
  return canvas.toDataURL();
}

let cache = null;

/** Data-URL icon for a non-block item id, or null. */
export function itemIconUrl(id) {
  if (!cache) {
    cache = {
      [ITEM.STICK]: drawIcon(STICK, WOOD_COLORS),
      [ITEM.WOOD_PICKAXE]: drawIcon(PICKAXE, WOOD_COLORS),
      [ITEM.WOOD_AXE]: drawIcon(AXE, WOOD_COLORS),
      [ITEM.WOOD_SHOVEL]: drawIcon(SHOVEL, WOOD_COLORS),
      [ITEM.STONE_PICKAXE]: drawIcon(PICKAXE, STONE_COLORS),
      [ITEM.STONE_AXE]: drawIcon(AXE, STONE_COLORS),
      [ITEM.STONE_SHOVEL]: drawIcon(SHOVEL, STONE_COLORS),
      [ITEM.PORKCHOP]: drawIcon(PORKCHOP, MEAT_COLORS),
    };
  }
  return cache[id] ?? null;
}
