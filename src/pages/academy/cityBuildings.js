// Procedural, themed low-poly buildings for the six new estate districts
// (Oriental, Cyberpunk, Wild West, Snowy Alpine, Spooky Hollow, Desert Bazaar).
//
// Each building is a single merged BufferGeometry with baked VERTEX COLOURS, so
// the whole pool renders through ONE vertex-coloured material and instances
// cheaply (one InstancedMesh per variant — see ProceduralInstances in
// CityMap3D.jsx). Geometry is authored directly in WORLD units with its base at
// y=0 and centred on XZ, so it needs no GLTF-style normalisation: computeScene
// places it like any other building (lifted to the terrain, turned to the road).
//
// We can't reliably download themed building models for all six themes (the CC0
// mirrors only carry modern + medieval buildings), so these are hand-authored to
// match the game's chunky low-poly look while giving each district a clear,
// recognisable silhouette: pagodas, neon slabs, false-front saloons, snow-roofed
// chalets, crooked haunted houses, and flat-roofed adobe + a bazaar.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// ── small geometry builders (each returns a vertex-coloured, base-at-y part) ──
function paint(geo, hex) {
  const c = new THREE.Color(hex);
  const n = geo.attributes.position.count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i += 1) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
  geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return geo;
}
// Axis-aligned box, base sitting at height y.
function box(w, h, d, color, x = 0, y = 0, z = 0) {
  const g = new THREE.BoxGeometry(w, h, d); g.translate(x, y + h / 2, z); return paint(g, color);
}
// 4-sided pyramid roof (square base, aligned to the axes), base at y.
function pyramid(r, h, color, x = 0, y = 0, z = 0) {
  const g = new THREE.ConeGeometry(r, h, 4); g.rotateY(Math.PI / 4); g.translate(x, y + h / 2, z); return paint(g, color);
}
// Round column / dome stem, base at y.
function cyl(r, h, color, x = 0, y = 0, z = 0, seg = 8) {
  const g = new THREE.CylinderGeometry(r, r, h, seg); g.translate(x, y + h / 2, z); return paint(g, color);
}
// Half-sphere dome, base at y.
function dome(r, color, x = 0, y = 0, z = 0) {
  const g = new THREE.SphereGeometry(r, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2); g.translate(x, y, z); return paint(g, color);
}
// Long gable (triangular prism roof) running along X, base at y.
function gable(w, h, d, color, x = 0, y = 0, z = 0) {
  const g = new THREE.CylinderGeometry(h, h, w, 3, 1); // 3-sided prism
  g.rotateZ(Math.PI / 2); g.rotateY(Math.PI / 2); // ridge along X, flat side down
  g.scale(1, 1, d / (h * Math.sqrt(3))); g.translate(x, y + h / 2, z); return paint(g, color);
}
// Freely-rotated box (centre at x,y,z) — for tilted accents like upturned eaves.
function rbox(w, h, d, color, x, y, z, rx = 0, ry = 0, rz = 0) {
  const g = new THREE.BoxGeometry(w, h, d);
  if (rx) g.rotateX(rx); if (ry) g.rotateY(ry); if (rz) g.rotateZ(rz);
  g.translate(x, y, z); return paint(g, color);
}
// The signature oriental roof: an octagonal pyramid whose eave ring is pushed OUT
// (deep overhang) and UP (concave upturned eaves), base at y. This single moved-
// vertex trick is what makes a box read as a pagoda.
function curvedRoof(baseR, h, color, y = 0, overhang = 1.14, lift = 0.2) {
  const g = new THREE.ConeGeometry(baseR, h, 8);
  const pos = g.attributes.position; const half = h / 2;
  for (let i = 0; i < pos.count; i += 1) {
    if (pos.getY(i) < -half + 0.001) { // the base (eave) ring
      const x = pos.getX(i); const z = pos.getZ(i); const r = Math.hypot(x, z);
      if (r > 0.01) { pos.setX(i, (x / r) * baseR * overhang); pos.setZ(i, (z / r) * baseR * overhang); }
      pos.setY(i, -half + h * lift);
    }
  }
  pos.needsUpdate = true; g.translate(0, y + half, 0); return paint(g, color);
}
// A band of dougong bracket blocks sitting on a lintel, just under an eave.
// Returns an ARRAY of parts (spread into the builder).
function dougong(w, y, color) {
  const out = [box(w * 0.92, 0.08, w * 0.92, color, 0, y, 0)];
  for (let i = 0; i < 8; i += 1) {
    const a = (i / 8) * Math.PI * 2;
    out.push(box(0.1, 0.13, 0.16, '#5a3320', Math.cos(a) * w * 0.46, y + 0.06, Math.sin(a) * w * 0.46));
  }
  return out;
}
// A hanging red paper lantern with gold caps + tassel. Returns an ARRAY of parts.
function lantern(x, y, z) {
  const ly = y - 0.16;
  const b = new THREE.SphereGeometry(0.11, 8, 6); b.scale(1, 0.82, 1); b.translate(x, ly - 0.13, z); paint(b, '#c0241c');
  return [
    cyl(0.012, 0.16, '#2a1a10', x, ly, z, 4),          // cord up to the eave
    b,                                                  // body
    cyl(0.12, 0.02, '#d4a84a', x, ly, z, 8),            // top cap
    cyl(0.12, 0.02, '#d4a84a', x, ly - 0.26, z, 8),     // bottom cap
    box(0.025, 0.07, 0.025, '#d4a84a', x, ly - 0.33, z), // tassel
  ];
}

// ── theme palettes ───────────────────────────────────────────────────────────
const ORI = { stone: '#9a9488', body: '#efe6d2', body2: '#b23a2e', roof: ['#34506b', '#3f7a5a', '#9c3327'], trim: '#d4a84a' };
const CYB = { base: ['#1b2030', '#232a45', '#14161f'], glass: '#2a3a6a', neon: ['#27e3e3', '#e8409e', '#9af23a', '#f0a020'] };
const WST = { wood: ['#8a5a36', '#6f4525'], face: '#a06f40', roof: '#5a3a22', trim: '#caa46a', stone: '#8b8276' };
const ALP = { timber: '#7a5436', wall: '#cdb89a', snow: '#eef3f8', roof: '#5e4630', stone: '#8b8e92', window: '#d8b46a' };
const SPK = { wall: ['#3a2f44', '#2a2730', '#46414f'], roof: '#221a2c', window: '#c2d24a', trim: '#5a4a3a' };
const DST = { sand: '#d8b878', clay: '#c98b54', terra: '#b5673c', dome: '#e0cb96', awn: ['#b0463a', '#3f6f7a', '#caa24a'], shadow: '#a06a3a' };

const door = (color, w = 0.34, h = 0.55, z = 0) => box(w, h, 0.06, color, 0, 0, z);

// ── ORIENTAL — multi-tier pagodas, tea house, torii, shrine, fireworks shop,
// grand temple. Curved upturned eaves (curvedRoof) + dougong brackets + red
// lacquer columns on stone podiums + hanging lanterns + sorin finials. ──────────
// A sorin (the jewelled spire finial) on top of a roof at height y.
function sorin(y, col = '#caa024') {
  return [cyl(0.04, 0.1, ORI.stone, 0, y, 0, 6), dome(0.08, ORI.trim, 0, y + 0.1, 0),
    cyl(0.025, 0.34, col, 0, y + 0.12, 0, 6), dome(0.05, col, 0, y + 0.46, 0)];
}
function pagoda(tiers, bodyCol, roofCol) {
  const p = []; let y = 0; let w = 1.5;
  // stepped stone podium
  p.push(box(w + 0.5, 0.14, w + 0.5, ORI.stone, 0, y, 0));
  p.push(box(w + 0.3, 0.12, w + 0.3, '#b0a894', 0, y + 0.14, 0)); y += 0.26;
  for (let t = 0; t < tiers; t += 1) {
    const bh = 0.6 - t * 0.05;
    p.push(box(w, bh, w, t % 2 ? ORI.body2 : bodyCol, 0, y, 0));
    // red corner columns
    for (const dx of [-1, 1]) for (const dz of [-1, 1]) p.push(cyl(0.05, bh, ORI.body2, dx * w * 0.44, y, dz * w * 0.44, 6));
    if (t === 0) p.push(box(0.4, bh * 0.7, 0.06, '#3a1f12', 0, y, w * 0.5)); // door
    y += bh;
    p.push(...dougong(w, y, ORI.trim)); y += 0.08;
    p.push(curvedRoof(w * 0.58 + 0.2, 0.42, roofCol, y));
    if (t === 0) { p.push(...lantern(w * 0.62, y + 0.06, w * 0.62)); p.push(...lantern(-w * 0.62, y + 0.06, w * 0.62)); }
    y += 0.2; w *= 0.8;
  }
  p.push(...sorin(y));
  return mergeGeometries(p);
}
function teaHouse(roofCol) {
  const p = [];
  p.push(box(2.0, 0.16, 1.6, ORI.stone, 0, 0, 0));
  p.push(box(1.7, 0.6, 1.3, ORI.body, 0, 0.16, 0));
  p.push(box(1.5, 0.5, 0.05, '#e8e0cf', 0, 0.2, 0.66)); // shoji screen front
  for (const dx of [-0.5, 0, 0.5]) p.push(box(0.04, 0.5, 0.06, '#7a5a3a', dx, 0.2, 0.69));
  for (const dx of [-0.85, 0.85]) p.push(cyl(0.05, 0.66, ORI.body2, dx, 0.16, 0.72, 6)); // veranda posts
  p.push(...dougong(1.7, 0.78, ORI.trim));
  p.push(curvedRoof(1.2, 0.5, roofCol, 0.86));
  p.push(...lantern(0.78, 1.0, 0.72));
  return mergeGeometries(p);
}
function torii() {
  const p = [];
  for (const dx of [-0.7, 0.7]) { p.push(cyl(0.12, 0.85, ORI.body2, dx, 0, 0, 8)); p.push(cyl(0.1, 0.75, ORI.body2, dx, 0.85, 0, 8)); }
  p.push(box(1.7, 0.12, 0.18, '#7a241c', 0, 1.1, 0));          // lower beam (nuki)
  p.push(box(2.0, 0.1, 0.26, '#7a241c', 0, 1.46, 0));         // shimaki
  p.push(box(1.5, 0.16, 0.22, ORI.body2, 0, 1.56, 0));        // centre of top beam
  p.push(rbox(0.55, 0.16, 0.24, ORI.body2, 0.86, 1.62, 0, 0, 0, -0.22)); // upturned right
  p.push(rbox(0.55, 0.16, 0.24, ORI.body2, -0.86, 1.62, 0, 0, 0, 0.22)); // upturned left
  p.push(box(0.3, 0.34, 0.06, '#caa024', 0, 1.26, 0.02));     // nameplate
  return mergeGeometries(p);
}
function shrine() {
  const p = [];
  p.push(box(1.6, 0.4, 1.4, ORI.stone, 0, 0, 0)); // podium
  p.push(box(1.3, 0.5, 1.1, ORI.body2, 0, 0.4, 0));
  for (const dx of [-1, 1]) for (const dz of [-1, 1]) p.push(cyl(0.05, 0.5, '#7a241c', dx * 0.55, 0.4, dz * 0.45, 6));
  p.push(box(0.32, 0.36, 0.06, '#2a1810', 0, 0.4, 0.56)); // door
  p.push(...dougong(1.3, 0.9, ORI.trim));
  p.push(curvedRoof(1.12, 0.6, ORI.roof[0], 0.96));
  p.push(...lantern(0.5, 1.06, 0.5));
  p.push(...sorin(1.5));
  return mergeGeometries(p);
}
function fireworkShop() {
  const p = [];
  p.push(box(2.0, 0.14, 1.5, ORI.stone, 0, 0, 0));
  p.push(box(1.8, 0.7, 1.3, ORI.body2, 0, 0.14, 0));
  p.push(box(1.4, 0.46, 0.06, '#2a1410', 0, 0.18, 0.64)); // dark open shopfront
  p.push(box(1.5, 0.26, 0.06, ORI.trim, 0, 0.16, 0.7));   // goods counter
  p.push(box(1.3, 0.26, 0.05, '#7a1a14', 0, 0.74, 0.66)); // name board
  p.push(box(1.36, 0.05, 0.07, ORI.trim, 0, 0.88, 0.66));
  p.push(box(1.36, 0.05, 0.07, ORI.trim, 0, 0.6, 0.66));
  p.push(box(0.22, 0.85, 0.05, '#caa024', 0.78, 0.5, 0.66)); // vertical sign banner
  for (let i = 0; i < 3; i += 1) p.push(box(0.12, 0.12, 0.06, '#7a1a14', 0.78, 0.76 - i * 0.22, 0.69));
  p.push(...dougong(1.8, 0.84, ORI.trim));
  p.push(curvedRoof(1.35, 0.5, ORI.roof[2], 0.9));
  for (const dx of [-0.6, 0, 0.6]) p.push(...lantern(dx, 1.02, 0.76));
  for (const dx of [-0.85, 0.85]) { p.push(cyl(0.05, 0.45, dx < 0 ? '#c0241c' : '#caa024', dx, 0.14, 0.58, 6)); p.push(pyramid(0.07, 0.13, '#caa024', dx, 0.59, 0.58)); }
  return mergeGeometries(p);
}
function grandTemple() {
  const p = []; const hy = 0.48;
  p.push(box(2.2, 0.18, 1.8, ORI.stone, 0, 0, 0));     // stepped podium
  p.push(box(2.0, 0.16, 1.6, '#b0a894', 0, 0.18, 0));
  p.push(box(1.8, 0.14, 1.4, ORI.stone, 0, 0.34, 0));
  for (let s = 0; s < 4; s += 1) p.push(box(0.8, 0.1, 0.15, ORI.stone, 0, 0.34 - s * 0.1, 0.75 + s * 0.15)); // staircase
  for (const dx of [-0.5, 0.5]) { p.push(box(0.15, 0.5, 0.15, ORI.stone, dx, 0.34, 0.85)); p.push(dome(0.09, ORI.trim, dx, 0.84, 0.85)); }
  p.push(box(1.7, 0.9, 1.3, ORI.body, 0, hy, 0));      // hall
  for (let i = 0; i < 5; i += 1) p.push(cyl(0.07, 0.9, ORI.body2, -0.66 + i * 0.33, hy, 0.62, 8)); // colonnade
  p.push(box(1.7, 0.1, 0.15, '#7a241c', 0, hy + 0.9, 0.62)); // architrave
  p.push(box(0.46, 0.6, 0.06, '#2a1810', 0, hy, 0.64));  // door
  p.push(...dougong(1.7, hy + 1.0, ORI.trim));
  p.push(curvedRoof(1.5, 0.5, ORI.roof[0], hy + 1.05)); // lower wide roof
  p.push(curvedRoof(0.98, 0.5, ORI.roof[0], hy + 1.4)); // upper roof
  p.push(...sorin(hy + 1.85));
  for (const dx of [-0.78, 0.78]) p.push(...lantern(dx, hy + 1.12, 0.68));
  return mergeGeometries(p);
}

// ── CYBERPUNK — dark neon slabs / setback towers / antennas ───────────────────
function cyberTower(h, baseCol, neonCol, setbacks) {
  const p = []; let y = 0; let w = 1.5;
  p.push(box(w + 0.2, 0.2, w + 0.2, '#0e1018', 0, y, 0)); y += 0.2;
  for (let s = 0; s < setbacks; s += 1) {
    const sh = h / setbacks;
    p.push(box(w, sh, w, baseCol, 0, y, 0));
    // neon bands on the four faces (thin bright strips)
    const bands = Math.max(1, Math.round(sh / 0.5));
    for (let b = 1; b <= bands; b += 1) {
      const by = y + (sh * b) / (bands + 1);
      p.push(box(w + 0.04, 0.05, w + 0.04, neonCol, 0, by - 0.025, 0));
    }
    y += sh; w *= 0.82;
  }
  p.push(box(w * 0.5, 0.25, w * 0.5, '#0e1018', 0, y, 0)); // rooftop unit
  p.push(cyl(0.03, 0.9, neonCol, w * 0.18, y + 0.25, 0, 5)); // antenna
  p.push(box(0.06, 0.06, 0.06, neonCol, w * 0.18, y + 1.15, 0)); // beacon
  return mergeGeometries(p);
}
function cyberBlock(neonCol) {
  const p = [];
  p.push(box(1.7, 1.0, 1.5, CYB.base[1], 0, 0, 0));
  p.push(box(1.74, 0.06, 1.54, neonCol, 0, 0.55, 0));
  p.push(box(1.2, 0.5, 1.0, CYB.glass, 0, 1.0, 0));
  p.push(box(0.5, 0.06, 1.6, neonCol, 0.4, 1.0, 0)); // rooftop sign bar
  p.push(box(0.06, 0.7, 0.06, neonCol, 0.78, 1.0, 0.6)); // vertical sign
  return mergeGeometries(p);
}

// ── WILD WEST — false-front storefronts, saloon, water tower, barn ────────────
function falseFront(wood, h) {
  const p = [];
  p.push(box(1.7, h, 1.4, wood, 0, 0, 0));
  p.push(box(1.8, 0.5, 0.16, WST.face, 0, h, 0.62)); // tall false front facade
  p.push(box(1.9, 0.12, 1.6, WST.roof, 0, h, 0)); // flat roof line
  p.push(box(1.9, 0.1, 0.5, WST.trim, 0, h - 0.18, 0.78)); // porch awning
  p.push(cyl(0.05, h - 0.2, WST.wood[1], -0.8, 0, 0.9, 5));
  p.push(cyl(0.05, h - 0.2, WST.wood[1], 0.8, 0, 0.9, 5));
  p.push(door('#3a2414', 0.4, h * 0.6));
  return mergeGeometries(p);
}
function saloon() {
  const p = [];
  p.push(box(2.2, 1.0, 1.6, WST.wood[0], 0, 0, 0));
  p.push(box(2.4, 0.6, 0.18, WST.face, 0, 1.0, 0.7));
  p.push(box(2.5, 0.12, 1.8, WST.roof, 0, 1.0, 0));
  p.push(box(2.4, 0.12, 0.6, WST.trim, 0, 0.82, 0.92));
  p.push(cyl(0.06, 0.82, WST.wood[1], -1.05, 0, 1.05, 5));
  p.push(cyl(0.06, 0.82, WST.wood[1], 1.05, 0, 1.05, 5));
  p.push(box(1.0, 0.3, 0.05, '#d8c089', 0, 1.15, 0.8)); // SALOON sign board
  return mergeGeometries(p);
}
function waterTower() {
  const p = [];
  for (const dx of [-0.5, 0.5]) for (const dz of [-0.5, 0.5]) p.push(cyl(0.05, 1.2, WST.wood[1], dx, 0, dz, 4));
  p.push(cyl(0.6, 0.7, WST.wood[0], 0, 1.2, 0, 8));
  p.push(pyramid(0.7, 0.35, WST.roof, 0, 1.9, 0));
  return mergeGeometries(p);
}
function barn() {
  const p = [];
  p.push(box(1.9, 0.8, 1.5, '#9a3b2c', 0, 0, 0));
  p.push(gable(2.0, 0.55, 1.6, '#7a2e22', 0, 0.8, 0));
  p.push(box(0.6, 0.6, 0.05, WST.trim, 0, 0, 0.76)); // barn door
  p.push(box(0.05, 0.6, 0.6, WST.trim, 0.76, 0, 0)); // side
  return mergeGeometries(p);
}

// ── SNOWY ALPINE — chalets, A-frames, log cabin, ski lodge ────────────────────
function chalet(h, wall) {
  const p = [];
  p.push(box(1.7, 0.18, 1.4, ALP.stone, 0, 0, 0));
  p.push(box(1.6, h, 1.3, wall, 0, 0.18, 0));
  p.push(box(1.64, 0.1, 1.34, ALP.timber, 0, 0.18 + h * 0.55, 0)); // balcony band
  p.push(gable(1.9, 0.6, 1.6, ALP.roof, 0, 0.18 + h, 0)); // steep gable
  p.push(gable(1.9, 0.66, 1.66, ALP.snow, 0, 0.30 + h, 0)); // snow cap on top of roof
  p.push(box(0.32, h * 0.5, 0.05, ALP.window, 0, 0.18, 0.66));
  p.push(box(0.3, 0.5, 0.3, ALP.stone, 0.5, 0.18 + h + 0.2, 0)); // chimney
  return mergeGeometries(p);
}
function aFrame() {
  const p = [];
  p.push(box(1.5, 0.16, 1.4, ALP.stone, 0, 0, 0));
  p.push(gable(1.5, 1.3, 1.5, ALP.roof, 0, 0.16, 0));
  p.push(gable(1.52, 1.36, 1.32, ALP.snow, 0, 0.30, 0)); // snow over most of it
  p.push(box(0.5, 0.7, 0.05, ALP.window, 0, 0.16, 0.74));
  return mergeGeometries(p);
}
function logCabin() {
  const p = [];
  for (let i = 0; i < 4; i += 1) p.push(box(1.7, 0.16, 1.4, i % 2 ? ALP.timber : '#8a6242', 0, 0.16 * i, 0));
  p.push(gable(1.9, 0.45, 1.5, ALP.roof, 0, 0.64, 0));
  p.push(gable(1.92, 0.5, 1.54, ALP.snow, 0, 0.74, 0));
  p.push(box(0.3, 0.45, 0.3, ALP.stone, 0.55, 0.64, 0)); // chimney
  return mergeGeometries(p);
}

// ── SPOOKY HOLLOW — crooked houses, manor, crypt, dead lamp ───────────────────
function hauntedHouse(h, wall) {
  const p = [];
  p.push(box(1.6, h, 1.3, wall, 0, 0, 0));
  p.push(box(0.9, h * 0.7, 0.9, wall, 0.5, h * 0.6, -0.3)); // off-kilter annexe
  p.push(pyramid(1.15, 1.1, SPK.roof, 0, h, 0)); // tall witch-hat roof
  p.push(pyramid(0.7, 0.8, SPK.roof, 0.5, h * 0.6 + 0.63, -0.3));
  p.push(box(0.26, 0.34, 0.05, SPK.window, 0, h * 0.55, 0.66)); // glowing window
  p.push(box(0.22, 0.3, 0.05, SPK.window, 0.5, h * 0.6 + 0.3, 0.16));
  p.push(door('#1a1420', 0.34, h * 0.45));
  return mergeGeometries(p);
}
function manor() {
  const p = [];
  p.push(box(2.2, 1.2, 1.5, SPK.wall[1], 0, 0, 0));
  p.push(box(0.7, 1.7, 0.7, SPK.wall[2], -0.9, 0, 0.2)); // tower wing
  p.push(pyramid(0.6, 1.0, SPK.roof, -0.9, 1.7, 0.2));
  p.push(gable(2.3, 0.6, 1.6, SPK.roof, 0, 1.2, 0));
  for (const wx of [-0.4, 0.4]) p.push(box(0.24, 0.34, 0.05, SPK.window, wx, 0.5, 0.76));
  p.push(box(0.24, 0.4, 0.05, SPK.window, -0.9, 0.9, 0.56));
  return mergeGeometries(p);
}
function crypt() {
  const p = [];
  p.push(box(1.5, 0.7, 1.4, '#6a6470', 0, 0, 0));
  p.push(gable(1.6, 0.4, 1.5, '#4a4652', 0, 0.7, 0));
  p.push(box(0.4, 0.55, 0.06, '#1a1620', 0, 0, 0.72)); // dark doorway
  p.push(box(0.12, 0.7, 0.12, '#7a7480', -0.6, 0.7, -0.6)); // broken pillar
  return mergeGeometries(p);
}

// ── DESERT BAZAAR — adobe blocks, domes, minaret, market stalls ───────────────
function adobe(stories, col) {
  const p = []; let y = 0; let w = 1.7;
  for (let s = 0; s < stories; s += 1) {
    const sh = 0.7;
    p.push(box(w, sh, w * 0.85, s ? DST.clay : col, (s % 2 ? 0.15 : -0.1) * s, y, (s % 2 ? -0.1 : 0.12) * s));
    p.push(box(w + 0.06, 0.08, w * 0.85 + 0.06, DST.shadow, (s % 2 ? 0.15 : -0.1) * s, y + sh, (s % 2 ? -0.1 : 0.12) * s)); // parapet
    y += sh; w *= 0.82;
  }
  p.push(box(0.3, 0.5, 0.05, '#6a4326', 0, 0, w * 0.6)); // door
  p.push(box(0.22, 0.22, 0.05, '#7a5a36', 0.5, 0.35, w * 0.5)); // window
  return mergeGeometries(p);
}
function domeHouse(col) {
  const p = [];
  p.push(box(1.7, 0.7, 1.5, col, 0, 0, 0));
  p.push(box(1.76, 0.08, 1.56, DST.shadow, 0, 0.7, 0));
  p.push(dome(0.6, DST.dome, 0, 0.78, 0));
  p.push(cyl(0.04, 0.25, DST.terra, 0, 1.38, 0, 6));
  p.push(box(0.32, 0.48, 0.05, '#6a4326', 0, 0, 0.76));
  return mergeGeometries(p);
}
function minaret() {
  const p = [];
  p.push(box(1.3, 0.6, 1.3, DST.sand, 0, 0, 0));
  p.push(cyl(0.35, 1.8, DST.clay, 0, 0.6, 0, 10));
  p.push(cyl(0.42, 0.18, DST.terra, 0, 2.2, 0, 10)); // balcony ring
  p.push(dome(0.36, DST.dome, 0, 2.38, 0));
  p.push(cyl(0.03, 0.3, DST.terra, 0, 2.74, 0, 6));
  return mergeGeometries(p);
}
function bazaarStall(awn) {
  const p = [];
  p.push(box(1.6, 0.5, 1.2, DST.clay, 0, 0, 0));
  for (const dx of [-0.7, 0.7]) for (const dz of [-0.5, 0.5]) p.push(cyl(0.04, 0.95, '#6a4326', dx, 0.5, dz, 5));
  p.push(box(1.9, 0.1, 1.5, awn, 0, 1.4, 0)); // awning
  p.push(box(1.5, 0.3, 0.05, '#d8c089', 0, 0.6, 0.62)); // goods counter front
  return mergeGeometries(p);
}

// ── assemble the variant pools per tier ───────────────────────────────────────
const SPEC = {
  Oriental: [
    pagoda(2, ORI.body, ORI.roof[0]), pagoda(3, ORI.body, ORI.roof[1]), pagoda(4, ORI.body, ORI.roof[2]),
    pagoda(3, ORI.body2, ORI.roof[0]), pagoda(5, ORI.body, ORI.roof[1]),
    teaHouse(ORI.roof[1]), teaHouse(ORI.roof[2]),
    torii(), shrine(), fireworkShop(), grandTemple(),
  ],
  Cyberpunk: [
    cyberTower(3.2, CYB.base[0], CYB.neon[0], 3), cyberTower(4.0, CYB.base[1], CYB.neon[1], 4),
    cyberTower(2.6, CYB.base[2], CYB.neon[2], 2), cyberTower(3.6, CYB.base[0], CYB.neon[3], 3),
    cyberTower(4.6, CYB.base[1], CYB.neon[0], 4), cyberBlock(CYB.neon[1]), cyberBlock(CYB.neon[2]),
    cyberBlock(CYB.neon[0]), cyberTower(2.2, CYB.base[2], CYB.neon[1], 2),
  ],
  WildWest: [
    falseFront(WST.wood[0], 0.9), falseFront(WST.wood[1], 1.0), falseFront(WST.wood[0], 0.8),
    falseFront(WST.wood[1], 1.1), saloon(), waterTower(), barn(), falseFront(WST.face, 0.95), saloon(),
  ],
  Alpine: [
    chalet(0.8, ALP.wall), chalet(1.0, ALP.timber), chalet(0.9, '#b8a07e'),
    aFrame(), aFrame(), logCabin(), logCabin(), chalet(1.1, ALP.wall), chalet(0.7, ALP.timber),
  ],
  Spooky: [
    hauntedHouse(1.0, SPK.wall[0]), hauntedHouse(1.2, SPK.wall[1]), hauntedHouse(0.9, SPK.wall[2]),
    hauntedHouse(1.1, SPK.wall[0]), manor(), manor(), crypt(), crypt(), hauntedHouse(1.3, SPK.wall[1]),
  ],
  Desert: [
    adobe(1, DST.sand), adobe(2, DST.clay), adobe(3, DST.sand), adobe(2, DST.terra),
    domeHouse(DST.sand), domeHouse(DST.clay), minaret(), bazaarStall(DST.awn[0]), bazaarStall(DST.awn[1]),
  ],
};

// Build the key→geometry registry + per-tier key lists.
export const PROC_BUILDINGS = new Map();
export const PROC_KEYS = {};
for (const [tier, geos] of Object.entries(SPEC)) {
  PROC_KEYS[tier] = geos.map((geo, i) => {
    const key = `proc:${tier}:${i}`;
    if (geo) { geo.computeVertexNormals(); PROC_BUILDINGS.set(key, geo); }
    return key;
  }).filter((k) => PROC_BUILDINGS.has(k));
}

// One shared material for every procedural building (colour comes from the baked
// vertex colours). Slightly shiny so the cyberpunk neon and gold trim read.
export const PROC_MATERIAL = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.78, metalness: 0.06 });

export const PROC_TIERS = Object.keys(SPEC); // ['Oriental','Cyberpunk',...]
export const PROC_COUNT = PROC_BUILDINGS.size; // total distinct buildings
export const isProcKey = (file) => typeof file === 'string' && file.startsWith('proc:');
