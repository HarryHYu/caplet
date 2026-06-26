// Shared "where am I" helpers for the walkable estate: which district a world
// position falls in, plus per-district presentation (heading name, sky tint and
// procedural-audio params). Mirrors the district geometry in cityPlots.js /
// backend cityPlan.js — keep the ring radii rules in sync.
import { TILE } from './cityModels.js';

const inRect = (x, y, r) => r && x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1;

// Plot-district name (rings + rectangles) → our presentation key.
const NAME_TO_KEY = {
  Finance: 'finance',
  Commerce: 'commerce',
  'Inner Suburb': 'suburb',
  'Outer Suburb': 'frontier',
  Industrial: 'industrial',
  'Old Town': 'oldtown',
  Oriental: 'oriental',
  Cyberpunk: 'cyberpunk',
  'Wild West': 'wildwest',
  Alpine: 'alpine',
  'Spooky Hollow': 'spooky',
  'Desert Bazaar': 'desert',
};

// Per-district presentation. `sky` is a wash blended over the day/night sky;
// `pad` drives the procedural ambient voice (root note Hz, oscillator type,
// low-pass cutoff Hz, and a slow shimmer detune in cents).
export const DISTRICT_META = {
  centre: { name: 'City Centre', sky: '#cdd8ea', pad: { root: 220.0, type: 'sawtooth', cutoff: 900, detune: 6 } },
  finance: { name: 'Finance District', sky: '#aebfd8', pad: { root: 196.0, type: 'sawtooth', cutoff: 1100, detune: 4 } },
  commerce: { name: 'Commerce Quarter', sky: '#dccaa6', pad: { root: 246.9, type: 'triangle', cutoff: 1300, detune: 5 } },
  suburb: { name: 'The Suburbs', sky: '#cfe0c0', pad: { root: 164.8, type: 'triangle', cutoff: 800, detune: 7 } },
  frontier: { name: 'Frontier Colony', sky: '#aab6ff', pad: { root: 261.6, type: 'sine', cutoff: 1800, detune: 12 } },
  industrial: { name: 'Industrial Zone', sky: '#b8b0a4', pad: { root: 110.0, type: 'sawtooth', cutoff: 480, detune: 3 } },
  oldtown: { name: 'Old Town', sky: '#e8cfa0', pad: { root: 174.6, type: 'triangle', cutoff: 700, detune: 8 } },
  oriental: { name: 'Oriental Quarter', sky: '#e6c2b0', pad: { root: 220.0, type: 'triangle', cutoff: 1000, detune: 9 } },
  cyberpunk: { name: 'Neon District', sky: '#9aa6e0', pad: { root: 130.8, type: 'sawtooth', cutoff: 1600, detune: 14 } },
  wildwest: { name: 'Frontier Town', sky: '#e6c49a', pad: { root: 196.0, type: 'triangle', cutoff: 760, detune: 6 } },
  alpine: { name: 'Alpine Village', sky: '#dceaf4', pad: { root: 246.9, type: 'sine', cutoff: 1300, detune: 10 } },
  spooky: { name: 'Spooky Hollow', sky: '#b8b0c8', pad: { root: 110.0, type: 'sawtooth', cutoff: 600, detune: 11 } },
  desert: { name: 'Desert Bazaar', sky: '#e8d2a0', pad: { root: 174.6, type: 'sine', cutoff: 1100, detune: 8 } },
  park: { name: 'Parklands', sky: '#cfe6c0', pad: { root: 146.8, type: 'sine', cutoff: 900, detune: 9 } },
  beach: { name: 'The Seaside', sky: '#cfeef6', pad: { root: 233.1, type: 'sine', cutoff: 1500, detune: 10 } },
  farm: { name: 'Farmlands', sky: '#e6d9a8', pad: { root: 130.8, type: 'triangle', cutoff: 700, detune: 6 } },
  woods: { name: 'The Woodlands', sky: '#bcd9b0', pad: { root: 138.6, type: 'sine', cutoff: 760, detune: 9 } },
  countryside: { name: 'Countryside', sky: '#d6e2c2', pad: { root: 155.6, type: 'sine', cutoff: 820, detune: 8 } },
  water: { name: 'The Coast', sky: '#bfe2ef', pad: { root: 196.0, type: 'sine', cutoff: 1400, detune: 11 } },
};

const CELL_TO_KEY = { P: 'centre', C: 'centre', K: 'park', S: 'beach', F: 'farm', T: 'woods', G: 'countryside', W: 'water' };

// Which district key a WORLD position falls in. Cell-type zones (plaza, park,
// beach, farm, forest…) win; built/road cells fall back to the ring/rectangle
// district rules. Returns a key into DISTRICT_META.
export function districtAt(worldX, worldZ, layout) {
  if (!layout?.cells || !layout.districtGeo) return 'centre';
  const { gridW, gridH, cells, districtGeo: geo } = layout;
  const originX = ((gridW - 1) * TILE) / 2;
  const originZ = ((gridH - 1) * TILE) / 2;
  const gx = Math.round((worldX + originX) / TILE);
  const gy = Math.round((worldZ + originZ) / TILE);
  const grid = cells.split('\n');
  const cell = (gx >= 0 && gx < gridW && gy >= 0 && gy < gridH) ? grid[gy]?.[gx] : ' ';
  if (cell && CELL_TO_KEY[cell]) return CELL_TO_KEY[cell];

  if (inRect(gx, gy, geo.industrial)) return 'industrial';
  if (inRect(gx, gy, geo.oldTown)) return 'oldtown';
  // Themed outer ring (angular sectors) — mirrors backend cityPlan.themedAt.
  const tt = geo.themed;
  if (tt && Math.max(Math.abs(gx - geo.cc), Math.abs(gy - geo.cc)) > tt.r0) {
    const ang = Math.atan2(gy - geo.cc, gx - geo.cc);
    const name = tt.sectors[Math.floor(((ang + Math.PI) / (2 * Math.PI)) * tt.sectors.length) % tt.sectors.length];
    return NAME_TO_KEY[name] || 'frontier';
  }
  let r = Math.max(Math.abs(gx - geo.cc), Math.abs(gy - geo.cc));
  if (geo.cc2) r = Math.min(r, Math.max(Math.abs(gx - geo.cc2.x), Math.abs(gy - geo.cc2.y)));
  for (const [rad, name] of geo.radii) if (r <= rad) return NAME_TO_KEY[name] || 'centre';
  return NAME_TO_KEY[geo.outer] || 'frontier';
}
