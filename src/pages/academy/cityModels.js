// Mixed CC0 model manifest (consistency between packs intentionally not required).
//   - KayKit "City Builder Bits" (.gltf)  — roads, water tower, some mid-rises
//   - Kenney "City Kit (Suburban)" (.glb) — 21 houses
//   - Kenney "City Kit (Commercial)" (.glb) — 14 shops/offices + 5 skyscrapers
//   - Kenney "Nature Kit" (.glb)          — 18 trees + rocks/bushes/flowers
// All models are auto-normalised at load (footprint -> tile, base y=0), so packs
// with different scales mix freely.

import { PROC_KEYS, isProcKey } from './cityBuildings.js';

export const BASE = '/estate/';
export const TILE = 2;
const u = (f) => BASE + f;

const KAY = (n) => `kaykit/${n}.gltf`;
const SUB = (l) => `suburban/building-type-${l}.glb`;
const COM = (n) => `commercial/${n}.glb`;
const NAT = (n) => `nature/${n}.glb`;
const IND = (n) => `industrial/${n}.glb`;
const WC = (n) => `watercraft/${n}.glb`;
const QUAT = (n) => `quaternius/${n}.glb`; // Quaternius CC0 buildings (multi-material)
const SPEC = (n) => `special/${n}.glb`;    // one-off flair landmarks
const CUST = (n) => `custom/building-${n}.png`; // user's iso building art (billboards)
const ORI3D = (n) => `oriental/${n}.glb`; // real downloaded oriental models (poly.pizza)
// Oriental district hero/accent models, downloaded as direct .glb. The Sketchfab
// models the user linked are all auth-gated (HTTP 401) — one is NonCommercial —
// so these are the closest CC0/CC-BY equivalents (Quaternius torii + Japanese
// door = CC0; pagodas/shrine via poly.pizza — see oriental/CREDITS.md). They mix
// into the Oriental pool alongside the (now upgraded) procedural buildings.
export const ORIENTAL_MODELS = ['pagoda-grand', 'pagoda', 'torii', 'shrine', 'gate'].map(ORI3D);

// Quaternius "Buildings" + "Modular Buildings" (CC0) — added for skyline variety.
// These are MULTI-MATERIAL (flat-coloured walls/windows/roofs with no texture
// atlas), so they must be rendered with extractParts + the multi-material
// instancer (see MULTI_MAT) or they'd collapse to a single colour.
export const QUAT_BUILDINGS = [
  'q-building1-large', 'q-building2-large', 'q-building3-big',
  'q-house1', 'q-4story', 'q-2story-sign', 'q-6story-stack',
].map(QUAT);

// Quaternius modern street signs (CC0) — sprinkled along the roads for detail.
export const SIGNS = ['sign-stop', 'sign-noparking', 'sign-triangle'].map(QUAT);

// Extra CC0 Quaternius packs (mirrored from trebeljahr/quaternius-showcase).
// All multi-material flat-colour models — they render via MultiMatInstancedModel.
const QMED = (n) => `quaternius/medieval/${n}.glb`;
const QANI = (n) => `quaternius/animals/${n}.glb`;
const QMORE = (n) => `quaternius/more/${n}.glb`;
const QFUT = (n) => `quaternius/future/${n}.glb`;   // ultimate space pack
const QCAS = (n) => `quaternius/castle/${n}.glb`;   // modular medieval (castle) pack
// Each district gets ONE coherent building theme (kept in its own pack folder).
// Real 3D medieval village + castle towers — the Heritage quarter.
export const MEDIEVAL_BUILDINGS = ['House_1', 'House_2', 'House_3', 'House_4', 'Inn', 'Blacksmith', 'Mill', 'Stable', 'Bell_Tower'].map(QMED);
export const CASTLE_BUILDINGS = ['LargeTower', 'PointyTower', 'Watchtower', 'WatchTowerWRoof', 'LargeSquareTowerBricks', 'SimpleTowerBricks'].map(QCAS);
// Houses dominate, the odd tower rises above them (medieval town, not all-castle).
export const HERITAGE_BUILDINGS = [...MEDIEVAL_BUILDINGS, ...MEDIEVAL_BUILDINGS, ...CASTLE_BUILDINGS];
export const MEDIEVAL_PROPS = ['Well', 'Gazebo', 'MarketStand_1'].map(QMED);
// Futuristic colony buildings — the Luxury downtown (one coherent sci-fi theme).
export const FUTURE_BUILDINGS = ['Building_L', 'Base_Large', 'GeodesicDome', 'House_Cylinder', 'House_Long', 'House_Open', 'House_Single', 'House_Single_Support', 'Connector'].map(QFUT);
// Modern Quaternius homes — the Starter neighbourhood (one coherent theme).
export const QUAT_HOMES = ['q-house1'].map(QUAT).concat(['House2', 'Building1_Small', 'Building2_Small', 'Building3_Small', 'Building4', '2Story_Balcony', '3Story_Balcony'].map(QMORE));
// Low-poly animals scattered across the countryside, forest and farm for life.
export const ANIMALS = ['Cow', 'Deer', 'Horse', 'Stag', 'Alpaca', 'Fox'].map(QANI);
export const FOREST_ANIMALS = ['Deer', 'Stag', 'Fox'].map(QANI);
export const FARM_ANIMALS = ['Cow', 'Horse', 'Alpaca'].map(QANI);

// Multi-material models that must render via extractParts / MultiMatInstancedModel
// (they have no shared texture atlas, so collapsing to one material loses colour).
export const MULTI_MAT = new Set([
  ...QUAT_BUILDINGS, ...SIGNS,
  ...MEDIEVAL_BUILDINGS, ...CASTLE_BUILDINGS, ...MEDIEVAL_PROPS,
  ...ANIMALS, ...QUAT_HOMES, ...FUTURE_BUILDINGS,
  // Oriental GLBs with several flat-colour materials need the per-material path.
  ORI3D('pagoda'), ORI3D('gate'),
]);

// One-off "special" flair landmarks (rendered as full multi-material clones, a
// handful of instances each, so their colours survive). Placed by computeSpecials.
export const SPECIAL_FERRIS = SPEC('ferris-wheel');     // CC0 — CreativeTrio
export const SPECIAL_LIGHTHOUSE = SPEC('lighthouse');   // CC-BY — Jarlan Perez
export const SPECIAL_WINDMILL = SPEC('k-windmill');     // CC0 — Kenney
export const SPECIAL_FOUNTAIN = SPEC('k-fountain');     // CC0 — Kenney
export const BALLOON_FILE = SPEC('balloon');            // CC-BY — Poly by Google (animated, airborne)
export const SPECIAL_URLS = [
  SPECIAL_FERRIS, SPECIAL_LIGHTHOUSE, SPECIAL_WINDMILL, SPECIAL_FOUNTAIN, BALLOON_FILE,
].map((f) => u(f));

// PNG "billboards" are flat camera-facing cards, not GLTF — rendered specially.
// The player's AI art are LANDMARKS (whole 4×4 stages); the Kenney isometric
// sprites are smaller cards: Old Town storefronts stand on single plots, and
// farm minis decorate the fields.
export function isBillboard(file) { return /\.png$/.test(file); }
export const BILLBOARD_SCALE = 7.2; // landmark card width in world units
// A flat ground tile of size TILE renders (at the 45° iso azimuth) as a diamond
// TILE·√2 wide on screen; a camera-facing card of world-width W renders W wide.
// Matching them locks each storefront sprite onto its grid cell exactly.
export const OLD_TOWN_SCALE = TILE * Math.SQRT2; // ≈ 2.83
export const FARM_SCALE = 1.6;      // field prop card width
export const CUSTOM_IMAGES = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '012'].map(CUST);

// Kenney "Isometric Tiles (Buildings)" storefronts — the Old Town quarter.
export const OLD_TOWN_ART = [2, 3, 4, 8, 9, 14, 15, 16, 18, 20, 22, 26, 27, 29, 38, 40, 41, 46, 51, 55]
  .map((n) => `iso/oldtown/buildingTiles_${String(n).padStart(3, '0')}.png`);

// Kenney "Isometric Miniature Farm" props — scattered across the farmland.
export const FARM_ART = [
  'corn_S', 'cornDouble_S', 'cornYoung_S', 'hay_S', 'hayBales_S',
  'hayBalesStacked_S', 'sacksCrate_S', 'fenceLow_S',
].map((n) => `iso/farm/${n}.png`);

const HOUSES = 'abcdefghijklmnopqrstu'.split('').map(SUB);                       // 21
const SHOPS = 'abcdefghijklmn'.split('').map((l) => COM(`building-${l}`));        // 14
const FACTORIES = 'abcdefghijklmnopqrst'.split('').map((l) => IND(`building-${l}`)); // 20

// Distinctive STYLIZED skyscrapers (Poly Pizza, CC-BY) — deliberately away from
// the basic Kenney boxes: a thin modern tower, a poly high-rise and an Empire-
// State-style stepped tower. These carry the downtown's character.
const SKY = (n) => `skyscrapers/${n}.glb`;
export const STYLIZED_TOWERS = ['perez-tower', 'poly-tower-a', 'empire-state'].map(SKY);
STYLIZED_TOWERS.forEach((f) => MULTI_MAT.add(f)); // multi-material → keep colours

// Downtown tower set: the stylized towers (weighted) rounded out with KayKit
// glass high-rises and Quaternius large blocks for silhouette variety. No Kenney
// skyscrapers here any more — the centre should look characterful, not generic.
export const TOWERS = [
  ...STYLIZED_TOWERS, ...STYLIZED_TOWERS,
  KAY('building_G'), KAY('building_H'),
  QUAT('q-building1-large'), QUAT('q-building2-large'), QUAT('q-building3-big'), QUAT('q-6story-stack'),
];
// Mid/high-rise modern set for the Commerce belt around the tower core.
export const QUAT_MODERN = [
  QUAT('q-4story'), QUAT('q-6story-stack'), QUAT('q-building3-big'), QUAT('q-2story-sign'),
  ...QUAT_HOMES,
];
// Significant one-off LANDMARK towers — rendered oversized by computeScene at a
// few fixed spots around the plaza so the centre has a unique, recognisable
// skyline rather than a uniform field of towers.
export const LANDMARK_TOWERS = [
  SKY('empire-state'), SKY('poly-tower-a'), SKY('perez-tower'), KAY('building_H'),
];

// Industrial props (between the sheds) + harbour craft.
export const CHIMNEYS = ['chimney-small', 'chimney-medium', 'chimney-large', 'chimney-basic'].map(IND);
export const IND_TANK = IND('detail-tank');
export const CONTAINERS = ['cargo-container-a', 'cargo-container-b', 'cargo-container-c'].map(WC);
export const SAIL_BOATS = ['boat-sail-a', 'boat-sail-b'].map(WC);
export const SPEED_BOATS = ['boat-speed-a', 'boat-speed-c', 'boat-speed-e'].map(WC);
export const MOORED_BOATS = ['boat-fishing-small', 'boat-tug-a', 'boat-row-small', 'boat-house-a'].map(WC);
export const BUOYS = ['buoy', 'buoy-flag'].map(WC);

// Building pool per district price tier — houses on the outskirts, shops + mid-
// rises in commerce, skyscrapers + towers downtown. 3D models only: the custom
// iso-art PNGs are rendered as whole-block landmarks on park blocks instead of
// being mixed into 1×1 plots (where the flat cards looked detached/cluttered).
// One theme per district, arranged centre → edge so the city reads as a
// modern metropolis fading into a futuristic frontier:
//   Civic core → varied skyscrapers + LANDMARK towers (the dense heart)
//   Luxury  (innermost ring) → varied skyscrapers (Finance towers)
//   Premium (Commerce belt)  → Quaternius modern mid/high-rise
//   Suburban (Inner Suburb)  → Kenney suburban houses
//   Starter  (Outer Suburb, OUTERMOST) → futuristic space colony
//   Heritage → medieval village + castle towers (placed separately)
//   Industrial → Kenney industrial sheds
export const DISTRICT_BUILDINGS = {
  Luxury: TOWERS,             // dense, varied downtown towers
  Premium: QUAT_MODERN,       // modern commerce mid/high-rise
  Suburban: HOUSES,           // classic suburbs
  Starter: FUTURE_BUILDINGS,  // futuristic colony
  Industrial: FACTORIES,
  // Six themed outer-ring districts — hand-authored procedural buildings
  // (see cityBuildings.js). Each pool is a list of `proc:<Tier>:<n>` keys that
  // the renderer turns into instanced vertex-coloured geometry instead of GLTFs.
  // Upgraded procedural pagodas/temples + real downloaded oriental GLBs mixed in.
  Oriental: [...PROC_KEYS.Oriental, ...PROC_KEYS.Oriental, ...ORIENTAL_MODELS],
  Cyberpunk: PROC_KEYS.Cyberpunk,
  WildWest: PROC_KEYS.WildWest,
  Alpine: PROC_KEYS.Alpine,
  Spooky: PROC_KEYS.Spooky,
  Desert: PROC_KEYS.Desert,
};

// Civic core (fixed) is the densest tower cluster — the modern city centre.
export const CIVIC_POOL = TOWERS;

export const TREES = [
  'tree_default', 'tree_oak', 'tree_detailed', 'tree_fat', 'tree_cone', 'tree_blocks', 'tree_simple', 'tree_thin',
  'tree_pineDefaultA', 'tree_pineRoundA', 'tree_pineRoundB', 'tree_pineRoundC', 'tree_pineSmallA', 'tree_pineTallA', 'tree_pineTallB',
  'tree_palmShort', 'tree_palmTall', 'tree_palmDetailedTall',
].map(NAT);
export const PALMS = TREES.filter((t) => /palm/.test(t));
export const PINES = TREES.filter((t) => /pine/.test(t));

// Mountain boundary ring — Kenney Nature Kit cliff blocks, instanced huge.
export const CLIFFS = [
  'cliff_block_rock', 'cliff_blockSlope_rock', 'cliff_blockDiagonal_rock',
  'cliff_large_rock', 'cliff_top_rock',
].map(NAT);
export const BUSHES = ['plant_bushLarge', 'plant_bushDetailed'].map(NAT);
export const SMALL_DECOR = ['flower_redA', 'flower_yellowA', 'flower_purpleA', 'mushroom_red', 'rock_smallA', 'rock_smallB'].map(NAT);
export const ROCKS = ['rock_largeA', 'rock_largeB'].map(NAT);

export const ROAD_FILE = KAY('road_straight');
export const ROAD_JUNCTION_FILE = KAY('road_junction');
export const ROAD_CROSSING_FILE = KAY('road_straight_crossing');
export const ROAD_CORNER_FILE = KAY('road_corner_curved');
export const ROAD_TSPLIT_FILE = KAY('road_tsplit');
export const GROUND_FILE = KAY('base');
export const WATERTOWER_FILE = KAY('watertower');

// Street life (fixed decoration on road tiles, never clickable).
export const CARS = ['car_sedan', 'car_hatchback', 'car_stationwagon', 'car_taxi', 'car_police'].map(KAY);
export const STREETLIGHT_FILE = KAY('streetlight');
export const TRAFFICLIGHT_FILES = ['trafficlight_A', 'trafficlight_B', 'trafficlight_C'].map(KAY);
export const STREET_PROPS = ['bench', 'firehydrant', 'trash_A', 'trash_B', 'dumpster'].map(KAY);
// Tidier subset for formal spaces (plaza, rambla, civic ring) — benches, no bins.
export const BENCH_FILE = KAY('bench');
export const FLOWERS = ['flower_redA', 'flower_yellowA', 'flower_purpleA'].map(NAT);

// Pedestrians — Kenney "Mini Characters" (CC0, public/estate/people/). Animated
// by CityLife (walk-slide + bob along sidewalks), so they're never static decor.
export const PEOPLE = ['a', 'b', 'c', 'd', 'e', 'f']
  .flatMap((l) => [`people/character-female-${l}.glb`, `people/character-male-${l}.glb`]);

export function hashCell(x, y) {
  const h = (x * 73856093) ^ (y * 19349663);
  return (h ^ (h >>> 13)) >>> 0;
}

export function buildingForTier(tier, x, y) {
  const list = DISTRICT_BUILDINGS[tier] || DISTRICT_BUILDINGS.Starter;
  return list[hashCell(x, y) % list.length];
}

// Deterministically place the one-off "special" landmarks from the map layout.
// Pure (depends only on layout) so the renderer (computeScene) and the walk-mode
// collision (buildCollision) agree on where they stand. Returns grid-cell
// placements: { file, gridX, gridY, height (world units), rotY, solid, radius }.
// The drifting balloon is airborne and handled separately — not returned here.
export function computeSpecials(layout) {
  const { gridW, gridH, cells } = layout;
  const grid = (cells || '').split('\n');
  const cc = layout.cityCenter || { x: (gridW - 1) / 2, y: (gridH - 1) / 2 };
  const S = []; const F = []; const P = [];
  for (let y = 0; y < gridH; y += 1) {
    const row = grid[y];
    if (!row) continue;
    for (let x = 0; x < gridW; x += 1) {
      const c = row[x];
      if (c === 'S') S.push([x, y]);
      else if (c === 'F') F.push([x, y]);
      else if (c === 'P') P.push([x, y]);
    }
  }
  const out = [];
  const add = (file, cell, height, opts = {}) => {
    if (!cell) return;
    out.push({ file, gridX: cell[0], gridY: cell[1], height, rotY: opts.rotY || 0, solid: opts.solid !== false, radius: opts.radius || 0 });
  };
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  // The world is far bigger than the city (beach/farm sit in the outer margins),
  // so place each landmark on the cell of its terrain NEAREST the city, where
  // players actually are — a seaside near town, a windmill on the near field —
  // rather than a random far corner.
  const nearest = (arr, ok = () => true) => {
    let best = null; let bd = Infinity;
    for (const c of arr) { if (!ok(c)) continue; const d = dist(c, [cc.x, cc.y]); if (d < bd) { bd = d; best = c; } }
    return best;
  };
  if (P.length) add(SPECIAL_FOUNTAIN, nearest(P), 1.3, { radius: 0 }); // plaza centrepiece
  if (S.length) {
    // Lighthouse on the nearest stretch of coast to the city.
    const light = nearest(S);
    add(SPECIAL_LIGHTHOUSE, light, 7, { radius: 1 });
    // Ferris wheel on the nearest coast too, but set apart from the lighthouse —
    // a little seaside fairground by the city.
    const ferris = nearest(S, (c) => dist(c, light) > 15) || nearest(S, (c) => dist(c, light) > 8);
    if (ferris) add(SPECIAL_FERRIS, ferris, 9, { radius: 2 });
  }
  if (F.length) add(SPECIAL_WINDMILL, nearest(F), 5, { radius: 1 }); // windmill on the near field
  return out;
}

// How a model is normalised onto its tile: ['fill', f] scales the footprint to
// TILE*f (right for wide things); ['height', h] scales to an absolute world
// height (right for tall-thin props — a streetlight normalised by its tiny
// footprint would tower over the skyline).
// Human-scale anchor: a person is PERSON_H (≈0.26) world units tall, so every
// prop below is sized as a real-world multiple of a 1.7 m human (≈ 6.5 m / unit).
// This keeps street furniture, cars and signs from towering over the walkable
// player — the whole point of "everything proportional to the character".
export const PERSON_H = 0.26;
export function normFor(file) {
  if (/people\//.test(file)) return ['height', PERSON_H];
  // Animals, sized as real-world multiples of the human anchor (PERSON_H).
  if (/quaternius\/animals\//.test(file)) {
    if (/Fox/.test(file)) return ['height', 0.13];           // small
    if (/Cow|Horse|Stag/.test(file)) return ['height', 0.24]; // large
    return ['height', 0.19];                                  // deer, alpaca
  }
  // Medieval props (well, gazebo, market stand) sit small on their plot; the
  // medieval buildings fill their tile like any other building.
  if (/quaternius\/medieval\/(Well|Gazebo|MarketStand)/.test(file)) return ['fill', 0.5];
  if (/quaternius\/medieval\//.test(file)) return ['fill', 0.9];
  if (/skyscrapers\//.test(file)) return ['fill', 0.82];         // stylized downtown towers
  if (/quaternius\/castle\//.test(file)) return ['fill', 0.7];   // tall stone towers
  if (/quaternius\/future\//.test(file)) return ['fill', 0.95];  // futuristic colony
  if (/quaternius\/more\//.test(file)) return ['fill', 0.85];
  if (/quaternius\/sign-/.test(file)) return ['height', 0.95]; // ~2.2 m sign on a pole
  if (/cliff_/.test(file)) return ['height', 16];
  if (/chimney/.test(file)) return ['height', 2.6];
  if (/detail-tank/.test(file)) return ['height', 1.1];
  if (/cargo-container/.test(file)) return ['fill', 0.55];
  if (/boat-house/.test(file)) return ['fill', 1.6];
  if (/boat-sail/.test(file)) return ['fill', 1.5];
  if (/boat-speed/.test(file)) return ['fill', 1.1];
  if (/boat-/.test(file)) return ['fill', 1.0];
  if (/buoy/.test(file)) return ['height', 0.5];
  if (/industrial\//.test(file)) return ['fill', 0.92];
  if (/streetlight/.test(file)) return ['height', 1.55];  // ~10 m lamp post
  if (/trafficlight/.test(file)) return ['height', 1.0];  // ~6.5 m signal
  if (/firehydrant/.test(file)) return ['height', 0.18];  // ~1.2 m hydrant
  if (/trash_/.test(file)) return ['height', 0.3];        // ~2 m bin
  if (/dumpster/.test(file)) return ['height', 0.36];
  if (/car_/.test(file)) return ['fill', 0.4];            // ~4.5 m long, ~1.5 m tall
  if (/bench/.test(file)) return ['fill', 0.3];           // ~1.6 m bench
  if (/skyscraper/.test(file)) return ['fill', 0.82];
  // Plants are height-normalised: footprint scaling lets skinny-tall models
  // (pines, flower stems) blow up taller than the skyline.
  if (TREES.includes(file)) return ['height', 2.0];
  if (/plant_bush/.test(file)) return ['fill', 0.6];
  if (/rock_large/.test(file)) return ['fill', 0.6];
  if (/rock_small/.test(file)) return ['fill', 0.45];
  if (/flower_/.test(file)) return ['height', 0.35];
  if (/mushroom/.test(file)) return ['height', 0.3];
  if (/road_|base/.test(file)) return ['fill', 1.0];
  if (/watertower/.test(file)) return ['fill', 1.0];
  // Oriental hero models: footprint-normalised so the tall pagodas keep their
  // height; gates/torii sit a touch smaller.
  if (/oriental\/pagoda-grand/.test(file)) return ['fill', 1.05];
  if (/oriental\/pagoda/.test(file)) return ['fill', 0.95];
  if (/oriental\/(torii|gate)/.test(file)) return ['fill', 0.95];
  if (/oriental\/shrine/.test(file)) return ['fill', 0.7];
  return ['fill', 0.85]; // buildings — slightly inside the tile so neighbours never touch
}

// 3D (GLTF/GLB) models only — PNG billboards are loaded as textures separately.
export const ALL_MODEL_URLS = [
  ...new Set([
    ...Object.values(DISTRICT_BUILDINGS).flat(),
    ...CIVIC_POOL,
    ...TREES, ...BUSHES, ...SMALL_DECOR, ...ROCKS,
    ...CARS, STREETLIGHT_FILE, ...TRAFFICLIGHT_FILES, ...STREET_PROPS, ...SIGNS, ...PEOPLE,
    ...CHIMNEYS, IND_TANK, ...CONTAINERS, ...SAIL_BOATS, ...SPEED_BOATS, ...MOORED_BOATS, ...BUOYS,
    ...CLIFFS,
    ...MEDIEVAL_BUILDINGS, ...CASTLE_BUILDINGS, ...MEDIEVAL_PROPS,
    ...ANIMALS, ...QUAT_HOMES, ...FUTURE_BUILDINGS,
    ROAD_FILE, ROAD_JUNCTION_FILE, ROAD_CROSSING_FILE, ROAD_CORNER_FILE, ROAD_TSPLIT_FILE,
    GROUND_FILE, WATERTOWER_FILE,
  ]),
].filter((f) => !isBillboard(f) && !isProcKey(f)).map(u);

export const CUSTOM_IMAGE_URLS = [...CUSTOM_IMAGES, ...OLD_TOWN_ART, ...FARM_ART].map(u);

export const modelUrl = u;
