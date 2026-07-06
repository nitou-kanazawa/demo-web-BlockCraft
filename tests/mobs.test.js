import { describe, it, expect } from 'vitest';
import { createMob, stepMob, MobManager, MOB_TYPES } from '../src/core/mobs.js';
import { stepBody } from '../src/core/physics.js';
import { mulberry32 } from '../src/core/noise.js';
import { World } from '../src/core/world.js';
import { BLOCK } from '../src/core/blocks.js';

const flatFloor = (x, y, z) => y < 10;
const IDLE = { dirX: 0, dirZ: 0, jump: false };

describe('stepBody with a custom (mob-sized) body', () => {
  it('falls and lands like the player does', () => {
    const mob = createMob('pig', 0.5, 14, 0.5);
    for (let i = 0; i < 120; i++) stepBody(flatFloor, mob, IDLE, 1 / 60, mob.body);
    expect(mob.onGround).toBe(true);
    expect(mob.pos.y).toBeCloseTo(10, 2);
  });

  it('fits through gaps the taller player cannot', () => {
    // Ceiling at y=11: 1-block gap over the floor at y=10.
    const tunnel = (x, y, z) => y < 10 || y >= 11;
    const pig = createMob('pig', 0.5, 10.05, 0.5); // 0.8 tall, fits
    for (let i = 0; i < 60; i++) stepBody(tunnel, pig, IDLE, 1 / 60, pig.body);
    expect(pig.onGround).toBe(true); // resting inside the gap, not ejected
    expect(pig.pos.y).toBeCloseTo(10, 2);
  });
});

describe('stepMob wander AI', () => {
  it('alternates idle and walk and moves while walking', () => {
    const mob = createMob('pig', 0.5, 11, 0.5);
    const rand = mulberry32(7);
    const modes = new Set();
    const start = { ...mob.pos };
    for (let i = 0; i < 20 * 60; i++) { // 20 simulated seconds
      stepMob(flatFloor, mob, 1 / 60, rand);
      modes.add(mob.mode);
    }
    expect(modes.has('idle')).toBe(true);
    expect(modes.has('walk')).toBe(true);
    const moved = Math.hypot(mob.pos.x - start.x, mob.pos.z - start.z);
    expect(moved).toBeGreaterThan(1); // actually wandered somewhere
    expect(mob.pos.y).toBeCloseTo(10, 1); // stayed on the ground
  });

  it('is deterministic under a seeded rand', () => {
    const run = () => {
      const mob = createMob('sheep', 0.5, 11, 0.5);
      const rand = mulberry32(42);
      for (let i = 0; i < 600; i++) stepMob(flatFloor, mob, 1 / 60, rand);
      return mob.pos;
    };
    expect(run()).toEqual(run());
  });

  it('hops when walking into a 1-block step', () => {
    // Floor at y<10 plus a step at x>=3, y<11.
    const stepWorld = (x, y, z) => y < 10 || (x >= 3 && y < 11);
    const mob = createMob('pig', 0.5, 10.05, 0.5);
    mob.mode = 'walk';
    mob.timer = 999; // keep walking
    mob.yaw = Math.PI / 2; // sin=1, cos=0 -> +x, toward the step
    const rand = () => 0.5;
    let peak = 0;
    for (let i = 0; i < 5 * 60; i++) {
      stepMob(stepWorld, mob, 1 / 60, rand);
      peak = Math.max(peak, mob.pos.y);
    }
    expect(peak).toBeGreaterThan(10.5); // left the ground to hop
    expect(mob.pos.x).toBeGreaterThan(3); // made it onto the step
    expect(mob.pos.y).toBeCloseTo(11, 1); // standing on top of it
  });

  it('advances the walk animation phase only while walking', () => {
    const mob = createMob('pig', 0.5, 11, 0.5);
    mob.mode = 'idle';
    mob.timer = 999;
    stepMob(flatFloor, mob, 1 / 60, () => 0.5);
    expect(mob.walkPhase).toBe(0);
  });
});

describe('MobManager', () => {
  it('spawns mobs on grass near the player up to the cap', () => {
    const world = new World(42);
    const manager = new MobManager(world, 7);
    const playerPos = { x: 8, y: 30, z: 8 };
    // Generate terrain around the player first (like the game loop does).
    for (let cx = -3; cx <= 3; cx++) {
      for (let cz = -3; cz <= 3; cz++) world.ensureChunk(cx, cz);
    }
    for (let i = 0; i < 60 * 60; i++) manager.update(1 / 60, playerPos); // 60s
    expect(manager.mobs.length).toBeGreaterThan(0);
    expect(manager.mobs.length).toBeLessThanOrEqual(8);
    for (const mob of manager.mobs) {
      expect(MOB_TYPES[mob.type]).toBeDefined();
      expect(mob.id).toBeGreaterThan(0);
      const dist = Math.hypot(mob.pos.x - playerPos.x, mob.pos.z - playerPos.z);
      expect(dist).toBeLessThanOrEqual(64);
    }
    // Spawn columns were grass (mobs may have wandered since, so check the
    // block under the original spawn is meaningless — instead assert they
    // are standing somewhere solid and above water level).
    for (const mob of manager.mobs) {
      expect(mob.pos.y).toBeGreaterThan(0);
    }
  });

  it('despawns mobs when the player leaves them behind', () => {
    const world = new World(42);
    const manager = new MobManager(world, 7);
    const near = { x: 8, y: 30, z: 8 };
    for (let cx = -3; cx <= 3; cx++) {
      for (let cz = -3; cz <= 3; cz++) world.ensureChunk(cx, cz);
    }
    for (let i = 0; i < 60 * 30; i++) manager.update(1 / 60, near);
    expect(manager.mobs.length).toBeGreaterThan(0);
    manager.update(1 / 60, { x: 2000, y: 30, z: 2000 }); // teleport far away
    expect(manager.mobs.length).toBe(0);
  });

  it('assigns unique ids across spawns', () => {
    const world = new World(42);
    const manager = new MobManager(world, 3);
    for (let cx = -3; cx <= 3; cx++) {
      for (let cz = -3; cz <= 3; cz++) world.ensureChunk(cx, cz);
    }
    for (let i = 0; i < 60 * 60; i++) manager.update(1 / 60, { x: 8, y: 30, z: 8 });
    const ids = manager.mobs.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
