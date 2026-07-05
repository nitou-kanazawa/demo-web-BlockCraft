import { BLOCK, BLOCK_INFO } from '../core/blocks.js';

// Placeable blocks on the hotbar, selected with keys 1-8 or the mouse wheel.
export const HOTBAR_BLOCKS = [
  BLOCK.GRASS,
  BLOCK.DIRT,
  BLOCK.STONE,
  BLOCK.SAND,
  BLOCK.WOOD,
  BLOCK.LEAVES,
  BLOCK.PLANK,
  BLOCK.BRICK,
];

// Representative UI colors (roughly matching the texture atlas).
const SWATCH = {
  [BLOCK.GRASS]: '#4c9e3d',
  [BLOCK.DIRT]: '#8a6244',
  [BLOCK.STONE]: '#8d8d8d',
  [BLOCK.SAND]: '#dbc681',
  [BLOCK.WOOD]: '#6b4a2b',
  [BLOCK.LEAVES]: '#2d6b1f',
  [BLOCK.PLANK]: '#b08d55',
  [BLOCK.BRICK]: '#9c4a38',
};

export class Hotbar {
  constructor(parent = document.body) {
    this.index = 0;
    this.root = document.createElement('div');
    this.root.id = 'hotbar';
    this.slots = HOTBAR_BLOCKS.map((id, i) => {
      const slot = document.createElement('div');
      slot.className = 'slot';
      slot.style.setProperty('--swatch', SWATCH[id]);
      slot.title = BLOCK_INFO[id].name;
      const key = document.createElement('span');
      key.textContent = String(i + 1);
      slot.appendChild(key);
      this.root.appendChild(slot);
      return slot;
    });
    parent.appendChild(this.root);

    document.addEventListener('keydown', (e) => {
      const n = Number(e.code.replace('Digit', ''));
      if (n >= 1 && n <= HOTBAR_BLOCKS.length) this.select(n - 1);
    });
    document.addEventListener('wheel', (e) => {
      const dir = Math.sign(e.deltaY);
      this.select(
        (this.index + dir + HOTBAR_BLOCKS.length) % HOTBAR_BLOCKS.length,
      );
    });
    this.select(0);
  }

  select(i) {
    this.index = i;
    this.slots.forEach((slot, j) => slot.classList.toggle('selected', i === j));
  }

  get selectedBlock() {
    return HOTBAR_BLOCKS[this.index];
  }
}
