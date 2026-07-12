import * as THREE from 'three';

// Blocky animal models built from shaded boxes, synced to mob state.
// Geometry/material instances are shared per mob type.

const PALETTES = {
  pig: { body: 0xeb9c9c, head: 0xf2adad, legs: 0xd88888, snout: 0xc97575 },
  sheep: { body: 0xe8e6e0, head: 0x3a3a3a, legs: 0x3a3a3a, snout: 0x555555 },
};

// Materials are per-model instances (not shared) so the hurt flash can
// tint one mob without affecting the others.
function material(color) {
  return new THREE.MeshLambertMaterial({ color });
}

const geometryCache = new Map();
function box(w, h, d) {
  const key = `${w},${h},${d}`;
  if (!geometryCache.has(key)) {
    geometryCache.set(key, new THREE.BoxGeometry(w, h, d));
  }
  return geometryCache.get(key);
}

/**
 * Build a four-legged blocky animal. The group's origin is at the feet
 * center (matches mob.pos); the model faces +Z.
 */
function buildModel(type) {
  const palette = PALETTES[type];
  const tall = type === 'sheep' ? 0.15 : 0; // sheep stand a little higher
  const root = new THREE.Group();
  const materials = [];

  const bodyMesh = new THREE.Mesh(box(0.55, 0.45, 0.9), material(palette.body));
  bodyMesh.position.set(0, 0.5 + tall, 0);
  root.add(bodyMesh);
  materials.push(bodyMesh.material);

  const head = new THREE.Mesh(box(0.4, 0.4, 0.3), material(palette.head));
  head.position.set(0, 0.72 + tall, 0.55);
  root.add(head);
  materials.push(head.material);

  const snout = new THREE.Mesh(box(0.18, 0.14, 0.06), material(palette.snout));
  snout.position.set(0, 0.66 + tall, 0.73);
  root.add(snout);
  materials.push(snout.material);

  const legs = [];
  const legGeo = box(0.16, 0.32 + tall, 0.16);
  for (const [lx, lz] of [[-0.17, 0.3], [0.17, 0.3], [-0.17, -0.3], [0.17, -0.3]]) {
    // Pivot at the hip so rotation.x swings the leg.
    const hip = new THREE.Group();
    hip.position.set(lx, 0.32 + tall, lz);
    const leg = new THREE.Mesh(legGeo, material(palette.legs));
    leg.position.set(0, -(0.32 + tall) / 2, 0);
    hip.add(leg);
    root.add(hip);
    legs.push(hip);
    materials.push(leg.material);
  }
  return { root, legs, materials };
}

export class MobRenderer {
  constructor(scene) {
    this.scene = scene;
    this.models = new Map(); // mob id -> { root, legs }
  }

  /** Reconcile models with the mob list and pose them. Call once per frame. */
  sync(mobs) {
    const seen = new Set();
    for (const mob of mobs) {
      seen.add(mob.id);
      let model = this.models.get(mob.id);
      if (!model) {
        model = buildModel(mob.type);
        this.models.set(mob.id, model);
        this.scene.add(model.root);
      }
      model.root.position.set(mob.pos.x, mob.pos.y, mob.pos.z);
      model.root.rotation.y = mob.yaw;
      const swing = mob.mode === 'walk' ? Math.sin(mob.walkPhase) * 0.6 : 0;
      model.legs[0].rotation.x = swing;
      model.legs[1].rotation.x = -swing;
      model.legs[2].rotation.x = -swing;
      model.legs[3].rotation.x = swing;
      // Red hurt flash while stunned.
      const hurt = mob.hurtTimer > 0;
      for (const mat of model.materials) {
        mat.emissive.setRGB(hurt ? 0.45 : 0, 0, 0);
      }
    }
    for (const [id, model] of this.models) {
      if (!seen.has(id)) {
        this.scene.remove(model.root);
        for (const mat of model.materials) mat.dispose(); // per-instance
        this.models.delete(id); // geometry is shared, no dispose
      }
    }
  }
}
