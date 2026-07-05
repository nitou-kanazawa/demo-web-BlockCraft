import { describe, it, expect } from 'vitest';
import {
  buildChunkMesh, faceVisible, blockFaceTile, tileUvRect, FACES, TILE, FACE_SHADE,
} from '../src/core/mesher.js';
import { Chunk } from '../src/core/chunk.js';
import { BLOCK } from '../src/core/blocks.js';

/** getWorldBlock backed by a single chunk at (0,0); everything else is AIR. */
function singleChunkLookup(chunk) {
  return (x, y, z) => chunk.get(x, y, z);
}

describe('faceVisible', () => {
  it('hides faces behind opaque blocks', () => {
    expect(faceVisible(BLOCK.STONE, BLOCK.DIRT)).toBe(false);
    expect(faceVisible(BLOCK.WATER, BLOCK.STONE)).toBe(false);
  });
  it('shows faces against air and transparent blocks', () => {
    expect(faceVisible(BLOCK.STONE, BLOCK.AIR)).toBe(true);
    expect(faceVisible(BLOCK.STONE, BLOCK.WATER)).toBe(true);
    expect(faceVisible(BLOCK.STONE, BLOCK.LEAVES)).toBe(true);
  });
  it('culls faces between two blocks of the same transparent type', () => {
    expect(faceVisible(BLOCK.WATER, BLOCK.WATER)).toBe(false);
    expect(faceVisible(BLOCK.LEAVES, BLOCK.LEAVES)).toBe(false);
  });
});

describe('buildChunkMesh', () => {
  it('meshes an isolated cube as 6 faces / 24 vertices / 36 indices', () => {
    const c = new Chunk(0, 0);
    c.set(5, 10, 5, BLOCK.STONE);
    const { solid, water } = buildChunkMesh(c, singleChunkLookup(c));
    expect(solid.positions.length).toBe(24 * 3);
    expect(solid.normals.length).toBe(24 * 3);
    expect(solid.uvs.length).toBe(24 * 2);
    expect(solid.indices.length).toBe(36);
    expect(water.indices.length).toBe(0);
  });

  it('culls the shared face between two adjacent cubes (10 faces)', () => {
    const c = new Chunk(0, 0);
    c.set(5, 10, 5, BLOCK.STONE);
    c.set(6, 10, 5, BLOCK.STONE);
    const { solid } = buildChunkMesh(c, singleChunkLookup(c));
    expect(solid.indices.length).toBe(10 * 6);
  });

  it('splits water into its own bucket and culls water-water faces', () => {
    const c = new Chunk(0, 0);
    c.set(5, 10, 5, BLOCK.WATER);
    c.set(5, 11, 5, BLOCK.WATER);
    const { solid, water } = buildChunkMesh(c, singleChunkLookup(c));
    expect(solid.indices.length).toBe(0);
    // Two stacked water blocks: 12 faces - 2 shared = 10.
    expect(water.indices.length).toBe(10 * 6);
  });

  it('draws a stone top face under water (visible through water)', () => {
    const c = new Chunk(0, 0);
    c.set(5, 10, 5, BLOCK.STONE);
    c.set(5, 11, 5, BLOCK.WATER);
    const { solid } = buildChunkMesh(c, singleChunkLookup(c));
    expect(solid.indices.length).toBe(6 * 6); // all 6 stone faces visible
  });

  it('consults the world lookup across chunk borders', () => {
    const c = new Chunk(0, 0);
    c.set(0, 10, 5, BLOCK.STONE);
    // Neighbouring chunk (-1, 0) claims an opaque block right next door.
    const lookup = (x, y, z) =>
      x === -1 && y === 10 && z === 5 ? BLOCK.STONE : c.get(x, y, z);
    const { solid } = buildChunkMesh(c, lookup);
    expect(solid.indices.length).toBe(5 * 6); // -x face culled
  });

  it('emits positions in world space for non-origin chunks', () => {
    const c = new Chunk(2, -1); // origin at world (32, 0, -16)
    c.set(0, 10, 0, BLOCK.STONE);
    const { solid } = buildChunkMesh(c, () => BLOCK.AIR);
    const xs = [];
    for (let i = 0; i < solid.positions.length; i += 3) xs.push(solid.positions[i]);
    expect(Math.min(...xs)).toBe(32);
    expect(Math.max(...xs)).toBe(33);
  });

  it('bakes directional shading into vertex colors', () => {
    const c = new Chunk(0, 0);
    c.set(5, 10, 5, BLOCK.STONE);
    const { solid } = buildChunkMesh(c, singleChunkLookup(c));
    expect(solid.colors.length).toBe(solid.positions.length);
    for (let v = 0; v < solid.normals.length / 3; v++) {
      const [nx, ny] = [solid.normals[v * 3], solid.normals[v * 3 + 1]];
      const shade = solid.colors[v * 3];
      if (ny === 1) expect(shade).toBe(FACE_SHADE[3]); // top, full bright
      if (ny === -1) expect(shade).toBe(FACE_SHADE[2]); // bottom, darkest
      if (nx !== 0) expect(shade).toBe(FACE_SHADE[0]); // east/west
      // r == g == b (grayscale shading)
      expect(solid.colors[v * 3 + 1]).toBe(shade);
      expect(solid.colors[v * 3 + 2]).toBe(shade);
    }
  });

  it('keeps normals unit-length and axis-aligned', () => {
    const c = new Chunk(0, 0);
    c.set(1, 1, 1, BLOCK.GRASS);
    const { solid } = buildChunkMesh(c, singleChunkLookup(c));
    for (let i = 0; i < solid.normals.length; i += 3) {
      const [nx, ny, nz] = solid.normals.slice(i, i + 3);
      expect(Math.abs(nx) + Math.abs(ny) + Math.abs(nz)).toBe(1);
    }
  });
});

describe('texture atlas mapping', () => {
  const FACE_INDEX = Object.fromEntries(FACES.map((f, i) => [f.name, i]));

  it('gives grass a distinct top, bottom and side tile', () => {
    expect(blockFaceTile(BLOCK.GRASS, FACE_INDEX.py)).toBe(TILE.GRASS_TOP);
    expect(blockFaceTile(BLOCK.GRASS, FACE_INDEX.ny)).toBe(TILE.DIRT);
    expect(blockFaceTile(BLOCK.GRASS, FACE_INDEX.px)).toBe(TILE.GRASS_SIDE);
  });

  it('keeps every tile uv rect inside [0,1] and non-degenerate', () => {
    for (const tile of Object.values(TILE)) {
      const [u0, v0, u1, v1] = tileUvRect(tile);
      expect(u0).toBeGreaterThanOrEqual(0);
      expect(v0).toBeGreaterThanOrEqual(0);
      expect(u1).toBeLessThanOrEqual(1);
      expect(v1).toBeLessThanOrEqual(1);
      expect(u1).toBeGreaterThan(u0);
      expect(v1).toBeGreaterThan(v0);
    }
  });

  it('assigns distinct uv rects to distinct tiles', () => {
    const seen = new Set();
    for (const tile of Object.values(TILE)) {
      const key = tileUvRect(tile).join(',');
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
  });
});
