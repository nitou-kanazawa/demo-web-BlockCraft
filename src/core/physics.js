// AABB-vs-voxel physics with axis-separated resolution, shared by the
// player and mobs. Pure logic — the world is supplied as an
// `isSolidAt(x, y, z)` predicate over integer voxel coordinates.

export const PLAYER = {
  WIDTH: 0.6, // AABB footprint (x and z)
  HEIGHT: 1.8,
  EYE: 1.62, // camera height above the feet
  SPEED: 5.5, // horizontal walk speed, blocks/s
  JUMP_SPEED: 8.5,
  GRAVITY: -26,
  TERMINAL: -50, // max fall speed
};

// Generic body view of the player constants, for the shared stepBody().
export const PLAYER_BODY = {
  width: PLAYER.WIDTH,
  height: PLAYER.HEIGHT,
  speed: PLAYER.SPEED,
  jumpSpeed: PLAYER.JUMP_SPEED,
  gravity: PLAYER.GRAVITY,
  terminal: PLAYER.TERMINAL,
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
 * Move a body along one axis by `delta`, clamping against the first solid
 * voxel layer in the direction of motion. Returns true on collision (the
 * corresponding velocity component is zeroed).
 */
export function moveAxis(isSolidAt, state, axis, delta, body = PLAYER_BODY) {
  if (delta === 0) return false;
  state.pos[axis] += delta;

  const half = body.width / 2;
  const min = { x: state.pos.x - half, y: state.pos.y, z: state.pos.z - half };
  const max = { x: state.pos.x + half, y: state.pos.y + body.height, z: state.pos.z + half };
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
    state.pos.y = delta > 0 ? layer - body.height - EPS : layer + 1 + EPS;
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
 * Advance a body by dt seconds.
 * input: { dirX, dirZ, jump } — desired world-space horizontal direction
 * (|(dirX, dirZ)| <= 1) and whether the jump input is held.
 * Returns { hitX, hitZ }: whether the body hit a wall on each horizontal
 * axis this step (used by mob AI to hop over obstacles).
 */
export function stepBody(isSolidAt, state, input, dt, body = PLAYER_BODY) {
  state.vel.x = input.dirX * body.speed;
  state.vel.z = input.dirZ * body.speed;
  if (input.jump && state.onGround) {
    state.vel.y = body.jumpSpeed;
    state.onGround = false;
  }
  state.vel.y = Math.max(state.vel.y + body.gravity * dt, body.terminal);

  const maxSpeed = Math.max(
    Math.abs(state.vel.x),
    Math.abs(state.vel.y),
    Math.abs(state.vel.z),
  );
  const steps = Math.max(1, Math.ceil((maxSpeed * dt) / MAX_STEP_DISP));
  const h = dt / steps;

  let grounded = false;
  let hitX = false;
  let hitZ = false;
  for (let s = 0; s < steps; s++) {
    hitX = moveAxis(isSolidAt, state, 'x', state.vel.x * h, body) || hitX;
    const fallingBefore = state.vel.y < 0;
    const hitY = moveAxis(isSolidAt, state, 'y', state.vel.y * h, body);
    if (hitY && fallingBefore) grounded = true;
    hitZ = moveAxis(isSolidAt, state, 'z', state.vel.z * h, body) || hitZ;
  }
  state.onGround = grounded;
  return { hitX, hitZ };
}

/** Advance the player by dt seconds (stepBody with the player's body). */
export function stepPlayer(isSolidAt, state, input, dt) {
  stepBody(isSolidAt, state, input, dt, PLAYER_BODY);
  return state;
}
