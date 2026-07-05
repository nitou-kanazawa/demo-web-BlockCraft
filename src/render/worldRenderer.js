import * as THREE from 'three';
import { buildChunkMesh } from '../core/mesher.js';
import { World } from '../core/world.js';
import { createAtlasTexture } from './atlas.js';

/**
 * Owns the THREE meshes for the world's chunks: builds geometry for dirty
 * chunks, swaps it into the scene, and disposes replaced GPU resources.
 */
export class WorldRenderer {
  constructor(scene, world) {
    this.scene = scene;
    this.world = world;
    this.meshes = new Map(); // chunk key -> { solid: Mesh|null, water: Mesh|null }

    const atlas = createAtlasTexture();
    this.solidMaterial = new THREE.MeshLambertMaterial({ map: atlas });
    this.waterMaterial = new THREE.MeshLambertMaterial({
      map: atlas,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
  }

  /** Generate chunks in a square radius around chunk (ccx, ccz). */
  ensureRadius(ccx, ccz, radius) {
    for (let cx = ccx - radius; cx <= ccx + radius; cx++) {
      for (let cz = ccz - radius; cz <= ccz + radius; cz++) {
        this.world.ensureChunk(cx, cz);
      }
    }
  }

  /**
   * Rebuild meshes for dirty chunks, at most `maxRebuilds` per call to keep
   * frame times stable while chunks stream in around a moving player.
   * When a center is given, only chunks within `radius` of it are meshed —
   * pruned far chunks stay dirty until they come back into range.
   */
  update(maxRebuilds = Infinity, ccx = 0, ccz = 0, radius = Infinity) {
    let rebuilt = 0;
    for (const chunk of this.world.chunks.values()) {
      if (!chunk.dirty) continue;
      if (Math.max(Math.abs(chunk.cx - ccx), Math.abs(chunk.cz - ccz)) > radius) continue;
      this.rebuildChunk(chunk);
      if (++rebuilt >= maxRebuilds) break;
    }
  }

  /**
   * Drop meshes of chunks farther than `radius` (Chebyshev) from chunk
   * (ccx, ccz). Voxel data stays in the world; the chunk is marked dirty so
   * it remeshes when it comes back into range.
   */
  pruneBeyond(ccx, ccz, radius) {
    for (const [key, entry] of this.meshes) {
      const [cx, cz] = key.split(',').map(Number);
      if (Math.max(Math.abs(cx - ccx), Math.abs(cz - ccz)) <= radius) continue;
      for (const mesh of Object.values(entry)) {
        if (!mesh) continue;
        this.scene.remove(mesh);
        mesh.geometry.dispose();
      }
      this.meshes.delete(key);
      const chunk = this.world.getChunk(cx, cz);
      if (chunk) chunk.dirty = true;
    }
  }

  rebuildChunk(chunk) {
    chunk.dirty = false;
    const key = World.key(chunk.cx, chunk.cz);
    const old = this.meshes.get(key);
    if (old) {
      for (const mesh of Object.values(old)) {
        if (!mesh) continue;
        this.scene.remove(mesh);
        mesh.geometry.dispose();
      }
    }

    const data = buildChunkMesh(chunk, (x, y, z) => this.world.getBlock(x, y, z));
    const entry = {
      solid: this.addMesh(data.solid, this.solidMaterial),
      water: this.addMesh(data.water, this.waterMaterial),
    };
    this.meshes.set(key, entry);
  }

  addMesh(bucket, material) {
    if (bucket.indices.length === 0) return null;
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(bucket.positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(bucket.normals, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(bucket.uvs, 2));
    geometry.setIndex(bucket.indices);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.frustumCulled = true;
    this.scene.add(mesh);
    return mesh;
  }
}
