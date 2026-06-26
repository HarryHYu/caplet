/**
 * Deterministic "world plan" generator for an academy's property world.
 *
 * v5 — a 340×340 world whose CITY spans 270×270 (≈5× the v4 city area).
 * At this scale the metropolis CONTAINS its districts: the grand plaza and
 * civic ring at the heart, Finance/Commerce/Suburb belts stretching outward,
 * an OLD TOWN heritage quarter (isometric sprite buildings) in the south-west,
 * and the INDUSTRIAL estate inside the south-east quadrant. Around the city:
 * sand beaches (S+E), a lake feeding the river, forest and farmland rims, and
 * country highways.
 *
 * Cell types: '.' plot   'R' road   'P' paving   'C' civic   'K' park
 * 'W' water   'S' sand   'F' field   'T' forest   'G' grass
 *
 * SCALE NOTE: ~50k plots means the API no longer ships every plot. The client
 * derives unowned plots from `cells` + `districtGeo` (same rules as here), and
 * the server returns only OWNED rows + landmark deeds. Mutations are addressed
 * by grid coordinates. Names use the same deterministic scan order (y outer,
 * x inner) on both sides.
 */

const GRID = 340;
const CITY = 270;
const CX0 = 30;
const CY0 = 30;
const CC = CX0 + (CITY - 1) / 2; // 164.5 (world)
const CL = (CITY - 1) / 2;       // 134.5 (city-local)

const PLAZA_R = 10;
const CIVIC_R = 15;
const RING_MIN = 45;             // city-local ring road
const RING_MAX = 224;
const RAMBLA_OFF = 6;

// The grand river: a clean, gently meandering vertical channel of FIXED width
// running lake → city → sea. RIVER_HALF is its half-width (the channel is
// 2·HALF+1 cells across); RIVER_CXL is its city-local centre column. Unlike the
// old generator, every chosen crossing row carries a CONTINUOUS road deck, so
// the bridges are real — you can walk the whole span instead of dead-ending in
// the water halfway across.
const RIVER_HALF = 10;
const RIVER_CXL = 150;
const RIVER_AVOID = [RIVER_CXL - RIVER_HALF - 7, RIVER_CXL + RIVER_HALF + 7]; // keep grid streets out of the channel

const BEACH_W = 14;
const LAKE = { x: 172, y: 13, rx: 16, ry: 8 };
const BOARDWALK_Y = GRID - 9;
const lakeExitY = LAKE.y + LAKE.ry;
// World centre column of the channel at world row y — ramps out of the lake,
// then meanders gently down through the city to the sea.
const riverCxAt = (y) => {
  const c = CX0 + RIVER_CXL + Math.round(5 * Math.sin((y - CY0) / 28));
  if (y < CY0) {
    const t = (y - lakeExitY) / Math.max(1, CY0 - lakeExitY);
    return Math.round((LAKE.x - 4) * (1 - t) + c * t);
  }
  return c;
};

// Twin downtowns: the original civic core sits on the WEST bank; a second core
// (EAST_CC) rises just across the water, so a skyline stands on BOTH banks.
// Districts price off whichever centre is nearer (see districtFor).
const EAST_CC = { x: CX0 + RIVER_CXL + RIVER_HALF + 24, y: CC }; // world
const EAST_PLAZA_R = 5;
const EAST_CIVIC_R = 13;

// In-city quarters (city-local rects).
const OLD_TOWN_L = { x0: 14, x1: 58, y0: 170, y1: 225 };
const IND_L = { x0: 200, x1: 252, y0: 172, y1: 232 };

const DISTRICTS = {
  Finance: { tier: 'Luxury', color: '#7e8aa6', base: 9000, step: 1800 },
  Commerce: { tier: 'Premium', color: '#9a8f74', base: 2600, step: 520 },
  'Inner Suburb': { tier: 'Suburban', color: '#86a96a', base: 700, step: 120 },
  'Outer Suburb': { tier: 'Starter', color: '#9aa861', base: 130, step: 26 },
  Industrial: { tier: 'Industrial', color: '#8a8578', base: 1600, step: 320 },
  'Old Town': { tier: 'Heritage', color: '#c08a4e', base: 900, step: 160 },
  // Six themed districts carved from the outer ring (angular sectors). `tier`
  // selects the procedural building pool in cityModels.DISTRICT_BUILDINGS.
  Oriental: { tier: 'Oriental', color: '#c0463b', base: 540, step: 108 },
  Cyberpunk: { tier: 'Cyberpunk', color: '#2b3a6a', base: 760, step: 150 },
  'Wild West': { tier: 'WildWest', color: '#b0824a', base: 300, step: 62 },
  Alpine: { tier: 'Alpine', color: '#cfe0ec', base: 600, step: 120 },
  'Spooky Hollow': { tier: 'Spooky', color: '#4a3a55', base: 360, step: 74 },
  'Desert Bazaar': { tier: 'Desert', color: '#d8b070', base: 380, step: 78 },
};

// The themed outer ring: everything beyond the Inner Suburb radius (and outside
// the Industrial / Old Town rects) is split into six angular sectors, one per
// theme. Mirrored verbatim on the client (cityPlots.js + cityWorld.js).
const THEMED_R0 = 95; // outer ~30% of the city radius becomes the themed ring
const THEMED_SECTORS = ['Oriental', 'Cyberpunk', 'Wild West', 'Alpine', 'Spooky Hollow', 'Desert Bazaar'];
function themedAt(x, y) {
  if (ringFrom(x, y, CC) <= THEMED_R0) return null;
  const ang = Math.atan2(y - CC, x - CC); // -PI..PI
  const s = Math.floor(((ang + Math.PI) / (2 * Math.PI)) * THEMED_SECTORS.length) % THEMED_SECTORS.length;
  return THEMED_SECTORS[s];
}

// District radii (Chebyshev from the city centre) — also shipped to the client
// so it can derive plot pricing without the server sending 50k rows.
const RADII = [[45, 'Finance'], [78, 'Commerce'], [112, 'Inner Suburb']];

function hash(x, y) {
  let h = (x * 73856093) ^ (y * 19349663);
  h = (h ^ (h >>> 13)) >>> 0;
  return h;
}

const ringFrom = (x, y, c) => Math.max(Math.abs(x - c), Math.abs(y - c));
const cheb = (x, y, cx, cy) => Math.max(Math.abs(x - cx), Math.abs(y - cy));
const inRectL = (lx, ly, r) => lx >= r.x0 && lx <= r.x1 && ly >= r.y0 && ly <= r.y1;

function districtFor(x, y) {
  const lx = x - CX0; const ly = y - CY0;
  if (inRectL(lx, ly, IND_L)) return 'Industrial';
  if (inRectL(lx, ly, OLD_TOWN_L)) return 'Old Town';
  // Themed outer ring wins before the (two-centre) inner rings, so the east
  // downtown's reach can't swallow the eastern themed sector.
  const themed = themedAt(x, y);
  if (themed) return themed;
  // Nearest of the two downtown centres drives the ring district + pricing.
  const r = Math.min(ringFrom(x, y, CC), cheb(x, y, EAST_CC.x, EAST_CC.y));
  for (const [rad, name] of RADII) if (r <= rad) return name;
  return 'Outer Suburb';
}

// Irregular street spacing, generated from a repeating gap pattern; columns
// skip the river corridor so the water stays unbraided.
function streetPositions(phase, avoid) {
  const pattern = [4, 7, 6, 8, 5, 7, 8, 6, 9, 7, 5, 8, 6, 7];
  const out = [];
  let pos = 0;
  for (let i = 0; pos < CITY - 6; i += 1) {
    pos += pattern[(i + phase) % pattern.length];
    if (pos >= CITY - 2) break;
    if (avoid && pos >= avoid[0] && pos <= avoid[1]) continue;
    out.push(pos);
  }
  return out;
}

function build() {
  const cells = Array.from({ length: GRID }, () => Array(GRID).fill('G'));
  const put = (x, y, t) => {
    if (x >= 0 && x < GRID && y >= 0 && y < GRID) cells[y][x] = t;
  };
  const at = (x, y) => (x >= 0 && x < GRID && y >= 0 && y < GRID ? cells[y][x] : null);

  // ==== 1. coastline (S + E beaches) =========================================
  const beachDepthS = (x) => BEACH_W + Math.round(3 * Math.sin(x / 9)) + (hash(x, 7) % 2);
  const beachDepthE = (y) => BEACH_W + Math.round(3 * Math.sin(y / 11)) + (hash(3, y) % 2);
  for (let y = 0; y < GRID; y += 1) {
    for (let x = 0; x < GRID; x += 1) {
      if (GRID - 1 - y < beachDepthS(x) || GRID - 1 - x < beachDepthE(y)) put(x, y, 'S');
    }
  }

  // ==== 2. lake ===============================================================
  for (let y = LAKE.y - LAKE.ry - 2; y <= LAKE.y + LAKE.ry + 2; y += 1) {
    for (let x = LAKE.x - LAKE.rx - 2; x <= LAKE.x + LAKE.rx + 2; x += 1) {
      const dx = (x - LAKE.x) / LAKE.rx;
      const dy = (y - LAKE.y) / LAKE.ry;
      const wob = ((hash(x, y) % 100) / 100 - 0.5) * 0.18;
      if (dx * dx + dy * dy <= 1 + wob) put(x, y, 'W');
      else if (dx * dx + dy * dy <= 1.45 + wob && hash(x, y) % 3 !== 0) put(x, y, 'K');
    }
  }

  // ==== 3. forest + farmland rims ============================================
  for (let y = 0; y < GRID; y += 1) {
    for (let x = 0; x < GRID; x += 1) {
      if (at(x, y) !== 'G') continue;
      const forest = (x < 26 && y < 160) || (y < 26 && x < 150);
      const farm = x < 26 && y >= 160 && y < 310;
      if (forest) put(x, y, 'T');
      else if (farm) put(x, y, 'F');
    }
  }

  // ==== 4. the city ===========================================================
  const colsL = streetPositions(0, RIVER_AVOID);
  const rowsL = streetPositions(3, null);
  const inCity = (x, y) => x >= CX0 && x < CX0 + CITY && y >= CY0 && y < CY0 + CITY;

  for (let ly = 0; ly < CITY; ly += 1) {
    for (let lx = 0; lx < CITY; lx += 1) put(CX0 + lx, CY0 + ly, '.');
  }
  for (const c of colsL) for (let ly = 0; ly < CITY; ly += 1) put(CX0 + c, CY0 + ly, 'R');
  for (const r of rowsL) for (let lx = 0; lx < CITY; lx += 1) put(CX0 + lx, CY0 + r, 'R');
  for (let i = RING_MIN; i <= RING_MAX; i += 1) {
    put(CX0 + i, CY0 + RING_MIN, 'R'); put(CX0 + i, CY0 + RING_MAX, 'R');
    put(CX0 + RING_MIN, CY0 + i, 'R'); put(CX0 + RING_MAX, CY0 + i, 'R');
  }

  // ==== 5. river: one clean meandering channel with REAL bridge decks ========
  // Every 3rd city road row (plus the ring road, and the highways laid later)
  // keeps an UNBROKEN road deck across the channel; everywhere else the channel
  // is open water you must cross by a bridge. Because each deck is laid as
  // continuous road, walk-mode collision lets you cross the whole span — the old
  // generator left water gaps mid-river, so "bridges" dead-ended in the water.
  const deckRows = new Set();
  rowsL.forEach((r, i) => { if (i % 3 === 0) deckRows.add(CY0 + r); });
  deckRows.add(CY0 + RING_MIN); deckRows.add(CY0 + RING_MAX);
  for (let y = lakeExitY; y < GRID; y += 1) {
    const cx = riverCxAt(y);
    const deck = deckRows.has(y);
    for (let dx = -RIVER_HALF; dx <= RIVER_HALF; dx += 1) put(cx + dx, y, deck ? 'R' : 'W');
    if (deck) { put(cx - RIVER_HALF - 1, y, 'R'); put(cx + RIVER_HALF + 1, y, 'R'); }
    // grassy levee banks lining the channel inside the city (not on deck rows)
    if (!deck && y >= CY0 && y < CY0 + CITY) {
      for (const bx of [cx - RIVER_HALF - 1, cx + RIVER_HALF + 1]) {
        if (at(bx, y) === '.' && hash(bx, y) % 3 !== 0) put(bx, y, 'K');
      }
    }
  }

  // ==== 6. rambla, plaza, civic ==============================================
  for (let ly = 2; ly < CITY - 2; ly += 1) {
    const lx = ly + RAMBLA_OFF;
    if (lx >= CITY - 1) break;
    const cxl = riverCxAt(CY0 + ly) - CX0;
    if (lx >= cxl - RIVER_HALF - 2 && lx <= cxl + RIVER_HALF + 2) continue;
    for (const xx of [lx, lx + 1]) {
      const cur = at(CX0 + xx, CY0 + ly);
      if (cur === '.' || cur === 'K') put(CX0 + xx, CY0 + ly, 'P');
    }
  }
  for (let y = 0; y < GRID; y += 1) {
    for (let x = 0; x < GRID; x += 1) {
      if (!inCity(x, y)) continue;
      const r = ringFrom(x, y, CC);
      if (r <= PLAZA_R) put(x, y, 'P');
      else if (r <= CIVIC_R && at(x, y) === '.') put(x, y, 'C');
    }
  }
  // East downtown: a second civic core + plaza just across the river, so a
  // tower skyline rises on the far bank too (twin riverfront CBDs).
  for (let y = 0; y < GRID; y += 1) {
    for (let x = 0; x < GRID; x += 1) {
      if (!inCity(x, y)) continue;
      const r = cheb(x, y, EAST_CC.x, EAST_CC.y);
      if (r <= EAST_PLAZA_R) { if (at(x, y) === '.' || at(x, y) === 'C') put(x, y, 'P'); }
      else if (r <= EAST_CIVIC_R && at(x, y) === '.') put(x, y, 'C');
    }
  }

  // ==== 6b. diagonal boulevards — break the rigid grid =======================
  // A handful of long avenues at irregular angles fired from a few "star" nodes,
  // cutting diagonally across the waffle grid so the city reads as organic, not
  // structured. 2 cells wide (auto-tiles as real road); only paves plots/parks,
  // so it never braids the water — it simply stops at the river bank.
  const DIAG_STARS = [[CL, CL], [55, 60], [205, 70], [70, 205], [205, 205], [EAST_CC.x - CX0, EAST_CC.y - CY0], [135, 40]];
  for (let d = 0; d < DIAG_STARS.length; d += 1) {
    const [sx, sy] = DIAG_STARS[d];
    const ang = Math.PI / 6 + ((hash(d * 13 + 1, 7) % 1000) / 1000) * (Math.PI * 2 / 3); // 30°..150°
    const ux = Math.cos(ang); const uy = Math.sin(ang);
    const vert = Math.abs(uy) >= Math.abs(ux);
    for (let t = -CITY; t < CITY; t += 1) {
      const lx = Math.round(sx + ux * t); const ly = Math.round(sy + uy * t);
      for (const [ox, oy] of [[0, 0], vert ? [1, 0] : [0, 1]]) {
        const gx = CX0 + lx + ox; const gy = CY0 + ly + oy;
        if (!inCity(gx, gy)) continue;
        const c = at(gx, gy);
        if (c === '.' || c === 'K') put(gx, gy, 'R');
      }
    }
  }

  // ==== 7. park blobs =========================================================
  const PARK_SEEDS = [];
  for (let i = 0; i < 44; i += 1) {
    const h = hash(i * 17 + 5, i * 29 + 11);
    PARK_SEEDS.push([8 + (h % (CITY - 16)), 8 + ((h >>> 9) % (CITY - 16))]);
  }
  for (const [plx, ply] of PARK_SEEDS) {
    const px = CX0 + plx; const py = CY0 + ply;
    const rad = 2 + (hash(plx, ply) % 3);
    for (let y = py - rad; y <= py + rad; y += 1) {
      for (let x = px - rad; x <= px + rad; x += 1) {
        const d = Math.abs(x - px) + Math.abs(y - py);
        if (d <= rad + (hash(x, y) % 2) && at(x, y) === '.') put(x, y, 'K');
      }
    }
  }

  // ==== 8. highways ===========================================================
  const HWY_ROWS_L = [40, 190];
  const HWY_COLS_L = [30, 230];
  const hwySpan = { rows: new Map(), cols: new Map() };
  for (const r of HWY_ROWS_L) {
    const gy = CY0 + r;
    let a = 0; let b = GRID - 1;
    for (let x = 0; x < GRID; x += 1) {
      if (at(x, gy) === 'S') { if (x < CX0) a = Math.max(a, x + 1); else { b = Math.min(b, x - 1); break; } continue; }
    }
    for (let x = a; x <= b; x += 1) {
      if (at(x, gy) === 'S') continue;
      put(x, gy, 'R');
    }
    hwySpan.rows.set(gy, [a, b]);
  }
  for (const c of HWY_COLS_L) {
    const gx = CX0 + c;
    let a = 0; let b = GRID - 1;
    for (let y = 0; y < GRID; y += 1) {
      if (at(gx, y) === 'S') { if (y < CY0) a = Math.max(a, y + 1); else { b = Math.min(b, y - 1); break; } continue; }
    }
    for (let y = a; y <= b; y += 1) {
      if (at(gx, y) === 'S') continue;
      put(gx, y, 'R');
    }
    hwySpan.cols.set(gx, [a, b]);
  }

  // ==== 8b. organic city outline — carve the square into an irregular blob ====
  // Real cities aren't perfect rectangles. Convert built cells (plots/roads/
  // paving/parks) that fall OUTSIDE a wobbly organic boundary back into nature
  // (grass + a little forest), but KEEP the river corridor (so bridges/decks
  // survive) and never touch sea/beach/forest/farm or the civic core (r < ~95).
  // Done before landmarks + plots so they only ever land inside the real city.
  const blobR = (a) => 138 + 18 * Math.sin(a * 2 + 0.6) + 12 * Math.sin(a * 3 - 1.3)
    + 8 * Math.sin(a * 5 + 2.2) + 5 * Math.sin(a * 7 - 0.4); // ranges ~95..181 cells
  for (let y = CY0; y < CY0 + CITY; y += 1) {
    const rcx = riverCxAt(y);
    for (let x = CX0; x < CX0 + CITY; x += 1) {
      const c = at(x, y);
      if (c !== '.' && c !== 'R' && c !== 'P' && c !== 'K') continue;       // keep W/S/C/F/T/G
      if (x >= rcx - RIVER_HALF - 2 && x <= rcx + RIVER_HALF + 2) continue; // keep the river corridor
      const dx = x - CC; const dy = y - CC;
      if (Math.hypot(dx, dy) <= blobR(Math.atan2(dy, dx))) continue;        // inside the blob → keep
      put(x, y, hash(x, y) % 4 === 0 ? 'T' : 'G');                          // outside → nature
    }
  }

  // ==== 9. landmark stages (programmatic, well-spaced) =======================
  const artLandmarks = [];
  const farEnough = (x, y) => artLandmarks.every((z) => Math.max(Math.abs(z.ax - x), Math.abs(z.ay - y)) >= 30);
  outer:
  for (let ly = 6; ly < CITY - 10; ly += 5) {
    for (let lx = 6; lx < CITY - 10; lx += 5) {
      if (artLandmarks.length >= 11) break outer;
      const ax = CX0 + lx; const ay = CY0 + ly;
      if (inRectL(lx, ly, OLD_TOWN_L) || inRectL(lx + 3, ly + 3, OLD_TOWN_L)) continue;
      if (inRectL(lx, ly, IND_L) || inRectL(lx + 3, ly + 3, IND_L)) continue;
      if (!farEnough(ax, ay)) continue;
      let clear = true;
      for (let y = ay - 1; y <= ay + 4 && clear; y += 1) {
        for (let x = ax - 1; x <= ax + 4 && clear; x += 1) {
          if (at(x, y) !== '.') clear = false;
        }
      }
      if (!clear) continue;
      for (let y = ay; y < ay + 4; y += 1) for (let x = ax; x < ax + 4; x += 1) put(x, y, 'K');
      artLandmarks.push({ x: ax + 1.5, y: ay + 1.5, ax, ay, kind: 'city' });
    }
  }
  for (const [bx, by] of [[140, GRID - 12], [220, GRID - 11]]) {
    if (artLandmarks.some((z) => z.kind === 'beach')) break;
    let clear = true;
    for (let y = by - 1; y <= by + 4 && clear; y += 1) {
      for (let x = bx - 1; x <= bx + 4 && clear; x += 1) {
        if (at(x, y) !== 'S') clear = false;
      }
    }
    if (clear) artLandmarks.push({ x: bx + 1.5, y: by + 1.5, ax: bx, ay: by, kind: 'beach' });
  }

  // ==== 10. plots (seed rows for the DB; the client re-derives these) ========
  const plots = [];
  let counter = 0;
  for (let y = 0; y < GRID; y += 1) {
    for (let x = 0; x < GRID; x += 1) {
      if (cells[y][x] !== '.') continue;
      const district = districtFor(x, y);
      const d = DISTRICTS[district];
      const variety = hash(x, y) % 5;
      let price = d.base + variety * d.step;
      const nearWater = ['W', 'S'].includes(at(x + 1, y)) || ['W', 'S'].includes(at(x - 1, y))
        || ['W', 'S'].includes(at(x, y + 1)) || ['W', 'S'].includes(at(x, y - 1))
        || ['W', 'S'].includes(at(x + 2, y)) || ['W', 'S'].includes(at(x - 2, y));
      if (nearWater) price = Math.round(price * 1.3);
      counter += 1;
      plots.push({
        gridX: x,
        gridY: y,
        neighborhood: district,
        tier: d.tier,
        name: `${district} Lot #${counter}`,
        price,
      });
    }
  }
  artLandmarks.forEach((z, i) => {
    counter += 1;
    plots.push({
      gridX: z.ax + 1,
      gridY: z.ay + 1,
      neighborhood: z.kind === 'beach' ? 'Beachfront' : 'Landmark',
      tier: 'Landmark',
      name: z.kind === 'beach' ? 'The Beach Resort' : `Landmark Estate #${i + 1}`,
      price: z.kind === 'beach' ? 60000 : 25000 + (hash(z.ax, z.ay) % 5) * 3000,
    });
  });

  // Continuous bridge decks across the channel — one entry per crossing, used by
  // the 3D renderer to stand a real bridge over each. A deck cell is road with
  // open water immediately up/down-river.
  const bridges = [];
  for (let ly = 0; ly < CITY; ly += 1) {
    const y = CY0 + ly;
    const cx = riverCxAt(y);
    if (at(cx, y) === 'R' && at(cx - RIVER_HALF, y) === 'R' && at(cx + RIVER_HALF, y) === 'R'
      && (at(cx, y - 1) === 'W' || at(cx, y + 1) === 'W')) {
      bridges.push({ y, cx, half: RIVER_HALF });
    }
  }

  // ==== 11. movement networks =================================================
  const carRoads = [];
  for (const c of colsL) {
    if (Math.abs(c - CL) <= PLAZA_R + 1) continue;
    const gx = CX0 + c;
    if (hwySpan.cols.has(gx)) continue;
    carRoads.push({ axis: 'z', cell: gx, a: CY0, b: CY0 + CITY - 1, walk: true });
  }
  for (const r of rowsL) {
    if (Math.abs(r - CL) <= PLAZA_R + 1) continue;
    const gy = CY0 + r;
    if (hwySpan.rows.has(gy)) continue;
    const cx = riverCxAt(gy);
    if (deckRows.has(gy)) {
      // a bridge row — cars drive the full width, across the deck
      carRoads.push({ axis: 'x', cell: gy, a: CX0, b: CX0 + CITY - 1, walk: true });
    } else {
      // no crossing here — traffic runs each bank up to the water's edge
      carRoads.push({ axis: 'x', cell: gy, a: CX0, b: cx - RIVER_HALF - 1, walk: true });
      carRoads.push({ axis: 'x', cell: gy, a: cx + RIVER_HALF + 1, b: CX0 + CITY - 1, walk: true });
    }
  }
  for (const [gx, [a, b]] of hwySpan.cols) carRoads.push({ axis: 'z', cell: gx, a, b, walk: false });
  for (const [gy, [a, b]] of hwySpan.rows) carRoads.push({ axis: 'x', cell: gy, a, b, walk: false });

  const walkPaths = [
    [[CX0 + RAMBLA_OFF + 2.5, CY0 + 2], [CC - PLAZA_R + 1, CC - PLAZA_R - 5.5]],
    // riverfront promenade along the east bank, between the two downtowns
    [[EAST_CC.x - EAST_CIVIC_R, CY0 + 12], [EAST_CC.x - EAST_CIVIC_R, CY0 + CITY - 12]],
    [
      [CC - PLAZA_R + 1.5, CC - PLAZA_R + 1.5], [CC + PLAZA_R - 1.5, CC - PLAZA_R + 1.5],
      [CC + PLAZA_R - 1.5, CC + PLAZA_R - 1.5], [CC - PLAZA_R + 1.5, CC + PLAZA_R - 1.5],
      [CC - PLAZA_R + 1.5, CC - PLAZA_R + 1.5],
    ],
    [[24, BOARDWALK_Y], [GRID - 26, BOARDWALK_Y]],
    [[30, GRID - 4.5], [GRID - 32, GRID - 4.5]],
  ];

  const districtList = Object.entries(DISTRICTS).map(([name, d]) => ({
    name,
    tier: d.tier,
    color: d.color,
  }));

  const infra = {
    gridW: GRID,
    gridH: GRID,
    cells: cells.map((row) => row.join('')).join('\n'),
    plazaC: CC,
    plazaR: PLAZA_R,
    cityCenter: { x: CC, y: CC },
    eastCenter: { x: EAST_CC.x, y: EAST_CC.y },
    bridges,
    carRoads,
    walkPaths,
    artLandmarks,
    districts: districtList,
    // Everything the client needs to derive unowned plots locally.
    districtGeo: {
      cc: CC,
      cc2: { x: EAST_CC.x, y: EAST_CC.y },
      radii: RADII,
      outer: 'Outer Suburb',
      industrial: { x0: CX0 + IND_L.x0, x1: CX0 + IND_L.x1, y0: CY0 + IND_L.y0, y1: CY0 + IND_L.y1 },
      oldTown: { x0: CX0 + OLD_TOWN_L.x0, x1: CX0 + OLD_TOWN_L.x1, y0: CY0 + OLD_TOWN_L.y0, y1: CY0 + OLD_TOWN_L.y1 },
      themed: { r0: THEMED_R0, sectors: THEMED_SECTORS },
      pricing: DISTRICTS,
      waterfrontMult: 1.3,
    },
    landmarks: [
      { type: 'watertower', x: CC - 7, y: CC - 7 },
      { type: 'fountain', x: CC + 6.5, y: CC + 6.5 },
    ],
  };

  return { gridW: GRID, gridH: GRID, plots, infra };
}

let cached = null;
function getCityPlan() {
  if (!cached) cached = build();
  return cached;
}

// Coordinate → plot descriptor lookup (includes landmark deeds). Lets the buy
// endpoint create a Property row on demand instead of pre-seeding ~50k rows
// per academy. Cached alongside the plan.
let plotIndex = null;
function getPlotAt(gridX, gridY) {
  if (!plotIndex) {
    plotIndex = new Map();
    for (const p of getCityPlan().plots) plotIndex.set(`${p.gridX},${p.gridY}`, p);
  }
  return plotIndex.get(`${gridX},${gridY}`) || null;
}

module.exports = { getCityPlan, getPlotAt, GRID, DISTRICTS };
