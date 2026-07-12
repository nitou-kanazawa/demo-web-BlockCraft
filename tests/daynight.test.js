import { describe, it, expect } from 'vitest';
import {
  DAY_LENGTH, advanceTime, sunElevation, sunDirection, daylight, skyColor,
  lightLevels, formatClock,
} from '../src/core/daynight.js';

describe('advanceTime', () => {
  it('advances proportionally and wraps at 1', () => {
    expect(advanceTime(0, DAY_LENGTH / 4)).toBeCloseTo(0.25, 6);
    expect(advanceTime(0.9, DAY_LENGTH * 0.2)).toBeCloseTo(0.1, 6);
  });
});

describe('sun', () => {
  it('peaks at noon and bottoms at midnight', () => {
    expect(sunElevation(0.25)).toBeCloseTo(1, 6);
    expect(sunElevation(0.75)).toBeCloseTo(-1, 6);
    expect(sunElevation(0)).toBeCloseTo(0, 6); // sunrise
    expect(sunElevation(0.5)).toBeCloseTo(0, 6); // sunset
  });

  it('direction is a unit vector, above the horizon at noon', () => {
    for (const t of [0, 0.1, 0.25, 0.5, 0.75]) {
      const d = sunDirection(t);
      expect(Math.hypot(d.x, d.y, d.z)).toBeCloseTo(1, 6);
    }
    expect(sunDirection(0.25).y).toBeGreaterThan(0.9);
    expect(sunDirection(0.75).y).toBeLessThan(0);
  });
});

describe('daylight', () => {
  it('is full at noon, zero at midnight, partial in twilight', () => {
    expect(daylight(0.25)).toBe(1);
    expect(daylight(0.75)).toBe(0);
    const dawn = daylight(0);
    expect(dawn).toBeGreaterThan(0);
    expect(dawn).toBeLessThan(1);
  });
});

describe('skyColor', () => {
  it('keeps every channel within [0, 1] across the whole day', () => {
    for (let t = 0; t < 1; t += 0.01) {
      for (const c of skyColor(t)) {
        expect(c).toBeGreaterThanOrEqual(0);
        expect(c).toBeLessThanOrEqual(1);
      }
    }
  });

  it('is much darker at midnight than at noon', () => {
    const lum = ([r, g, b]) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
    expect(lum(skyColor(0.75))).toBeLessThan(lum(skyColor(0.25)) * 0.25);
  });

  it('tints toward red/orange at sunset relative to noon', () => {
    const noon = skyColor(0.25);
    const sunset = skyColor(0.49);
    expect(sunset[0] / sunset[2]).toBeGreaterThan(noon[0] / noon[2]);
  });

  it('changes continuously (no jumps frame to frame)', () => {
    let prev = skyColor(0);
    for (let t = 0.001; t < 1; t += 0.001) {
      const cur = skyColor(t);
      for (let i = 0; i < 3; i++) {
        expect(Math.abs(cur[i] - prev[i])).toBeLessThan(0.02);
      }
      prev = cur;
    }
  });
});

describe('lightLevels', () => {
  it('keeps a minimum hemisphere light at night', () => {
    expect(lightLevels(0.75).hemisphere).toBeGreaterThan(0.1);
    expect(lightLevels(0.75).sun).toBe(0);
    expect(lightLevels(0.25).sun).toBeGreaterThan(1);
  });
});

describe('formatClock', () => {
  it('maps cycle anchors to expected clock times', () => {
    expect(formatClock(0)).toBe('06:00'); // sunrise
    expect(formatClock(0.25)).toBe('12:00'); // noon
    expect(formatClock(0.5)).toBe('18:00'); // sunset
    expect(formatClock(0.75)).toBe('00:00'); // midnight
  });
});
