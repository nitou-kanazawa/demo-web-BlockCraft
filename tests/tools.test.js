import { describe, it, expect } from 'vitest';
import { breakDuration } from '../src/core/breaking.js';
import { BLOCK } from '../src/core/blocks.js';
import { ITEM, ITEM_INFO, itemInfo, isBlockItem, maxStackOf } from '../src/core/items.js';
import { Inventory } from '../src/core/inventory.js';

describe('tool items', () => {
  const TOOLS = [
    ITEM.WOOD_PICKAXE, ITEM.WOOD_AXE, ITEM.WOOD_SHOVEL,
    ITEM.STONE_PICKAXE, ITEM.STONE_AXE, ITEM.STONE_SHOVEL,
  ];

  it('are registered as non-stackable non-block items', () => {
    for (const id of TOOLS) {
      const info = itemInfo(id);
      expect(info.kind).toBe('tool');
      expect(maxStackOf(id)).toBe(1);
      expect(isBlockItem(id)).toBe(false);
      expect(info.speed).toBeGreaterThan(1);
    }
  });

  it('do not stack in the inventory', () => {
    const inv = new Inventory();
    inv.add(ITEM.WOOD_PICKAXE, 1);
    inv.add(ITEM.WOOD_PICKAXE, 1);
    expect(inv.get(0)).toEqual({ id: ITEM.WOOD_PICKAXE, count: 1 });
    expect(inv.get(1)).toEqual({ id: ITEM.WOOD_PICKAXE, count: 1 });
  });

  it('cannot be placed as blocks', () => {
    const inv = new Inventory();
    inv.add(ITEM.STONE_AXE, 1);
    inv.selected = 0;
    expect(inv.consumeSelectedBlock()).toBeNull();
    expect(inv.get(0)).toEqual({ id: ITEM.STONE_AXE, count: 1 }); // not consumed
  });
});

describe('tool mining speed', () => {
  it('speeds up only the matching block class', () => {
    // Stone (hardness 4, pickaxe class)
    expect(breakDuration(BLOCK.STONE, ITEM.WOOD_PICKAXE)).toBeCloseTo(4 / 3);
    expect(breakDuration(BLOCK.STONE, ITEM.STONE_PICKAXE)).toBeCloseTo(4 / 6);
    expect(breakDuration(BLOCK.STONE, ITEM.WOOD_AXE)).toBe(4); // wrong tool
    expect(breakDuration(BLOCK.STONE, ITEM.WOOD_SHOVEL)).toBe(4);
  });

  it('axes speed up wood and planks', () => {
    expect(breakDuration(BLOCK.WOOD, ITEM.WOOD_AXE)).toBeCloseTo(2.5 / 3);
    expect(breakDuration(BLOCK.PLANK, ITEM.STONE_AXE)).toBeCloseTo(2.5 / 6);
    expect(breakDuration(BLOCK.WOOD, ITEM.STONE_PICKAXE)).toBe(2.5);
  });

  it('shovels speed up dirt, grass and sand', () => {
    expect(breakDuration(BLOCK.DIRT, ITEM.WOOD_SHOVEL)).toBeCloseTo(0.75 / 3);
    expect(breakDuration(BLOCK.GRASS, ITEM.STONE_SHOVEL)).toBeCloseTo(0.9 / 6);
    expect(breakDuration(BLOCK.SAND, ITEM.WOOD_PICKAXE)).toBe(0.75);
  });

  it('leaves get no tool bonus (no tool class)', () => {
    for (const id of [ITEM.WOOD_AXE, ITEM.WOOD_PICKAXE, ITEM.WOOD_SHOVEL]) {
      expect(breakDuration(BLOCK.LEAVES, id)).toBe(0.3);
    }
  });

  it('stone tools are strictly faster than wood tools', () => {
    expect(ITEM_INFO[ITEM.STONE_PICKAXE].speed).toBeGreaterThan(ITEM_INFO[ITEM.WOOD_PICKAXE].speed);
  });
});
