import { describe, it, expect } from 'vitest';
import { clamp, mod, lerp, smootherstep } from '../src/core/math.js';

describe('clamp', () => {
  it('returns value inside range unchanged', () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });
  it('clamps below min and above max', () => {
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(11, 0, 10)).toBe(10);
  });
});

describe('mod', () => {
  it('behaves like % for positive operands', () => {
    expect(mod(7, 3)).toBe(1);
  });
  it('returns non-negative result for negative dividend', () => {
    expect(mod(-1, 16)).toBe(15);
    expect(mod(-16, 16)).toBe(0);
    expect(mod(-17, 16)).toBe(15);
  });
});

describe('lerp', () => {
  it('interpolates endpoints and midpoint', () => {
    expect(lerp(0, 10, 0)).toBe(0);
    expect(lerp(0, 10, 1)).toBe(10);
    expect(lerp(0, 10, 0.5)).toBe(5);
  });
});

describe('smootherstep', () => {
  it('is 0 at t=0 and 1 at t=1', () => {
    expect(smootherstep(0)).toBe(0);
    expect(smootherstep(1)).toBe(1);
  });
  it('is monotonic on a sample grid', () => {
    let prev = -Infinity;
    for (let t = 0; t <= 1.0001; t += 0.05) {
      const v = smootherstep(t);
      expect(v).toBeGreaterThanOrEqual(prev);
      prev = v;
    }
  });
});
