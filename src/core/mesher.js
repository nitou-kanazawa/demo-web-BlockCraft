import { BLOCK, BLOCK_INFO } from './blocks.js';
import { CHUNK_SIZE, CHUNK_HEIGHT } from './chunk.js';

// Chunk meshing: turns voxel data into vertex arrays with hidden-face
// culling. Pure logic — three.js consumes the output but is not imported.

// Texture atlas tile ids (ATLAS_TILES per row in a 4x4 grid).
export const ATLAS_TILES = 4;
export const TILE = {
  GRASS_TOP: 0,
  GRASS_SIDE: 1,
  DIRT: 2,
  STONE: 3,
  SAND: 4,
  WOOD_SIDE: 5,
  WOOD_TOP: 6,
  LEAVES: 7,
  WATER: 8,
  PLANK: 9,
  BRICK: 10,
};

// Face order: nx, px, ny (bottom), py (top), nz, pz.
export const FACES = [
  {
    name: 'nx', dir: [-1, 0, 0],
    corners: [
      { pos: [0, 1, 0], uv: [0, 1] },
      { pos: [0, 0, 0], uv: [0, 0] },
      { pos: [0, 1, 1], uv: [1, 1] },
      { pos: [0, 0, 1], uv: [1, 0] },
    ],
  },
  {
    name: 'px', dir: [1, 0, 0],
    corners: [
      { pos: [1, 1, 1], uv: [0, 1] },
      { pos: [1, 0, 1], uv: [0, 0] },
      { pos: [1, 1, 0], uv: [1, 1] },
      { pos: [1, 0, 0], uv: [1, 0] },
    ],
  },
  {
    name: 'ny', dir: [0, -1, 0],
    corners: [
      { pos: [1, 0, 1], uv: [1, 0] },
      { pos: [0, 0, 1], uv: [0, 0] },
      { pos: [1, 0, 0], uv: [1, 1] },
      { pos: [0, 0, 0], uv: [0, 1] },
    ],
  },
  {
    name: 'py', dir: [0, 1, 0],
    corners: [
      { pos: [0, 1, 1], uv: [1, 1] },
      { pos: [1, 1, 1], uv: [0, 1] },
      { pos: [0, 1, 0], uv: [1, 0] },
      { pos: [1, 1, 0], uv: [0, 0] },
    ],
  },
  {
    name: 'nz', dir: [0, 0, -1],
    corners: [
      { pos: [1, 0, 0], uv: [0, 0] },
      { pos: [0, 0, 0], uv: [1, 0] },
      { pos: [1, 1, 0], uv: [0, 1] },
      { pos: [0, 1, 0], uv: [1, 1] },
    ],
  },
  {
    name: 'pz', dir: [0, 0, 1],
    corners: [
      { pos: [0, 0, 1], uv: [0, 0] },
      { pos: [1, 0, 1], uv: [1, 0] },
      { pos: [0, 1, 1], uv: [0, 1] },
      { pos: [1, 1, 1], uv: [1, 1] },
    ],
  },
];

const FACE_NX = 0;
const FACE_PX = 1;
const FACE_NY = 2;
const FACE_PY = 3;

// Directional shading baked into vertex colors (Minecraft-style):
// top full bright, east/west darker than north/south, bottom darkest.
// Order matches FACES: nx, px, ny, py, nz, pz.
export const FACE_SHADE = [0.6, 0.6, 0.5, 1.0, 0.8, 0.8];

/** Atlas tile for a given block face. */
export function blockFaceTile(blockId, faceIndex) {
  switch (blockId) {
    case BLOCK.GRASS:
      if (faceIndex === FACE_PY) return TILE.GRASS_TOP;
      if (faceIndex === FACE_NY) return TILE.DIRT;
      return TILE.GRASS_SIDE;
    case BLOCK.DIRT: return TILE.DIRT;
    case BLOCK.STONE: return TILE.STONE;
    case BLOCK.SAND: return TILE.SAND;
    case BLOCK.WOOD:
      return faceIndex === FACE_PY || faceIndex === FACE_NY ? TILE.WOOD_TOP : TILE.WOOD_SIDE;
    case BLOCK.LEAVES: return TILE.LEAVES;
    case BLOCK.WATER: return TILE.WATER;
    case BLOCK.PLANK: return TILE.PLANK;
    case BLOCK.BRICK: return TILE.BRICK;
    default: return TILE.STONE;
  }
}

/** UV rect [u0, v0, u1, v1] of a tile in the atlas (v=0 at the bottom). */
export function tileUvRect(tile) {
  const col = tile % ATLAS_TILES;
  const row = Math.floor(tile / ATLAS_TILES);
  return [
    col / ATLAS_TILES,
    1 - (row + 1) / ATLAS_TILES,
    (col + 1) / ATLAS_TILES,
    1 - row / ATLAS_TILES,
  ];
}

function isOpaque(id) {
  const info = BLOCK_INFO[id];
  return info ? info.solid && !info.transparent : false;
}

/**
 * Is `neighbor`'s side of `id` visible?
 * A face is hidden behind opaque blocks, and between two blocks of the
 * same transparent type (no inner faces inside a body of water / leaves).
 */
export function faceVisible(id, neighbor) {
  if (isOpaque(neighbor)) return false;
  if (id === neighbor) return false;
  return true;
}

/**
 * Build vertex data for one chunk.
 * `getWorldBlock(wx, wy, wz)` supplies neighbours (including blocks in
 * adjacent chunks). Vertex positions are in world space.
 * Returns { solid, water }, each { positions, normals, uvs, indices }.
 */
export function buildChunkMesh(chunk, getWorldBlock) {
  const buckets = {
    solid: { positions: [], normals: [], uvs: [], colors: [], indices: [] },
    water: { positions: [], normals: [], uvs: [], colors: [], indices: [] },
  };
  const ox = chunk.cx * CHUNK_SIZE;
  const oz = chunk.cz * CHUNK_SIZE;

  for (let y = 0; y < CHUNK_HEIGHT; y++) {
    for (let z = 0; z < CHUNK_SIZE; z++) {
      for (let x = 0; x < CHUNK_SIZE; x++) {
        const id = chunk.get(x, y, z);
        if (id === BLOCK.AIR) continue;
        const wx = ox + x;
        const wz = oz + z;
        const bucket = id === BLOCK.WATER ? buckets.water : buckets.solid;

        for (let f = 0; f < FACES.length; f++) {
          const face = FACES[f];
          const neighbor = getWorldBlock(wx + face.dir[0], y + face.dir[1], wz + face.dir[2]);
          if (!faceVisible(id, neighbor)) continue;

          const [u0, v0, u1, v1] = tileUvRect(blockFaceTile(id, f));
          const shade = FACE_SHADE[f];
          const base = bucket.positions.length / 3;
          for (const corner of face.corners) {
            bucket.positions.push(wx + corner.pos[0], y + corner.pos[1], wz + corner.pos[2]);
            bucket.normals.push(face.dir[0], face.dir[1], face.dir[2]);
            bucket.colors.push(shade, shade, shade);
            bucket.uvs.push(
              corner.uv[0] ? u1 : u0,
              corner.uv[1] ? v1 : v0,
            );
          }
          bucket.indices.push(base, base + 1, base + 2, base + 2, base + 1, base + 3);
        }
      }
    }
  }
  return buckets;
}
