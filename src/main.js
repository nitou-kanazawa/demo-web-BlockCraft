import * as THREE from 'three';
import { World } from './core/world.js';
import { WorldRenderer } from './render/worldRenderer.js';
import { CHUNK_SIZE } from './core/chunk.js';

// Task 3: render the generated voxel world with a slow orbiting camera.
// Player controls arrive in Task 4.

const VIEW_RADIUS = 3; // chunks around the center

const container = document.getElementById('app');

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
container.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
scene.fog = new THREE.Fog(0x87ceeb, 60, 140);

const camera = new THREE.PerspectiveCamera(
  70,
  window.innerWidth / window.innerHeight,
  0.1,
  1000,
);

const ambient = new THREE.AmbientLight(0xffffff, 0.55);
scene.add(ambient);
const sun = new THREE.DirectionalLight(0xffffff, 1.3);
sun.position.set(60, 100, 40);
scene.add(sun);

const seedParam = new URLSearchParams(location.search).get('seed');
const world = new World(seedParam ? Number(seedParam) : 1337);
const worldRenderer = new WorldRenderer(scene, world);
worldRenderer.ensureRadius(0, 0, VIEW_RADIUS);

const centerX = CHUNK_SIZE / 2;
const centerZ = CHUNK_SIZE / 2;
const centerY = Math.max(world.surfaceHeight(centerX, centerZ), 20);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

renderer.setAnimationLoop((time) => {
  const angle = time / 12000;
  const orbitRadius = 45;
  camera.position.set(
    centerX + Math.cos(angle) * orbitRadius,
    centerY + 22,
    centerZ + Math.sin(angle) * orbitRadius,
  );
  camera.lookAt(centerX, centerY, centerZ);
  worldRenderer.update();
  renderer.render(scene, camera);
});
