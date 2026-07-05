// Player physics: AABB vs voxel collision with axis-separated resolution.
// Pure logic — the world is supplied as an `isSolidAt(x, y, z)` predicate
// over integer voxel coordinates.

export const PLAYER = {
  WIDTH: 0.6, // AABB footprint (x and z)
  HEIGHT: 1.8,
  EYE: 1.62, // camera height above the feet
  SPEED: 5.5, // horizontal walk speed, blocks/s
  JUMP_SPEED: 8.5,
  GRAVITY: -26,
  TERMINAL: -50, // max fall speed
};

// Max displacement per collision substep. Must stay well below 1 voxel so
// penetration never reaches past the first solid layer (no tunneling).
const MAX_STEP_DISP = 0.4;
const EPS = 1e-4;

export function createPlayerState(x, y, z) {
  return {
    pos: { x, y, z }, // feet center
    vel: { x: 0, y: 0, z: 0 },
    onGround: false,
  };
}

const OTHER_AXES = {
  x: ['y', 'z'],
  y: ['x', 'z'],
  z: ['x', 'y'],
};

/**
 * Move the player along one axis by `delta`, clamping against the first
 * solid voxel layer in the direction of motion. Returns true on collision
 * (the corresponding velocity component is zeroed).
 */
export function moveAxis(isSolidAt, state, axis, delta) {
  if (delta === 0) return false;
  state.pos[axis] += delta;

  const half = PLAYER.WIDTH / 2;
  const min = { x: state.pos.x - half, y: state.pos.y, z: state.pos.z - half };
  const max = { x: state.pos.x + half, y: state.pos.y + PLAYER.HEIGHT, z: state.pos.z + half };
  const lo = { x: Math.floor(min.x), y: Math.floor(min.y), z: Math.floor(min.z) };
  const hi = {
    x: Math.floor(max.x - 1e-9),
    y: Math.floor(max.y - 1e-9),
    z: Math.floor(max.z - 1e-9),
  };

  // With sub-voxel displacement, only the leading voxel layer can newly overlap.
  const layer = delta > 0 ? hi[axis] : lo[axis];
  const [a1, a2] = OTHER_AXES[axis];
  const probe = { x: 0, y: 0, z: 0 };
  probe[axis] = layer;

  let hit = false;
  for (let i = lo[a1]; i <= hi[a1] && !hit; i++) {
    for (let j = lo[a2]; j <= hi[a2] && !hit; j++) {
      probe[a1] = i;
      probe[a2] = j;
      if (isSolidAt(probe.x, probe.y, probe.z)) hit = true;
    }
  }
  if (!hit) return false;

  if (axis === 'y') {
    state.pos.y = delta > 0 ? layer - PLAYER.HEIGHT - EPS : layer + 1 + EPS;
  } else {
    state.pos[axis] = delta > 0 ? layer - half - EPS : layer + 1 + half + EPS;
  }
  state.vel[axis] = 0;
  return true;
}

/**
 * Does the player's AABB overlap voxel (vx, vy, vz)?
 * Used to refuse placing a block inside the player.
 */
export function playerIntersectsVoxel(pos, vx, vy, vz) {
  const half = PLAYER.WIDTH / 2;
  return (
    pos.x - half < vx + 1 && pos.x + half > vx &&
    pos.y < vy + 1 && pos.y + PLAYER.HEIGHT > vy &&
    pos.z - half < vz + 1 && pos.z + half > vz
  );
}

/**
 * Advance the player by dt seconds.
 * input: { dirX, dirZ, jump } — desired world-space horizontal direction
 * (|(dirX, dirZ)| <= 1) and whether the jump key is held.
 */
export function stepPlayer(isSolidAt, state, input, dt) {
  state.vel.x = input.dirX * PLAYER.SPEED;
  state.vel.z = input.dirZ * PLAYER.SPEED;
  if (input.jump && state.onGround) {
    state.vel.y = PLAYER.JUMP_SPEED;
    state.onGround = false;
  }
  state.vel.y = Math.max(state.vel.y + PLAYER.GRAVITY * dt, PLAYER.TERMINAL);

  const maxSpeed = Math.max(
    Math.abs(state.vel.x),
    Math.abs(state.vel.y),
    Math.abs(state.vel.z),
  );
  const steps = Math.max(1, Math.ceil((maxSpeed * dt) / MAX_STEP_DISP));
  const h = dt / steps;

  let grounded = false;
  for (let s = 0; s < steps; s++) {
    moveAxis(isSolidAt, state, 'x', state.vel.x * h);
    const fallingBefore = state.vel.y < 0;
    const hitY = moveAxis(isSolidAt, state, 'y', state.vel.y * h);
    if (hitY && fallingBefore) grounded = true;
    moveAxis(isSolidAt, state, 'z', state.vel.z * h);
  }
  state.onGround = grounded;
  return state;
}
