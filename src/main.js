import * as THREE from 'three';
import { World } from './core/world.js';
import { WorldRenderer } from './render/worldRenderer.js';
import { CHUNK_SIZE, CHUNK_HEIGHT } from './core/chunk.js';
import { PLAYER, createPlayerState, stepPlayer } from './core/physics.js';
import { PlayerControls } from './player/controls.js';

const VIEW_RADIUS = 3; // chunks generated/rendered around the player
const MAX_DT = 0.05; // clamp long frames (tab switch etc.)

const container = document.getElementById('app');

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
container.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
scene.fog = new THREE.Fog(0x87ceeb, 50, 110);

const camera = new THREE.PerspectiveCamera(
  70,
  window.innerWidth / window.innerHeight,
  0.1,
  1000,
);

scene.add(new THREE.AmbientLight(0xffffff, 0.55));
const sun = new THREE.DirectionalLight(0xffffff, 1.3);
sun.position.set(60, 100, 40);
scene.add(sun);

// --- World & player -------------------------------------------------------

const seedParam = new URLSearchParams(location.search).get('seed');
const world = new World(seedParam ? Number(seedParam) : 1337);
const worldRenderer = new WorldRenderer(scene, world);
worldRenderer.ensureRadius(0, 0, VIEW_RADIUS);

const spawnX = CHUNK_SIZE / 2 + 0.5;
const spawnZ = CHUNK_SIZE / 2 + 0.5;
const spawnY = Math.min(world.surfaceHeight(Math.floor(spawnX), Math.floor(spawnZ)) + 1, CHUNK_HEIGHT - 3);
const player = createPlayerState(spawnX, spawnY, spawnZ);

const controls = new PlayerControls(renderer.domElement);
const isSolidAt = (x, y, z) => world.isSolidAt(x, y, z);

// --- Overlay (click to play) ----------------------------------------------

const overlay = document.createElement('div');
overlay.id = 'overlay';
overlay.innerHTML = `
  <div class="panel">
    <h1>BlockCraft</h1>
    <p>クリックで開始（ポインタロック）</p>
    <p class="keys">WASD: 移動 / Space: ジャンプ / マウス: 視点 / Esc: 解除</p>
  </div>`;
document.body.appendChild(overlay);
controls.onLockChange = (locked) => {
  overlay.style.display = locked ? 'none' : 'flex';
};
overlay.addEventListener('click', () => renderer.domElement.click());

// --- Main loop --------------------------------------------------------------

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

let lastTime = performance.now();
renderer.setAnimationLoop((now) => {
  const dt = Math.min((now - lastTime) / 1000, MAX_DT);
  lastTime = now;

  if (controls.locked) {
    stepPlayer(isSolidAt, player, controls.getInput(), dt);
    // Fell out of the world? Respawn above the spawn column.
    if (player.pos.y < -10) {
      player.pos = { x: spawnX, y: spawnY + 5, z: spawnZ };
      player.vel = { x: 0, y: 0, z: 0 };
    }
  }
  controls.applyToCamera(camera, player.pos, PLAYER.EYE);

  const pcx = Math.floor(player.pos.x / CHUNK_SIZE);
  const pcz = Math.floor(player.pos.z / CHUNK_SIZE);
  worldRenderer.ensureRadius(pcx, pcz, VIEW_RADIUS);
  worldRenderer.pruneBeyond(pcx, pcz, VIEW_RADIUS + 1);
  worldRenderer.update(2, pcx, pcz, VIEW_RADIUS);

  renderer.render(scene, camera);
});
