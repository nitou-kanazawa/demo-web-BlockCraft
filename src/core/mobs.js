import { stepBody } from './physics.js';
import { mulberry32 } from './noise.js';
import { BLOCK } from './blocks.js';
import { CHUNK_HEIGHT } from './chunk.js';
import { ITEM } from './items.js';

// Passive animal mobs: wander AI (idle <-> walk) on shared AABB physics.
// Pure logic; rendering lives in render/mobRenderer.js.

export const MOB_TYPES = {
  pig: {
    body: { width: 0.7, height: 0.8, speed: 1.6, jumpSpeed: 7.5, gravity: -26, terminal: -50 },
    hp: 6,
    drop: { id: ITEM.PORKCHOP, count: 1 },
    color: '#eb9c9c', // hit/death particle color
  },
  sheep: {
    body: { width: 0.7, height: 1.0, speed: 1.3, jumpSpeed: 7.5, gravity: -26, terminal: -50 },
    hp: 6,
    drop: { id: ITEM.WOOL, count: 1 },
    color: '#e8e6e0',
  },
};

export const ATTACK = {
  REACH: 4, // blocks
  DAMAGE_HAND: 2,
  DAMAGE_TOOL: 3, // any held tool
  KNOCKBACK: 6, // horizontal impulse, blocks/s
  STUN: 0.35, // seconds of hurt-flash / knockback drift
};

export function createMob(type, x, y, z) {
  return {
    id: 0, // assigned by MobManager
    type,
    body: MOB_TYPES[type].body,
    pos: { x, y, z },
    vel: { x: 0, y: 0, z: 0 },
    yaw: 0,
    onGround: false,
    mode: 'idle', // 'idle' | 'walk'
    timer: 0.5,
    walkPhase: 0, // drives the leg swing animation
    hp: MOB_TYPES[type].hp,
    hurtTimer: 0, // >0 while flashing red / being knocked back
    kb: { x: 0, z: 0 }, // knockback velocity while stunned
  };
}

/**
 * Apply one hit to a mob: damage, red-flash stun and knockback impulse.
 * Returns true if the mob died.
 */
export function attackMob(mob, damage, kbX, kbZ) {
  mob.hp -= damage;
  mob.hurtTimer = ATTACK.STUN;
  mob.kb = { x: kbX, z: kbZ };
  mob.vel.y = Math.max(mob.vel.y, 4); // pop up a little
  mob.onGround = false;
  return mob.hp <= 0;
}

/** Ray vs AABB (slab method); distance along `dir` (unit), or null. */
function rayAABB(origin, dir, min, max) {
  let tmin = 0;
  let tmax = Infinity;
  for (const axis of ['x', 'y', 'z']) {
    if (dir[axis] === 0) {
      if (origin[axis] < min[axis] || origin[axis] > max[axis]) return null;
      continue;
    }
    let t1 = (min[axis] - origin[axis]) / dir[axis];
    let t2 = (max[axis] - origin[axis]) / dir[axis];
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return null;
  }
  return tmin;
}

/** Nearest mob whose AABB the ray hits within maxDist: {mob, dist} or null. */
export function pickMob(mobs, origin, dir, maxDist) {
  let best = null;
  for (const mob of mobs) {
    const half = mob.body.width / 2;
    const t = rayAABB(origin, dir, {
      x: mob.pos.x - half, y: mob.pos.y, z: mob.pos.z - half,
    }, {
      x: mob.pos.x + half, y: mob.pos.y + mob.body.height, z: mob.pos.z + half,
    });
    if (t !== null && t <= maxDist && (!best || t < best.dist)) {
      best = { mob, dist: t };
    }
  }
  return best;
}

/**
 * Advance one mob by dt: wander state machine + physics.
 * `rand` is a () => [0,1) source (seeded for determinism in tests).
 */
export function stepMob(isSolidAt, mob, dt, rand) {
  // Stunned: drift with the knockback impulse instead of walking.
  if (mob.hurtTimer > 0) {
    mob.hurtTimer -= dt;
    const input = {
      dirX: mob.kb.x / mob.body.speed,
      dirZ: mob.kb.z / mob.body.speed,
      jump: false,
    };
    stepBody(isSolidAt, mob, input, dt, mob.body);
    const decay = Math.pow(0.01, dt / ATTACK.STUN);
    mob.kb.x *= decay;
    mob.kb.z *= decay;
    return;
  }

  mob.timer -= dt;
  if (mob.timer <= 0) {
    if (mob.mode === 'idle') {
      mob.mode = 'walk';
      mob.yaw = rand() * Math.PI * 2;
      mob.timer = 1.5 + rand() * 2.5;
    } else {
      mob.mode = 'idle';
      mob.timer = 1 + rand() * 3;
    }
  }

  const walking = mob.mode === 'walk';
  const input = {
    // Model faces +Z at yaw 0 (renderer sets rotation.y = yaw).
    dirX: walking ? Math.sin(mob.yaw) : 0,
    dirZ: walking ? Math.cos(mob.yaw) : 0,
    jump: false,
  };
  const wasOnGround = mob.onGround;
  const { hitX, hitZ } = stepBody(isSolidAt, mob, input, dt, mob.body);
  // Hop over 1-block steps when walking into a wall.
  if (walking && (hitX || hitZ) && wasOnGround) {
    mob.vel.y = mob.body.jumpSpeed;
    mob.onGround = false;
  }
  if (walking) mob.walkPhase += dt * mob.body.speed * 4;
}

const MAX_MOBS = 8;
const SPAWN_MIN = 12; // blocks from the player
const SPAWN_MAX = 32;
const DESPAWN_DIST = 64;
const SPAWN_INTERVAL = 0.5; // seconds between spawn attempts

/**
 * Owns the mob population: steps AI/physics, spawns animals on grass near
 * the player (up to MAX_MOBS) and despawns far or fallen ones.
 */
export class MobManager {
  constructor(world, seed = 1) {
    this.world = world;
    this.mobs = [];
    this.rand = mulberry32(seed);
    this.spawnCooldown = 0;
    this.nextId = 1;
    this.isSolidAt = (x, y, z) => world.isSolidAt(x, y, z);
  }

  update(dt, playerPos) {
    for (const mob of this.mobs) {
      stepMob(this.isSolidAt, mob, dt, this.rand);
    }
    this.mobs = this.mobs.filter((mob) => {
      const dx = mob.pos.x - playerPos.x;
      const dz = mob.pos.z - playerPos.z;
      return Math.hypot(dx, dz) <= DESPAWN_DIST && mob.pos.y > -10;
    });

    this.spawnCooldown -= dt;
    if (this.spawnCooldown <= 0 && this.mobs.length < MAX_MOBS) {
      this.spawnCooldown = SPAWN_INTERVAL;
      this.trySpawn(playerPos);
    }
  }

  /** Remove a specific mob (killed by the player). */
  remove(mob) {
    this.mobs = this.mobs.filter((m) => m !== mob);
  }

  /** One spawn attempt at a random spot around the player; may do nothing. */
  trySpawn(playerPos) {
    const angle = this.rand() * Math.PI * 2;
    const dist = SPAWN_MIN + this.rand() * (SPAWN_MAX - SPAWN_MIN);
    const wx = Math.floor(playerPos.x + Math.cos(angle) * dist);
    const wz = Math.floor(playerPos.z + Math.sin(angle) * dist);
    const y = this.world.surfaceHeight(wx, wz);
    if (y < 0 || y >= CHUNK_HEIGHT - 3) return; // ungenerated chunk or too high
    if (this.world.getBlock(wx, y, wz) !== BLOCK.GRASS) return; // grass only
    const type = this.rand() < 0.5 ? 'pig' : 'sheep';
    const mob = createMob(type, wx + 0.5, y + 1, wz + 0.5);
    mob.id = this.nextId++;
    mob.yaw = this.rand() * Math.PI * 2;
    this.mobs.push(mob);
  }
}
