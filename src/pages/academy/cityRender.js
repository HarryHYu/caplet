// Shared instancing + GLTF-normalisation helpers for the academy city map.
// Used by the static city (CityMap3D) and the animated layer (CityLife).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { TILE } from './cityModels.js';

export const Y_AXIS = new THREE.Vector3(0, 1, 0);

// Shared river heights (world Y). configureTerrain carves the bed down to
// RIVER_BED_Y and raises the banks + bridge decks up to RIVER_DECK_Y; the river
// renderer (CityMap3D.jsx) fills the water surface to RIVER_WATER_Y in between
// and sits the bridge geometry on the deck. Kept here so terrain and visuals
// always agree about how deep the channel is and how high the banks sit.
export const RIVER_BED_Y = -1.4;
export const RIVER_WATER_Y = -0.6;
export const RIVER_DECK_Y = 0.32;

// ── Terrain heightfield ──────────────────────────────────────────────────────
// A mostly-FLAT, walkable heightmap built once from the layout: the city is flat
// except for a few LARGE blocky plateaus (whole neighbourhoods on a raised hill,
// flat tops + ramped sides); water/beach stay at 0. One shared sampler
// (terrainHeight / walkHeight) lifts every instanced object, the ground mesh and
// the player onto the same surface so nothing floats.
let TER = null;

export function configureTerrain(layout) {
  if (!layout?.cells) { TER = null; return; }
  const { gridW, gridH, cells } = layout;
  const grid = cells.split('\n');
  // The city is mostly DEAD FLAT, with a few LARGE blocky plateaus — whole
  // neighbourhoods raised onto a hill — instead of scattered bumpiness. Each
  // plateau has a flat top and ramped sides (the blur below softens the ramps
  // into walkable slopes). They steer clear of the river corridor so the bridge
  // decks stay at their fixed deck height.
  const PLATEAUS = [
    { cx: 92, cy: 95, rx: 34, ry: 30, h: 2.6 },    // raised NW quarter
    { cx: 250, cy: 105, rx: 30, ry: 34, h: 3.2 },  // tall NE hill
    { cx: 100, cy: 245, rx: 38, ry: 30, h: 2.0 },  // SW rise
    { cx: 245, cy: 248, rx: 28, ry: 26, h: 2.8 },  // SE hill
    { cx: 110, cy: 168, rx: 28, ry: 26, h: 2.2 },  // west-central rise
  ];
  const RAMP = 16; // cells of sloped edge around each plateau (wider = gentler)
  const plateauAt = (x, y) => {
    let hv = 0;
    for (const p of PLATEAUS) {
      const ax = Math.abs(x - p.cx); const ay = Math.abs(y - p.cy);
      if (ax > p.rx || ay > p.ry) continue;
      const fx = 1 - Math.max(0, ax - (p.rx - RAMP)) / RAMP;
      const fy = 1 - Math.max(0, ay - (p.ry - RAMP)) / RAMP;
      const f = Math.max(0, Math.min(fx, fy));
      const sf = f * f * (3 - 2 * f);          // smoothstep → flat top, ramped sides
      hv = Math.max(hv, p.h * sf);
    }
    return hv;
  };
  const h = new Float32Array(gridW * gridH);
  for (let y = 0; y < gridH; y += 1) {
    for (let x = 0; x < gridW; x += 1) {
      const cell = grid[y]?.[x] || ' ';
      // sea + beach stay flat; land takes the plateau height (0 almost everywhere)
      h[y * gridW + x] = (cell === 'W' || cell === 'S') ? 0 : plateauAt(x, y);
    }
  }
  // Blur several passes so slopes are long and gradual (no terraced steps, no
  // abrupt shoulders under roads/buildings).
  for (let p = 0; p < 5; p += 1) {
    const o = h.slice();
    for (let y = 1; y < gridH - 1; y += 1) {
      for (let x = 1; x < gridW - 1; x += 1) {
        const i = y * gridW + x;
        h[i] = (o[i] * 4 + o[i - 1] + o[i + 1] + o[i - gridW] + o[i + gridW]) / 8;
      }
    }
  }
  // Carve the river as a deep, CONTAINED channel. The water cells drop to a deep
  // bed; the land on BOTH sides is RAISED into a grassy levee that sits well above
  // the water surface (RIVER_WATER_Y), so the river reads as a real sunken river
  // that can't overflow — you have to look down into it and cross it by a bridge.
  // Done AFTER the hill blur so the channel + banks keep their shape.
  // These heights are mirrored by the river renderer in CityMap3D.jsx; keep them
  // in sync (exported below as RIVER_BED_Y / RIVER_DECK_Y).
  const isW = (x, y) => grid[y]?.[x] === 'W';
  const isR = (x, y) => grid[y]?.[x] === 'R';
  const RIVER = RIVER_BED_Y;   // deep channel floor
  const BANK1 = RIVER_DECK_Y;  // inner bank / bridge deck — top of the contained channel
  const BANK2 = RIVER_DECK_Y * 0.5; // outer bank: ramps the surrounding ground up to the levee
  // Any water within Chebyshev radius r of (x, y).
  const nearW = (x, y, r) => {
    for (let dy = -r; dy <= r; dy += 1) {
      for (let dx = -r; dx <= r; dx += 1) if (isW(x + dx, y + dy)) return true;
    }
    return false;
  };
  const base = h.slice();
  for (let y = 0; y < gridH; y += 1) {
    for (let x = 0; x < gridW; x += 1) {
      if (isW(x, y)) { h[y * gridW + x] = RIVER; continue; }
      // Bridge-deck cells (road crossing the water) and the inner banks stay flush
      // at the levee top so the deck connects the two raised sides at a walkable
      // height (instead of sagging down into the channel like before).
      if (nearW(x, y, 1) || (isR(x, y) && nearW(x, y, 2))) {
        h[y * gridW + x] = Math.max(base[y * gridW + x], BANK1);
      } else if (nearW(x, y, 2)) {
        h[y * gridW + x] = Math.max(base[y * gridW + x], BANK2);
      }
    }
  }
  TER = { gridW, gridH, originX: ((gridW - 1) * TILE) / 2, originZ: ((gridH - 1) * TILE) / 2, h };
}

// World-space ground height at (worldX, worldZ), bilinearly interpolated. Returns
// 0 before the terrain is configured or outside the grid.
export function terrainHeight(worldX, worldZ) {
  if (!TER) return 0;
  const gx = (worldX + TER.originX) / TILE;
  const gz = (worldZ + TER.originZ) / TILE;
  const x0 = Math.floor(gx); const z0 = Math.floor(gz);
  if (x0 < 0 || z0 < 0 || x0 >= TER.gridW - 1 || z0 >= TER.gridH - 1) return 0;
  const tx = gx - x0; const tz = gz - z0;
  const H = (ix, iz) => TER.h[iz * TER.gridW + ix];
  const a = H(x0, z0); const b = H(x0 + 1, z0); const c = H(x0, z0 + 1); const d = H(x0 + 1, z0 + 1);
  return (a * (1 - tx) + b * tx) * (1 - tz) + (c * (1 - tx) + d * tx) * tz;
}

// Ground height for anything that SITS ON the surface — the player, road tiles,
// props, landmarks. Like terrainHeight but CLIFF-AWARE: at a genuine vertical
// drop (a bridge deck or raised levee flanked by the deep river channel) the
// bilinear blend would drag you DOWN into the water, so we stand flat on the
// cell instead. A cliff is detected by a LARGE drop to a neighbouring cell —
// only the river channel does that (deck ≈ 0.32 → bed ≈ -1.4). Hill ramps are
// gentle (smoothstep + blur keep neighbour-to-neighbour steps small), so they
// fall through to the smooth bilinear height — the SAME sampler the grass mesh
// uses. That keeps roads, tiles, props and the player flush with the grass on
// the slopes (no terraced steps, no ground tearing away from the hillside).
export function walkHeight(worldX, worldZ) {
  const bil = terrainHeight(worldX, worldZ);
  if (!TER) return bil;
  const { gridW, gridH, h } = TER;
  const ix = Math.round((worldX + TER.originX) / TILE);
  const iz = Math.round((worldZ + TER.originZ) / TILE);
  if (ix < 0 || iz < 0 || ix >= gridW || iz >= gridH) return bil;
  const cell = h[iz * gridW + ix];
  // Lowest of the 8 surrounding cells (clamped to self at the edge). A big gap
  // means we're on the lip of the river channel → snap flat onto the deck/bank.
  const at = (x, y) => ((x < 0 || y < 0 || x >= gridW || y >= gridH) ? cell : h[y * gridW + x]);
  let lowest = cell;
  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) lowest = Math.min(lowest, at(ix + dx, iz + dy));
  }
  return cell - lowest > 1.0 ? cell : bil;
}

// Set per-instance transforms ([x, z, rotY, scale]) on an InstancedMesh ref.
// Keeps the model UPRIGHT (just lifted onto the surface + turned to face rotY) —
// used for buildings, trees, props, people: things that stand vertically even on
// a hill. Ground-hugging tiles use applyGroundMatrices instead.
export function applyMatrices(mesh, instances) {
  if (!mesh) return;
  const m = new THREE.Matrix4();
  const p = new THREE.Vector3();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  for (let i = 0; i < instances.length; i += 1) {
    const [x, z, rotY, sc] = instances[i];
    p.set(x, walkHeight(x, z), z);
    q.setFromAxisAngle(Y_AXIS, rotY);
    s.set(sc, sc, sc);
    m.compose(p, q, s);
    mesh.setMatrixAt(i, m);
  }
  mesh.instanceMatrix.needsUpdate = true;
  mesh.computeBoundingSphere();
}

// Surface normal of the smooth (bilinear) terrain at a world point, from the
// height gradient. Flat ground → straight up; a hillside → leaned downhill.
// Sampled a cell-width out so the tilt follows the overall hill, not per-vertex
// wobble. `out` is reused to avoid per-instance allocation.
export function terrainNormal(worldX, worldZ, out) {
  const n = out || new THREE.Vector3();
  if (!TER) return n.set(0, 1, 0);
  const e = TILE;
  const dx = terrainHeight(worldX + e, worldZ) - terrainHeight(worldX - e, worldZ);
  const dz = terrainHeight(worldX, worldZ + e) - terrainHeight(worldX, worldZ - e);
  return n.set(-dx / (2 * e), 1, -dz / (2 * e)).normalize();
}

// Highest and lowest smooth-terrain height under a square footprint of half-
// width `r` centred at (x,z) — sampled at the centre + four corners. Buildings
// put a FLAT floor at `top` so no uphill corner of ground pokes through it (never
// submerged); a foundation plinth then fills from `bottom` up to `top` so no
// downhill corner is left floating.
export function footprintLevels(x, z, r) {
  const c = terrainHeight(x, z);
  let top = c; let bottom = c;
  const corners = [
    terrainHeight(x - r, z - r), terrainHeight(x + r, z - r),
    terrainHeight(x - r, z + r), terrainHeight(x + r, z + r),
  ];
  for (const v of corners) { if (v > top) top = v; if (v < bottom) bottom = v; }
  return { top, bottom };
}

// Per-instance transforms for BUILDINGS: upright (like applyMatrices) but seated
// on a FLAT floor at the highest ground under the footprint, so a house on a
// slope never sinks into the hillside. The gap this leaves on the downhill side
// is filled by the foundation plinth (FoundationLayer in CityMap3D). `half` is
// the footprint half-width to sample.
export function applyBuildingMatrices(mesh, instances, half = TILE * 0.5) {
  if (!mesh) return;
  const m = new THREE.Matrix4();
  const p = new THREE.Vector3();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  for (let i = 0; i < instances.length; i += 1) {
    const [x, z, rotY, sc] = instances[i];
    p.set(x, footprintLevels(x, z, half * (sc || 1)).top, z);
    q.setFromAxisAngle(Y_AXIS, rotY);
    s.set(sc, sc, sc);
    m.compose(p, q, s);
    mesh.setMatrixAt(i, m);
  }
  mesh.instanceMatrix.needsUpdate = true;
  mesh.computeBoundingSphere();
}

// Per-instance transforms for things that HUG the ground as one continuous
// surface — road tiles, paved/sand lots, sidewalks. Unlike applyMatrices (which
// keeps models upright), each tile is TILTED onto the local slope and dropped
// onto the smooth terrain height, so neighbouring tiles meet edge-to-edge and a
// hillside reads as a single slope instead of a staircase of flat ledges.
// At a true cliff — the river's edge, where walkHeight snaps up or the slope is
// near-vertical — the tile stays FLAT on the deck/levee so the bridge crossing
// and contained channel keep their shape.
export function applyGroundMatrices(mesh, instances) {
  if (!mesh) return;
  const m = new THREE.Matrix4();
  const p = new THREE.Vector3();
  const q = new THREE.Quaternion();
  const qy = new THREE.Quaternion();
  const s = new THREE.Vector3();
  const nrm = new THREE.Vector3();
  for (let i = 0; i < instances.length; i += 1) {
    const [x, z, rotY, sc] = instances[i];
    const th = terrainHeight(x, z);
    const wh = walkHeight(x, z);
    terrainNormal(x, z, nrm);
    qy.setFromAxisAngle(Y_AXIS, rotY);
    if (wh - th > 0.5 || nrm.y < 0.7) {
      // Cliff / bridge deck: lie flat on the snapped height — no tilt into the
      // channel, no near-vertical tiles at the bank.
      p.set(x, wh, z);
      q.copy(qy);
    } else {
      // Hillside: lean the tile onto the slope and sit it on the smooth surface.
      p.set(x, th, z);
      q.setFromUnitVectors(Y_AXIS, nrm).multiply(qy);
    }
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

// Like extractGeoMat, but PRESERVES every material: returns one {geometry,
// material} per distinct material (geometries sharing a material are merged),
// all baked to world space and normalised with a SINGLE shared scale so the
// parts stay aligned. Use for multi-material models (e.g. Quaternius buildings)
// that would go monochrome if collapsed to a single material for instancing.
export function extractParts(scene, normMode, normV) {
  scene.updateWorldMatrix(true, true);
  const meshes = [];
  scene.traverse((o) => { if (o.isMesh) meshes.push(o); });
  if (!meshes.length) return null;

  // One combined world-space bbox → one shared normalisation for all parts.
  const bb = new THREE.Box3();
  for (const m of meshes) bb.expandByObject(m);
  const height = bb.max.y - bb.min.y;
  const footprint = Math.max(bb.max.x - bb.min.x, bb.max.z - bb.min.z) || 1;
  const scale = normMode === 'height' ? normV / (height || 1) : (TILE * normV) / footprint;
  const cx = (bb.max.x + bb.min.x) / 2;
  const cz = (bb.max.z + bb.min.z) / 2;
  const norm = new THREE.Matrix4().makeScale(scale, scale, scale)
    .multiply(new THREE.Matrix4().makeTranslation(-cx, -bb.min.y, -cz));

  // Bake every mesh to world+normalised space, grouped by material.
  const byMat = new Map();
  for (const m of meshes) {
    const g = m.geometry.clone();
    // Some decor (the animals) ships as rigged SkinnedMeshes. We render them
    // static in bind pose, so drop skin attributes — otherwise mergeGeometries
    // throws when skinned and non-skinned parts share a material.
    g.deleteAttribute('skinIndex');
    g.deleteAttribute('skinWeight');
    g.applyMatrix4(m.matrixWorld);
    g.applyMatrix4(norm);
    const key = m.material.uuid;
    if (!byMat.has(key)) byMat.set(key, { material: m.material, geos: [] });
    byMat.get(key).geos.push(g);
  }
  const parts = [];
  for (const { material, geos } of byMat.values()) {
    if (geos.length === 1) { parts.push({ geometry: geos[0], material }); continue; }
    try {
      const flat = geos.map((g) => (g.index ? g.toNonIndexed() : g));
      const merged = mergeGeometries(flat, false);
      if (merged) parts.push({ geometry: merged, material });
      else geos.forEach((g) => parts.push({ geometry: g, material }));
    } catch { geos.forEach((g) => parts.push({ geometry: g, material })); }
  }
  return { parts };
}
