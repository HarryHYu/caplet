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
const riverXLocal = (ly) => 150 + Math.round(5 * Math.sin(ly / 12));
const RIVER_AVOID = [143, 160];  // no street columns inside the river corridor

const BEACH_W = 14;
const LAKE = { x: 172, y: 13, rx: 16, ry: 8 };
const BOARDWALK_Y = GRID - 9;

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
};

// District radii (Chebyshev from the city centre) — also shipped to the client
// so it can derive plot pricing without the server sending 50k rows.
const RADII = [[45, 'Finance'], [78, 'Commerce'], [112, 'Inner Suburb']];

function hash(x, y) {
  let h = (x * 73856093) ^ (y * 19349663);
  h = (h ^ (h >>> 13)) >>> 0;
  return h;
}

const ringFrom = (x, y, c) => Math.max(Math.abs(x - c), Math.abs(y - c));
const inRectL = (lx, ly, r) => lx >= r.x0 && lx <= r.x1 && ly >= r.y0 && ly <= r.y1;

function districtFor(x, y) {
  const lx = x - CX0; const ly = y - CY0;
  if (inRectL(lx, ly, IND_L)) return 'Industrial';
  if (inRectL(lx, ly, OLD_TOWN_L)) return 'Old Town';
  const r = ringFrom(x, y, CC);
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

  // ==== 5. river: lake → city → sea ==========================================
  const cityRiverTopX = CX0 + riverXLocal(0);
  const lakeExit = { x: LAKE.x - 4, y: LAKE.y + LAKE.ry };
  for (let y = lakeExit.y; y < CY0; y += 1) {
    const t = (y - lakeExit.y) / Math.max(1, CY0 - lakeExit.y);
    const x = Math.round(lakeExit.x + (cityRiverTopX - lakeExit.x) * t + 2 * Math.sin(y / 5));
    for (const xx of [x, x + 1]) {
      if (at(xx, y) === 'R') continue;
      put(xx, y, 'W');
    }
  }
  const bridgeRowsL = new Set(rowsL.filter((_, i) => i % 2 === 0));
  for (let ly = 0; ly < CITY; ly += 1) {
    const xr = CX0 + riverXLocal(ly);
    for (const x of [xr, xr + 1]) {
      const cur = at(x, CY0 + ly);
      if (cur === 'R') {
        const isBridge = rowsL.includes(ly) ? bridgeRowsL.has(ly) : true;
        if (!isBridge) put(x, CY0 + ly, 'W');
      } else {
        put(x, CY0 + ly, 'W');
      }
    }
    for (const x of [xr - 1, xr + 2]) {
      if (at(x, CY0 + ly) === '.' && hash(x, ly) % 3 !== 0) put(x, CY0 + ly, 'K');
    }
  }
  const cityRiverBotX = CX0 + riverXLocal(CITY - 1);
  for (let y = CY0 + CITY; y < GRID; y += 1) {
    const x = Math.round(cityRiverBotX + 4 * Math.sin((y - CY0 - CITY) / 9));
    const width = at(x, y) === 'S' || at(x + 1, y) === 'S' ? 4 : 2;
    for (let k = 0; k < width; k += 1) {
      if (at(x + k, y) === 'R') continue;
      put(x + k, y, 'W');
    }
    if (at(x, y + 1) === null) break;
  }

  // ==== 6. rambla, plaza, civic ==============================================
  for (let ly = 2; ly < CITY - 2; ly += 1) {
    const lx = ly + RAMBLA_OFF;
    if (lx >= CITY - 1) break;
    const xr = riverXLocal(ly);
    if (lx >= xr - 2 && lx <= xr + 3) continue;
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
    if (!bridgeRowsL.has(r)) continue;
    const gy = CY0 + r;
    if (hwySpan.rows.has(gy)) continue;
    carRoads.push({ axis: 'x', cell: gy, a: CX0, b: CX0 + CITY - 1, walk: true });
  }
  for (const [gx, [a, b]] of hwySpan.cols) carRoads.push({ axis: 'z', cell: gx, a, b, walk: false });
  for (const [gy, [a, b]] of hwySpan.rows) carRoads.push({ axis: 'x', cell: gy, a, b, walk: false });

  const walkPaths = [
    [[CX0 + RAMBLA_OFF + 2.5, CY0 + 2], [CC - PLAZA_R + 1, CC - PLAZA_R - 5.5]],
    [[CX0 + 163.5, CY0 + 157], [CX0 + CITY - 2.5, CY0 + CITY - 8.5]],
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
    carRoads,
    walkPaths,
    artLandmarks,
    districts: districtList,
    // Everything the client needs to derive unowned plots locally.
    districtGeo: {
      cc: CC,
      radii: RADII,
      outer: 'Outer Suburb',
      industrial: { x0: CX0 + IND_L.x0, x1: CX0 + IND_L.x1, y0: CY0 + IND_L.y0, y1: CY0 + IND_L.y1 },
      oldTown: { x0: CX0 + OLD_TOWN_L.x0, x1: CX0 + OLD_TOWN_L.x1, y0: CY0 + OLD_TOWN_L.y0, y1: CY0 + OLD_TOWN_L.y1 },
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
