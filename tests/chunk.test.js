import { describe, it, expect } from 'vitest';
import { Chunk, CHUNK_SIZE, CHUNK_HEIGHT } from '../src/core/chunk.js';
import { BLOCK } from '../src/core/blocks.js';

describe('Chunk', () => {
  it('starts filled with AIR and marked dirty', () => {
    const c = new Chunk(0, 0);
    expect(c.get(0, 0, 0)).toBe(BLOCK.AIR);
    expect(c.get(15, 63, 15)).toBe(BLOCK.AIR);
    expect(c.dirty).toBe(true);
  });

  it('round-trips set/get', () => {
    const c = new Chunk(0, 0);
    c.set(3, 10, 7, BLOCK.STONE);
    expect(c.get(3, 10, 7)).toBe(BLOCK.STONE);
    expect(c.get(3, 10, 8)).toBe(BLOCK.AIR);
  });

  it('ignores out-of-bounds writes and reads them as AIR', () => {
    const c = new Chunk(0, 0);
    c.set(-1, 0, 0, BLOCK.STONE);
    c.set(0, CHUNK_HEIGHT, 0, BLOCK.STONE);
    c.set(CHUNK_SIZE, 0, 0, BLOCK.STONE);
    expect(c.get(-1, 0, 0)).toBe(BLOCK.AIR);
    expect(c.get(0, CHUNK_HEIGHT, 0)).toBe(BLOCK.AIR);
    expect(c.get(CHUNK_SIZE, 0, 0)).toBe(BLOCK.AIR);
    // Nothing leaked into real cells.
    expect(c.blocks.every((b) => b === BLOCK.AIR)).toBe(true);
  });

  it('uses distinct storage slots for all coordinates', () => {
    const c = new Chunk(0, 0);
    const seen = new Set();
    for (const [x, y, z] of [
      [0, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1],
      [15, 63, 15], [15, 0, 0], [0, 63, 0], [0, 0, 15],
    ]) {
      const idx = Chunk.index(x, y, z);
      expect(seen.has(idx)).toBe(false);
      seen.add(idx);
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThan(c.blocks.length);
    }
  });
});
