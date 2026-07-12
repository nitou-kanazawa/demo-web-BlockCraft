import * as THREE from 'three';
import { ParticleSim } from '../core/particles.js';

// Draws the particle simulation as a single THREE.Points cloud with
// preallocated buffers (no per-frame allocation).

const MAX_PARTICLES = 256;

export class ParticleRenderer {
  constructor(scene) {
    this.sim = new ParticleSim(MAX_PARTICLES);

    this.positions = new Float32Array(MAX_PARTICLES * 3);
    this.colors = new Float32Array(MAX_PARTICLES * 3);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    geometry.setDrawRange(0, 0);
    this.geometry = geometry;

    this.points = new THREE.Points(
      geometry,
      new THREE.PointsMaterial({ size: 0.14, vertexColors: true }),
    );
    this.points.frustumCulled = false; // cheap, and particles move every frame
    scene.add(this.points);
  }

  /** Spawn a burst (see ParticleSim.burst). */
  burst(opts) {
    this.sim.burst(opts);
  }

  /** Step the simulation and refresh GPU buffers. Call once per frame. */
  update(dt, isSolidAt) {
    this.sim.update(dt, isSolidAt);
    const list = this.sim.particles;
    for (let i = 0; i < list.length; i++) {
      const p = list[i];
      this.positions[i * 3] = p.pos.x;
      this.positions[i * 3 + 1] = p.pos.y;
      this.positions[i * 3 + 2] = p.pos.z;
      this.colors[i * 3] = p.color[0];
      this.colors[i * 3 + 1] = p.color[1];
      this.colors[i * 3 + 2] = p.color[2];
    }
    this.geometry.setDrawRange(0, list.length);
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
  }
}
