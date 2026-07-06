import { describe, it, expect } from 'vitest';
import { matchRecipe, trimGrid, consumeGrid, RECIPES } from '../src/core/crafting.js';
import { ITEM, itemInfo } from '../src/core/items.js';
import { Inventory } from '../src/core/inventory.js';

const P = ITEM.PLANK;
const S = ITEM.STICK;
const W = ITEM.WOOD;
const ST = ITEM.STONE;
const _ = null;

describe('trimGrid', () => {
  it('trims to the bounding box of non-empty cells', () => {
    expect(trimGrid([[_, _, _], [_, W, _], [_, _, _]])).toEqual([[W]]);
    expect(trimGrid([[_, P, _], [_, P, _], [_, _, _]])).toEqual([[P], [P]]);
  });
  it('returns null for an empty grid', () => {
    expect(trimGrid([[_, _], [_, _]])).toBeNull();
  });
});

describe('matchRecipe', () => {
  it('crafts planks from wood anywhere in any grid', () => {
    expect(matchRecipe([W, _, _, _], 2)).toEqual({ id: ITEM.PLANK, count: 4 });
    expect(matchRecipe([_, _, _, W], 2)).toEqual({ id: ITEM.PLANK, count: 4 });
    expect(matchRecipe([_, _, _, _, W, _, _, _, _], 3)).toEqual({ id: ITEM.PLANK, count: 4 });
  });

  it('crafts sticks from two vertical planks but not horizontal', () => {
    expect(matchRecipe([P, _, P, _], 2)).toEqual({ id: ITEM.STICK, count: 4 });
    expect(matchRecipe([P, P, _, _], 2)).toBeNull();
  });

  it('crafts a crafting table from 2x2 planks in both grid sizes', () => {
    expect(matchRecipe([P, P, P, P], 2)).toEqual({ id: ITEM.CRAFTING_TABLE, count: 1 });
    expect(matchRecipe([_, _, _, _, P, P, _, P, P], 3))
      .toEqual({ id: ITEM.CRAFTING_TABLE, count: 1 });
  });

  it('crafts a wooden pickaxe on the 3x3 table, offset-invariant', () => {
    expect(matchRecipe([P, P, P, _, S, _, _, S, _], 3))
      .toEqual({ id: ITEM.WOOD_PICKAXE, count: 1 });
  });

  it('rejects tool recipes in the 2x2 grid (do not fit)', () => {
    // A pickaxe needs a 3-wide pattern; nothing 2x2 should produce it.
    expect(matchRecipe([P, P, S, S], 2)).toBeNull();
  });

  it('distinguishes wood and stone tool variants', () => {
    expect(matchRecipe([ST, ST, ST, _, S, _, _, S, _], 3))
      .toEqual({ id: ITEM.STONE_PICKAXE, count: 1 });
    expect(matchRecipe([P, _, _, S, _, _, S, _, _], 3))
      .toEqual({ id: ITEM.WOOD_SHOVEL, count: 1 });
    expect(matchRecipe([P, P, _, P, S, _, _, S, _], 3))
      .toEqual({ id: ITEM.WOOD_AXE, count: 1 });
  });

  it('crafts bricks from 2x2 stone', () => {
    expect(matchRecipe([ST, ST, ST, ST], 2)).toEqual({ id: ITEM.BRICK, count: 4 });
  });

  it('rejects a grid with extra junk around a valid shape', () => {
    expect(matchRecipe([W, _, _, _, _, _, _, _, ST], 3)).toBeNull();
  });

  it('every recipe result is a registered item', () => {
    for (const r of RECIPES) {
      expect(itemInfo(r.result.id)).not.toBeNull();
      expect(r.result.count).toBeGreaterThan(0);
    }
  });
});

describe('consumeGrid', () => {
  it('takes exactly one item from each occupied cell', () => {
    const grid = new Inventory(4);
    grid.setSlot(0, { id: P, count: 3 });
    grid.setSlot(1, { id: P, count: 1 });
    consumeGrid(grid);
    expect(grid.get(0)).toEqual({ id: P, count: 2 });
    expect(grid.get(1)).toBeNull();
    expect(grid.get(2)).toBeNull();
  });

  it('supports craft-until-empty loops', () => {
    const grid = new Inventory(4);
    grid.setSlot(0, { id: W, count: 2 });
    const ids = () => grid.slots.map((s) => (s ? s.id : null));
    expect(matchRecipe(ids(), 2)).toEqual({ id: ITEM.PLANK, count: 4 });
    consumeGrid(grid);
    expect(matchRecipe(ids(), 2)).toEqual({ id: ITEM.PLANK, count: 4 });
    consumeGrid(grid);
    expect(matchRecipe(ids(), 2)).toBeNull(); // materials exhausted
  });
});

describe('sized Inventory (crafting grids)', () => {
  it('respects the grid size in add()', () => {
    const grid = new Inventory(4);
    expect(grid.slots.length).toBe(4);
    grid.add(P, 64 * 5); // way more than 4 slots hold
    expect(grid.slots.every((s) => s && s.count === 64)).toBe(true);
  });
});
