import { BLOCK_INFO } from './blocks.js';
import { itemInfo } from './items.js';

// Mining time model. Pure logic.
// Task 8: bare-hand times from block hardness. The held item is consulted
// for a tool speed multiplier (populated by the tools task).

/**
 * Seconds needed to break `blockId` while holding item `heldItemId`
 * (null = bare hand). Infinity for unbreakable blocks.
 */
export function breakDuration(blockId, heldItemId = null) {
  const info = BLOCK_INFO[blockId];
  if (!info || info.hardness === Infinity) return Infinity;
  const held = heldItemId !== null ? itemInfo(heldItemId) : null;
  // A matching tool divides the time by its speed factor.
  if (held?.kind === 'tool' && held.toolClass === info.toolClass) {
    return info.hardness / held.speed;
  }
  return info.hardness;
}

/**
 * Tracks mining progress on the currently targeted block.
 * Feed it every frame; it resets when the player stops mining or looks at
 * a different block, and reports completion exactly once per broken block.
 */
export class MiningTracker {
  constructor() {
    this.targetKey = null;
    this.elapsed = 0;
    this.duration = Infinity;
  }

  reset() {
    this.targetKey = null;
    this.elapsed = 0;
    this.duration = Infinity;
  }

  /**
   * @param mining    is the mine button held?
   * @param targetKey identity of the targeted block (e.g. "x,y,z"), or null
   * @param duration  seconds required to break it
   * @param dt        seconds since last frame
   * @returns true exactly when the block finishes breaking this frame
   */
  update(mining, targetKey, duration, dt) {
    if (!mining || targetKey === null || duration === Infinity) {
      this.reset();
      return false;
    }
    if (targetKey !== this.targetKey) {
      this.targetKey = targetKey;
      this.elapsed = 0;
    }
    this.duration = duration;
    this.elapsed += dt;
    if (this.elapsed >= duration) {
      this.reset();
      return true;
    }
    return false;
  }

  /** Progress in [0, 1) toward breaking the current target. */
  get progress() {
    if (this.targetKey === null || this.duration === Infinity) return 0;
    return Math.min(this.elapsed / this.duration, 1);
  }
}
