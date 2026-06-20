// Mixed CC0 model manifest (consistency between packs intentionally not required).
//   - KayKit "City Builder Bits" (.gltf)  — roads, water tower, some mid-rises
//   - Kenney "City Kit (Suburban)" (.glb) — 21 houses
//   - Kenney "City Kit (Commercial)" (.glb) — 14 shops/offices + 5 skyscrapers
//   - Kenney "Nature Kit" (.glb)          — 18 trees + rocks/bushes/flowers
// All models are auto-normalised at load (footprint -> tile, base y=0), so packs
// with different scales mix freely.

export const BASE = '/estate/';
export const TILE = 2;
const u = (f) => BASE + f;

const KAY = (n) => `kaykit/${n}.gltf`;
const SUB = (l) => `suburban/building-type-${l}.glb`;
const COM = (n) => `commercial/${n}.glb`;
const NAT = (n) => `nature/${n}.glb`;
const IND = (n) => `industrial/${n}.glb`;
const WC = (n) => `watercraft/${n}.glb`;
const CUST = (n) => `custom/building-${n}.png`; // user's iso building art (billboards)

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
const SKYSCRAPERS = 'abcde'.split('').map((l) => COM(`building-skyscraper-${l}`)); // 5
const FACTORIES = 'abcdefghijklmnopqrst'.split('').map((l) => IND(`building-${l}`)); // 20

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
export const DISTRICT_BUILDINGS = {
  Luxury: [...SKYSCRAPERS, KAY('building_H'), KAY('building_G')],                 // Finance
  Premium: [...SHOPS, KAY('building_E'), KAY('building_D'), KAY('building_F')],   // Commerce
  Suburban: [...HOUSES, COM('building-a'), COM('building-b')],
  Starter: HOUSES,
  Industrial: FACTORIES,
};

// Civic core (fixed) uses skyscrapers for a dense downtown.
export const CIVIC_POOL = SKYSCRAPERS;

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

// How a model is normalised onto its tile: ['fill', f] scales the footprint to
// TILE*f (right for wide things); ['height', h] scales to an absolute world
// height (right for tall-thin props — a streetlight normalised by its tiny
// footprint would tower over the skyline).
export function normFor(file) {
  if (/people\//.test(file)) return ['height', 0.42];
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
  if (/streetlight/.test(file)) return ['height', 2.4];
  if (/trafficlight/.test(file)) return ['height', 2.0];
  if (/firehydrant/.test(file)) return ['height', 0.55];
  if (/trash_/.test(file)) return ['height', 0.7];
  if (/dumpster/.test(file)) return ['height', 0.75];
  if (/car_/.test(file)) return ['fill', 0.62];
  if (/bench/.test(file)) return ['fill', 0.5];
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
  return ['fill', 0.85]; // buildings — slightly inside the tile so neighbours never touch
}

// 3D (GLTF/GLB) models only — PNG billboards are loaded as textures separately.
export const ALL_MODEL_URLS = [
  ...new Set([
    ...Object.values(DISTRICT_BUILDINGS).flat(),
    ...CIVIC_POOL,
    ...TREES, ...BUSHES, ...SMALL_DECOR, ...ROCKS,
    ...CARS, STREETLIGHT_FILE, ...TRAFFICLIGHT_FILES, ...STREET_PROPS, ...PEOPLE,
    ...CHIMNEYS, IND_TANK, ...CONTAINERS, ...SAIL_BOATS, ...SPEED_BOATS, ...MOORED_BOATS, ...BUOYS,
    ...CLIFFS,
    ROAD_FILE, ROAD_JUNCTION_FILE, ROAD_CROSSING_FILE, ROAD_CORNER_FILE, ROAD_TSPLIT_FILE,
    GROUND_FILE, WATERTOWER_FILE,
  ]),
].filter((f) => !isBillboard(f)).map(u);

export const CUSTOM_IMAGE_URLS = [...CUSTOM_IMAGES, ...OLD_TOWN_ART, ...FARM_ART].map(u);

export const modelUrl = u;
