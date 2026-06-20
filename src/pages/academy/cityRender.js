// Shared instancing + GLTF-normalisation helpers for the academy city map.
// Used by the static city (CityMap3D) and the animated layer (CityLife).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { TILE } from './cityModels.js';

export const Y_AXIS = new THREE.Vector3(0, 1, 0);

// Set per-instance transforms ([x, z, rotY, scale]) on an InstancedMesh ref.
export function applyMatrices(mesh, instances) {
  if (!mesh) return;
  const m = new THREE.Matrix4();
  const p = new THREE.Vector3();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  for (let i = 0; i < instances.length; i += 1) {
    const [x, z, rotY, sc] = instances[i];
    p.set(x, 0, z);
    q.setFromAxisAngle(Y_AXIS, rotY);
    s.set(sc, sc, sc);
    m.compose(p, q, s);
    mesh.setMatrixAt(i, m);
  }
  mesh.instanceMatrix.needsUpdate = true;
  mesh.computeBoundingSphere();
}

// Bake world transforms, merge every compatible sub-mesh (cars keep their
// wheels, buildings their roofs), then normalise: ['fill', f] scales the
// footprint to TILE*f; ['height', v] scales to an absolute world height (for
// tall-thin models like streetlights or people). Base ends at y=0, centred.
export function extractGeoMat(scene, normMode, normV) {
  scene.updateWorldMatrix(true, true);
  const meshes = [];
  scene.traverse((o) => { if (o.isMesh) meshes.push(o); });
  if (!meshes.length) return null;

  const refKeys = Object.keys(meshes[0].geometry.attributes).sort().join();
  const parts = [];
  for (const m of meshes) {
    if (Object.keys(m.geometry.attributes).sort().join() !== refKeys) continue;
    const g = m.geometry.clone();
    g.applyMatrix4(m.matrixWorld);
    parts.push(g);
  }
  let geometry = parts[0];
  if (parts.length > 1) {
    try {
      const flat = parts.map((g) => (g.index ? g.toNonIndexed() : g));
      geometry = mergeGeometries(flat, false) || parts[0];
    } catch { geometry = parts[0]; }
  }

  geometry.computeBoundingBox();
  const bb = geometry.boundingBox;
  const height = bb.max.y - bb.min.y;
  const footprint = Math.max(bb.max.x - bb.min.x, bb.max.z - bb.min.z) || 1;
  const scale = normMode === 'height' ? normV / (height || 1) : (TILE * normV) / footprint;
  const cx = (bb.max.x + bb.min.x) / 2;
  const cz = (bb.max.z + bb.min.z) / 2;
  const norm = new THREE.Matrix4().makeScale(scale, scale, scale)
    .multiply(new THREE.Matrix4().makeTranslation(-cx, -bb.min.y, -cz));
  geometry.applyMatrix4(norm);
  return { geometry, material: meshes[0].material };
}
