import { Inventory, HOTBAR_SIZE, INVENTORY_SIZE } from '../core/inventory.js';
import { itemInfo, maxStackOf } from '../core/items.js';
import { itemIconUrl } from './itemIcons.js';
import { matchRecipe, consumeGrid } from '../core/crafting.js';
import { BLOCK_COLORS as SWATCH } from '../core/blockColors.js';

// DOM UI for the inventory: always-visible hotbar + toggleable panel (E key)
// with click-to-move stacks and a crafting grid (2x2 from the inventory,
// 3x3 when opened at a crafting table).

/** Visual for one item stack: color swatch for blocks, icon for the rest. */
export function stackVisual(stack) {
  if (!stack) return { swatch: null, iconUrl: null, label: '' };
  const info = itemInfo(stack.id);
  const iconUrl = itemIconUrl(stack.id);
  return {
    swatch: iconUrl ? null : SWATCH[stack.id] ?? '#777',
    iconUrl,
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
  const { swatch, iconUrl, label } = stackVisual(stack);
  el.style.setProperty('--swatch', swatch ?? 'transparent');
  el.classList.toggle('empty', !stack);
  const iconEl = el.querySelector('.icon');
  iconEl.style.backgroundImage = iconUrl ? `url(${iconUrl})` : 'none';
  el.querySelector('.count').textContent = stack && stack.count > 1 ? stack.count : '';
  el.title = label;
}

export class InventoryUI {
  constructor(inventory, controls) {
    this.inventory = inventory;
    this.controls = controls;
    this.open = false;
    this.cursor = null; // stack held on the mouse cursor inside the panel
    this.craftInv = null; // Inventory(4|9) while the panel is open
    this.craftWidth = 2;
    this.sounds = null; // optional SoundPlayer, assigned by main

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

    // Panel (toggled with E / opened by a crafting table).
    this.panel = document.createElement('div');
    this.panel.id = 'inventory';
    this.title = document.createElement('div');
    this.title.className = 'inv-title';
    this.panel.appendChild(this.title);

    // Crafting area: grid + arrow + result slot.
    this.craftArea = document.createElement('div');
    this.craftArea.className = 'craft-area';
    this.craftGridEl = document.createElement('div');
    this.craftGridEl.className = 'craft-grid';
    const arrow = document.createElement('div');
    arrow.className = 'craft-arrow';
    arrow.textContent = '→';
    this.resultSlot = makeSlot('craft-result');
    this.resultSlot.addEventListener('mousedown', (e) => {
      e.preventDefault();
      this.takeResult();
    });
    this.craftArea.append(this.craftGridEl, arrow, this.resultSlot);
    this.panel.appendChild(this.craftArea);
    this.craftSlots = [];

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
        this.sounds?.play('click');
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
        if (this.open) this.close();
        else this.openPanel(2);
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

  /** Open the panel with a `width` x `width` crafting grid (2 or 3). */
  openPanel(width) {
    if (this.open) return;
    this.open = true;
    this.craftWidth = width;
    this.craftInv = new Inventory(width * width);
    this.title.textContent =
      width === 3 ? '作業台 (E で閉じる)' : 'インベントリ (E で閉じる)';

    this.craftGridEl.innerHTML = '';
    this.craftGridEl.style.gridTemplateColumns = `repeat(${width}, 44px)`;
    this.craftSlots = [];
    for (let i = 0; i < width * width; i++) {
      const slot = makeSlot('craft-slot');
      slot.addEventListener('mousedown', (e) => {
        e.preventDefault();
        this.cursor = this.craftInv.clickSlot(i, this.cursor);
        this.sounds?.play('click');
      });
      this.craftGridEl.appendChild(slot);
      this.craftSlots.push(slot);
    }

    this.panel.style.display = 'block';
    document.exitPointerLock();
  }

  close() {
    if (!this.open) return;
    this.open = false;
    // Return crafting materials and the cursor stack to the inventory.
    for (const s of this.craftInv.slots) {
      if (s) this.inventory.add(s.id, s.count);
    }
    this.craftInv = null;
    if (this.cursor) {
      this.inventory.add(this.cursor.id, this.cursor.count);
      this.cursor = null;
    }
    this.panel.style.display = 'none';
    this.controls.domElement.requestPointerLock();
  }

  /** Current craft result stack, or null. */
  get craftResult() {
    if (!this.craftInv) return null;
    const ids = this.craftInv.slots.map((s) => (s ? s.id : null));
    return matchRecipe(ids, this.craftWidth);
  }

  /** Click on the result slot: craft once onto the cursor. */
  takeResult() {
    const result = this.craftResult;
    if (!result) return;
    if (!this.cursor) {
      this.cursor = { id: result.id, count: result.count };
    } else if (
      this.cursor.id === result.id
      && this.cursor.count + result.count <= maxStackOf(result.id)
    ) {
      this.cursor.count += result.count;
    } else {
      return; // cursor holds something incompatible
    }
    consumeGrid(this.craftInv);
    this.sounds?.play('craft');
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
      for (let i = 0; i < this.craftSlots.length; i++) {
        paintSlot(this.craftSlots[i], this.craftInv.get(i));
      }
      paintSlot(this.resultSlot, this.craftResult);
    }
    this.cursorEl.style.display = this.open && this.cursor ? 'flex' : 'none';
    if (this.cursor) paintSlot(this.cursorEl, this.cursor);
  }
}
