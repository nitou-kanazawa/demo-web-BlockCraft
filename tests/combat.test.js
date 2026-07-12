import { describe, it, expect } from 'vitest';
import {
  createMob, stepMob, attackMob, pickMob, MOB_TYPES, ATTACK,
} from '../src/core/mobs.js';
import { itemInfo, isBlockItem, ITEM } from '../src/core/items.js';
import { BLOCK, BLOCK_INFO } from '../src/core/blocks.js';
import { blockFaceTile, TILE } from '../src/core/mesher.js';
import { blockDrop } from '../src/core/items.js';

const flatFloor = (x, y, z) => y < 10;

describe('attackMob', () => {
  it('reduces hp and reports death at zero', () => {
    const mob = createMob('pig', 0.5, 11, 0.5);
    expect(attackMob(mob, 2, 1, 0)).toBe(false);
    expect(mob.hp).toBe(MOB_TYPES.pig.hp - 2);
    expect(attackMob(mob, 2, 1, 0)).toBe(false);
    expect(attackMob(mob, 2, 1, 0)).toBe(true); // 6 hp / 2 dmg = 3 hits
  });

  it('applies stun, knockback impulse and a vertical pop', () => {
    const mob = createMob('sheep', 0.5, 11, 0.5);
    attackMob(mob, 2, 5, -3);
    expect(mob.hurtTimer).toBe(ATTACK.STUN);
    expect(mob.kb).toEqual({ x: 5, z: -3 });
    expect(mob.vel.y).toBeGreaterThanOrEqual(4);
    expect(mob.onGround).toBe(false);
  });
});

describe('stepMob while stunned', () => {
  it('drifts in the knockback direction instead of walking', () => {
    const mob = createMob('pig', 0.5, 10.05, 0.5);
    mob.mode = 'walk';
    mob.yaw = Math.PI; // AI would walk -z
    attackMob(mob, 1, ATTACK.KNOCKBACK, 0); // knock toward +x
    const x0 = mob.pos.x;
    for (let i = 0; i < 10; i++) stepMob(flatFloor, mob, 1 / 60, () => 0.5);
    expect(mob.pos.x).toBeGreaterThan(x0 + 0.05); // moved with the knockback
  });

  it('recovers after the stun and decays the knockback', () => {
    const mob = createMob('pig', 0.5, 10.05, 0.5);
    attackMob(mob, 1, ATTACK.KNOCKBACK, 0);
    for (let i = 0; i < 60; i++) stepMob(flatFloor, mob, 1 / 60, () => 0.5);
    expect(mob.hurtTimer).toBeLessThanOrEqual(0);
    expect(Math.abs(mob.kb.x)).toBeLessThan(0.5); // impulse spent
  });
});

describe('pickMob', () => {
  const ORIGIN = { x: 0, y: 11, z: 0 };
  const FORWARD = { x: 1, y: 0, z: 0 };

  it('hits a mob straight ahead and reports the distance', () => {
    const mob = createMob('pig', 3, 10.5, 0);
    const picked = pickMob([mob], ORIGIN, FORWARD, ATTACK.REACH);
    expect(picked?.mob).toBe(mob);
    expect(picked.dist).toBeCloseTo(3 - mob.body.width / 2, 2);
  });

  it('returns the nearest of several mobs', () => {
    const near = createMob('pig', 2, 10.5, 0);
    const far = createMob('sheep', 3.5, 10.5, 0);
    expect(pickMob([far, near], ORIGIN, FORWARD, ATTACK.REACH)?.mob).toBe(near);
  });

  it('misses mobs off to the side or beyond reach', () => {
    const side = createMob('pig', 3, 10.5, 2);
    expect(pickMob([side], ORIGIN, FORWARD, ATTACK.REACH)).toBeNull();
    const beyond = createMob('pig', 10, 10.5, 0);
    expect(pickMob([beyond], ORIGIN, FORWARD, ATTACK.REACH)).toBeNull();
  });

  it('hits from inside the AABB (dist 0)', () => {
    const mob = createMob('pig', 0, 10.8, 0);
    const picked = pickMob([mob], ORIGIN, FORWARD, ATTACK.REACH);
    expect(picked?.dist).toBe(0);
  });
});

describe('mob drops and new items', () => {
  it('every mob type drops a registered item', () => {
    for (const [type, info] of Object.entries(MOB_TYPES)) {
      expect(info.hp, type).toBeGreaterThan(0);
      expect(itemInfo(info.drop.id), type).not.toBeNull();
      expect(info.drop.count, type).toBeGreaterThan(0);
      expect(info.color, type).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it('registers wool as a placeable, breakable block that drops itself', () => {
    expect(isBlockItem(ITEM.WOOL)).toBe(true);
    expect(BLOCK_INFO[BLOCK.WOOL].solid).toBe(true);
    expect(BLOCK_INFO[BLOCK.WOOL].hardness).toBeLessThan(Infinity);
    expect(blockDrop(BLOCK.WOOL)).toBe(ITEM.WOOL);
    expect(blockFaceTile(BLOCK.WOOL, 0)).toBe(TILE.WOOL);
  });

  it('registers porkchop as a material', () => {
    expect(itemInfo(ITEM.PORKCHOP).kind).toBe('material');
    expect(isBlockItem(ITEM.PORKCHOP)).toBe(false);
  });
});
