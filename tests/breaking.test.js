import { describe, it, expect } from 'vitest';
import { breakDuration, MiningTracker } from '../src/core/breaking.js';
import { BLOCK, BLOCK_INFO } from '../src/core/blocks.js';
import { ITEM } from '../src/core/items.js';

describe('breakDuration', () => {
  it('uses block hardness bare-handed', () => {
    expect(breakDuration(BLOCK.DIRT)).toBe(0.75);
    expect(breakDuration(BLOCK.STONE)).toBe(4.0);
    expect(breakDuration(BLOCK.LEAVES)).toBe(0.3);
  });

  it('marks air and water unbreakable', () => {
    expect(breakDuration(BLOCK.AIR)).toBe(Infinity);
    expect(breakDuration(BLOCK.WATER)).toBe(Infinity);
  });

  it('ignores held block items (no speed bonus)', () => {
    expect(breakDuration(BLOCK.STONE, ITEM.DIRT)).toBe(4.0);
  });

  it('every breakable block has a finite positive hardness', () => {
    for (const [id, info] of Object.entries(BLOCK_INFO)) {
      if (info.hardness !== Infinity) {
        expect(info.hardness).toBeGreaterThan(0);
        expect(Number(id)).not.toBe(BLOCK.AIR);
      }
    }
  });
});

describe('MiningTracker', () => {
  const KEY = '1,2,3';

  it('completes after accumulating the full duration on one target', () => {
    const t = new MiningTracker();
    let completed = 0;
    for (let i = 0; i < 10; i++) {
      if (t.update(true, KEY, 1.0, 0.12)) completed++;
    }
    expect(completed).toBe(1); // 9 * 0.12 > 1.0 exactly once
  });

  it('reports progress between 0 and 1 while mining', () => {
    const t = new MiningTracker();
    t.update(true, KEY, 2.0, 0.5);
    expect(t.progress).toBeCloseTo(0.25, 5);
    t.update(true, KEY, 2.0, 0.5);
    expect(t.progress).toBeCloseTo(0.5, 5);
  });

  it('resets when the target changes', () => {
    const t = new MiningTracker();
    t.update(true, KEY, 1.0, 0.8);
    t.update(true, 'other', 1.0, 0.1);
    expect(t.progress).toBeCloseTo(0.1, 5);
    // The old 0.8 must not carry over to completion.
    expect(t.update(true, 'other', 1.0, 0.3)).toBe(false);
  });

  it('resets when the button is released', () => {
    const t = new MiningTracker();
    t.update(true, KEY, 1.0, 0.9);
    t.update(false, KEY, 1.0, 0.1);
    expect(t.progress).toBe(0);
    expect(t.update(true, KEY, 1.0, 0.2)).toBe(false); // starts from scratch
  });

  it('never completes on unbreakable targets', () => {
    const t = new MiningTracker();
    for (let i = 0; i < 100; i++) {
      expect(t.update(true, KEY, Infinity, 1.0)).toBe(false);
    }
    expect(t.progress).toBe(0);
  });

  it('completes again on a fresh block after finishing one', () => {
    const t = new MiningTracker();
    expect(t.update(true, KEY, 0.2, 0.25)).toBe(true);
    // Same key (a new block occupying the same coords counts as new mining).
    expect(t.update(true, KEY, 0.2, 0.1)).toBe(false);
    expect(t.update(true, KEY, 0.2, 0.15)).toBe(true);
  });
});
