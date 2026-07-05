// Voxel ray marching (Amanatides & Woo DDA), used to find the block the
// player is looking at. Pure logic over an `isTarget(x, y, z)` predicate.

/**
 * March a ray through the voxel grid.
 * The starting voxel itself is never reported (the camera may be embedded
 * in water or leaves); the first *entered* voxel matching `isTarget` wins.
 *
 * @param isTarget (x, y, z) => boolean over integer voxel coords
 * @param origin   {x, y, z} ray start
 * @param dir      {x, y, z} ray direction (need not be normalised, but
 *                 distances are measured in units of its length)
 * @returns { x, y, z, nx, ny, nz, dist } or null
 *          (nx, ny, nz) is the normal of the face the ray entered through.
 */
export function raycastVoxels(isTarget, origin, dir, maxDist) {
  const len = Math.hypot(dir.x, dir.y, dir.z);
  if (len === 0) return null;
  const d = { x: dir.x / len, y: dir.y / len, z: dir.z / len };

  let vx = Math.floor(origin.x);
  let vy = Math.floor(origin.y);
  let vz = Math.floor(origin.z);

  const stepX = d.x > 0 ? 1 : d.x < 0 ? -1 : 0;
  const stepY = d.y > 0 ? 1 : d.y < 0 ? -1 : 0;
  const stepZ = d.z > 0 ? 1 : d.z < 0 ? -1 : 0;

  // Distance along the ray to the first boundary crossing per axis, and
  // the distance between successive crossings.
  const tDeltaX = stepX !== 0 ? Math.abs(1 / d.x) : Infinity;
  const tDeltaY = stepY !== 0 ? Math.abs(1 / d.y) : Infinity;
  const tDeltaZ = stepZ !== 0 ? Math.abs(1 / d.z) : Infinity;

  let tMaxX = stepX > 0 ? (vx + 1 - origin.x) * tDeltaX
    : stepX < 0 ? (origin.x - vx) * tDeltaX : Infinity;
  let tMaxY = stepY > 0 ? (vy + 1 - origin.y) * tDeltaY
    : stepY < 0 ? (origin.y - vy) * tDeltaY : Infinity;
  let tMaxZ = stepZ > 0 ? (vz + 1 - origin.z) * tDeltaZ
    : stepZ < 0 ? (origin.z - vz) * tDeltaZ : Infinity;

  while (true) {
    let nx = 0;
    let ny = 0;
    let nz = 0;
    let t;
    if (tMaxX <= tMaxY && tMaxX <= tMaxZ) {
      t = tMaxX;
      tMaxX += tDeltaX;
      vx += stepX;
      nx = -stepX;
    } else if (tMaxY <= tMaxZ) {
      t = tMaxY;
      tMaxY += tDeltaY;
      vy += stepY;
      ny = -stepY;
    } else {
      t = tMaxZ;
      tMaxZ += tDeltaZ;
      vz += stepZ;
      nz = -stepZ;
    }
    if (t > maxDist) return null;
    if (isTarget(vx, vy, vz)) {
      return { x: vx, y: vy, z: vz, nx, ny, nz, dist: t };
    }
  }
}
