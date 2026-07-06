import { maxStackOf, isBlockItem, itemInfo } from './items.js';

// Player inventory: 36 slots (0-8 = hotbar, 9-35 = main grid).
// Stacks are { id, count } or null. Pure logic, unit-tested.

export const INVENTORY_SIZE = 36;
export const HOTBAR_SIZE = 9;

export class Inventory {
  /** `size` defaults to the player inventory; crafting grids pass 4 or 9. */
  constructor(size = INVENTORY_SIZE) {
    this.slots = new Array(size).fill(null);
    this.selected = 0; // selected hotbar index
  }

  get(i) {
    return this.slots[i] ?? null;
  }

  setSlot(i, stack) {
    this.slots[i] = stack && stack.count > 0 ? stack : null;
  }

  /**
   * Add `count` of item `id`, merging into existing stacks first, then
   * filling empty slots (hotbar first). Returns the count that didn't fit.
   */
  add(id, count = 1) {
    if (!itemInfo(id)) return count;
    const max = maxStackOf(id);
    let left = count;
    for (let i = 0; i < this.slots.length && left > 0; i++) {
      const s = this.slots[i];
      if (s && s.id === id && s.count < max) {
        const take = Math.min(max - s.count, left);
        s.count += take;
        left -= take;
      }
    }
    for (let i = 0; i < this.slots.length && left > 0; i++) {
      if (!this.slots[i]) {
        const take = Math.min(max, left);
        this.slots[i] = { id, count: take };
        left -= take;
      }
    }
    return left;
  }

  /** Remove up to `count` items from slot `i`; returns how many were removed. */
  removeAt(i, count = 1) {
    const s = this.slots[i];
    if (!s) return 0;
    const take = Math.min(s.count, count);
    s.count -= take;
    if (s.count === 0) this.slots[i] = null;
    return take;
  }

  /** Total count of item `id` across all slots. */
  countOf(id) {
    return this.slots.reduce((n, s) => n + (s && s.id === id ? s.count : 0), 0);
  }

  get selectedStack() {
    return this.slots[this.selected] ?? null;
  }

  /**
   * Consume one block item from the selected hotbar slot for placement.
   * Returns the block ID to place, or null if the slot has no block item.
   */
  consumeSelectedBlock() {
    const s = this.selectedStack;
    if (!s || !isBlockItem(s.id)) return null;
    const block = itemInfo(s.id).block;
    this.removeAt(this.selected, 1);
    return block;
  }

  /**
   * Click-to-move semantics for the inventory UI: exchange between a cursor
   * stack and slot `i`. Returns the new cursor stack.
   * - empty cursor: pick up the whole slot
   * - same item: merge cursor into the slot (leftover stays on cursor)
   * - different item (or empty slot): swap
   */
  clickSlot(i, cursor) {
    const s = this.slots[i];
    if (!cursor) {
      this.slots[i] = null;
      return s;
    }
    if (s && s.id === cursor.id) {
      const max = maxStackOf(s.id);
      const take = Math.min(max - s.count, cursor.count);
      s.count += take;
      cursor.count -= take;
      return cursor.count > 0 ? cursor : null;
    }
    this.slots[i] = cursor;
    return s;
  }
}
