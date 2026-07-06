import * as THREE from 'three';
import { BLOCK, isSolid } from '../core/blocks.js';
import { raycastVoxels } from '../core/raycast.js';
import { playerIntersectsVoxel } from '../core/physics.js';
import { CHUNK_HEIGHT } from '../core/chunk.js';
import { blockDrop } from '../core/items.js';

const REACH = 5; // max targeting distance in blocks

/**
 * Break / place blocks with the mouse and highlight the targeted block.
 * Left click: break (the drop goes into the inventory). Right click: place
 * one item from the selected hotbar slot against the targeted face
 * (refused inside the player or out of world bounds).
 */
export class BlockInteraction {
  constructor(world, controls, player, inventory, scene) {
    this.world = world;
    this.controls = controls;
    this.player = player;
    this.inventory = inventory;
    this.hit = null;

    this.highlight = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(1.002, 1.002, 1.002)),
      new THREE.LineBasicMaterial({ color: 0x111111 }),
    );
    this.highlight.visible = false;
    scene.add(this.highlight);

    document.addEventListener('contextmenu', (e) => e.preventDefault());
    document.addEventListener('mousedown', (e) => {
      if (!controls.locked) return;
      if (e.button === 0) this.breakBlock();
      else if (e.button === 2) this.placeBlock();
    });
  }

  /** Recompute the targeted block from the camera; call once per frame. */
  update(camera) {
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    this.hit = raycastVoxels(
      (x, y, z) => isSolid(this.world.getBlock(x, y, z)),
      camera.position,
      dir,
      REACH,
    );
    if (this.hit) {
      this.highlight.position.set(this.hit.x + 0.5, this.hit.y + 0.5, this.hit.z + 0.5);
      this.highlight.visible = true;
    } else {
      this.highlight.visible = false;
    }
  }

  breakBlock() {
    if (!this.hit) return;
    const broken = this.world.getBlock(this.hit.x, this.hit.y, this.hit.z);
    this.world.setBlock(this.hit.x, this.hit.y, this.hit.z, BLOCK.AIR);
    const drop = blockDrop(broken);
    if (drop !== null) this.inventory.add(drop, 1);
  }

  placeBlock() {
    if (!this.hit) return;
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
  }
}
