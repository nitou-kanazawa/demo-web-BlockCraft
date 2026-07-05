import { describe, it, expect } from 'vitest';
import { ValueNoise2D, mulberry32 } from '../src/core/noise.js';

describe('mulberry32', () => {
  it('is deterministic for the same seed', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    for (let i = 0; i < 10; i++) expect(a()).toBe(b());
  });
  it('produces values in [0, 1)', () => {
    const r = mulberry32(7);
    for (let i = 0; i < 1000; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('ValueNoise2D', () => {
  it('is deterministic for the same seed', () => {
    const n1 = new ValueNoise2D(123);
    const n2 = new ValueNoise2D(123);
    for (let i = 0; i < 50; i++) {
      const x = i * 1.37;
      const z = i * -2.11;
      expect(n1.noise(x, z)).toBe(n2.noise(x, z));
      expect(n1.fbm(x, z)).toBe(n2.fbm(x, z));
    }
  });

  it('differs across seeds', () => {
    const n1 = new ValueNoise2D(1);
    const n2 = new ValueNoise2D(2);
    let different = false;
    for (let i = 0; i < 20 && !different; i++) {
      if (n1.noise(i * 0.7, i * 1.3) !== n2.noise(i * 0.7, i * 1.3)) different = true;
    }
    expect(different).toBe(true);
  });

  it('stays within [0, 1)', () => {
    const n = new ValueNoise2D(99);
    for (let i = 0; i < 500; i++) {
      const v = n.fbm(i * 0.531 - 100, i * -0.717 + 50);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('is continuous (no jumps between nearby samples)', () => {
    const n = new ValueNoise2D(5);
    const eps = 0.001;
    for (let i = 0; i < 100; i++) {
      const x = i * 0.913 - 40;
      const z = i * 0.377 + 13;
      expect(Math.abs(n.noise(x + eps, z) - n.noise(x, z))).toBeLessThan(0.01);
    }
  });

  it('matches lattice values at integer coordinates', () => {
    const n = new ValueNoise2D(11);
    expect(n.noise(3, 7)).toBe(n.latticeValue(3, 7));
    expect(n.noise(-5, 2)).toBe(n.latticeValue(-5, 2));
  });
});
