import { describe, it, expect } from 'vitest';
import { PLAYER, createPlayerState, stepPlayer, moveAxis } from '../src/core/physics.js';

// Simple test worlds as isSolidAt predicates.
const flatFloor = (x, y, z) => y < 10; // ground surface at y=10
const floorWithWall = (x, y, z) => y < 10 || (x === 5 && y < 14); // wall plane at x=5
const floorWithCeiling = (x, y, z) => y < 10 || y >= 12; // 2-block gap

const IDLE = { dirX: 0, dirZ: 0, jump: false };

function settle(world, state, frames = 120, input = IDLE) {
  for (let i = 0; i < frames; i++) stepPlayer(world, state, input, 1 / 60);
  return state;
}

describe('gravity and ground collision', () => {
  it('falls under gravity and lands on the floor', () => {
    const s = createPlayerState(0.5, 15, 0.5);
    settle(flatFloor, s);
    expect(s.onGround).toBe(true);
    expect(s.pos.y).toBeCloseTo(10, 2);
    expect(s.vel.y).toBe(0);
  });

  it('does not tunnel through the floor at terminal velocity', () => {
    const s = createPlayerState(0.5, 30, 0.5);
    s.vel.y = PLAYER.TERMINAL;
    // Worst case frame: clamped dt with max fall speed.
    for (let i = 0; i < 60; i++) stepPlayer(flatFloor, s, IDLE, 0.05);
    expect(s.pos.y).toBeCloseTo(10, 2);
    expect(s.onGround).toBe(true);
  });

  it('is not grounded while airborne', () => {
    const s = createPlayerState(0.5, 20, 0.5);
    stepPlayer(flatFloor, s, IDLE, 1 / 60);
    expect(s.onGround).toBe(false);
  });
});

describe('jumping', () => {
  it('jumps only from the ground and reaches at least one block', () => {
    const s = createPlayerState(0.5, 15, 0.5);
    settle(flatFloor, s);
    stepPlayer(flatFloor, s, { ...IDLE, jump: true }, 1 / 60);
    expect(s.vel.y).toBeGreaterThan(0);
    let peak = s.pos.y;
    for (let i = 0; i < 120; i++) {
      stepPlayer(flatFloor, s, IDLE, 1 / 60);
      peak = Math.max(peak, s.pos.y);
    }
    expect(peak).toBeGreaterThan(11); // cleared a full block above the floor
    expect(s.pos.y).toBeCloseTo(10, 2); // and came back down
  });

  it('ignores jump input while airborne', () => {
    const s = createPlayerState(0.5, 20, 0.5);
    stepPlayer(flatFloor, s, IDLE, 1 / 60);
    const before = s.vel.y;
    stepPlayer(flatFloor, s, { ...IDLE, jump: true }, 1 / 60);
    expect(s.vel.y).toBeLessThan(before); // still falling, no boost
  });

  it('stops rising when hitting a ceiling', () => {
    // Spawn inside the 2-block gap between floor (y=10) and ceiling (y=12).
    const s = createPlayerState(0.5, 10.05, 0.5);
    settle(floorWithCeiling, s);
    expect(s.onGround).toBe(true);
    stepPlayer(floorWithCeiling, s, { ...IDLE, jump: true }, 1 / 60);
    let maxTop = 0;
    for (let i = 0; i < 60; i++) {
      stepPlayer(floorWithCeiling, s, IDLE, 1 / 60);
      maxTop = Math.max(maxTop, s.pos.y + PLAYER.HEIGHT);
    }
    // An unobstructed jump would peak well above y=13; the ceiling caps it.
    expect(maxTop).toBeGreaterThan(11.9); // actually reached the ceiling
    expect(maxTop).toBeLessThanOrEqual(12); // never poked into it
  });
});

describe('walls and sliding', () => {
  it('stops at a wall and keeps sliding along it', () => {
    const s = createPlayerState(2.5, 15, 2.5);
    settle(floorWithWall, s);
    // Walk diagonally into the wall (+x) while moving +z.
    const input = { dirX: Math.SQRT1_2, dirZ: Math.SQRT1_2, jump: false };
    const startZ = s.pos.z;
    for (let i = 0; i < 120; i++) stepPlayer(floorWithWall, s, input, 1 / 60);
    // Blocked before the wall plane at x=5 (minus half width).
    expect(s.pos.x).toBeLessThanOrEqual(5 - PLAYER.WIDTH / 2 + 0.01);
    expect(s.pos.x).toBeGreaterThan(4); // actually reached the wall
    expect(s.pos.z).toBeGreaterThan(startZ + 2); // slid along it
  });

  it('walks freely on open ground', () => {
    const s = createPlayerState(0.5, 15, 0.5);
    settle(flatFloor, s);
    const startX = s.pos.x;
    for (let i = 0; i < 60; i++) {
      stepPlayer(flatFloor, s, { dirX: 1, dirZ: 0, jump: false }, 1 / 60);
    }
    expect(s.pos.x - startX).toBeCloseTo(PLAYER.SPEED, 0); // ~SPEED blocks in 1s
    expect(s.pos.y).toBeCloseTo(10, 2); // stayed on the floor
  });
});

describe('moveAxis', () => {
  it('reports no collision in empty space', () => {
    const s = createPlayerState(0.5, 20, 0.5);
    expect(moveAxis(() => false, s, 'x', 0.3)).toBe(false);
    expect(s.pos.x).toBeCloseTo(0.8, 6);
  });

  it('zeroes only the colliding velocity component', () => {
    const s = createPlayerState(4.5, 10.5, 0.5);
    s.vel.x = 3;
    s.vel.z = 3;
    moveAxis(floorWithWall, s, 'x', 0.3); // box reaches into the x=5 wall
    expect(s.vel.x).toBe(0);
    expect(s.vel.z).toBe(3);
  });
});
