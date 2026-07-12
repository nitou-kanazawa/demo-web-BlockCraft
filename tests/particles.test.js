import { describe, it, expect } from 'vitest';
import { ParticleSim } from '../src/core/particles.js';
import { BLOCK_COLORS, hexToRgb } from '../src/core/blockColors.js';
import { BLOCK, BLOCK_INFO } from '../src/core/blocks.js';
import { mulberry32 } from '../src/core/noise.js';

describe('hexToRgb', () => {
  it('parses channels into [0,1]', () => {
    expect(hexToRgb('#ff0000')).toEqual([1, 0, 0]);
    expect(hexToRgb('#00ff00')).toEqual([0, 1, 0]);
    expect(hexToRgb('#000000')).toEqual([0, 0, 0]);
    const [r, g, b] = hexToRgb('#8a6244');
    expect(r).toBeCloseTo(0x8a / 255, 5);
    expect(g).toBeCloseTo(0x62 / 255, 5);
    expect(b).toBeCloseTo(0x44 / 255, 5);
  });
});

describe('BLOCK_COLORS', () => {
  it('covers every visible block', () => {
    for (const [id, info] of Object.entries(BLOCK_INFO)) {
      if (Number(id) === BLOCK.AIR) continue;
      expect(BLOCK_COLORS[id], info.name).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
});

describe('ParticleSim', () => {
  it('spawns the requested count around the origin point', () => {
    const sim = new ParticleSim();
    sim.burst({ x: 10, y: 20, z: 30, count: 12, rand: mulberry32(1) });
    expect(sim.count).toBe(12);
    for (const p of sim.particles) {
      expect(Math.abs(p.pos.x - 10)).toBeLessThan(0.5);
      expect(Math.abs(p.pos.y - 20)).toBeLessThan(0.5);
      expect(Math.abs(p.pos.z - 30)).toBeLessThan(0.5);
      for (const c of p.color) {
        expect(c).toBeGreaterThanOrEqual(0);
        expect(c).toBeLessThanOrEqual(1);
      }
    }
  });

  it('never exceeds the particle cap', () => {
    const sim = new ParticleSim(20);
    for (let i = 0; i < 10; i++) sim.burst({ x: 0, y: 0, z: 0, count: 8, rand: mulberry32(i) });
    expect(sim.count).toBe(20);
  });

  it('ages particles and removes dead ones', () => {
    const sim = new ParticleSim();
    sim.burst({ x: 0, y: 0, z: 0, count: 10, lifetime: 0.5, rand: mulberry32(2) });
    for (let i = 0; i < 60; i++) sim.update(1 / 60); // 1s > max lifetime 0.5*1.4
    expect(sim.count).toBe(0);
  });

  it('applies gravity (velocity decreases over time)', () => {
    const sim = new ParticleSim();
    sim.burst({ x: 0, y: 50, z: 0, count: 1, lifetime: 10, rand: mulberry32(3) });
    const v0 = sim.particles[0].vel.y;
    sim.update(0.5);
    expect(sim.particles[0].vel.y).toBeLessThan(v0);
  });

  it('bounces off solid ground instead of sinking through', () => {
    const sim = new ParticleSim();
    const floor = (x, y, z) => y < 10;
    sim.burst({ x: 0.5, y: 12, z: 0.5, count: 8, lifetime: 30, speed: 1, rand: mulberry32(4) });
    for (let i = 0; i < 240; i++) sim.update(1 / 60, floor);
    for (const p of sim.particles) {
      expect(p.pos.y).toBeGreaterThanOrEqual(10); // resting on the floor top
      expect(Math.abs(p.vel.y)).toBeLessThan(1); // settled, not vibrating
    }
    expect(sim.count).toBeGreaterThan(0); // still alive at lifetime 30
  });
});
