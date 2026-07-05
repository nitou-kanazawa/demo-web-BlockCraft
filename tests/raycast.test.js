import { describe, it, expect } from 'vitest';
import { raycastVoxels } from '../src/core/raycast.js';
import { playerIntersectsVoxel, PLAYER } from '../src/core/physics.js';

const floor = (x, y, z) => y < 10; // solid below y=10

describe('raycastVoxels', () => {
  it('hits the floor straight down through the top face', () => {
    const hit = raycastVoxels(floor, { x: 0.5, y: 12.5, z: 0.5 }, { x: 0, y: -1, z: 0 }, 8);
    expect(hit).toMatchObject({ x: 0, y: 9, z: 0, nx: 0, ny: 1, nz: 0 });
    expect(hit.dist).toBeCloseTo(2.5, 5);
  });

  it('hits a wall along +x through its -x face', () => {
    const wall = (x, y, z) => x >= 5;
    const hit = raycastVoxels(wall, { x: 2.5, y: 0.5, z: 0.5 }, { x: 1, y: 0, z: 0 }, 10);
    expect(hit).toMatchObject({ x: 5, y: 0, z: 0, nx: -1, ny: 0, nz: 0 });
    expect(hit.dist).toBeCloseTo(2.5, 5);
  });

  it('respects maxDist', () => {
    const hit = raycastVoxels(floor, { x: 0.5, y: 30, z: 0.5 }, { x: 0, y: -1, z: 0 }, 5);
    expect(hit).toBeNull();
  });

  it('normalises the direction (distances in world units)', () => {
    const hit = raycastVoxels(floor, { x: 0.5, y: 12.5, z: 0.5 }, { x: 0, y: -10, z: 0 }, 8);
    expect(hit).not.toBeNull();
    expect(hit.dist).toBeCloseTo(2.5, 5);
  });

  it('skips the voxel the ray starts inside', () => {
    const all = () => true; // everything is a target
    const hit = raycastVoxels(all, { x: 0.5, y: 0.5, z: 0.5 }, { x: 1, y: 0, z: 0 }, 3);
    expect(hit).toMatchObject({ x: 1, y: 0, z: 0, nx: -1 }); // not (0,0,0)
  });

  it('walks a diagonal without skipping corners', () => {
    // Target only (3, 0, 2): a 45-degree ray from (0.5, 0.5, 0.5) must
    // reach it by alternating x/z steps, never stepping diagonally.
    const target = (x, y, z) => x === 3 && y === 0 && z === 2;
    const hit = raycastVoxels(target, { x: 0.5, y: 0.5, z: 0.5 }, { x: 1, y: 0, z: 0.62 }, 10);
    expect(hit).not.toBeNull();
    expect(Math.abs(hit.nx) + Math.abs(hit.ny) + Math.abs(hit.nz)).toBe(1); // face normal is axis-aligned
  });

  it('returns null for a zero direction', () => {
    expect(raycastVoxels(floor, { x: 0, y: 20, z: 0 }, { x: 0, y: 0, z: 0 }, 5)).toBeNull();
  });
});

describe('playerIntersectsVoxel', () => {
  it('detects the voxels the player stands in', () => {
    const pos = { x: 0.5, y: 10, z: 0.5 }; // feet at y=10, head to 11.8
    expect(playerIntersectsVoxel(pos, 0, 10, 0)).toBe(true);
    expect(playerIntersectsVoxel(pos, 0, 11, 0)).toBe(true);
  });

  it('does not flag blocks beside, above or below', () => {
    const pos = { x: 0.5, y: 10, z: 0.5 };
    expect(playerIntersectsVoxel(pos, 0, 9, 0)).toBe(false); // under the feet
    expect(playerIntersectsVoxel(pos, 0, 12, 0)).toBe(false); // above the head
    expect(playerIntersectsVoxel(pos, 2, 10, 0)).toBe(false); // beside
  });

  it('flags a neighbouring voxel the wide AABB pokes into', () => {
    // Standing at x=0.95 the 0.6-wide box reaches into voxel x=1.
    const pos = { x: 0.95, y: 10, z: 0.5 };
    expect(playerIntersectsVoxel(pos, 1, 10, 0)).toBe(true);
  });
});
