import { hexToRgb } from './blockColors.js';

// Particle simulation: short-lived colored chips with gravity and a simple
// ground bounce. Pure logic — render/particleRenderer.js draws the state.

const GRAVITY = -16;
const BOUNCE = -0.4; // vertical velocity retained on ground hit
const FRICTION = 0.5; // horizontal velocity retained on ground hit

export class ParticleSim {
  constructor(max = 256) {
    this.max = max;
    this.particles = [];
  }

  /**
   * Spawn a burst of particles around (x, y, z).
   * color is '#rrggbb'; speed scales the random initial velocity;
   * rand is injectable for deterministic tests.
   */
  burst({ x, y, z, count = 8, color = '#888888', speed = 2.5, lifetime = 0.7, rand = Math.random }) {
    const rgb = hexToRgb(color);
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.max) return;
      // Random direction with an upward bias so chips pop out of the block.
      const a = rand() * Math.PI * 2;
      const r = rand() * speed;
      // One shared factor per particle: vary brightness, not hue.
      const brightness = 0.75 + rand() * 0.5;
      this.particles.push({
        pos: {
          x: x + (rand() - 0.5) * 0.4,
          y: y + (rand() - 0.5) * 0.4,
          z: z + (rand() - 0.5) * 0.4,
        },
        vel: {
          x: Math.cos(a) * r,
          y: rand() * speed * 0.9 + speed * 0.25,
          z: Math.sin(a) * r,
        },
        life: lifetime * (0.6 + rand() * 0.8),
        color: rgb.map((c) => Math.min(1, c * brightness)),
      });
    }
  }

  /**
   * Advance all particles; dead ones are removed.
   * `isSolidAt` (optional) enables bouncing off solid voxels from above.
   */
  update(dt, isSolidAt = null) {
    for (const p of this.particles) {
      p.life -= dt;
      p.vel.y += GRAVITY * dt;
      const nx = p.pos.x + p.vel.x * dt;
      const ny = p.pos.y + p.vel.y * dt;
      const nz = p.pos.z + p.vel.z * dt;
      if (
        isSolidAt
        && p.vel.y < 0
        && isSolidAt(Math.floor(nx), Math.floor(ny), Math.floor(nz))
      ) {
        // Rest on top of the solid voxel and bounce.
        p.pos.y = Math.floor(ny) + 1 + 1e-3;
        p.vel.y = Math.abs(p.vel.y) > 1 ? p.vel.y * BOUNCE : 0;
        p.vel.x *= FRICTION;
        p.vel.z *= FRICTION;
      } else {
        p.pos.x = nx;
        p.pos.y = ny;
        p.pos.z = nz;
      }
    }
    this.particles = this.particles.filter((p) => p.life > 0);
  }

  get count() {
    return this.particles.length;
  }
}
