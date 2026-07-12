import * as THREE from 'three';
import { ATLAS_TILES, TILE } from '../core/mesher.js';
import { mulberry32 } from '../core/noise.js';

// Procedural texture atlas drawn on a canvas — no binary assets needed.
// Layout matches TILE ids: 4x4 grid, 64px tiles, row-major from top-left.

const TILE_PX = 64;

function fillSpeckled(ctx, x0, y0, base, speckles, rand, count = 260) {
  ctx.fillStyle = base;
  ctx.fillRect(x0, y0, TILE_PX, TILE_PX);
  for (let i = 0; i < count; i++) {
    ctx.fillStyle = speckles[Math.floor(rand() * speckles.length)];
    const s = 2 + Math.floor(rand() * 3);
    ctx.fillRect(x0 + rand() * (TILE_PX - s), y0 + rand() * (TILE_PX - s), s, s);
  }
}

const TILE_PAINTERS = {
  [TILE.GRASS_TOP]: (ctx, x, y, rand) =>
    fillSpeckled(ctx, x, y, '#4c9e3d', ['#3f8c33', '#5cab4a', '#448f38', '#63b551'], rand),
  [TILE.GRASS_SIDE]: (ctx, x, y, rand) => {
    fillSpeckled(ctx, x, y, '#8a6244', ['#7a563c', '#9b6f4e', '#6f4e36'], rand);
    // Grass strip along the top edge with a ragged lower boundary.
    ctx.fillStyle = '#4c9e3d';
    ctx.fillRect(x, y, TILE_PX, 8);
    for (let i = 0; i < TILE_PX; i += 4) {
      ctx.fillRect(x + i, y + 8, 4, Math.floor(rand() * 8));
    }
  },
  [TILE.DIRT]: (ctx, x, y, rand) =>
    fillSpeckled(ctx, x, y, '#8a6244', ['#7a563c', '#9b6f4e', '#6f4e36', '#a17553'], rand),
  [TILE.STONE]: (ctx, x, y, rand) =>
    fillSpeckled(ctx, x, y, '#8d8d8d', ['#7f7f7f', '#999999', '#767676', '#a4a4a4'], rand),
  [TILE.SAND]: (ctx, x, y, rand) =>
    fillSpeckled(ctx, x, y, '#dbc681', ['#cdb873', '#e6d28f', '#c4ad66'], rand),
  [TILE.WOOD_SIDE]: (ctx, x, y, rand) => {
    ctx.fillStyle = '#6b4a2b';
    ctx.fillRect(x, y, TILE_PX, TILE_PX);
    for (let i = 0; i < 8; i++) {
      ctx.fillStyle = i % 2 ? '#5d3f24' : '#77532f';
      ctx.fillRect(x + i * 8, y, 3 + Math.floor(rand() * 3), TILE_PX);
    }
  },
  [TILE.WOOD_TOP]: (ctx, x, y, rand) => {
    ctx.fillStyle = '#77532f';
    ctx.fillRect(x, y, TILE_PX, TILE_PX);
    ctx.strokeStyle = '#5d3f24';
    ctx.lineWidth = 3;
    for (let r = 6; r < TILE_PX / 2; r += 9) {
      ctx.beginPath();
      ctx.arc(x + TILE_PX / 2, y + TILE_PX / 2, r + rand() * 3, 0, Math.PI * 2);
      ctx.stroke();
    }
  },
  [TILE.LEAVES]: (ctx, x, y, rand) =>
    fillSpeckled(ctx, x, y, '#2d6b1f', ['#245818', '#37822a', '#1e4a13', '#419234'], rand, 400),
  [TILE.WATER]: (ctx, x, y, rand) =>
    fillSpeckled(ctx, x, y, '#3a6fd8', ['#3567c9', '#4179e3', '#2f5db8'], rand, 120),
  [TILE.PLANK]: (ctx, x, y, rand) => {
    ctx.fillStyle = '#b08d55';
    ctx.fillRect(x, y, TILE_PX, TILE_PX);
    ctx.fillStyle = '#96774a';
    for (let i = 0; i < 4; i++) ctx.fillRect(x, y + i * 16, TILE_PX, 2);
    for (let i = 0; i < 4; i++) {
      ctx.fillRect(x + ((i * 24 + 8) % TILE_PX), y + i * 16, 2, 16);
    }
  },
  [TILE.TABLE_TOP]: (ctx, x, y, rand) => {
    TILE_PAINTERS[TILE.PLANK](ctx, x, y, rand);
    // Dark work-surface square with a grid, framed by the plank border.
    ctx.fillStyle = '#7a5c33';
    ctx.fillRect(x + 10, y + 10, TILE_PX - 20, TILE_PX - 20);
    ctx.strokeStyle = '#4e3a1e';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 10, y + 10, TILE_PX - 20, TILE_PX - 20);
    ctx.beginPath();
    ctx.moveTo(x + TILE_PX / 2, y + 10);
    ctx.lineTo(x + TILE_PX / 2, y + TILE_PX - 10);
    ctx.moveTo(x + 10, y + TILE_PX / 2);
    ctx.lineTo(x + TILE_PX - 10, y + TILE_PX / 2);
    ctx.stroke();
  },
  [TILE.TABLE_SIDE]: (ctx, x, y, rand) => {
    TILE_PAINTERS[TILE.PLANK](ctx, x, y, rand);
    // Tool silhouettes: two dark squares like the Minecraft table side.
    ctx.fillStyle = '#4e3a1e';
    ctx.fillRect(x + 12, y + 14, 14, 14);
    ctx.fillRect(x + 38, y + 14, 14, 14);
  },
  [TILE.WOOL]: (ctx, x, y, rand) =>
    fillSpeckled(ctx, x, y, '#e8e6e0', ['#dcd9d1', '#f2f0ea', '#cfccc4'], rand, 320),
  [TILE.BRICK]: (ctx, x, y, rand) => {
    ctx.fillStyle = '#9c4a38';
    ctx.fillRect(x, y, TILE_PX, TILE_PX);
    ctx.fillStyle = '#d9d0c7';
    for (let row = 0; row < 4; row++) {
      ctx.fillRect(x, y + row * 16, TILE_PX, 2);
      const offset = row % 2 ? 0 : 16;
      for (let col = 0; col < 3; col++) {
        ctx.fillRect(x + ((offset + col * 32) % TILE_PX), y + row * 16, 2, 16);
      }
    }
  },
};

/** Draw the atlas and wrap it in a THREE.CanvasTexture (pixelated look). */
export function createAtlasTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = TILE_PX * ATLAS_TILES;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ff00ff'; // unused tiles show up loudly
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const rand = mulberry32(20260705);
  for (const [tile, paint] of Object.entries(TILE_PAINTERS)) {
    const t = Number(tile);
    const x = (t % ATLAS_TILES) * TILE_PX;
    const y = Math.floor(t / ATLAS_TILES) * TILE_PX;
    paint(ctx, x, y, rand);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
