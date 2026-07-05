import { clamp } from '../core/math.js';

// Pointer-lock mouse look + WASD key state. Translates view direction and
// pressed keys into the world-space input vector consumed by physics.

const MOUSE_SENSITIVITY = 0.002;
const MAX_PITCH = Math.PI / 2 - 0.01;

export class PlayerControls {
  constructor(domElement) {
    this.domElement = domElement;
    this.yaw = 0;
    this.pitch = 0;
    this.keys = new Set();
    this.locked = false;
    this.onLockChange = null; // callback(locked)

    domElement.addEventListener('click', () => {
      if (!this.locked) domElement.requestPointerLock();
    });
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === domElement;
      if (!this.locked) this.keys.clear();
      if (this.onLockChange) this.onLockChange(this.locked);
    });
    document.addEventListener('mousemove', (e) => {
      if (!this.locked) return;
      this.yaw -= e.movementX * MOUSE_SENSITIVITY;
      this.pitch = clamp(this.pitch - e.movementY * MOUSE_SENSITIVITY, -MAX_PITCH, MAX_PITCH);
    });
    document.addEventListener('keydown', (e) => {
      if (!this.locked) return;
      this.keys.add(e.code);
      // Keep Space from scrolling the page if lock is ever lost mid-press.
      if (e.code === 'Space') e.preventDefault();
    });
    document.addEventListener('keyup', (e) => this.keys.delete(e.code));
  }

  /** World-space movement input for the physics step. */
  getInput() {
    let forward = 0;
    let strafe = 0;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) forward += 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) forward -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) strafe += 1;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) strafe -= 1;
    const len = Math.hypot(forward, strafe);
    if (len > 0) {
      forward /= len;
      strafe /= len;
    }
    const sin = Math.sin(this.yaw);
    const cos = Math.cos(this.yaw);
    return {
      // Camera looks along -Z at yaw 0; strafe right is +X.
      dirX: -sin * forward + cos * strafe,
      dirZ: -cos * forward - sin * strafe,
      jump: this.keys.has('Space'),
    };
  }

  /** Position the camera at the player's eye with the current view angles. */
  applyToCamera(camera, playerPos, eyeHeight) {
    camera.position.set(playerPos.x, playerPos.y + eyeHeight, playerPos.z);
    camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
  }
}
