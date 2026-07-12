import * as THREE from 'three';
import { World } from './core/world.js';
import { WorldRenderer } from './render/worldRenderer.js';
import { CHUNK_SIZE, CHUNK_HEIGHT } from './core/chunk.js';
import { BLOCK } from './core/blocks.js';
import { PLAYER, createPlayerState, stepPlayer } from './core/physics.js';
import { PlayerControls } from './player/controls.js';
import { BlockInteraction } from './player/interaction.js';
import { Inventory } from './core/inventory.js';
import { InventoryUI } from './ui/inventoryUI.js';
import { MobManager } from './core/mobs.js';
import {
  advanceTime, sunDirection, skyColor, lightLevels, formatClock,
} from './core/daynight.js';
import { MobRenderer } from './render/mobRenderer.js';
import { SoundPlayer } from './audio/soundPlayer.js';
import { ParticleRenderer } from './render/particleRenderer.js';

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

// Sky/ground hemisphere gives cooler shade in shadows than flat ambient.
const hemisphere = new THREE.HemisphereLight(0xd8ecff, 0x9a7f5e, 0.75);
scene.add(hemisphere);
const sun = new THREE.DirectionalLight(0xfff4e0, 1.15);
sun.position.set(60, 100, 40);
scene.add(sun);

// Day/night cycle state (t=0.25 -> start at noon).
const dayState = { t: 0.25 };
function applyDayNight() {
  const dir = sunDirection(dayState.t);
  sun.position.set(
    player.pos.x + dir.x * 100,
    player.pos.y + dir.y * 100,
    player.pos.z + dir.z * 100,
  );
  sun.target.position.set(player.pos.x, player.pos.y, player.pos.z);
  sun.target.updateMatrixWorld();
  const levels = lightLevels(dayState.t);
  sun.intensity = levels.sun;
  hemisphere.intensity = levels.hemisphere;
  const [r, g, b] = skyColor(dayState.t);
  scene.background.setRGB(r, g, b);
  scene.fog.color.setRGB(r, g, b);
}

// --- World & player -------------------------------------------------------

const seedParam = new URLSearchParams(location.search).get('seed');
const world = new World(seedParam ? Number(seedParam) : 1337);
const worldRenderer = new WorldRenderer(scene, world);
worldRenderer.ensureRadius(0, 0, VIEW_RADIUS);

const spawnX = CHUNK_SIZE / 2 + 0.5;
const spawnZ = CHUNK_SIZE / 2 + 0.5;
const spawnY = Math.min(world.surfaceHeight(Math.floor(spawnX), Math.floor(spawnZ)) + 1, CHUNK_HEIGHT - 3);
const player = createPlayerState(spawnX, spawnY, spawnZ);

const sounds = new SoundPlayer();
// Autoplay policy: the context must be created inside a user gesture.
document.addEventListener('mousedown', () => sounds.unlock());
document.addEventListener('keydown', (e) => {
  sounds.unlock();
  if (e.code === 'KeyM') sounds.toggleMute();
});

const controls = new PlayerControls(renderer.domElement);
const isSolidAt = (x, y, z) => world.isSolidAt(x, y, z);
const inventory = new Inventory();
const inventoryUI = new InventoryUI(inventory, controls);
inventoryUI.sounds = sounds;
const interaction = new BlockInteraction(world, controls, player, inventory, scene);
interaction.sounds = sounds;
const particles = new ParticleRenderer(scene);
interaction.particles = particles;
interaction.onUseBlock = (blockId) => {
  if (blockId !== BLOCK.CRAFTING_TABLE) return false;
  inventoryUI.openPanel(3);
  return true;
};

const mobManager = new MobManager(world, world.seed ^ 0x5eed);
const mobRenderer = new MobRenderer(scene);
interaction.mobManager = mobManager;

const crosshair = document.createElement('div');
crosshair.id = 'crosshair';
document.body.appendChild(crosshair);

// Debug / test handle (used by the headless browser checks).
window.blockcraft = { world, player, inventory, inventoryUI, interaction, controls, mobManager, dayState, sounds, particles };

const hud = document.createElement('div');
hud.id = 'hud';
document.body.appendChild(hud);
let hudFrames = 0;
let hudLast = performance.now();
function updateHud(now) {
  hudFrames++;
  if (now - hudLast < 500) return;
  const fps = Math.round((hudFrames * 1000) / (now - hudLast));
  hudFrames = 0;
  hudLast = now;
  const { x, y, z } = player.pos;
  hud.textContent =
    `${fps} fps | XYZ ${x.toFixed(1)} / ${y.toFixed(1)} / ${z.toFixed(1)} | `
    + `${formatClock(dayState.t)} | seed ${world.seed}`;
}

// --- Overlay (click to play) ----------------------------------------------

const overlay = document.createElement('div');
overlay.id = 'overlay';
overlay.innerHTML = `
  <div class="panel">
    <h1>BlockCraft</h1>
    <p>クリックで開始（ポインタロック）</p>
    <p class="keys">WASD: 移動 / Space: ジャンプ / マウス: 視点 / E: インベントリ / M: ミュート / Esc: 解除</p>
  </div>`;
document.body.appendChild(overlay);
controls.onLockChange = (locked) => {
  // Keep the start overlay hidden while the inventory panel is open —
  // opening it intentionally releases pointer lock.
  overlay.style.display = locked || inventoryUI.open ? 'none' : 'flex';
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
    const wasOnGround = player.onGround;
    stepPlayer(isSolidAt, player, controls.getInput(), dt);
    if (wasOnGround && !player.onGround && player.vel.y > 2) sounds.play('jump');
    if (!wasOnGround && player.onGround) sounds.play('land');
    // Fell out of the world? Respawn above the spawn column.
    if (player.pos.y < -10) {
      player.pos = { x: spawnX, y: spawnY + 5, z: spawnZ };
      player.vel = { x: 0, y: 0, z: 0 };
    }
  }
  controls.applyToCamera(camera, player.pos, PLAYER.EYE);
  interaction.update(camera, dt);

  const pcx = Math.floor(player.pos.x / CHUNK_SIZE);
  const pcz = Math.floor(player.pos.z / CHUNK_SIZE);
  worldRenderer.ensureRadius(pcx, pcz, VIEW_RADIUS);
  worldRenderer.pruneBeyond(pcx, pcz, VIEW_RADIUS + 1);
  worldRenderer.update(2, pcx, pcz, VIEW_RADIUS);

  dayState.t = advanceTime(dayState.t, dt);
  applyDayNight();

  mobManager.update(dt, player.pos);
  mobRenderer.sync(mobManager.mobs);
  particles.update(dt, isSolidAt);

  updateHud(now);
  inventoryUI.render();
  renderer.render(scene, camera);
});
