import { lerp, smootherstep } from './math.js';

// Deterministic seeded 2D value noise with fBm, used for terrain heightmaps.
// Same seed + same coordinates => same output, on every platform.

/** mulberry32 PRNG — small, fast, deterministic. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PERM_SIZE = 256;

export class ValueNoise2D {
  constructor(seed = 1337) {
    const rand = mulberry32(seed);
    this.values = new Float64Array(PERM_SIZE);
    this.perm = new Uint8Array(PERM_SIZE * 2);
    for (let i = 0; i < PERM_SIZE; i++) this.values[i] = rand();
    // Fisher-Yates shuffle of 0..255 for the permutation table.
    const p = Array.from({ length: PERM_SIZE }, (_, i) => i);
    for (let i = PERM_SIZE - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [p[i], p[j]] = [p[j], p[i]];
    }
    for (let i = 0; i < PERM_SIZE * 2; i++) this.perm[i] = p[i & (PERM_SIZE - 1)];
  }

  /** Lattice value at integer coordinates, in [0, 1). */
  latticeValue(ix, iz) {
    const px = this.perm[(ix & (PERM_SIZE - 1)) + this.perm[iz & (PERM_SIZE - 1)]];
    return this.values[px];
  }

  /** Smoothly interpolated noise at (x, z), in [0, 1). */
  noise(x, z) {
    const ix = Math.floor(x);
    const iz = Math.floor(z);
    const fx = x - ix;
    const fz = z - iz;
    const v00 = this.latticeValue(ix, iz);
    const v10 = this.latticeValue(ix + 1, iz);
    const v01 = this.latticeValue(ix, iz + 1);
    const v11 = this.latticeValue(ix + 1, iz + 1);
    const sx = smootherstep(fx);
    const sz = smootherstep(fz);
    return lerp(lerp(v00, v10, sx), lerp(v01, v11, sx), sz);
  }

  /**
   * Fractal Brownian motion: sum of `octaves` noise layers, each at double
   * frequency and `persistence` amplitude of the previous. Result in [0, 1).
   */
  fbm(x, z, octaves = 4, persistence = 0.5, baseFrequency = 1) {
    let total = 0;
    let amplitude = 1;
    let frequency = baseFrequency;
    let max = 0;
    for (let i = 0; i < octaves; i++) {
      total += this.noise(x * frequency, z * frequency) * amplitude;
      max += amplitude;
      amplitude *= persistence;
      frequency *= 2;
    }
    return total / max;
  }
}
