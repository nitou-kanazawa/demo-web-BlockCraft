import * as THREE from 'three';
import { BLOCK, isSolid } from '../core/blocks.js';
import { raycastVoxels } from '../core/raycast.js';
import { playerIntersectsVoxel } from '../core/physics.js';
import { CHUNK_HEIGHT } from '../core/chunk.js';
import { blockDrop } from '../core/items.js';
import { breakDuration, MiningTracker } from '../core/breaking.js';
import { soundForBlock, DIG_SOUND_INTERVAL } from '../core/soundDefs.js';
import { BLOCK_COLORS } from '../core/blockColors.js';

const REACH = 5; // max targeting distance in blocks

/**
 * Mine / place blocks with the mouse and highlight the targeted block.
 * Hold left: mine the targeted block (time depends on block hardness and
 * the held tool); the drop goes into the inventory. Right click: place one
 * item from the selected hotbar slot against the targeted face.
 */
export class BlockInteraction {
  constructor(world, controls, player, inventory, scene) {
    this.world = world;
    this.controls = controls;
    this.player = player;
    this.inventory = inventory;
    this.hit = null;
    this.mining = false; // left button held
    this.tracker = new MiningTracker();
    this.sounds = null; // optional SoundPlayer, assigned by main
    this.particles = null; // optional ParticleRenderer, assigned by main
    this.digSoundTimer = 0;

    this.highlight = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(1.002, 1.002, 1.002)),
      new THREE.LineBasicMaterial({ color: 0x111111 }),
    );
    this.highlight.visible = false;
    scene.add(this.highlight);

    // Darkening overlay on the mined block, opacity follows progress.
    this.crack = new THREE.Mesh(
      new THREE.BoxGeometry(1.004, 1.004, 1.004),
      new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
    );
    this.crack.visible = false;
    scene.add(this.crack);

    // Progress bar under the crosshair.
    this.progressEl = document.createElement('div');
    this.progressEl.id = 'break-progress';
    this.progressEl.innerHTML = '<div class="fill"></div>';
    document.body.appendChild(this.progressEl);

    document.addEventListener('contextmenu', (e) => e.preventDefault());
    document.addEventListener('mousedown', (e) => {
      if (!controls.locked) return;
      if (e.button === 0) this.mining = true;
      else if (e.button === 2) this.placeBlock();
    });
    document.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.mining = false;
    });
  }

  /** Retarget, advance mining progress, refresh visuals. Call once per frame. */
  update(camera, dt) {
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    this.hit = raycastVoxels(
      (x, y, z) => isSolid(this.world.getBlock(x, y, z)),
      camera.position,
      dir,
      REACH,
    );

    let duration = Infinity;
    let targetKey = null;
    if (this.hit) {
      this.highlight.position.set(this.hit.x + 0.5, this.hit.y + 0.5, this.hit.z + 0.5);
      this.highlight.visible = true;
      targetKey = `${this.hit.x},${this.hit.y},${this.hit.z}`;
      duration = breakDuration(
        this.world.getBlock(this.hit.x, this.hit.y, this.hit.z),
        this.inventory.selectedStack?.id ?? null,
      );
    } else {
      this.highlight.visible = false;
    }

    const active = this.mining && this.controls.locked;
    // Periodic dig tick while actually chipping at a block.
    if (active && targetKey && duration !== Infinity) {
      this.digSoundTimer -= dt;
      if (this.digSoundTimer <= 0) {
        this.digSoundTimer = DIG_SOUND_INTERVAL;
        const target = this.world.getBlock(this.hit.x, this.hit.y, this.hit.z);
        this.sounds?.play(soundForBlock(target, 'dig'));
        // Chips fly off the face being chipped at.
        this.particles?.burst({
          x: this.hit.x + 0.5 + this.hit.nx * 0.55,
          y: this.hit.y + 0.5 + this.hit.ny * 0.55,
          z: this.hit.z + 0.5 + this.hit.nz * 0.55,
          count: 4,
          speed: 1.6,
          lifetime: 0.5,
          color: BLOCK_COLORS[target] ?? '#888888',
        });
      }
    } else {
      this.digSoundTimer = 0;
    }
    if (this.tracker.update(active, targetKey, duration, dt)) {
      this.breakBlock();
    }

    const progress = this.tracker.progress;
    if (progress > 0 && this.hit) {
      this.crack.position.copy(this.highlight.position);
      this.crack.material.opacity = 0.15 + progress * 0.45;
      this.crack.visible = true;
      this.progressEl.style.display = 'block';
      this.progressEl.querySelector('.fill').style.width = `${Math.round(progress * 100)}%`;
    } else {
      this.crack.visible = false;
      this.progressEl.style.display = 'none';
    }
  }

  breakBlock() {
    if (!this.hit) return;
    const broken = this.world.getBlock(this.hit.x, this.hit.y, this.hit.z);
    this.world.setBlock(this.hit.x, this.hit.y, this.hit.z, BLOCK.AIR);
    this.sounds?.play(soundForBlock(broken, 'break'));
    this.particles?.burst({
      x: this.hit.x + 0.5,
      y: this.hit.y + 0.5,
      z: this.hit.z + 0.5,
      count: 16,
      speed: 2.6,
      lifetime: 0.8,
      color: BLOCK_COLORS[broken] ?? '#888888',
    });
    const drop = blockDrop(broken);
    if (drop !== null) this.inventory.add(drop, 1);
  }

  placeBlock() {
    if (!this.hit) return;
    // Interactable blocks (crafting table) take priority over placing.
    if (this.onUseBlock) {
      const target = this.world.getBlock(this.hit.x, this.hit.y, this.hit.z);
      if (this.onUseBlock(target)) return;
    }
    const x = this.hit.x + this.hit.nx;
    const y = this.hit.y + this.hit.ny;
    const z = this.hit.z + this.hit.nz;
    if (y < 0 || y >= CHUNK_HEIGHT) return;
    const occupant = this.world.getBlock(x, y, z);
    if (occupant !== BLOCK.AIR && occupant !== BLOCK.WATER) return;
    if (playerIntersectsVoxel(this.player.pos, x, y, z)) return;
    const block = this.inventory.consumeSelectedBlock();
    if (block === null) return;
    this.world.setBlock(x, y, z, block);
    this.sounds?.play(soundForBlock(block, 'place'));
    this.particles?.burst({
      x: x + 0.5, y: y + 0.5, z: z + 0.5,
      count: 6, speed: 1.2, lifetime: 0.4,
      color: BLOCK_COLORS[block] ?? '#888888',
    });
  }
}
