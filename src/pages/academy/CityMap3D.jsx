import { useMemo, useRef, useState, useEffect, useCallback, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import {
  MapControls, OrthographicCamera, PerspectiveCamera,
  Html, useGLTF, useTexture, useProgress, useAnimations,
} from '@react-three/drei';
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { clone as cloneSkeleton } from 'three/addons/utils/SkeletonUtils.js';
import {
  TILE, ALL_MODEL_URLS, CUSTOM_IMAGES, CUSTOM_IMAGE_URLS, modelUrl, GROUND_FILE, ROAD_FILE,
  ROAD_JUNCTION_FILE, ROAD_CROSSING_FILE, ROAD_CORNER_FILE, ROAD_TSPLIT_FILE, WATERTOWER_FILE,
  CIVIC_POOL, TREES, BUSHES, PALMS, PINES, SMALL_DECOR, ROCKS, STREETLIGHT_FILE,
  TRAFFICLIGHT_FILES, STREET_PROPS, CHIMNEYS, IND_TANK, CONTAINERS, FARM_ART,
  CLIFFS, PEOPLE, buildingForTier, hashCell, normFor, isBillboard, BILLBOARD_SCALE,
  FARM_SCALE,
  MULTI_MAT, SPECIAL_URLS, BALLOON_FILE, computeSpecials, CARS, SIGNS, BENCH_FILE, FLOWERS,
  HERITAGE_BUILDINGS, MEDIEVAL_PROPS, FOREST_ANIMALS, FARM_ANIMALS, ANIMALS, LANDMARK_TOWERS,
} from './cityModels.js';

// The player avatar is one of the Kenney mini-characters — same model + scale as
// the NPCs walking the streets, so "you" are the same little size as everyone.
const PLAYER_MODEL = 'people/character-male-e.glb';
const PLAYER_HEIGHT = 0.26;   // small person against a big city (matches NPC PERSON_H)
const POV_MIN = 1.4;          // closest 3rd-person framing (keeps the avatar small in frame)
const POV_MAX = 12;           // furthest 3rd-person pull-back
import {
  applyMatrices, applyGroundMatrices, applyBuildingMatrices, footprintLevels,
  extractGeoMat, extractParts, Y_AXIS, configureTerrain, terrainHeight, walkHeight,
  RIVER_WATER_Y, RIVER_DECK_Y,
} from './cityRender.js';
import { districtAt, DISTRICT_META } from './cityWorld.js';
import { useDistrictAudio } from './cityAudio.js';
import { PROC_BUILDINGS, PROC_MATERIAL, isProcKey } from './cityBuildings.js';
import CityLife from './CityLife.jsx';

ALL_MODEL_URLS.forEach((u) => useGLTF.preload(u));
SPECIAL_URLS.forEach((url) => useGLTF.preload(url));
useTexture.preload(CUSTOM_IMAGE_URLS);

const X_AXIS = new THREE.Vector3(1, 0, 0);
const GROUND_PLANE = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0); // y=0, for drop→world unproject

// Overview "melt away" fade. As you zoom the isometric map in, the buildings
// closest to the camera dissolve so they stop blocking the ones behind. Driven
// by one shared uniform (view-space depth cutoff) that FadeDriver updates from
// the camera zoom; 0 in walk mode (no effect). Building materials opt in via
// patchFadeMaterial, which dithers-discards fragments nearer than the cutoff.
const FADE_U = { value: 0 };
function patchFadeMaterial(mat) {
  if (!mat || mat.userData.__fadePatched) return mat;
  mat.userData.__fadePatched = true;
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uFade = FADE_U;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying float vViewDepth;')
      .replace('#include <project_vertex>', '#include <project_vertex>\n  vViewDepth = -mvPosition.z;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uFade;\nvarying float vViewDepth;')
      .replace('#include <dithering_fragment>', `
      if (uFade > 0.001) {
        float vis = smoothstep(uFade - 130.0, uFade, vViewDepth);
        float n = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
        if (vis < n) discard;
      }
      #include <dithering_fragment>`);
  };
  mat.needsUpdate = true;
  return mat;
}

// Which model files count as "buildings" (and so melt away in the zoomed
// overview). Excludes roads, ground, nature and street furniture.
function isBuildingFile(f) {
  return !/(road_|\/base|nature\/|tree_|plant_|rock_|flower_|mushroom_|people\/|animals\/|car_|streetlight|trafficlight|bench|firehydrant|trash_|dumpster|sign-|cliff_|watercraft\/|buoy|boat-)/.test(f);
}

// Flat tiles that pave the ground (roads, junctions, the base lot). These TILT
// onto the terrain slope so they form one continuous surface; everything else
// stays upright. Buildings/props sit on top via the normal (upright) path.
const GROUND_TILE_FILES = new Set([
  GROUND_FILE, ROAD_FILE, ROAD_JUNCTION_FILE, ROAD_CROSSING_FILE, ROAD_CORNER_FILE, ROAD_TSPLIT_FILE,
]);

// Footprint half-width (world units) of a building instance — used to size its
// foundation pad. Buildings normalise to TILE*frac ('fill' mode) then scale by
// the per-instance scale; tall-thin ('height') and procedural models fall back
// to a tile-ish base.
function buildingHalf(file, sc) {
  const s = sc || 1;
  if (isProcKey(file)) return TILE * 0.45 * s;
  const [mode, v] = normFor(file);
  const frac = mode === 'fill' ? v : 0.8;
  return Math.max(0.5, (TILE * frac * s) / 2);
}

// Drives the overview melt-away: dissolves buildings BETWEEN the camera and the
// focal point (controls target), more aggressively the further you zoom in, so
// the towers you've zoomed past stop hiding the ones you're looking at. Off in
// walk mode.
const _fadeV = new THREE.Vector3();
function FadeDriver({ active }) {
  const { camera, controls } = useThree();
  useFrame(() => {
    if (!active || !camera.isOrthographicCamera || !controls?.target) { FADE_U.value = 0; return; }
    _fadeV.copy(controls.target).applyMatrix4(camera.matrixWorldInverse);
    const targetDepth = -_fadeV.z;                       // view depth of the focus
    const zf = Math.min(1, Math.max(0, (camera.zoom - 30) / (120 - 30)));
    // Peel the FRONT portion only — keep the focal buildings (and those behind)
    // visible. 0.6 caps how far toward the focus the dissolve plane advances.
    FADE_U.value = zf > 0 ? targetDepth * zf * 0.6 : 0;
  });
  return null;
}

// ── Day/night + weather cycle ───────────────────────────────────────────────
const DAY_LEN = 160;   // seconds for a full day-night loop
const WEATHER_LEN = 45; // seconds per weather phase (clear → overcast → rain)
const dayPhaseAt = (t) => (((t / DAY_LEN) + 0.32) % 1); // start mid-morning
const sunElevationAt = (phase) => Math.sin((phase - 0.25) * Math.PI * 2); // -1..1
// Weather targets: cloudiness (dims light) and rain (0/1), looping.
function weatherAt(t) {
  const wt = t % (WEATHER_LEN * 3);
  if (wt < WEATHER_LEN) return { cloud: 0, rain: 0, phase: 'clear' };
  if (wt < WEATHER_LEN * 2) return { cloud: 1, rain: 0, phase: 'cloud' };
  return { cloud: 1, rain: 1, phase: 'rain' };
}
const SKY_DAY = new THREE.Color('#bcd6f2');
const SKY_NIGHT = new THREE.Color('#0b1226');
const SKY_DUSK = new THREE.Color('#e6a062');
const SKY_OVERCAST = new THREE.Color('#9aa3ad');
const SUN_WARM = new THREE.Color('#ffcaa0');
const SUN_NOON = new THREE.Color('#fff6e8');
const BILLBOARD_FACING = Math.PI / 4; // face the fixed iso camera azimuth

// Scratch objects for per-frame matrix recomposition (tree sway).
const _m = new THREE.Matrix4();
const _p = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _q2 = new THREE.Quaternion();
const _s = new THREE.Vector3();

/**
 * Colossal districted city with mixed CC0 packs (KayKit towers + Kenney suburban
 * houses + Kenney nature). Everything is GPU-instanced (one InstancedMesh per
 * model) and auto-normalised to the tile, so packs with different scales mix.
 */
export default function CityMap3D({ plots, ownedRows, layout, selectedKey, onSelectPlot }) {
  const wrapRef = useRef(null);
  const downPos = useRef(null);
  const glRef = useRef(null);
  const camRef = useRef(null);
  const stateRef = useRef(null);
  const [isFull, setIsFull] = useState(false);
  const [ready, setReady] = useState(false);
  // 'play' = spawn into the city as a tiny player (perspective + pointer lock +
  // WASD, scroll to change POV); 'overview' = the isometric map (orthographic,
  // drag/zoom). You spawn straight into the city.
  const [mode, setMode] = useState('play');
  const [locked, setLocked] = useState(false);
  // Where the avatar spawns when entering walk mode. null = city centre; set by
  // dragging the avatar chip onto the overview map (drop → spawn there + walk).
  const [spawnPos, setSpawnPos] = useState(null);
  // Walk-mode purchasing: the plot the player is currently facing (set by Player's
  // probe). Pressing E selects it, which opens the existing buy modal.
  const [targetKey, setTargetKey] = useState(null);
  const targetKeyRef = useRef(null);
  useEffect(() => { targetKeyRef.current = targetKey; }, [targetKey]);
  // Resolve a plot key → its display info (owned rows win over derived plots).
  const plotByKey = useMemo(() => {
    const m = new Map();
    for (const p of plots) m.set(p.key, p);
    for (const r of ownedRows) m.set(`${r.gridX},${r.gridY}`, { ...r, key: `${r.gridX},${r.gridY}` });
    return m;
  }, [plots, ownedRows]);
  const targeted = targetKey ? plotByKey.get(targetKey) : null;

  // DEV ONLY — with #devsnap[=name] in the URL, capture the canvas shortly
  // after the city renders and POST it to the Vite dev-snap endpoint, so local
  // tooling can "see" the map without driving the browser. Optional params:
  //   snapzoom=N        camera zoom (8 ≈ whole island, 30+ ≈ street close-up)
  //   snapx=N&snapz=N   world position to centre on (panning)
  // No-op in prod.
  useEffect(() => {
    if (!import.meta.env.DEV || !ready) return undefined;
    if (!window.location.hash.includes('devsnap')) return undefined;
    let t2 = null;
    const t1 = setTimeout(() => {
      const hash = window.location.hash;
      const zoom = Number(hash.match(/snapzoom=(\d+)/)?.[1]);
      const px = Number(hash.match(/snapx=(-?\d+)/)?.[1] || 0);
      const pz = Number(hash.match(/snapz=(-?\d+)/)?.[1] || 0);
      const cam = camRef.current;
      // onCreated gives a one-time snapshot; .get() reads the live store
      // (controls are registered by MapControls after creation).
      const controls = stateRef.current?.get?.().controls || stateRef.current?.controls;
      if (zoom && cam) {
        cam.zoom = zoom;
        cam.updateProjectionMatrix();
      }
      if ((px || pz) && controls) {
        controls.target.set(px, 0, pz);
        controls.object.position.set(px + 200, 180, pz + 200);
        controls.update();
      }
      t2 = setTimeout(() => {
        const canvas = glRef.current?.domElement;
        if (!canvas) return;
        const name = hash.match(/devsnap=([a-zA-Z0-9_-]+)/)?.[1] || 'latest';
        fetch('/__dev/snap', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, dataUrl: canvas.toDataURL('image/png') }),
        }).catch(() => {});
      }, 400);
    }, 2200);
    return () => { clearTimeout(t1); if (t2) clearTimeout(t2); };
  }, [ready]);

  const toggleFull = useCallback(() => {
    const el = wrapRef.current;
    if (!document.fullscreenElement) el?.requestFullscreen?.();
    else document.exitFullscreen?.();
  }, []);

  // Drag the avatar chip onto the overview map → unproject the drop point onto the
  // ground, spawn the player there and drop into walk mode (so you don't have to
  // walk over). Reads the live default (overview) camera from the r3f store.
  const handleAvatarDrop = useCallback((e) => {
    e.preventDefault();
    const cam = stateRef.current?.get?.().camera;
    const wrap = wrapRef.current;
    if (!cam || !wrap) return;
    const rect = wrap.getBoundingClientRect();
    const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const ndcY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    const ray = new THREE.Raycaster();
    ray.setFromCamera({ x: ndcX, y: ndcY }, cam);
    const pt = new THREE.Vector3();
    if (ray.ray.intersectPlane(GROUND_PLANE, pt)) {
      setSpawnPos([pt.x, pt.z]);
      setMode('play');
    }
  }, []);
  useEffect(() => {
    const onFs = () => setIsFull(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  // In play mode: track pointer-lock (to show/hide the "click to look" hint)
  // and let Esc drop straight back to the overview.
  useEffect(() => {
    if (mode !== 'play') return undefined;
    const onLock = () => setLocked(!!document.pointerLockElement);
    const onKey = (e) => {
      if (e.key === 'Escape') { setMode('overview'); return; }
      // Press E to buy/manage the plot you're facing: select it (opens the buy
      // modal) and release the mouse so you can click through it.
      if ((e.key === 'e' || e.key === 'E') && targetKeyRef.current) {
        onSelectPlot?.(targetKeyRef.current);
        document.exitPointerLock?.();
      }
    };
    document.addEventListener('pointerlockchange', onLock);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerlockchange', onLock);
      window.removeEventListener('keydown', onKey);
    };
  }, [mode, onSelectPlot]);

  // Drop the facing-target when leaving walk mode so a stale prompt can't linger.
  useEffect(() => { if (mode !== 'play') setTargetKey(null); }, [mode]);

  // Grid of solid cells (buildings, civic towers, water) for walk-mode
  // collision. Computed once per layout; useMemo stays above the early return.
  const [sky, setSky] = useState(null);
  // Current district key (walk mode) → drives the heading banner, sky tint and
  // ambient music. `banner` is the name to flash when you cross a boundary.
  const [district, setDistrict] = useState('centre');
  const [banner, setBanner] = useState(null);
  const [muted, setMuted] = useState(false);
  const collision = useMemo(() => (layout?.cells ? buildCollision(layout) : null), [layout]);

  useDistrictAudio(district, mode === 'play' && !muted);

  // Flash the district name whenever it changes while walking.
  useEffect(() => {
    if (mode !== 'play') return undefined;
    const meta = DISTRICT_META[district];
    if (!meta) return undefined;
    setBanner(meta.name);
    const t = setTimeout(() => setBanner(null), 2600);
    return () => clearTimeout(t);
  }, [district, mode]);

  // The renderer needs the v2 cell-map layout; a stale backend (old infra
  // shape) just keeps the loader up rather than crashing mid-scene.
  if (!layout?.cells) return null;

  // First view opens on the city centre (the city sits NW on the big island).
  const ccOriginX = ((layout.gridW - 1) * TILE) / 2;
  const ccx = layout.cityCenter ? layout.cityCenter.x * TILE - ccOriginX : 0;
  const ccz = layout.cityCenter ? layout.cityCenter.y * TILE - ccOriginX : 0;

  return (
    <div
      ref={wrapRef}
      className="relative w-full bg-black rounded-xl overflow-hidden border border-line-soft"
      style={{ height: isFull ? '100vh' : 'max(440px, calc(100vh - 252px))' }}
      onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
      onDrop={handleAvatarDrop}
    >
      <Canvas
        shadows="percentage"
        dpr={[1, 1.75]}
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
          // dev-snap needs the buffer to survive until toDataURL; dev only.
          preserveDrawingBuffer: import.meta.env.DEV,
        }}
        onCreated={(state) => { glRef.current = state.gl; camRef.current = state.camera; stateRef.current = state; }}
      >
        {/* Sky, sun and weather drive background + fog imperatively (below). */}

        {/* Two cameras, swapped by makeDefault: the iso overview camera and the
            first-person player camera (positioned by the Player controller). */}
        <OrthographicCamera
          makeDefault={mode === 'overview'}
          position={[ccx + 200, 180, ccz + 200]}
          zoom={12}
          near={0.1}
          far={4000}
        />
        <PerspectiveCamera
          makeDefault={mode === 'play'}
          fov={72}
          near={0.1}
          far={2000}
          position={[ccx, 1.7, ccz]}
        />
        {/* Animated sun/sky/weather: day-night cycle + clear→overcast→rain. */}
        <SkyAndWeather play={mode === 'play'} onSample={setSky} districtSky={mode === 'play' ? DISTRICT_META[district]?.sky : null} />

        <Suspense fallback={null}>
          <City plots={plots} ownedRows={ownedRows} layout={layout} selectedKey={selectedKey} onSelectPlot={onSelectPlot} interactive={mode === 'overview'} downPos={downPos} onReady={() => setReady(true)} />
        </Suspense>

        {mode === 'overview' && (
          <>
            <MapControls makeDefault enableRotate={false} enableDamping dampingFactor={0.12} minZoom={6} maxZoom={170} target={[ccx, 0, ccz]} />
            <CameraLimits gridW={layout.gridW} />
          </>
        )}
        {mode === 'play' && (
          <Suspense fallback={null}>
            <Player spawn={spawnPos || [ccx, ccz]} bound={(layout.gridW * TILE) / 2 - 6} solid={collision} origin={ccOriginX} layout={layout} onDistrict={setDistrict} onTarget={setTargetKey} />
          </Suspense>
        )}
      </Canvas>

      <LoadingOverlay ready={ready} />

      {/* Mode toggle — spawn into the city, or return to the map overview. */}
      <button
        type="button"
        onClick={() => setMode((m) => (m === 'overview' ? 'play' : 'overview'))}
        className="absolute top-3 left-3 z-10 text-[10px] font-bold uppercase tracking-widest text-white bg-accent/80 hover:bg-accent px-3 py-1.5 rounded transition-colors"
      >
        {mode === 'overview' ? '🚶 Walk the city' : '🗺 Overview'}
      </button>

      <button
        type="button"
        onClick={toggleFull}
        className="absolute top-3 right-3 z-10 text-[10px] font-bold uppercase tracking-widest text-white bg-black/45 hover:bg-black/70 px-3 py-1.5 rounded transition-colors"
      >
        {isFull ? '⤢ Exit' : '⤢ Fullscreen'}
      </button>

      {/* District heading — flashes when you cross into a new quarter. */}
      {mode === 'play' && banner && (
        <div key={banner} className="absolute top-16 left-1/2 -translate-x-1/2 z-10 pointer-events-none text-center estate-banner">
          <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/70">Now entering</div>
          <div className="text-2xl md:text-3xl font-display font-extrabold text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">{banner}</div>
        </div>
      )}

      {/* Mute toggle for the ambient district music. */}
      {mode === 'play' && (
        <button
          type="button"
          onClick={() => setMuted((m) => !m)}
          className="absolute bottom-3 right-3 z-10 text-[10px] font-bold uppercase tracking-widest text-white bg-black/45 hover:bg-black/70 px-3 py-1.5 rounded transition-colors"
        >
          {muted ? '🔇 Music off' : '🔊 Music on'}
        </button>
      )}

      {/* Live clock + weather. */}
      {sky && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 text-[11px] font-bold tracking-widest text-white bg-black/45 px-3 py-1.5 rounded pointer-events-none tabular-nums">
          {sky.icon} {sky.clock}
        </div>
      )}

      {/* Centre crosshair + buy prompt while walking + locked. The crosshair turns
          green over a buyable plot; press E to open its buy/manage card. */}
      {mode === 'play' && locked && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center pointer-events-none">
          <div className={`w-2 h-2 rounded-full ring-1 ring-black/50 ${
            !targeted ? 'bg-white/80'
              : targeted.mine ? 'bg-accent'
                : targeted.owner ? 'bg-amber-400'
                  : 'bg-emerald-400'}`}
          />
          {targeted && (
            <div className="mt-3 bg-black/70 text-white text-center px-3 py-1.5 rounded-lg max-w-[16rem]">
              <div className="text-[12px] font-bold leading-tight">{targeted.name}</div>
              {!targeted.owner && (
                <div className="text-[11px] text-white/85">🪙 {Number(targeted.marketValue).toLocaleString()} · <span className="text-emerald-300 font-bold">[E] Buy</span></div>
              )}
              {targeted.owner && !targeted.mine && (
                <div className="text-[11px] text-white/70">Owned by {targeted.owner.name || 'someone'}</div>
              )}
              {targeted.mine && (
                <div className="text-[11px] text-white/85">Yours · <span className="text-accent font-bold">[E] Manage</span></div>
              )}
            </div>
          )}
        </div>
      )}

      {/* "Click to look" prompt while walking but not yet locked. */}
      {mode === 'play' && !locked && (
        <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
          <div className="bg-black/55 text-white text-center px-5 py-4 rounded-xl">
            <p className="text-sm font-bold">Click to look around</p>
            <p className="text-[11px] text-white/75 mt-1">WASD move · mouse look · scroll for 1st/3rd person · Shift sprint · Esc or “Overview” to exit</p>
          </div>
        </div>
      )}

      {/* Drag this onto the map to spawn there and drop into walk mode. */}
      {mode === 'overview' && (
        <div
          draggable
          onDragStart={(e) => { e.dataTransfer.setData('text/plain', 'avatar'); e.dataTransfer.effectAllowed = 'move'; }}
          title="Drag onto the map to spawn there and walk"
          className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 cursor-grab active:cursor-grabbing select-none bg-accent/90 hover:bg-accent text-white text-[11px] font-bold px-3 py-2 rounded-full shadow-lg flex items-center gap-1.5"
        >
          🧍 Drag me onto the map to spawn &amp; walk here
        </div>
      )}

      <div className="absolute bottom-3 left-3 text-[10px] font-bold uppercase tracking-widest text-white/80 bg-black/40 px-3 py-1.5 rounded pointer-events-none">
        {mode === 'overview'
          ? 'Drag the 🧍 onto the map to spawn · drag to pan · scroll to zoom · click a lot'
          : 'WASD move · mouse look · E buy plot · scroll 1st/3rd person · Shift sprint · Esc overview'}
      </div>
    </div>
  );
}

// Walk speeds in world units/sec. The avatar is only 0.42 tall (the tile is 2),
// so these are deliberately gentle — a stroll, not a sprint across rooftops.
const WALK_SPEED = 1.5;
const SPRINT_SPEED = 3.4;
const TURN_RATE = 11;   // how fast the avatar swings to face its heading

// First/third-person player: positions the (default) perspective camera and
// walks it with WASD on the ground plane; the mouse looks via a manual pointer
// lock. Building collision (see buildCollision) stops you walking through walls.
// The avatar is the REAL skinned Kenney character — not the flattened instanced
// mesh the NPCs use — so it plays the pack's actual idle / walk / sprint clips
// and turns to face the way it's moving. The scroll wheel dollies the camera
// from first person (dist 0) out to a third-person view (dist POV_MAX).
function Player({ spawn, bound, solid, origin, layout, onDistrict, onTarget }) {
  const { camera, gl } = useThree();
  const keys = useRef({});
  const lastDistrict = useRef(null);
  const lastTarget = useRef(null);
  // The map grid, for "what plot am I facing" probing so you can buy from the street.
  const grid = useMemo(() => (layout?.cells ? layout.cells.split('\n') : []), [layout]);
  const yaw = useRef(Math.PI);     // camera look yaw (into the city on spawn)
  const pitch = useRef(-0.05);
  const dist = useRef(0);          // POV: 0 = first person
  const groundPos = useRef(new THREE.Vector3(spawn[0], 0, spawn[1] + 4));
  const heading = useRef(0);       // avatar facing, smoothed toward movement dir
  const avatarRef = useRef();
  const EYE = PLAYER_HEIGHT * 0.92;

  // Player avatar — clone the cached GLB so the shared scene isn't mutated and
  // the mixer only drives our copy. Normalise to the NPC height with feet at
  // y=0, and let it cast a shadow.
  const { scene, animations } = useGLTF(modelUrl(PLAYER_MODEL));
  const avatar = useMemo(() => {
    const c = cloneSkeleton(scene);
    const box = new THREE.Box3().setFromObject(c);
    const h = (box.max.y - box.min.y) || 1;
    const s = PLAYER_HEIGHT / h;
    c.scale.setScalar(s);
    c.position.y = -box.min.y * s;
    c.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; } });
    return c;
  }, [scene]);
  const { actions } = useAnimations(animations, avatarRef);
  const clip = useRef('idle');

  const euler = useRef(new THREE.Euler(0, 0, 0, 'YXZ'));
  const look = useRef(new THREE.Vector3());
  const fwd = useRef(new THREE.Vector3());
  const right = useRef(new THREE.Vector3());

  useEffect(() => {
    const dom = gl.domElement;
    const onDown = (e) => { if (e.button === 0 && document.pointerLockElement !== dom) dom.requestPointerLock?.(); };
    const onMove = (e) => {
      if (document.pointerLockElement !== dom) return;
      yaw.current -= e.movementX * 0.0022;
      pitch.current = Math.max(-1.35, Math.min(1.35, pitch.current - e.movementY * 0.0022));
    };
    const onWheel = (e) => {
      e.preventDefault();
      const next = dist.current + e.deltaY * 0.01;
      // Snap between first person (0) and a minimum 3rd-person distance so the
      // avatar can never balloon up to fill the frame at close range.
      if (next < POV_MIN * 0.5) dist.current = 0;
      else dist.current = Math.max(POV_MIN, Math.min(POV_MAX, next));
    };
    const onKeyDown = (e) => { keys.current[e.code] = true; };
    const onKeyUp = (e) => { keys.current[e.code] = false; };
    dom.addEventListener('pointerdown', onDown);
    window.addEventListener('mousemove', onMove);
    dom.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      dom.removeEventListener('pointerdown', onDown);
      window.removeEventListener('mousemove', onMove);
      dom.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [gl]);

  // Start in the idle clip; the frame loop cross-fades to walk/sprint on the move.
  useEffect(() => {
    actions?.idle?.reset().fadeIn(0.2).play();
    return () => { Object.values(actions || {}).forEach((a) => a?.stop?.()); };
  }, [actions]);

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    const k = keys.current;
    const sprinting = !!(k.ShiftLeft || k.ShiftRight);
    const speed = (sprinting ? SPRINT_SPEED : WALK_SPEED) * dt;

    euler.current.set(pitch.current, yaw.current, 0);
    look.current.set(0, 0, -1).applyEuler(euler.current);
    fwd.current.set(look.current.x, 0, look.current.z);
    if (fwd.current.lengthSq() > 1e-5) fwd.current.normalize();
    right.current.crossVectors(fwd.current, Y_AXIS).normalize();

    let mf = 0; let ms = 0;
    if (k.KeyW || k.ArrowUp) mf += 1;
    if (k.KeyS || k.ArrowDown) mf -= 1;
    if (k.KeyD || k.ArrowRight) ms += 1;
    if (k.KeyA || k.ArrowLeft) ms -= 1;
    const moving = !!(mf || ms);
    if (moving) {
      const dx = fwd.current.x * mf + right.current.x * ms;
      const dz = fwd.current.z * mf + right.current.z * ms;
      const len = Math.hypot(dx, dz) || 1;
      const ux = dx / len; const uz = dz / len;
      const stepX = ux * speed;
      const stepZ = uz * speed;
      const clamp = (v) => Math.max(-bound, Math.min(bound, v));
      // Axis-separated so you slide along walls instead of sticking; a move is
      // rejected if its target cell is solid (building / civic tower / water).
      const free = (wx, wz) => {
        if (!solid) return true;
        const gx = Math.round((wx + origin) / TILE);
        const gy = Math.round((wz + origin) / TILE);
        return !solid.has(`${gx},${gy}`);
      };
      const nx = clamp(groundPos.current.x + stepX);
      if (free(nx, groundPos.current.z)) groundPos.current.x = nx;
      const nz = clamp(groundPos.current.z + stepZ);
      if (free(groundPos.current.x, nz)) groundPos.current.z = nz;
      // Turn the avatar to face where it's actually walking (shortest arc).
      const target = Math.atan2(ux, uz);
      const delta = Math.atan2(Math.sin(target - heading.current), Math.cos(target - heading.current));
      heading.current += delta * Math.min(1, dt * TURN_RATE);
    }

    // Cross-fade the animation to match the movement state.
    const want = moving ? (sprinting ? 'sprint' : 'walk') : 'idle';
    if (actions && want !== clip.current) {
      actions[clip.current]?.fadeOut(0.18);
      actions[want]?.reset().fadeIn(0.18).play();
      clip.current = want;
    }

    const ex = groundPos.current.x;
    const ez = groundPos.current.z;

    // Report the district under our feet (drives the banner, sky tint, music).
    if (onDistrict && layout) {
      const key = districtAt(ex, ez, layout);
      if (key !== lastDistrict.current) { lastDistrict.current = key; onDistrict(key); }
    }

    // Walk-mode targeting: the nearest buyable plot ('.') the player is FACING,
    // so you can buy a house from the street. Cheap cell probe along the look dir.
    if (onTarget) {
      let tk = null;
      const fx = fwd.current.x; const fz = fwd.current.z;
      if (fx || fz) {
        for (let dd = 1.5; dd <= 8; dd += 0.85) {
          const gx2 = Math.round((ex + fx * dd + origin) / TILE);
          const gz2 = Math.round((ez + fz * dd + origin) / TILE);
          if (grid[gz2]?.[gx2] === '.') { tk = `${gx2},${gz2}`; break; }
        }
      }
      if (tk !== lastTarget.current) { lastTarget.current = tk; onTarget(tk); }
      if (import.meta.env.DEV) window.__estateTarget = tk; // dev: inspect the facing-probe
    }

    // Ground height under the player — cliff-aware so we stand ON the bridge deck
    // and raised banks instead of sinking into the channel beside them.
    const gy = walkHeight(ex, ez);
    const d = dist.current;
    if (d > 0.6) {
      // Third person: orbit behind the avatar but LIFTED above it and angled
      // down, so the (small) character is clearly framed instead of sitting as a
      // sliver at eye level. Yaw orbits; the wheel sets the distance.
      const headY = gy + PLAYER_HEIGHT * 0.7;
      const lift = 0.5 + d * 0.6;
      camera.position.set(
        ex - look.current.x * d,
        Math.max(gy + 0.4, headY + lift - look.current.y * d),
        ez - look.current.z * d,
      );
      camera.lookAt(ex, headY, ez);
    } else {
      // First person: eye-level free look.
      camera.position.set(ex, gy + EYE, ez);
      camera.quaternion.setFromEuler(euler.current);
    }

    if (avatarRef.current) {
      avatarRef.current.position.set(ex, gy, ez);
      avatarRef.current.rotation.y = heading.current; // face the walk direction
      avatarRef.current.visible = dist.current > 0.6; // hidden in first person
    }
  });

  if (!avatar) return null;
  return (
    <group ref={avatarRef} visible={false}>
      <primitive object={avatar} />
    </group>
  );
}

// Animated sky: drives the sun (position/colour/intensity), ambient + hemisphere
// fill, the scene background and fog through a day-night loop, and a weather
// state machine (clear → overcast → rain) that dims the light and thickens the
// fog. Reports a clock/icon sample upward for the HUD. Rain particles render in
// play mode only (see Rain).
function SkyAndWeather({ play, onSample, districtSky }) {
  const { scene } = useThree();
  const sun = useRef();
  const amb = useRef();
  const bg = useMemo(() => SKY_DAY.clone(), []);
  const fog = useMemo(() => new THREE.Fog(SKY_DAY.getHex(), 50, 340), []);
  const cloudEase = useRef(0);
  const lastHud = useRef(0);
  // Per-district sky wash: ease a current tint toward the target district colour
  // and blend it over the day/night sky so each quarter has its own atmosphere.
  const tintTarget = useMemo(() => new THREE.Color('#cdd8ea'), []);
  const tintCur = useMemo(() => new THREE.Color('#cdd8ea'), []);
  useEffect(() => { if (districtSky) tintTarget.set(districtSky); }, [districtSky, tintTarget]);

  useEffect(() => {
    scene.background = bg;
    return () => { scene.background = null; };
  }, [scene, bg]);
  useEffect(() => {
    scene.fog = play ? fog : null;
    return () => { scene.fog = null; };
  }, [scene, fog, play]);

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    const phase = dayPhaseAt(t);
    const elev = sunElevationAt(phase);          // -1 (midnight) .. 1 (noon)
    const dayAmt = Math.max(0, Math.min(1, elev * 1.6 + 0.15)); // 0 night .. 1 day
    const w = weatherAt(t);
    cloudEase.current += (w.cloud - cloudEase.current) * Math.min(1, dt * 0.7);
    const cloud = cloudEase.current;

    // Sun position: arc across the sky; intensity/colour by elevation + weather.
    if (sun.current) {
      const az = phase * Math.PI * 2;
      sun.current.position.set(Math.cos(az) * 160, Math.max(8, elev * 170 + 25), Math.sin(az) * 160);
      sun.current.intensity = (0.12 + Math.max(0, elev) * 1.5) * (1 - cloud * 0.62);
      sun.current.color.copy(SUN_WARM).lerp(SUN_NOON, Math.max(0, Math.min(1, elev * 2)));
    }
    if (amb.current) amb.current.intensity = (0.2 + dayAmt * 0.4) * (1 - cloud * 0.25) + cloud * 0.08;

    // Background: night→day, warmed near the horizon at dawn/dusk, greyed when
    // overcast.
    bg.copy(SKY_NIGHT).lerp(SKY_DAY, Math.max(0, Math.min(1, (elev + 0.15) / 0.5)));
    const horizon = Math.max(0, 1 - Math.abs(elev) / 0.22);
    if (horizon > 0 && elev > -0.25) bg.lerp(SKY_DUSK, horizon * 0.6);
    if (cloud > 0) bg.lerp(SKY_OVERCAST, cloud * 0.55 * dayAmt);
    // District wash — only by day (night keeps its deep blue), eased smoothly.
    if (play && districtSky) {
      tintCur.lerp(tintTarget, Math.min(1, dt * 0.8));
      bg.lerp(tintCur, 0.32 * dayAmt);
    }
    fog.color.copy(bg);
    // Fog tightens at night and in rain so the far map fades naturally.
    const rainAmt = w.rain ? cloud : 0;
    fog.near = 50 - cloud * 18;
    fog.far = 340 - (1 - dayAmt) * 120 - rainAmt * 150;

    // HUD sample ~2/sec.
    if (onSample && t - lastHud.current > 0.5) {
      lastHud.current = t;
      const hrs = (phase * 24) % 24;
      const h = Math.floor(hrs);
      const m = Math.floor((hrs - h) * 60);
      const icon = w.phase === 'rain' ? '🌧️' : w.phase === 'cloud' ? '☁️' : (elev > 0 ? '☀️' : '🌙');
      onSample({ clock: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`, icon });
    }
  });

  return (
    <>
      <ambientLight ref={amb} intensity={0.55} />
      <hemisphereLight args={[0xffffff, 0x6b7a55, 0.45]} />
      <directionalLight
        ref={sun}
        intensity={1.4}
        castShadow
        shadow-mapSize-width={4096}
        shadow-mapSize-height={4096}
        shadow-camera-left={-365}
        shadow-camera-right={365}
        shadow-camera-top={365}
        shadow-camera-bottom={-365}
        shadow-camera-near={10}
        shadow-camera-far={1300}
        shadow-bias={-0.0002}
        shadow-normalBias={0.6}
      />
      {play && <Rain />}
    </>
  );
}

// Camera-following rain: a cloud of falling points kept centred on the player so
// it always rains around you. Opacity follows the weather so it fades in/out
// with the rain phase (no mount/unmount churn).
function Rain({ count = 2200, area = 46, height = 34, streak = 0.85 }) {
  const { camera } = useThree();
  const ref = useRef();
  const vy = useRef(new Float32Array(count));
  // Each drop is a short vertical line segment (top + bottom vertex) so it reads
  // as a falling streak, not a dot.
  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 2 * 3);
    for (let i = 0; i < count; i += 1) {
      const x = (Math.random() - 0.5) * area;
      const z = (Math.random() - 0.5) * area;
      const top = Math.random() * height;
      const o = i * 6;
      pos[o] = x; pos[o + 1] = top; pos[o + 2] = z;
      pos[o + 3] = x; pos[o + 4] = top - streak; pos[o + 5] = z;
      vy.current[i] = 55 + Math.random() * 35;
    }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return g;
  }, [count, area, height, streak]);
  const mat = useMemo(() => new THREE.LineBasicMaterial({
    color: '#dbe9f7', transparent: true, opacity: 0, depthWrite: false,
  }), []);
  useEffect(() => () => { geom.dispose(); mat.dispose(); }, [geom, mat]);

  useFrame((state, dt) => {
    const w = weatherAt(state.clock.elapsedTime);
    mat.opacity += ((w.rain ? 0.7 : 0) - mat.opacity) * Math.min(1, dt * 0.8);
    const seg = ref.current;
    if (!seg) return;
    seg.visible = mat.opacity > 0.02;
    if (!seg.visible) return;
    const p = geom.attributes.position.array;
    for (let i = 0; i < count; i += 1) {
      const o = i * 6;
      const d = vy.current[i] * dt;
      p[o + 1] -= d; p[o + 4] -= d;
      if (p[o + 1] < 0) {
        const x = (Math.random() - 0.5) * area;
        const z = (Math.random() - 0.5) * area;
        p[o] = x; p[o + 1] = height; p[o + 2] = z;
        p[o + 3] = x; p[o + 4] = height - streak; p[o + 5] = z;
      }
    }
    geom.attributes.position.needsUpdate = true;
    // Streaks fall from above the player down to the street, following xz.
    seg.position.set(camera.position.x, 0, camera.position.z);
  });

  return <lineSegments ref={ref} geometry={geom} material={mat} frustumCulled={false} />;
}

function City({ plots, ownedRows, layout, selectedKey, onSelectPlot, interactive = true, downPos, onReady }) {
  const deeds = useMemo(() => ownedRows.filter((p) => p.tier === 'Landmark'), [ownedRows]);
  // Build the terrain heightmap before the scene's instance matrices are applied,
  // so every prop/tile/building lands on the right ground height.
  useMemo(() => configureTerrain(layout), [layout]);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- positions are stable; rebuild on map/count only
  const plan = useMemo(() => computeScene(plots, deeds, layout), [layout, plots.length, deeds.length]);
  // A foundation plinth under any building whose footprint straddles a slope, so
  // houses stand on solid flat-topped ground instead of floating or sinking into
  // the hill. Runs after configureTerrain above, so the heightfield is ready.
  const foundations = useMemo(() => {
    const out = [];
    for (const [file, g] of Object.entries(plan.groups)) {
      if (isBillboard(file) || !isBuildingFile(file)) continue;
      for (const inst of g.inst) {
        const half = buildingHalf(file, inst[3]);
        const { top, bottom } = footprintLevels(inst[0], inst[1], half);
        if (top - bottom > 0.1) out.push([inst[0], inst[1], inst[2], half, top, bottom]);
      }
    }
    return out;
  }, [plan]);
  const owned = useMemo(() => ownedRows.filter((p) => p.owner), [ownedRows]);
  const selectedPos = useMemo(() => {
    if (!selectedKey) return null;
    const [sx, sy] = selectedKey.split(',').map(Number);
    return Number.isFinite(sx) && Number.isFinite(sy) ? [sx, sy] : null;
  }, [selectedKey]);
  const pickCb = useCallback((key) => onSelectPlot?.(key), [onSelectPlot]);
  // In walk mode (interactive=false) plots aren't clickable — a click locks the
  // pointer for mouse-look instead. Buying happens from the overview.
  const pick = interactive ? pickCb : undefined;

  // Models have resolved (we're past Suspense) and instances are committed —
  // signal ready so the loading overlay can hide (don't rely on the loader's
  // duplicate-texture progress count, which never reaches "done").
  useEffect(() => { onReady(); }, [onReady]);

  return (
    <group>
      <Island w={plan.islandW} d={plan.islandD} />
      <MountainRing islandW={plan.islandW} islandD={plan.islandD} />
      <RiverLayer cells={plan.waterCells} />
      <Bridges layout={layout} />
      <TileLayer cells={plan.pavedCells} color="#d8cdb6" y={0.045} />
      <TileLayer cells={plan.sandCells} color="#e8d8a8" y={0.035} />
      <TileLayer cells={plan.concreteCells} color="#a8a49a" y={0.04} />
      <TileLayer cells={plan.cobbleCells} color="#c2b194" y={0.042} />
      <TileLayer cells={plan.centerPaveCells} color="#bdb6ab" y={0.03} />
      <SidewalkLayer items={plan.sidewalks} />
      <FieldLayer cells={plan.fieldCells} />
      <FoundationLayer items={foundations} />
      <CityLife layout={layout} originX={plan.originX} originZ={plan.originZ} islandW={plan.islandW} islandD={plan.islandD} />
      <PlotClickLayer items={plan.clickCells} originX={plan.originX} originZ={plan.originZ} onPick={pick} downPos={downPos} />
      <FadeDriver active={interactive} />
      {Object.entries(plan.groups).map(([file, g]) => {
        const clickable = g.pick.some((x) => x != null);
        const onPick = clickable ? pick : undefined;
        if (isProcKey(file)) {
          // Themed-district buildings: hand-authored vertex-coloured geometry,
          // instanced through the shared procedural material (no GLTF/normalise).
          return <ProceduralInstances key={file} geometry={PROC_BUILDINGS.get(file)} instances={g.inst} pick={g.pick} onPick={onPick} downPos={downPos} building />;
        }
        if (isBillboard(file)) {
          return <BillboardInstances key={file} url={modelUrl(file)} instances={g.inst} pick={g.pick} onPick={onPick} downPos={downPos} />;
        }
        const [normMode, normV] = normFor(file);
        // Buildings melt away near the camera in the zoomed overview; roads,
        // nature and street props never fade.
        const fade = isBuildingFile(file);
        if (MULTI_MAT.has(file)) {
          // Multi-material buildings (Quaternius) keep every colour via per-
          // material instanced meshes that share one set of transforms.
          return <MultiMatInstancedModel key={file} url={modelUrl(file)} normMode={normMode} normV={normV} instances={g.inst} pick={g.pick} onPick={onPick} downPos={downPos} fade={fade} building={fade} />;
        }
        return (
          <InstancedModel
            key={file}
            url={modelUrl(file)}
            normMode={normMode}
            normV={normV}
            instances={g.inst}
            pick={g.pick}
            onPick={onPick}
            downPos={downPos}
            fade={fade}
            ground={GROUND_TILE_FILES.has(file)}
            building={fade && !GROUND_TILE_FILES.has(file)}
            sway={(TREES.includes(file) && !PINES.includes(file)) || BUSHES.includes(file)}
          />
        );
      })}
      {plan.specials.map((s, i) => (
        <SpecialLandmark key={`spec-${i}`} url={modelUrl(s.file)} x={s.x} z={s.z} rotY={s.rotY} height={s.height} />
      ))}
      <Balloon islandW={plan.islandW} />
      {owned.map((p) => (
        <OwnerMarker key={p.id} p={p} originX={plan.originX} originZ={plan.originZ} />
      ))}
      {selectedPos && (
        <mesh position={[selectedPos[0] * TILE - plan.originX, 0.16, selectedPos[1] * TILE - plan.originZ]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[TILE * 0.5, TILE * 0.64, 28]} />
          <meshBasicMaterial color={0xffd400} side={THREE.DoubleSide} transparent opacity={0.95} />
        </mesh>
      )}
    </group>
  );
}

// Keep the camera inside the world: pan is clamped well short of the edges and
// the minimum zoom never lets the whole map fit on screen (immersion rule).
function CameraLimits({ gridW }) {
  useFrame((state) => {
    // DEV: expose the live r3f state so local tooling can drive the overview
    // camera for verification screenshots. No-op in prod.
    if (import.meta.env.DEV) window.__estate = state;
    const c = state.controls;
    if (!c) return;
    const half = (gridW * TILE) / 2;
    const limit = half - 24;
    const before = { x: c.target.x, z: c.target.z };
    c.target.x = Math.min(limit, Math.max(-limit, c.target.x));
    c.target.z = Math.min(limit, Math.max(-limit, c.target.z));
    if (c.target.x !== before.x || c.target.z !== before.z) c.update();
    // Dynamic floor: visible width may never exceed ~55% of the island.
    const minZoom = state.size.width / (0.55 * gridW * TILE);
    if (c.minZoom !== minZoom) c.minZoom = Math.max(4, minZoom);
  });
  return null;
}

// The mountain range enclosing the world — two staggered rows of huge Kenney
// cliff blocks just past the coastline, closing off the horizon.
function MountainRing({ islandW, islandD }) {
  const placements = useMemo(() => {
    const out = CLIFFS.map(() => []);
    const hw = islandW / 2; const hd = islandD / 2;
    const step = 8;
    let i = 0;
    const ringAt = (x, z, row) => {
      const h = hashCell(Math.round(x * 3 + row * 7), Math.round(z * 3 - row * 5));
      const pad = 26 + row * 17 + (h % 12);
      const px = x === 0 ? (((h >>> 5) % 100) / 100 - 0.5) * 18 + x : x + Math.sign(x) * pad;
      const pz = z === 0 ? (((h >>> 7) % 100) / 100 - 0.5) * 18 + z : z + Math.sign(z) * pad;
      const scale = 0.7 + ((h >>> 9) % 90) / 100;
      out[h % CLIFFS.length].push([px, pz, ((h >>> 4) % 4) * (Math.PI / 2), scale]);
    };
    for (let x = -hw; x <= hw; x += step) {
      ringAt(x, -hd, 0); ringAt(x, hd, 0);
      ringAt(x + step / 2, -hd, 1); ringAt(x + step / 2, hd, 1);
      if (i % 2 === 0) { ringAt(x + step / 3, -hd, 2); ringAt(x + step / 3, hd, 2); }
      i += 1;
    }
    for (let z = -hd + step; z <= hd - step; z += step) {
      ringAt(-hw, z, 0); ringAt(hw, z, 0);
      ringAt(-hw, z + step / 2, 1); ringAt(hw, z + step / 2, 1);
      if (i % 2 === 0) { ringAt(-hw, z + step / 3, 2); ringAt(hw, z + step / 3, 2); }
      i += 1;
    }
    return out;
  }, [islandW, islandD]);
  return (
    <group>
      {CLIFFS.map((file, idx) => (
        <MountainModel key={file} file={file} placements={placements[idx]} />
      ))}
    </group>
  );
}

function MountainModel({ file, placements }) {
  const { scene } = useGLTF(modelUrl(file));
  const [normMode, normV] = normFor(file);
  const data = useMemo(() => extractGeoMat(scene, normMode, normV), [scene, normMode, normV]);
  const ref = useRef();
  useEffect(() => {
    const mesh = ref.current;
    if (!mesh || !placements.length) return;
    const m = new THREE.Matrix4();
    const p = new THREE.Vector3();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3();
    for (let i = 0; i < placements.length; i += 1) {
      const [x, z, rotY, sc] = placements[i];
      p.set(x, -0.4, z); // feet in the sea
      q.setFromAxisAngle(Y_AXIS, rotY);
      s.set(sc, sc, sc);
      m.compose(p, q, s);
      mesh.setMatrixAt(i, m);
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [placements, data]);
  if (!data || !placements.length) return null;
  return <instancedMesh ref={ref} args={[data.geometry, data.material, placements.length]} frustumCulled={false} />;
}

// Auto-tiling table: 4-neighbour road bitmask (N=1, E=2, S=4, W=8) → which
// KayKit piece + rotation. rot 0 of road_straight runs along z; the corner at
// rot 0 is assumed to join S+E and the T-split to join N+S+E — both verified
// against the pack visually (adjust here if a piece ever looks twisted).
const HPI = Math.PI / 2;
const ROAD_TILE_BY_MASK = {
  0: ['s', 0], 1: ['s', 0], 4: ['s', 0], 5: ['s', 0],
  2: ['s', HPI], 8: ['s', HPI], 10: ['s', HPI],
  6: ['c', 0], 3: ['c', HPI], 9: ['c', Math.PI], 12: ['c', 3 * HPI],
  7: ['t', 0], 11: ['t', HPI], 13: ['t', Math.PI], 14: ['t', 3 * HPI],
  15: ['j', 0],
};

// Both downtown centres (west core + east-bank core) and the radius that counts
// as "dense centre". Shared by computeScene and buildCollision so they agree on
// where the tight tower checkerboard + paving applies.
function cityCenters(L) {
  const ccc = L.districtGeo?.cc ?? (L.gridW - 1) / 2;
  const cc2 = L.districtGeo?.cc2 || null;
  const R = (L.districtGeo?.radii || []).reduce((m, [r, n]) => (n === 'Commerce' ? r : m), 80);
  return { ccc, cc2, R };
}

// Organic building placement — shared by computeScene (where a building is
// DRAWN) and buildCollision (where the cell is marked SOLID) so the two can
// never disagree. Instead of a perfect checkerboard / every-4th-cell grid, the
// modern city uses a hash-jittered, staggered lattice with cells swapped in and
// out, so the streetscape reads as an irregular real city. Heritage / Old Town
// keeps its own clean grid (handled by the caller).
function isBuildingCell(x, y, center) {
  const h = hashCell(x, y);
  if (center) {
    // downtown: most of the checkerboard plus a few off-cells → towers cluster
    return (x + y) % 2 === 0 ? (h % 100) >= 14 : (h % 100) < 12;
  }
  // stagger each row & column by a hash so blocks don't line up, then swap
  // ~1-in-6 cells in/out so the frontages scatter naturally.
  const jx = hashCell(0, y) & 1;
  const jy = hashCell(x, 0) & 1;
  const onLattice = ((x + jx) & 1) === 0 && ((y + jy) & 1) === 0;
  return onLattice ? (h % 100) >= 17 : (h % 100) < 9;
}

// Build instance lists grouped by model file. Each instance = [x, z, rotY, scale].
// The layout arrives as a per-cell type map from the backend's organic city
// plan ('.'=plot, R=road, P=pedestrian paving, C=civic, K=park, W=river):
// roads auto-tile from their neighbours (straights, curved corners, T-splits,
// junctions), so the irregular network — ring road, river bridges, dead-ends —
// renders correctly without any grid assumptions.
function computeScene(plots, deeds, L) {
  const { gridW, gridH, cells, plazaC = (gridW - 1) / 2, plazaR = 5, artLandmarks = [], landmarks = [] } = L;
  const originX = ((gridW - 1) * TILE) / 2;
  const originZ = ((gridH - 1) * TILE) / 2;
  const wx = (x) => x * TILE - originX;
  const wz = (y) => y * TILE - originZ;
  const grid = cells.split('\n');
  const at = (x, y) => (x >= 0 && x < gridW && y >= 0 && y < gridH ? grid[y][x] : ' ');
  const groups = {};
  const waterCells = [];
  const pavedCells = [];
  const sandCells = [];
  const fieldCells = [];
  const concreteCells = [];
  const cobbleCells = [];
  const centerPaveCells = []; // urban paving over the whole dense centre (no grass)
  const sidewalks = []; // [worldX, worldZ, rotY] raised footpaths flanking roads
  const clickCells = []; // [worldX, worldZ, key] for the universal click layer
  // The dense modern core (Finance + Commerce rings): paved over, no grass, and
  // buildings packed onto a tight checkerboard instead of every 4th cell.
  const { ccc, cc2, R: CENTER_R } = cityCenters(L);
  const isCenter = (x, y) => Math.max(Math.abs(x - ccc), Math.abs(y - ccc)) <= CENTER_R
    || (cc2 && Math.max(Math.abs(x - cc2.x), Math.abs(y - cc2.y)) <= CENTER_R);
  const add = (file, x, z, rotY = 0, scale = 1, pickId = null) => {
    if (file == null) return;
    const g = groups[file] || (groups[file] = { inst: [], pick: [] });
    g.inst.push([x, z, rotY, scale]);
    g.pick.push(pickId);
  };
  const rotAny = (h) => (h % 360) * (Math.PI / 180);
  // h can exceed 2^31; mod-and-wrap keeps the index in range even if a caller
  // passes a (signed-shifted) negative value.
  const pick = (list, h) => list[(((h % list.length) + list.length) % list.length)];

  const roadMask = (x, y) => (at(x, y - 1) === 'R' ? 1 : 0) | (at(x + 1, y) === 'R' ? 2 : 0)
    | (at(x, y + 1) === 'R' ? 4 : 0) | (at(x - 1, y) === 'R' ? 8 : 0);
  const bitCount = (m) => ((m & 1) + ((m >> 1) & 1) + ((m >> 2) & 1) + ((m >> 3) & 1));

  // Buildings face the nearest street (or pick a stable random facing).
  const faceRoad = (x, y, h) => {
    if (at(x, y - 1) === 'R') return 0;
    if (at(x + 1, y) === 'R') return HPI;
    if (at(x, y + 1) === 'R') return Math.PI;
    if (at(x - 1, y) === 'R') return 3 * HPI;
    if (at(x, y - 2) === 'R') return 0;
    if (at(x + 2, y) === 'R') return HPI;
    if (at(x, y + 2) === 'R') return Math.PI;
    if (at(x - 2, y) === 'R') return 3 * HPI;
    return (h % 4) * HPI;
  };

  const inArtZone = (x, y) => artLandmarks.some((a) => x >= a.ax && x < a.ax + 4 && y >= a.ay && y < a.ay + 4);
  const ringDist = (x, y) => Math.max(Math.abs(x - plazaC), Math.abs(y - plazaC));

  // A clickable garden lot: a tree or bush (carries the plot id) + maybe a small
  // decorative flower/rock nearby.
  const placeGarden = (x, y, h, pickId) => {
    const big = (h % 100 < 72) ? pick(TREES, h) : pick(BUSHES, h >>> 2);
    add(big, wx(x), wz(y), rotAny(h), 0.55 + (h % 25) / 100, pickId);
    if (h % 6 === 0) add(pick(SMALL_DECOR, h >>> 5), wx(x) + 0.45, wz(y) - 0.35, rotAny(h >>> 7), 0.7, null);
  };

  // Dense, lived-in fill for the gaps between buildings. Walk mode means we no
  // longer keep the city sparse for the isometric view, so empty lots become a
  // busy streetscape: kerbside parked cars, pocket gardens, benches with flowers,
  // flower/rock beds and the odd pine. Most of it is non-swaying decor (cars,
  // props, flowers, pines) to keep per-frame cost down; ~a fifth is leafy
  // greenery, ~a fifth stays open so the streets can breathe. The primary object
  // carries the plot key so clicking the decor still selects the lot to buy.
  const fillLot = (x, y, h, key) => {
    const roadDir = at(x, y - 1) === 'R' ? 0 : at(x, y + 1) === 'R' ? 2 : at(x + 1, y) === 'R' ? 1 : at(x - 1, y) === 'R' ? 3 : -1;
    const b = h % 100;
    if (roadDir >= 0 && b < 14) {
      // a car parked at the kerb, nosed along the adjacent street
      const off = 0.34 * TILE;
      const ox = roadDir === 1 ? off : roadDir === 3 ? -off : 0;
      const oz = roadDir === 0 ? -off : roadDir === 2 ? off : 0;
      const rot = (roadDir === 1 || roadDir === 3) ? HPI : 0;
      add(pick(CARS, h >>> 3), wx(x) + ox, wz(y) + oz, rot, 1, key);
    } else if (b < 34) {
      placeGarden(x, y, h, key);                                 // leafy pocket
    } else if (b < 50) {
      // a bench / hydrant / bin with a flower beside it
      add(pick(STREET_PROPS, h >>> 3), wx(x) - 0.25, wz(y), rotAny(h >>> 6), 1, key);
      add(pick(SMALL_DECOR, h >>> 9), wx(x) + 0.4, wz(y) + 0.35, rotAny(h >>> 11), 0.7, null);
    } else if (b < 64) {
      // a flower-and-rock bed
      add(pick(SMALL_DECOR, h >>> 4), wx(x) - 0.35, wz(y) - 0.25, 0, 0.7, key);
      add(pick(SMALL_DECOR, h >>> 7), wx(x) + 0.35, wz(y) + 0.25, 0, 0.6, null);
      if (h % 3 === 0) add(pick(ROCKS, h >>> 10), wx(x), wz(y) + 0.4, rotAny(h), 0.4, null);
    } else if (b < 78) {
      add(pick(PINES, h), wx(x), wz(y), rotAny(h), 0.7 + (h % 20) / 100, key); // a hardy street pine (no sway)
    }
    // else (~22%) left open so the streets still breathe
  };

  // ---- buyable plots (client-derived; pick values are "x,y" keys): a 3D
  // building on every OTHER cell so nothing hides behind a tall neighbour.
  // Old Town instead packs grid-aligned sprite storefronts on a checkerboard
  // over cobbles; industrial yards swap gardens for containers and chimneys
  // on concrete; landmark deeds render as the art card itself.
  for (const p of plots) {
    const x = p.gridX; const y = p.gridY;
    const h = hashCell(x, y);
    const industrial = p.tier === 'Industrial';
    const heritage = p.tier === 'Heritage';
    clickCells.push([wx(x), wz(y), p.key]);
    if (industrial) concreteCells.push([wx(x), wz(y)]);
    if (heritage) {
      cobbleCells.push([wx(x), wz(y)]);
      // Real 3D medieval buildings on the checkerboard (no longer flat iso
      // billboards) — a proper old-town quarter you can walk between. The
      // off-cells carry a well/gazebo/market stall or a pocket garden.
      if ((x + y) % 2 === 0) {
        add(pick(HERITAGE_BUILDINGS, h), wx(x), wz(y), faceRoad(x, y, h), 1, p.key);
      } else if (h % 5 === 0) {
        add(pick(MEDIEVAL_PROPS, h >>> 3), wx(x), wz(y), rotAny(h >>> 6), 1, p.key);
      } else if (h % 9 === 0) {
        placeGarden(x, y, h, p.key);
      }
      continue;
    }
    const center = isCenter(x, y);
    if (center) centerPaveCells.push([wx(x), wz(y)]);          // pave over grass
    // Sporadic, real-city placement (see isBuildingCell) instead of a rigid grid.
    const buildHere = isBuildingCell(x, y, center);
    if (buildHere) {
      add(GROUND_FILE, wx(x), wz(y), 0, 1, null);             // paved lot
      // Vary footprint/height so the skyline isn't a uniform comb; towers
      // (downtown / Luxury) get the widest spread for a dramatic silhouette.
      const tall = center || p.tier === 'Luxury';
      const s = tall ? 0.95 + (h % 55) / 100 : 0.9 + (h % 22) / 100;
      add(buildingForTier(p.tier, x, y), wx(x), wz(y), faceRoad(x, y, h), s, p.key);
    } else if (center) {
      // Between the downtown towers: paved plaza-floor with the odd tree/bench,
      // no grass gardens.
      if (h % 6 === 0) add(BENCH_FILE, wx(x), wz(y), rotAny(h >>> 5), 1, p.key);
      else if (h % 6 === 1) add(pick(TREES, h), wx(x), wz(y), rotAny(h), 0.42, p.key);
      else if (h % 6 === 2) add(STREETLIGHT_FILE, wx(x), wz(y), rotAny(h >>> 4), 1, p.key);
    } else if (industrial) {
      if (h % 7 < 2) add(pick(CONTAINERS, h >>> 3), wx(x), wz(y), ((h >>> 6) % 4) * HPI, 1, p.key);
      else if (h % 23 === 3) add(pick(CHIMNEYS, h >>> 4), wx(x), wz(y), 0, 1, p.key);
      else if (h % 19 === 5) add(IND_TANK, wx(x), wz(y), rotAny(h), 1, p.key);
    } else {
      fillLot(x, y, h, p.key);                                // dense, lived-in streetscape
    }
  }

  // Landmark deeds: clickable through the layer too (one pad per deed cell).
  const deedKeyByZone = new Map();
  for (const d of deeds) {
    const key = `${d.gridX},${d.gridY}`;
    deedKeyByZone.set(key, key);
    clickCells.push([wx(d.gridX), wz(d.gridY), key]);
  }

  // ---- fixed infrastructure, cell by cell -----------------------------------
  for (let y = 0; y < gridH; y += 1) {
    for (let x = 0; x < gridW; x += 1) {
      const cell = at(x, y);
      const h = hashCell(x, y);

      if (cell === 'R') {
        const mask = roadMask(x, y);
        const [kind, rot] = ROAD_TILE_BY_MASK[mask];
        if (kind === 'j') {
          add(ROAD_JUNCTION_FILE, wx(x), wz(y), 0, 1, null);
          if (h % 3 === 0) { // a traffic light on one corner of some junctions
            const q = (h >>> 4) % 4;
            const sx = q === 0 || q === 3 ? 1 : -1;
            const sz = q < 2 ? 1 : -1;
            add(pick(TRAFFICLIGHT_FILES, h >>> 6), wx(x) + sx * 0.38 * TILE, wz(y) + sz * 0.38 * TILE, q * HPI, 1, null);
          }
        } else if (kind === 'c') {
          add(ROAD_CORNER_FILE, wx(x), wz(y), rot, 1, null);
        } else if (kind === 't') {
          add(ROAD_TSPLIT_FILE, wx(x), wz(y), rot, 1, null);
        } else {
          const vertical = rot === 0; // runs along z
          // Pedestrians cross where the rambla meets the street, and beside
          // junctions/T-splits — paint a zebra there.
          const pedAdjacent = at(x, y - 1) === 'P' || at(x + 1, y) === 'P' || at(x, y + 1) === 'P' || at(x - 1, y) === 'P';
          const bigNeighbour = bitCount(roadMask(x, y - 1)) >= 3 || bitCount(roadMask(x + 1, y)) >= 3
            || bitCount(roadMask(x, y + 1)) >= 3 || bitCount(roadMask(x - 1, y)) >= 3;
          const zebra = pedAdjacent || (bigNeighbour && h % 2 === 0);
          add(zebra ? ROAD_CROSSING_FILE : ROAD_FILE, wx(x), wz(y), rot, 1, null);
          // Footpaths: a raised kerb strip on each side of the road that borders
          // something other than more road/water — a path to walk along.
          const walkable = (nx, ny) => { const c = at(nx, ny); return c !== 'R' && c !== 'W' && c !== ' '; };
          const EDGE = 0.46 * TILE;
          if (vertical) {
            if (walkable(x - 1, y)) sidewalks.push([wx(x) - EDGE, wz(y), 0]);
            if (walkable(x + 1, y)) sidewalks.push([wx(x) + EDGE, wz(y), 0]);
          } else {
            if (walkable(x, y - 1)) sidewalks.push([wx(x), wz(y) - EDGE, HPI]);
            if (walkable(x, y + 1)) sidewalks.push([wx(x), wz(y) + EDGE, HPI]);
          }
          if (!zebra) {
            const side = (h >>> 2) % 2 ? 1 : -1;
            const off = 0.42 * TILE * side;
            const px = wx(x) + (vertical ? off : 0);
            const pz = wz(y) + (vertical ? 0 : off);
            const facing = vertical ? (side === 1 ? -HPI : HPI) : (side === 1 ? Math.PI : 0);
            // A busy kerb: lamps, street furniture, signs and parked cars — ~4 of
            // every 7 stretches of road now carry something.
            const m = h % 7;
            if (m === 0) add(STREETLIGHT_FILE, px, pz, facing, 1, null);
            else if (m === 1) add(pick(STREET_PROPS, h >>> 4), px, pz, rotAny(h >>> 6), 1, null);
            else if (m === 2) add(pick(SIGNS, h >>> 5), px, pz, facing, 1, null);
            else if (m === 3) add(pick(CARS, h >>> 6), px, pz, vertical ? 0 : HPI, 1, null);
          }
        }
      } else if (cell === 'P') {
        // Pedestrian paving — the grand plaza and the rambla boulevard. Not the
        // KayKit base tile (it's grass-coloured and vanishes into the lawn):
        // PavingLayer draws these cells as warm sandstone instead.
        pavedCells.push([wx(x), wz(y)]);
        const inPlaza = ringDist(x, y) <= plazaR;
        if (inPlaza) {
          // A busy public square — benches, lamps, planter trees and flowers —
          // but keep the very heart open for the monuments.
          if (ringDist(x, y) >= 2) {
            const m = h % 5;
            if (m === 0) add(BENCH_FILE, wx(x), wz(y), rotAny(h >>> 5), 1, null);
            else if (m === 1) add(STREETLIGHT_FILE, wx(x), wz(y), rotAny(h >>> 4), 1, null);
            else if (m === 2) add(pick(TREES, h), wx(x), wz(y), rotAny(h), 0.5, null);
            else if (m === 3) add(pick(FLOWERS, h >>> 6), wx(x), wz(y), rotAny(h), 0.9, null);
          }
        } else {
          // Rambla: a dense boulevard of planter trees, benches, lamps and flowers.
          const m = (x + y) % 4;
          if (m === 0) add(pick(TREES, h), wx(x), wz(y), rotAny(h), 0.5, null);
          else if (m === 1) add(BENCH_FILE, wx(x), wz(y), rotAny(h >>> 5), 1, null);
          else if (m === 2) add(STREETLIGHT_FILE, wx(x), wz(y), rotAny(h >>> 4), 1, null);
          else if (h % 6 === 0) add(pick(FLOWERS, h >>> 7), wx(x), wz(y), rotAny(h), 0.85, null);
        }
      } else if (cell === 'C') {
        // Civic core — the dense modern downtown. Towers on a tight checkerboard
        // (kept a couple of rings off the very centre so the monuments breathe),
        // varied across the whole TOWERS pool; the gaps get benches, lamps and
        // planter trees so the streets between the skyscrapers feel alive.
        add(GROUND_FILE, wx(x), wz(y), 0, 1, null);
        if ((x + y) % 2 === 0 && ringDist(x, y) >= 3) {
          add(pick(CIVIC_POOL, h), wx(x), wz(y), (h % 4) * HPI, 0.95 + (h % 60) / 100, null);
        } else if (h % 4 === 0) {
          add(BENCH_FILE, wx(x), wz(y), rotAny(h >>> 6), 1, null);
        } else if (h % 5 === 1) {
          add(STREETLIGHT_FILE, wx(x), wz(y), rotAny(h >>> 5), 1, null);
        } else if (h % 7 === 2) {
          add(pick(TREES, h), wx(x), wz(y), rotAny(h), 0.5, null);
        }
      } else if (cell === 'K') {
        if (inArtZone(x, y)) {
          // Landmark clearing: a sandstone apron under the whole stage (no
          // grass for the art's edge pixels to fringe against), trees framing
          // the corners, centre open for the card.
          pavedCells.push([wx(x), wz(y)]);
          const a = artLandmarks.find((z) => x >= z.ax && x < z.ax + 4 && y >= z.ay && y < z.ay + 4);
          const lx = x - a.ax; const ly = y - a.ay;
          if ((lx === 0 || lx === 3) && (ly === 0 || ly === 3)) {
            add(pick(TREES, h), wx(x), wz(y), rotAny(h), 0.6, null);
          }
        } else {
          // Lush park: mostly greenery, with flower beds, the odd rock, and a
          // bench or lamp on the path.
          const m = h % 10;
          if (m < 6) {
            const big = (h % 100 < 60) ? pick(TREES, h) : (h % 100 < 85 ? pick(BUSHES, h >>> 2) : pick(ROCKS, h >>> 3));
            add(big, wx(x), wz(y), rotAny(h), 0.8 + (h % 35) / 100, null);
          } else if (m < 8) {
            add(pick(SMALL_DECOR, h >>> 4), wx(x), wz(y), rotAny(h), 0.85, null);
          } else if (m === 8) {
            add(pick(STREET_PROPS, h >>> 5), wx(x), wz(y), rotAny(h >>> 7), 1, null);
          }
        }
      } else if (cell === 'W') {
        waterCells.push([wx(x), wz(y)]);
      } else if (cell === 'S') {
        // The beach: sand underlay + scattered palms; landmark stages on the
        // sand keep their centre clear with palms on the corners.
        sandCells.push([wx(x), wz(y)]);
        if (inArtZone(x, y)) {
          const a = artLandmarks.find((z) => x >= z.ax && x < z.ax + 4 && y >= z.ay && y < z.ay + 4);
          const lx = x - a.ax; const ly = y - a.ay;
          if ((lx === 0 || lx === 3) && (ly === 0 || ly === 3)) {
            add(pick(PALMS, h), wx(x), wz(y), rotAny(h), 0.85, null);
          }
        } else if (h % 19 === 0) {
          add(pick(PALMS, h), wx(x), wz(y), rotAny(h), 0.75 + (h % 40) / 100, null);
        } else if (h % 43 === 1) {
          add(pick(ROCKS, h >>> 3), wx(x), wz(y), rotAny(h), 0.5, null);
        }
      } else if (cell === 'F') {
        // Farmland: crop tiles (coloured per patch by FieldLayer), sprite
        // crops/hay from the isometric farm pack, and the odd farmhouse.
        fieldCells.push([wx(x), wz(y), hashCell((x / 8) | 0, (y / 6) | 0)]);
        if (h % 97 === 0) {
          add(GROUND_FILE, wx(x), wz(y), 0, 1, null);
          add(buildingForTier('Starter', x, y), wx(x), wz(y), rotAny(h >>> 5), 1, null);
        } else if (h % 17 === 2) {
          add(pick(FARM_ART, h >>> 4), wx(x), wz(y), BILLBOARD_FACING, FARM_SCALE, null);
        } else if (h % 23 === 5) {
          add(pick(FARM_ANIMALS, h >>> 4), wx(x), wz(y), rotAny(h >>> 7), 1, null); // grazing livestock
        }
      } else if (cell === 'T') {
        // Pine forest, with clearings and the odd deer/fox.
        if (h % 10 < 7) add(pick(PINES, h), wx(x), wz(y), rotAny(h), 0.8 + (h % 45) / 100, null);
        else if (h % 29 === 0) add(pick(ROCKS, h >>> 3), wx(x), wz(y), rotAny(h), 0.7 + (h % 30) / 100, null);
        else if (h % 31 === 3) add(pick(FOREST_ANIMALS, h >>> 4), wx(x), wz(y), rotAny(h >>> 7), 1, null);
        else if (h % 13 === 0) add(pick(BUSHES, h >>> 2), wx(x), wz(y), rotAny(h), 0.7, null);
      } else if (cell === 'G') {
        // Open countryside: sparse, calm — grazing animals dot the fields.
        if (h % 41 === 0) add(pick(BUSHES, h >>> 2), wx(x), wz(y), rotAny(h), 0.6 + (h % 25) / 100, null);
        else if (h % 97 === 3) add(pick(TREES, h), wx(x), wz(y), rotAny(h), 0.7 + (h % 30) / 100, null);
        else if (h % 53 === 7) add(pick(ANIMALS, h >>> 4), wx(x), wz(y), rotAny(h >>> 7), 1, null);
        else if (h % 61 === 5) add(pick(SMALL_DECOR, h >>> 4), wx(x), wz(y), rotAny(h >>> 6), 0.6, null);
      }
    }
  }

  // The player-art landmark cards, centred on their clearings. Beach stages get
  // the beach art (the tiki/resort image); city stages cycle the rest. Each
  // card carries its deed's coordinate key, so clicking the art opens the menu.
  const beachArt = CUSTOM_IMAGES.filter((f) => /012/.test(f));
  const cityArt = CUSTOM_IMAGES.filter((f) => !/012/.test(f));
  let cityIdx = 0; let beachIdx = 0;
  for (const a of artLandmarks) {
    const img = a.kind === 'beach' && beachArt.length
      ? beachArt[beachIdx++ % beachArt.length]
      : cityArt[cityIdx++ % Math.max(1, cityArt.length)];
    add(img, wx(a.x), wz(a.y), BILLBOARD_FACING, BILLBOARD_SCALE, deedKeyByZone.get(`${a.ax + 1},${a.ay + 1}`) ?? null);
  }

  // Tree line around the island margin — except along the beaches, which stay
  // open to the sea.
  const edge = 2;
  const clampX = (v) => Math.min(gridW - 1, Math.max(0, v));
  for (let x = -edge; x < gridW + edge; x += 2) {
    for (const yy of [-edge, gridH + edge - 1]) {
      if (at(clampX(x), yy < 0 ? 0 : gridH - 1) === 'S') continue;
      const h = hashCell(x, yy);
      add(pick(TREES, h), wx(x), wz(yy), rotAny(h), 0.9 + (h % 30) / 100, null);
    }
  }
  for (let y = 0; y < gridH; y += 2) {
    for (const xx of [-edge, gridW + edge - 1]) {
      if (at(xx < 0 ? 0 : gridW - 1, y) === 'S') continue;
      const h = hashCell(xx, y);
      add(pick(TREES, h), wx(xx), wz(y), rotAny(h), 0.9 + (h % 30) / 100, null);
    }
  }

  // Landmark skyscrapers — oversized signature towers at the corners of EACH
  // downtown core (west bank + east bank), so both skylines have a unique,
  // recognisable silhouette rising above the surrounding tower field.
  {
    const cores = [{ x: plazaC, y: plazaC, r: plazaR }];
    if (L.eastCenter) cores.push({ x: L.eastCenter.x, y: L.eastCenter.y, r: 4 });
    cores.forEach((core, ci) => {
      const off = (core.r + 3) * TILE;
      const corners = [[-off, -off], [off, -off], [-off, off], [off, off]];
      const cxw = wx(core.x); const czw = wz(core.y);
      corners.forEach(([dx, dz], i) => {
        const file = LANDMARK_TOWERS[(i + ci * 2) % LANDMARK_TOWERS.length];
        add(GROUND_FILE, cxw + dx, czw + dz, 0, 1.6, null);
        add(file, cxw + dx, czw + dz, (i % 4) * HPI, 1.7, null); // 1.7× = supertall
      });
    });
  }

  // Plaza monuments: the watertower landmark plus a rock-and-flowers "fountain".
  for (const l of landmarks) {
    if (l.type === 'watertower') {
      add(WATERTOWER_FILE, wx(l.x), wz(l.y), 0, 1.2, null);
    } else {
      add(pick(ROCKS, hashCell(l.x | 0, l.y | 0)), wx(l.x), wz(l.y), 0, 1.4, null);
      for (let i = 0; i < 6; i += 1) {
        const a = (i / 6) * Math.PI * 2;
        add(pick(SMALL_DECOR, i), wx(l.x) + Math.cos(a) * 1.1, wz(l.y) + Math.sin(a) * 1.1, a, 0.6, null);
      }
    }
  }

  // One-off flair landmarks (lighthouse, ferris wheel, windmill, fountain),
  // placed deterministically from the layout and mapped to world coordinates.
  const specials = computeSpecials(L).map((s) => ({ ...s, x: wx(s.gridX), z: wz(s.gridY) }));

  return {
    originX,
    originZ,
    islandW: gridW * TILE + 28,
    islandD: gridH * TILE + 28,
    groups,
    waterCells,
    pavedCells,
    sandCells,
    fieldCells,
    concreteCells,
    cobbleCells,
    centerPaveCells,
    sidewalks,
    clickCells,
    specials,
  };
}

// Walk-mode collision: a set of solid grid cells ("x,y"). Mirrors where
// computeScene puts solid objects — a building on a plot cell (alternating
// cells; Old Town uses a checkerboard), a civic tower, or water. Keep this in
// sync with the placement rules in computeScene.
function buildCollision(layout) {
  const { gridW, gridH, cells, districtGeo } = layout;
  const grid = cells.split('\n');
  const ot = districtGeo && districtGeo.oldTown;
  const inOT = (x, y) => ot && x >= ot.x0 && x <= ot.x1 && y >= ot.y0 && y <= ot.y1;
  const { ccc, cc2, R: CENTER_R } = cityCenters(layout);
  const isCenter = (x, y) => Math.max(Math.abs(x - ccc), Math.abs(y - ccc)) <= CENTER_R
    || (cc2 && Math.max(Math.abs(x - cc2.x), Math.abs(y - cc2.y)) <= CENTER_R);
  const solid = new Set();
  for (let y = 0; y < gridH; y += 1) {
    const row = grid[y];
    if (!row) continue;
    for (let x = 0; x < gridW; x += 1) {
      const c = row[x];
      if (c === 'W') { solid.add(`${x},${y}`); continue; } // river / lake — no wading
      if (c === '.') {
        // Mirror computeScene exactly: Old Town keeps its grid; the modern city
        // uses the organic placement; both leave the bridges (road) walkable.
        const isBuilding = inOT(x, y) ? ((x + y) % 2 === 0) : isBuildingCell(x, y, isCenter(x, y));
        if (isBuilding) solid.add(`${x},${y}`);
      } else if (c === 'C' && (x + y) % 2 === 0) {
        solid.add(`${x},${y}`); // civic tower on the checkerboard
      }
    }
  }
  // Special landmarks block their footprint too (so you can't walk through the
  // lighthouse or ferris wheel). Same deterministic placement as the renderer.
  for (const s of computeSpecials(layout)) {
    if (s.solid === false) continue;
    for (let dy = -s.radius; dy <= s.radius; dy += 1) {
      for (let dx = -s.radius; dx <= s.radius; dx += 1) solid.add(`${s.gridX + dx},${s.gridY + dy}`);
    }
  }
  return solid;
}

// Shared click/drag handlers for an instanced, pickable mesh.
function pickHandlers(pick, onPick, downPos) {
  if (!onPick) return {};
  return {
    onPointerDown: (e) => { downPos.current = { x: e.nativeEvent.clientX, y: e.nativeEvent.clientY }; },
    onClick: (e) => {
      e.stopPropagation();
      if (e.instanceId == null) return;
      const id = pick[e.instanceId];
      if (id == null) return;
      const d = downPos.current;
      if (d && Math.hypot(e.nativeEvent.clientX - d.x, e.nativeEvent.clientY - d.y) > 6) return;
      onPick(id);
    },
  };
}

// The water surface sits at this constant Y (shared with the terrain carve). The
// channel is carved deep (RIVER_BED_Y) and its banks raised (RIVER_DECK_Y), so the
// water FILLS a sunken, contained channel — a real deep river you look down into
// and cross by bridge, not a blue stripe painted on the ground.
const WATER_Y = RIVER_WATER_Y;

// The river, in three layers: a dark bed sunk into the channel (hides the green
// channel floor and gives the water its deep colour), a translucent rippling
// surface that fills the channel, and scattered life — fish, lily pads, rocks.
// Bridges (road tiles, kept at street level) still pass over the top.
function RiverLayer({ cells }) {
  if (!cells.length) return null;
  return (
    <group>
      <Riverbed cells={cells} />
      <RiverWater cells={cells} />
      <RiverDecor cells={cells} />
    </group>
  );
}

// Dark riverbed: one instanced tile per water cell, dropped onto the carved
// channel floor (applyMatrices follows the terrain), so the river shows deep
// dark water instead of the bright grass the channel was cut out of.
function Riverbed({ cells }) {
  const ref = useRef();
  const count = cells.length;
  const instances = useMemo(() => cells.map(([x, z]) => [x, z, 0, 1]), [cells]);
  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(TILE * 1.06, TILE * 1.06);
    g.rotateX(-Math.PI / 2);
    return g;
  }, []);
  const material = useMemo(() => new THREE.MeshStandardMaterial({ color: '#15303a', roughness: 0.95 }), []);
  useEffect(() => { applyMatrices(ref.current, instances); }, [instances, count]);
  useEffect(() => () => { geometry.dispose(); material.dispose(); }, [geometry, material]);
  return <instancedMesh ref={ref} args={[geometry, material, count]} position={[0, 0.02, 0]} receiveShadow frustumCulled={false} />;
}

// The water surface: translucent, held at the constant waterline (NOT lifted onto
// the channel floor — that's what makes the filled river look deep). Its vertices
// are displaced by travelling sine WAVES in the vertex shader; because the waves
// are a function of WORLD position they roll seamlessly across the instanced
// tiles. depthWrite is off so the dark bed and fish below show through the tint.
function RiverWater({ cells }) {
  const ref = useRef();
  const count = cells.length;
  const instances = useMemo(() => cells.map(([x, z]) => [x, z]), [cells]);
  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(TILE * 1.02, TILE * 1.02, 4, 4); // segments so waves bend the surface
    g.rotateX(-Math.PI / 2);
    return g;
  }, []);
  const uniforms = useRef({ uTime: { value: 0 } });
  const material = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({
      color: '#2f6fae', transparent: true, opacity: 0.82, roughness: 0.3, metalness: 0.1, depthWrite: false,
    });
    m.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = uniforms.current.uTime;
      shader.vertexShader = `uniform float uTime;\n${shader.vertexShader}`.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
         vec3 wPos = (instanceMatrix * vec4(transformed, 1.0)).xyz;
         transformed.y += sin(wPos.x * 0.5 + uTime * 1.2) * 0.07
                        + sin(wPos.z * 0.35 - uTime * 0.9) * 0.05
                        + sin((wPos.x + wPos.z) * 0.8 + uTime * 1.8) * 0.03;`,
      );
    };
    return m;
  }, []);
  useEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    instances.forEach(([x, z], i) => { m.makeTranslation(x, 0, z); mesh.setMatrixAt(i, m); });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [instances, count]);
  useEffect(() => () => { geometry.dispose(); material.dispose(); }, [geometry, material]);
  useFrame((s) => { uniforms.current.uTime.value = s.clock.elapsedTime; });
  return (
    <group position={[0, WATER_Y, 0]}>
      <instancedMesh ref={ref} args={[geometry, material, count]} renderOrder={2} frustumCulled={false} />
    </group>
  );
}

// Life in the water, scattered deterministically over the water cells: fish that
// hover just under the surface and gently swim in place, lily pads floating flat
// on top (some with a flower), and rounded rocks breaking the surface.
function RiverDecor({ cells }) {
  const fishRef = useRef();
  const seed = (x, z, salt) => hashCell(Math.round(x) * 2 + salt, Math.round(z) * 2 - salt);

  const { fish, pads, flowers, rocks } = useMemo(() => {
    const fish = []; const pads = []; const flowers = []; const rocks = [];
    cells.forEach(([x, z]) => {
      const h = seed(x, z, 0);
      if (h % 7 < 2) { // ~2 in 7 water cells get a fish — a river teeming with them
        fish.push({
          x: x + ((h >>> 3) % 100) / 100 - 0.5,
          z: z + ((h >>> 10) % 100) / 100 - 0.5,
          yaw: ((h >>> 4) % 628) / 100,
          scale: 1.0 + ((h >>> 6) % 80) / 100,
          color: (h >>> 12) % 4,
          phase: ((h >>> 14) % 628) / 100,
        });
      } else if (h % 13 === 4) {
        const ph = seed(x, z, 7);
        pads.push({ x, z, scale: 0.7 + (ph % 60) / 100, rot: (ph % 628) / 100 });
        if (ph % 3 === 0) flowers.push({ x, z, color: (ph >>> 5) % 3 });
      } else if (h % 29 === 7) {
        const rh = seed(x, z, 3);
        rocks.push({
          x, z, scale: 0.4 + (rh % 45) / 100,
          rot: (rh % 628) / 100,
          tilt: ((rh >>> 5) % 40) / 100,
        });
      }
    });
    return { fish, pads, flowers, rocks };
  }, [cells]);

  // A fish: an ellipsoid body with a flat triangular tail, lying flat.
  const fishGeo = useMemo(() => {
    const body = new THREE.SphereGeometry(0.5, 8, 6);
    body.scale(0.42, 0.12, 0.2);
    const tail = new THREE.ConeGeometry(0.2, 0.26, 4);
    tail.rotateZ(-Math.PI / 2);
    tail.scale(1, 0.55, 1.7);
    tail.translate(-0.26, 0, 0);
    return mergeGeometries([body, tail]);
  }, []);
  const fishMat = useMemo(() => new THREE.MeshStandardMaterial({ roughness: 0.5, metalness: 0.1 }), []);
  const padGeo = useMemo(() => {
    const g = new THREE.CircleGeometry(0.45, 12);
    g.rotateX(-Math.PI / 2);
    return g;
  }, []);
  const padMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#3f7a39', roughness: 0.8, side: THREE.DoubleSide }), []);
  const flowerGeo = useMemo(() => new THREE.SphereGeometry(0.12, 6, 5), []);
  const flowerMat = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: false, roughness: 0.7 }), []);
  const rockGeo = useMemo(() => new THREE.IcosahedronGeometry(0.5, 0), []);
  const rockMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#8a8b86', roughness: 1 }), []);

  const fishColors = useMemo(() => ['#e08a3c', '#cfd6da', '#e6ddcf', '#5d7079'].map((c) => new THREE.Color(c)), []);
  const flowerColors = useMemo(() => ['#e8e2ea', '#e8a0c0', '#f0e08a'].map((c) => new THREE.Color(c)), []);

  // Fish colours (static) + lily-pad / flower transforms (static).
  useEffect(() => {
    const fm = fishRef.current;
    if (fm) {
      fish.forEach((f, i) => fm.setColorAt(i, fishColors[f.color]));
      if (fm.instanceColor) fm.instanceColor.needsUpdate = true;
    }
  }, [fish, fishColors]);

  // Fish swim in place: a small back-and-forth glide along their heading plus a
  // gentle yaw wiggle, so the river looks alive without anyone leaving the water.
  useFrame((s) => {
    const fm = fishRef.current;
    if (!fm || !fish.length) return;
    const t = s.clock.elapsedTime;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const p = new THREE.Vector3();
    const sc = new THREE.Vector3();
    for (let i = 0; i < fish.length; i += 1) {
      const f = fish[i];
      const swim = Math.sin(t * 0.8 + f.phase) * 0.22;
      const yaw = f.yaw + Math.sin(t * 1.6 + f.phase) * 0.25;
      p.set(f.x + Math.cos(yaw) * swim, WATER_Y - 0.25, f.z + Math.sin(yaw) * swim);
      q.setFromAxisAngle(Y_AXIS, -yaw);
      sc.setScalar(f.scale);
      m.compose(p, q, sc);
      fm.setMatrixAt(i, m);
    }
    fm.instanceMatrix.needsUpdate = true;
  });

  const setStatic = (mesh, items, y, build) => {
    if (!mesh) return;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const p = new THREE.Vector3();
    const sc = new THREE.Vector3();
    items.forEach((it, i) => { build(m, q, p, sc, it, y); mesh.setMatrixAt(i, m); });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  };
  const padsRef = useRef();
  const flowersRef = useRef();
  const rocksRef = useRef();
  useEffect(() => {
    setStatic(padsRef.current, pads, WATER_Y + 0.015, (m, q, p, sc, it) => {
      q.setFromAxisAngle(Y_AXIS, it.rot); p.set(it.x, 0, it.z); sc.setScalar(it.scale); m.compose(p, q, sc);
    });
    const fm = flowersRef.current;
    if (fm) {
      const m = new THREE.Matrix4();
      flowers.forEach((fl, i) => { m.makeTranslation(fl.x, WATER_Y + 0.08, fl.z); fm.setMatrixAt(i, m); fm.setColorAt(i, flowerColors[fl.color]); });
      fm.instanceMatrix.needsUpdate = true;
      if (fm.instanceColor) fm.instanceColor.needsUpdate = true;
    }
    setStatic(rocksRef.current, rocks, 0, (m, q, p, sc, it) => {
      q.setFromAxisAngle(X_AXIS, it.tilt); p.set(it.x, WATER_Y - 0.05, it.z); sc.setScalar(it.scale); m.compose(p, q, sc);
    });
  }, [pads, flowers, rocks, flowerColors]);

  useEffect(() => () => {
    [fishGeo, padGeo, flowerGeo, rockGeo].forEach((g) => g.dispose());
    [fishMat, padMat, flowerMat, rockMat].forEach((mat) => mat.dispose());
  }, [fishGeo, padGeo, flowerGeo, rockGeo, fishMat, padMat, flowerMat, rockMat]);

  return (
    <group>
      {!!fish.length && (
        <instancedMesh ref={fishRef} args={[fishGeo, fishMat, fish.length]} renderOrder={1} frustumCulled={false} />
      )}
      {!!pads.length && (
        <instancedMesh ref={padsRef} args={[padGeo, padMat, pads.length]} renderOrder={3} frustumCulled={false} receiveShadow />
      )}
      {!!flowers.length && (
        <instancedMesh ref={flowersRef} args={[flowerGeo, flowerMat, flowers.length]} renderOrder={3} frustumCulled={false} />
      )}
      {!!rocks.length && (
        <instancedMesh ref={rocksRef} args={[rockGeo, rockMat, rocks.length]} frustumCulled={false} castShadow receiveShadow />
      )}
    </group>
  );
}

// A proper, stylised SUSPENSION bridge over each river crossing. The road tiles
// already form the walkable deck at RIVER_DECK_Y; this stands the superstructure
// over it: twin portal pylons (Golden-Gate orange), main cables sweeping in a
// catenary between the towers and down to deck anchors, vertical hangers, and
// fascia + handrails down both edges. Driven by layout.bridges (the continuous
// decks cityPlan emits), so every bridge lines up exactly with the road deck.
const BRIDGE_PYLON_H = 4.6;        // pylon height above the deck
function Bridges({ layout }) {
  const legRef = useRef();
  const crossRef = useRef();
  const fasciaRef = useRef();
  const railRef = useRef();
  const hangerRef = useRef();
  const built = useMemo(() => {
    const bridges = layout.bridges || [];
    if (!bridges.length) return null;
    const { gridW, gridH } = layout;
    const originX = ((gridW - 1) * TILE) / 2;
    const originZ = ((gridH - 1) * TILE) / 2;
    const wx = (x) => x * TILE - originX;
    const wz = (y) => y * TILE - originZ;
    const deckY = RIVER_DECK_Y;
    const top = deckY + BRIDGE_PYLON_H;
    const railZ = TILE * 0.52;
    const legs = []; const cross = []; const fascia = []; const rails = []; const hangers = [];
    const cableGeos = [];
    for (const b of bridges) {
      const cxw = wx(b.cx); const zc = wz(b.y);
      const span = (b.half + 1) * 2 * TILE;
      const x0 = cxw - span / 2; const x1 = cxw + span / 2;
      const xa = cxw - span * 0.28; const xb = cxw + span * 0.28; // pylon columns
      const sag = deckY + BRIDGE_PYLON_H * 0.34;
      cross.push([xa, zc]); cross.push([xb, zc]);
      for (const sgn of [-1, 1]) {
        const z = zc + sgn * railZ;
        legs.push([xa, z]); legs.push([xb, z]);
        fascia.push([cxw, z]); rails.push([cxw, z]);
        // main cable: deck anchor → pylon top → mid sag → pylon top → deck anchor
        const pts = [
          new THREE.Vector3(x0, deckY + 0.12, z),
          new THREE.Vector3(xa, top, z),
          new THREE.Vector3(cxw, sag, z),
          new THREE.Vector3(xb, top, z),
          new THREE.Vector3(x1, deckY + 0.12, z),
        ];
        const curve = new THREE.CatmullRomCurve3(pts);
        cableGeos.push(new THREE.TubeGeometry(curve, 48, 0.06, 5, false));
        // hangers between the pylons, length following the cable's parabola
        const N = 6;
        for (let i = 1; i <= N; i += 1) {
          const t = -0.92 + (1.84 * i) / (N + 1);   // -0.92..0.92 across the span
          const hx = cxw + t * (xb - cxw);
          const cy = sag + (top - sag) * t * t;
          hangers.push([hx, z, Math.max(0.25, cy - deckY)]);
        }
      }
    }
    const cableGeo = cableGeos.length ? mergeGeometries(cableGeos, false) : null;
    return { legs, cross, fascia, rails, hangers, cableGeo, top, deckY, railZ };
  }, [layout]);

  const spanLen = ((layout.bridges?.[0]?.half ?? 10) + 1) * 2 * TILE;
  const legGeo = useMemo(() => new THREE.BoxGeometry(0.2, BRIDGE_PYLON_H, 0.2), []);
  const crossGeo = useMemo(() => new THREE.BoxGeometry(0.24, 0.26, TILE * 1.18), []);
  const fasciaGeo = useMemo(() => new THREE.BoxGeometry(spanLen, 0.26, 0.14), [spanLen]);
  const railGeo = useMemo(() => new THREE.BoxGeometry(spanLen, 0.08, 0.05), [spanLen]);
  const hangerGeo = useMemo(() => new THREE.BoxGeometry(0.04, 1, 0.04), []);
  const pylonMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#c14a1e', roughness: 0.55 }), []);
  const cableMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#d7dce2', roughness: 0.4, metalness: 0.3 }), []);
  const fasciaMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#cbc6ba', roughness: 0.9 }), []);
  const railMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#aeb4bc', roughness: 0.7 }), []);

  useEffect(() => {
    if (!built) return;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const one = new THREE.Vector3(1, 1, 1);
    const place = (ref, arr, y) => {
      const mesh = ref.current; if (!mesh) return;
      arr.forEach(([x, z], i) => { m.compose(new THREE.Vector3(x, y, z), q, one); mesh.setMatrixAt(i, m); });
      mesh.instanceMatrix.needsUpdate = true; mesh.computeBoundingSphere();
    };
    place(legRef, built.legs, built.deckY + BRIDGE_PYLON_H / 2);
    place(crossRef, built.cross, built.top);
    place(fasciaRef, built.fascia, built.deckY + 0.02);
    place(railRef, built.rails, built.deckY + 0.62);
    const hm = hangerRef.current;
    if (hm) {
      built.hangers.forEach(([x, z, len], i) => {
        m.compose(new THREE.Vector3(x, built.deckY + len / 2, z), q, new THREE.Vector3(1, len, 1));
        hm.setMatrixAt(i, m);
      });
      hm.instanceMatrix.needsUpdate = true; hm.computeBoundingSphere();
    }
  }, [built]);
  useEffect(() => () => {
    [legGeo, crossGeo, fasciaGeo, railGeo, hangerGeo].forEach((g) => g.dispose());
    [pylonMat, cableMat, fasciaMat, railMat].forEach((mat) => mat.dispose());
  }, [legGeo, crossGeo, fasciaGeo, railGeo, hangerGeo, pylonMat, cableMat, fasciaMat, railMat]);
  useEffect(() => () => { built?.cableGeo?.dispose(); }, [built]);

  if (!built) return null;
  return (
    <group>
      <instancedMesh ref={legRef} args={[legGeo, pylonMat, built.legs.length]} frustumCulled={false} castShadow />
      <instancedMesh ref={crossRef} args={[crossGeo, pylonMat, built.cross.length]} frustumCulled={false} castShadow />
      <instancedMesh ref={fasciaRef} args={[fasciaGeo, fasciaMat, built.fascia.length]} frustumCulled={false} castShadow receiveShadow />
      <instancedMesh ref={railRef} args={[railGeo, railMat, built.rails.length]} frustumCulled={false} castShadow />
      <instancedMesh ref={hangerRef} args={[hangerGeo, cableMat, built.hangers.length]} frustumCulled={false} />
      {built.cableGeo && <mesh geometry={built.cableGeo} material={cableMat} castShadow frustumCulled={false} />}
    </group>
  );
}

// Raised kerb footpaths flanking the roads — one instanced slab per strip,
// placed and rotated by computeScene. Lifted onto the terrain by applyMatrices.
function SidewalkLayer({ items }) {
  const ref = useRef();
  const count = items.length;
  const instances = useMemo(() => items.map(([x, z, r]) => [x, z, r, 1]), [items]);
  const geometry = useMemo(() => new THREE.BoxGeometry(0.5, 0.12, TILE * 0.98), []);
  const material = useMemo(() => new THREE.MeshStandardMaterial({ color: '#b8b3a8' }), []);
  useEffect(() => { applyGroundMatrices(ref.current, instances); }, [instances, count]);
  useEffect(() => () => { geometry.dispose(); material.dispose(); }, [geometry, material]);
  if (!count) return null;
  return (
    <instancedMesh ref={ref} args={[geometry, material, count]} position={[0, 0.06, 0]} receiveShadow frustumCulled={false} />
  );
}

// A plinth of "ground material" beneath each building that sits on a slope: a
// box filling from the terrain below up to the building's flat floor, so houses
// are supported (never floating) and read as built on a solid foundation rather
// than hovering over the hillside. Only emitted where the ground under the
// footprint actually drops away — flat lots get none. items =
// [worldX, worldZ, rotY, half, top, bottom].
function FoundationLayer({ items }) {
  const ref = useRef();
  const count = items.length;
  const geometry = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  const material = useMemo(() => new THREE.MeshStandardMaterial({ color: '#8c8377' }), []);
  useEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    const p = new THREE.Vector3();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3();
    for (let i = 0; i < count; i += 1) {
      const [x, z, rotY, half, top, bottom] = items[i];
      const padTop = top + 0.02;     // meet (a hair above) the building floor
      const padBot = bottom - 0.5;   // dig into the hill for a solid-looking base
      p.set(x, (padTop + padBot) / 2, z);
      q.setFromAxisAngle(Y_AXIS, rotY);
      s.set(half * 2, padTop - padBot, half * 2);
      m.compose(p, q, s);
      mesh.setMatrixAt(i, m);
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [items, count]);
  useEffect(() => () => { geometry.dispose(); material.dispose(); }, [geometry, material]);
  if (!count) return null;
  return <instancedMesh ref={ref} args={[geometry, material, count]} castShadow receiveShadow frustumCulled={false} />;
}

// A flat coloured ground layer (one instanced tile per cell): sandstone paving
// for the plaza/rambla, warm sand for the beaches, concrete for the industrial
// estate. Reads clearly against the grass and sits under props and walkers.
function TileLayer({ cells, color, y }) {
  const ref = useRef();
  const count = cells.length;
  const instances = useMemo(() => cells.map(([x, z]) => [x, z, 0, 1]), [cells]);
  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(TILE * 1.01, TILE * 1.01);
    g.rotateX(-Math.PI / 2);
    return g;
  }, []);
  const material = useMemo(() => new THREE.MeshStandardMaterial({ color }), [color]);

  useEffect(() => { applyGroundMatrices(ref.current, instances); }, [instances, count]);
  useEffect(() => () => { geometry.dispose(); material.dispose(); }, [geometry, material]);

  if (!count) return null;
  return (
    <instancedMesh ref={ref} args={[geometry, material, count]} position={[0, y, 0]} receiveShadow frustumCulled={false} />
  );
}

// Farmland: like TileLayer but each crop patch gets its own tone via
// per-instance colours, so the fields read as a quilt of wheat and greens.
function FieldLayer({ cells }) {
  const ref = useRef();
  const count = cells.length;
  const instances = useMemo(() => cells.map(([x, z]) => [x, z, 0, 1]), [cells]);
  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(TILE * 1.02, TILE * 1.02);
    g.rotateX(-Math.PI / 2);
    return g;
  }, []);
  const material = useMemo(() => new THREE.MeshStandardMaterial({ color: '#ffffff' }), []);

  useEffect(() => {
    applyGroundMatrices(ref.current, instances);
    const mesh = ref.current;
    if (!mesh) return;
    const palette = ['#c9b35a', '#9ab055', '#b5a23f', '#87a050'].map((c) => new THREE.Color(c));
    cells.forEach(([, , patch], i) => mesh.setColorAt(i, palette[patch % palette.length]));
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [instances, cells, count]);
  useEffect(() => () => { geometry.dispose(); material.dispose(); }, [geometry, material]);

  if (!count) return null;
  return (
    <instancedMesh ref={ref} args={[geometry, material, count]} position={[0, 0.03, 0]} receiveShadow frustumCulled={false} />
  );
}

// One invisible TILE×TILE pad over every buyable plot. It's the universal click
// target: open-grass plots stay buyable, and garden lots get a full-tile hit
// area instead of a fiddly tree trunk. Buildings sit above it and win the ray.
// items = [worldX, worldZ, coordKey].
function PlotClickLayer({ items, onPick, downPos }) {
  const ref = useRef();
  const count = items.length;
  const pickIds = useMemo(() => items.map((it) => it[2]), [items]);
  const instances = useMemo(() => items.map(([x, z]) => [x, z, 0, 1]), [items]);
  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(TILE, TILE);
    g.rotateX(-Math.PI / 2); // lie flat
    return g;
  }, []);
  const material = useMemo(
    () => new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
    [],
  );

  useEffect(() => { applyMatrices(ref.current, instances); }, [instances, count]);
  useEffect(() => () => { geometry.dispose(); material.dispose(); }, [geometry, material]);

  if (!count) return null;
  return (
    <instancedMesh ref={ref} args={[geometry, material, count]} position={[0, 0.05, 0]} frustumCulled={false} {...pickHandlers(pickIds, onPick, downPos)} />
  );
}

function InstancedModel({ url, normMode, normV, instances, pick, onPick, downPos, sway = false, fade = false, ground = false, building = false }) {
  const { scene } = useGLTF(url);
  const data = useMemo(() => {
    const d = extractGeoMat(scene, normMode, normV);
    if (d && fade) patchFadeMaterial(d.material);
    return d;
  }, [scene, normMode, normV, fade]);
  const ref = useRef();
  const count = instances.length;

  // Greenery breathes: a tiny per-instance phase-shifted lean. Static groups
  // (roads, buildings, props) early-return without touching the GPU.
  useFrame((state) => {
    if (!sway) return;
    const mesh = ref.current;
    if (!mesh) return;
    const t = state.clock.elapsedTime;
    for (let i = 0; i < count; i += 1) {
      const [x, z, rotY, sc] = instances[i];
      _p.set(x, walkHeight(x, z), z);
      _q.setFromAxisAngle(Y_AXIS, rotY);
      _q2.setFromAxisAngle(X_AXIS, Math.sin(t * 1.3 + i * 1.97) * 0.02);
      _q.multiply(_q2);
      _s.setScalar(sc);
      _m.compose(_p, _q, _s);
      mesh.setMatrixAt(i, _m);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  // DEV: one line per model with its normalised size + instance count, so the
  // dev-snap workflow can diagnose invisible/odd models from the console log.
  // Only logs during #devsnap captures to keep the normal console clean.
  useEffect(() => {
    if (!import.meta.env.DEV || !data || !window.location.hash.includes('devsnap')) return;
    const b = data.geometry.boundingBox;
    console.log(`[city-model] ${url} n=${count} h=${(b.max.y - b.min.y).toFixed(2)} fp=${Math.max(b.max.x - b.min.x, b.max.z - b.min.z).toFixed(2)}`);
  }, [url, data, count]);

  useEffect(() => {
    const apply = ground ? applyGroundMatrices : building ? applyBuildingMatrices : applyMatrices;
    apply(ref.current, instances);
  }, [instances, data, count, ground, building]);
  // Dispose the cloned geometry on unmount to avoid leaking GPU memory across
  // re-mounts (the gltf material is shared/cached, so we don't touch it).
  useEffect(() => () => { data?.geometry?.dispose(); }, [data]);

  if (!data || !count) return null;
  return (
    <instancedMesh ref={ref} args={[data.geometry, data.material, count]} castShadow receiveShadow frustumCulled={false} {...pickHandlers(pick, onPick, downPos)} />
  );
}

// Themed-district buildings (Oriental, Cyberpunk, Wild West, Alpine, Spooky,
// Desert) — hand-authored procedural geometry with baked vertex colours (see
// cityBuildings.js). No GLTF load or normalisation: the geometry is already
// world-scaled with its base at y=0, so we just instance it (lifted to the
// terrain + turned to the road by applyMatrices) through one shared, fade-patched
// material. Pickable like any other building, so themed plots stay buyable.
const PROC_MAT_FADED = patchFadeMaterial(PROC_MATERIAL.clone());
function ProceduralInstances({ geometry, instances, pick, onPick, downPos, building = false }) {
  const ref = useRef();
  const count = instances.length;
  useEffect(() => {
    (building ? applyBuildingMatrices : applyMatrices)(ref.current, instances);
  }, [instances, count, building]);
  if (!geometry || !count) return null;
  return (
    <instancedMesh ref={ref} args={[geometry, PROC_MAT_FADED, count]} castShadow receiveShadow frustumCulled={false} {...pickHandlers(pick, onPick, downPos)} />
  );
}

// Instances a MULTI-MATERIAL model (e.g. Quaternius buildings) without losing
// its colours: extractParts splits it into one merged geometry per material, and
// we render an InstancedMesh per part — all sharing the same per-instance
// transforms, so the coloured pieces always move together. Each part is pickable
// so clicking any face selects the plot.
function MultiMatInstancedModel({ url, normMode, normV, instances, pick, onPick, downPos, fade = false, building = false }) {
  const { scene } = useGLTF(url);
  const data = useMemo(() => {
    const d = extractParts(scene, normMode, normV);
    if (d && fade) d.parts.forEach((p) => patchFadeMaterial(p.material));
    return d;
  }, [scene, normMode, normV, fade]);
  useEffect(() => () => { data?.parts?.forEach((p) => p.geometry?.dispose()); }, [data]);
  if (!data || !instances.length) return null;
  return (
    <>
      {data.parts.map((p, i) => (
        <InstancedPart key={i} geometry={p.geometry} material={p.material} instances={instances} pick={pick} onPick={onPick} downPos={downPos} building={building} />
      ))}
    </>
  );
}

function InstancedPart({ geometry, material, instances, pick, onPick, downPos, building = false }) {
  const ref = useRef();
  const count = instances.length;
  useEffect(() => {
    (building ? applyBuildingMatrices : applyMatrices)(ref.current, instances);
  }, [instances, geometry, count, building]);
  return (
    <instancedMesh ref={ref} args={[geometry, material, count]} castShadow receiveShadow frustumCulled={false} {...pickHandlers(pick, onPick, downPos)} />
  );
}

// A single one-off flair landmark (lighthouse, ferris wheel, windmill, fountain)
// rendered as a full clone so all of its materials/colours survive. Normalised to
// an absolute world height with its feet on the ground and centred on its cell.
function SpecialLandmark({ url, x, z, rotY, height }) {
  const { scene } = useGLTF(url);
  const obj = useMemo(() => {
    const c = scene.clone(true);
    const box = new THREE.Box3().setFromObject(c);
    const h = (box.max.y - box.min.y) || 1;
    const s = height / h;
    const cx = (box.max.x + box.min.x) / 2;
    const cz = (box.max.z + box.min.z) / 2;
    c.scale.setScalar(s);
    c.position.set(-cx * s, -box.min.y * s, -cz * s);
    c.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false; } });
    return c;
  }, [scene, height]);
  return (
    <group position={[x, walkHeight(x, z), z]} rotation={[0, rotY, 0]}>
      <primitive object={obj} />
    </group>
  );
}

// A hot-air balloon drifting high above the city for a bit of moving flair.
function Balloon({ islandW }) {
  const { scene } = useGLTF(modelUrl(BALLOON_FILE));
  const obj = useMemo(() => {
    const c = scene.clone(true);
    const box = new THREE.Box3().setFromObject(c);
    const h = (box.max.y - box.min.y) || 1;
    const s = 6 / h;
    const cx = (box.max.x + box.min.x) / 2;
    const cz = (box.max.z + box.min.z) / 2;
    c.scale.setScalar(s);
    c.position.set(-cx * s, -box.min.y * s, -cz * s);
    c.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    return c;
  }, [scene]);
  const ref = useRef();
  useFrame((state, dtRaw) => {
    const g = ref.current;
    if (!g) return;
    const dt = Math.min(dtRaw, 0.1);
    const t = state.clock.elapsedTime;
    const limit = islandW * 0.5 + 40;
    g.position.x += dt * 1.4;
    if (g.position.x > limit) g.position.x = -limit;
    g.position.z = Math.sin(t * 0.05) * islandW * 0.18;
    g.position.y = 24 + Math.sin(t * 0.5) * 0.8;
    g.rotation.y = t * 0.05;
  });
  return (
    <group ref={ref} position={[0, 24, 0]}>
      <primitive object={obj} />
    </group>
  );
}

// Inspect a loaded texture's alpha channel, crop its UVs to the opaque
// silhouette (trimming the transparent margins the art is exported with), and
// return the trimmed aspect ratio (height / width). This is what stops the art
// from "levitating": without it the card's bottom edge is the IMAGE bottom,
// which sits below the building's feet by however much transparent padding the
// PNG happens to have. Idempotent — always recomputed from the raw pixels and
// SET (not accumulated), so StrictMode/HMR double-runs are harmless. Returns
// 1 (square, untouched) if the image can't be read or is fully transparent.
function trimToContent(texture) {
  const img = texture.image;
  if (!img || !img.width || !img.height || typeof document === 'undefined') return 1;
  const W = img.width;
  const H = img.height;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return 1;
  ctx.drawImage(img, 0, 0);
  let data;
  try { data = ctx.getImageData(0, 0, W, H).data; } catch { return 1; } // tainted
  const ALPHA = 16;
  let minX = W; let minY = H; let maxX = -1; let maxY = -1;
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      if (data[(y * W + x) * 4 + 3] > ALPHA) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return 1; // nothing opaque
  const aw = maxX - minX + 1;
  const ah = maxY - minY + 1;
  // UV V runs bottom→top while pixels run top→bottom, hence the H - maxY flip.
  texture.offset.set(minX / W, (H - maxY - 1) / H);
  texture.repeat.set(aw / W, ah / H);
  texture.needsUpdate = true;
  return ah / aw;
}

// Flat camera-facing "card" of the user's iso building art, instanced. The art
// is alpha-trimmed (see trimToContent) so the card == the building's silhouette
// and its FEET sit on the ground — no floating, whatever padding the PNG ships.
function BillboardInstances({ url, instances, pick, onPick, downPos }) {
  const texture = useTexture(url);
  const ref = useRef();
  const count = instances.length;

  // Crop to the opaque silhouette and get its true aspect (height per unit
  // width). The instance scale is the card WIDTH, so height follows the art.
  const aspect = useMemo(() => trimToContent(texture), [texture]);

  const geometry = useMemo(() => {
    const h = aspect || 1;
    const g = new THREE.PlaneGeometry(1, h);
    // Pivot at the building's feet (bottom of the trimmed art), sunk a hair so
    // the anti-aliased base edge tucks into the grass instead of hairlining.
    g.translate(0, h / 2 - h * 0.02, 0);
    return g;
  }, [aspect]);
  const material = useMemo(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    // alphaTest 0.65: anything mattier than ~65% opacity (the white-fringe zone
    // of AI-generated cutouts) is discarded by the GPU as extra insurance on
    // top of the offline defringe pass and the paved landmark aprons.
    return new THREE.MeshBasicMaterial({ map: texture, alphaTest: 0.65, side: THREE.DoubleSide, toneMapped: false });
  }, [texture]);

  useEffect(() => { applyMatrices(ref.current, instances); }, [instances, geometry, count]);
  useEffect(() => () => { geometry.dispose(); material.dispose(); }, [geometry, material]);

  if (!count) return null;
  // No castShadow on the art cards (per design): the skewed card silhouette
  // reads oddly, and the images carry their own baked ground shading.
  return (
    <instancedMesh ref={ref} args={[geometry, material, count]} frustumCulled={false} {...pickHandlers(pick, onPick, downPos)} />
  );
}

function OwnerMarker({ p, originX, originZ }) {
  const x = p.gridX * TILE - originX;
  const z = p.gridY * TILE - originZ;
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.14, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[TILE * 0.96, TILE * 0.96]} />
        {/* basic material: the ownership tint stays vivid regardless of sun/shadow */}
        <meshBasicMaterial color={p.houseColor || '#888888'} transparent opacity={0.55} />
      </mesh>
      <Html position={[0, 3.0, 0]} center wrapperClass="pointer-events-none" zIndexRange={[15, 0]}>
        <div className={`pointer-events-none px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap shadow ${p.mine ? 'bg-accent text-white' : 'bg-white/90 text-slate-800'}`}>
          {p.mine ? 'You' : (p.owner?.name || '').split(' ')[0]}
        </div>
      </Html>
    </group>
  );
}

function Island({ w, d }) {
  const waterRef = useRef();
  // The sea breathes against the beach.
  useFrame((state) => {
    if (waterRef.current) {
      waterRef.current.position.y = -0.4 + Math.sin(state.clock.elapsedTime * 0.45) * 0.025;
    }
  });
  // Grass mesh displaced to the shared terrain heightfield so the rolling hills
  // read as solid ground the props and player stand on.
  const grass = useMemo(() => {
    const seg = 360; // fine enough for the grass to dip into the river channel
    const g = new THREE.PlaneGeometry(w, d, seg, seg);
    g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i += 1) {
      pos.setY(i, terrainHeight(pos.getX(i), pos.getZ(i)));
    }
    pos.needsUpdate = true;
    g.computeVertexNormals();
    return g;
  }, [w, d]);
  useEffect(() => () => grass.dispose(), [grass]);
  return (
    <group>
      {/* Beach shelf — slightly wider than the city, dips into the sea. (The old
          soil box's top sat at y=0, ABOVE the grass plane, so the whole city
          floor rendered brown.) */}
      <mesh position={[0, -1.05, 0]} receiveShadow>
        <boxGeometry args={[w + 7, 1.0, d + 7]} />
        <meshStandardMaterial color="#d9c79c" />
      </mesh>
      {/* Grass the city sits on (rolling hills outside the flat centre) */}
      <mesh geometry={grass} position={[0, -0.02, 0]} receiveShadow>
        <meshStandardMaterial color="#86b35a" />
      </mesh>
      {/* The sea */}
      <mesh ref={waterRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.4, 0]}>
        <planeGeometry args={[4000, 4000]} />
        <meshStandardMaterial color="#4d86c8" />
      </mesh>
    </group>
  );
}

function LoadingOverlay({ ready }) {
  const { progress } = useProgress();
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    if (ready) {
      const t = setTimeout(() => setHidden(true), 400);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [ready]);
  if (hidden) return null;
  const pct = ready ? 100 : Math.min(99, Number.isFinite(progress) ? Math.round(progress) : 0);
  return (
    <div className={`absolute inset-0 z-20 flex flex-col items-center justify-center gap-5 bg-[#0e1320] transition-opacity duration-300 ${ready ? 'opacity-0' : 'opacity-100'}`}>
      <img src="/logo.png" alt="" width={56} height={56} className="w-14 h-14 rounded-full animate-caplet-logo-twist" aria-hidden />
      <div className="w-60 h-1.5 bg-white/15 rounded-full overflow-hidden">
        <div className="h-full bg-accent transition-[width] duration-200" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-white/70">Building the city · {pct}%</p>
    </div>
  );
}
