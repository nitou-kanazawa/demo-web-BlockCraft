import { HOTBAR_SIZE, INVENTORY_SIZE } from '../core/inventory.js';
import { itemInfo } from '../core/items.js';
import { BLOCK } from '../core/blocks.js';

// DOM UI for the inventory: always-visible hotbar + toggleable panel (E key)
// with click-to-move stacks. Rendering is a cheap full refresh per frame.

// Representative colors (roughly matching the texture atlas).
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

/** Visual for one item stack; extended by later tasks (tools). */
export function stackVisual(stack) {
  if (!stack) return { swatch: null, icon: '', label: '' };
  const info = itemInfo(stack.id);
  return {
    swatch: SWATCH[stack.id] ?? '#777',
    icon: info?.icon ?? '',
    label: info?.name ?? '?',
  };
}

function makeSlot(className) {
  const el = document.createElement('div');
  el.className = `slot ${className}`;
  const icon = document.createElement('span');
  icon.className = 'icon';
  const count = document.createElement('span');
  count.className = 'count';
  el.append(icon, count);
  return el;
}

function paintSlot(el, stack) {
  const { swatch, icon } = stackVisual(stack);
  el.style.setProperty('--swatch', swatch ?? 'transparent');
  el.classList.toggle('empty', !stack);
  el.querySelector('.icon').textContent = icon;
  el.querySelector('.count').textContent = stack && stack.count > 1 ? stack.count : '';
  el.title = stack ? stackVisual(stack).label : '';
}

export class InventoryUI {
  constructor(inventory, controls) {
    this.inventory = inventory;
    this.controls = controls;
    this.open = false;
    this.cursor = null; // stack held on the mouse cursor inside the panel

    // Hotbar (always visible).
    this.hotbarRoot = document.createElement('div');
    this.hotbarRoot.id = 'hotbar';
    this.hotbarSlots = [];
    for (let i = 0; i < HOTBAR_SIZE; i++) {
      const slot = makeSlot('hotbar-slot');
      const key = document.createElement('span');
      key.className = 'key';
      key.textContent = String(i + 1);
      slot.appendChild(key);
      this.hotbarRoot.appendChild(slot);
      this.hotbarSlots.push(slot);
    }
    document.body.appendChild(this.hotbarRoot);

    // Panel (toggled with E).
    this.panel = document.createElement('div');
    this.panel.id = 'inventory';
    this.panel.innerHTML = '<div class="inv-title">インベントリ (E で閉じる)</div>';
    this.grid = document.createElement('div');
    this.grid.className = 'inv-grid';
    this.panelSlots = [];
    // Main grid (9-35) on top, hotbar row (0-8) below, like Minecraft.
    const order = [];
    for (let i = HOTBAR_SIZE; i < INVENTORY_SIZE; i++) order.push(i);
    for (let i = 0; i < HOTBAR_SIZE; i++) order.push(i);
    for (const index of order) {
      const slot = makeSlot(index < HOTBAR_SIZE ? 'panel-hotbar' : 'panel-main');
      slot.addEventListener('mousedown', (e) => {
        e.preventDefault();
        this.cursor = this.inventory.clickSlot(index, this.cursor);
      });
      this.grid.appendChild(slot);
      this.panelSlots[index] = slot;
    }
    this.panel.appendChild(this.grid);
    document.body.appendChild(this.panel);

    // Cursor stack following the mouse.
    this.cursorEl = makeSlot('cursor-stack');
    this.cursorEl.id = 'cursor-stack';
    document.body.appendChild(this.cursorEl);
    document.addEventListener('mousemove', (e) => {
      this.cursorEl.style.left = `${e.clientX}px`;
      this.cursorEl.style.top = `${e.clientY}px`;
    });

    document.addEventListener('keydown', (e) => {
      if (e.code === 'KeyE' && (this.controls.locked || this.open)) {
        this.toggle();
        return;
      }
      if (this.open || !this.controls.locked) return;
      const n = Number(e.code.replace('Digit', ''));
      if (n >= 1 && n <= HOTBAR_SIZE) this.inventory.selected = n - 1;
    });
    document.addEventListener('wheel', (e) => {
      if (this.open || !this.controls.locked) return;
      const dir = Math.sign(e.deltaY);
      this.inventory.selected =
        (this.inventory.selected + dir + HOTBAR_SIZE) % HOTBAR_SIZE;
    });
  }

  toggle() {
    this.open = !this.open;
    this.panel.style.display = this.open ? 'block' : 'none';
    if (this.open) {
      document.exitPointerLock();
    } else {
      // Drop the cursor stack back into the inventory when closing.
      if (this.cursor) {
        this.inventory.add(this.cursor.id, this.cursor.count);
        this.cursor = null;
      }
      this.controls.domElement.requestPointerLock();
    }
  }

  /** Refresh all slot visuals; call once per frame. */
  render() {
    for (let i = 0; i < HOTBAR_SIZE; i++) {
      paintSlot(this.hotbarSlots[i], this.inventory.get(i));
      this.hotbarSlots[i].classList.toggle('selected', this.inventory.selected === i);
    }
    if (this.open) {
      for (let i = 0; i < INVENTORY_SIZE; i++) {
        paintSlot(this.panelSlots[i], this.inventory.get(i));
      }
    }
    this.cursorEl.style.display = this.open && this.cursor ? 'flex' : 'none';
    if (this.cursor) paintSlot(this.cursorEl, this.cursor);
  }
}
