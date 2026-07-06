import { describe, it, expect } from 'vitest';
import { Inventory, INVENTORY_SIZE } from '../src/core/inventory.js';
import { ITEM, blockDrop, isBlockItem } from '../src/core/items.js';
import { BLOCK } from '../src/core/blocks.js';

describe('Inventory.add', () => {
  it('stacks into an existing stack before opening a new slot', () => {
    const inv = new Inventory();
    inv.add(ITEM.DIRT, 10);
    inv.add(ITEM.DIRT, 5);
    expect(inv.get(0)).toEqual({ id: ITEM.DIRT, count: 15 });
    expect(inv.get(1)).toBeNull();
  });

  it('splits beyond max stack size into a second slot', () => {
    const inv = new Inventory();
    inv.add(ITEM.STONE, 70);
    expect(inv.get(0)).toEqual({ id: ITEM.STONE, count: 64 });
    expect(inv.get(1)).toEqual({ id: ITEM.STONE, count: 6 });
  });

  it('returns the leftover when the inventory is full', () => {
    const inv = new Inventory();
    for (let i = 0; i < INVENTORY_SIZE; i++) inv.setSlot(i, { id: ITEM.SAND, count: 64 });
    expect(inv.add(ITEM.SAND, 3)).toBe(3);
    expect(inv.add(ITEM.DIRT, 1)).toBe(1);
  });

  it('rejects unknown item ids untouched', () => {
    const inv = new Inventory();
    expect(inv.add(9999, 4)).toBe(4);
    expect(inv.get(0)).toBeNull();
  });
});

describe('Inventory.removeAt / countOf', () => {
  it('removes and clears emptied slots', () => {
    const inv = new Inventory();
    inv.add(ITEM.WOOD, 2);
    expect(inv.removeAt(0, 1)).toBe(1);
    expect(inv.get(0)).toEqual({ id: ITEM.WOOD, count: 1 });
    expect(inv.removeAt(0, 5)).toBe(1); // only 1 left
    expect(inv.get(0)).toBeNull();
  });

  it('counts across multiple stacks', () => {
    const inv = new Inventory();
    inv.add(ITEM.PLANK, 70);
    expect(inv.countOf(ITEM.PLANK)).toBe(70);
  });
});

describe('consumeSelectedBlock', () => {
  it('consumes one item and returns the block id', () => {
    const inv = new Inventory();
    inv.add(ITEM.BRICK, 2);
    inv.selected = 0;
    expect(inv.consumeSelectedBlock()).toBe(BLOCK.BRICK);
    expect(inv.get(0)).toEqual({ id: ITEM.BRICK, count: 1 });
  });

  it('returns null on an empty slot without side effects', () => {
    const inv = new Inventory();
    inv.selected = 3;
    expect(inv.consumeSelectedBlock()).toBeNull();
  });
});

describe('clickSlot (UI move semantics)', () => {
  it('picks up a whole stack with an empty cursor', () => {
    const inv = new Inventory();
    inv.add(ITEM.DIRT, 12);
    const cursor = inv.clickSlot(0, null);
    expect(cursor).toEqual({ id: ITEM.DIRT, count: 12 });
    expect(inv.get(0)).toBeNull();
  });

  it('places the cursor stack into an empty slot', () => {
    const inv = new Inventory();
    const cursor = inv.clickSlot(5, { id: ITEM.SAND, count: 7 });
    expect(cursor).toBeNull();
    expect(inv.get(5)).toEqual({ id: ITEM.SAND, count: 7 });
  });

  it('swaps different items', () => {
    const inv = new Inventory();
    inv.setSlot(2, { id: ITEM.STONE, count: 3 });
    const cursor = inv.clickSlot(2, { id: ITEM.WOOD, count: 1 });
    expect(cursor).toEqual({ id: ITEM.STONE, count: 3 });
    expect(inv.get(2)).toEqual({ id: ITEM.WOOD, count: 1 });
  });

  it('merges same items up to the stack limit', () => {
    const inv = new Inventory();
    inv.setSlot(1, { id: ITEM.DIRT, count: 60 });
    const cursor = inv.clickSlot(1, { id: ITEM.DIRT, count: 10 });
    expect(inv.get(1)).toEqual({ id: ITEM.DIRT, count: 64 });
    expect(cursor).toEqual({ id: ITEM.DIRT, count: 6 });
  });
});

describe('blockDrop', () => {
  it('drops the block itself for plain blocks', () => {
    expect(blockDrop(BLOCK.STONE)).toBe(ITEM.STONE);
    expect(blockDrop(BLOCK.SAND)).toBe(ITEM.SAND);
  });
  it('drops dirt for grass and nothing for leaves/water/air', () => {
    expect(blockDrop(BLOCK.GRASS)).toBe(ITEM.DIRT);
    expect(blockDrop(BLOCK.LEAVES)).toBeNull();
    expect(blockDrop(BLOCK.WATER)).toBeNull();
    expect(blockDrop(BLOCK.AIR)).toBeNull();
  });
  it('every droppable id is a placeable block item', () => {
    for (const b of [BLOCK.DIRT, BLOCK.STONE, BLOCK.SAND, BLOCK.WOOD, BLOCK.PLANK, BLOCK.BRICK]) {
      expect(isBlockItem(blockDrop(b))).toBe(true);
    }
  });
});
