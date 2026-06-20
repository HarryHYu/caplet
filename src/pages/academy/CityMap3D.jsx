import { useMemo, useRef, useState, useEffect, useCallback, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import {
  MapControls, OrthographicCamera, PerspectiveCamera,
  Html, useGLTF, useTexture, useProgress,
} from '@react-three/drei';
import * as THREE from 'three';
import {
  TILE, ALL_MODEL_URLS, CUSTOM_IMAGES, CUSTOM_IMAGE_URLS, modelUrl, GROUND_FILE, ROAD_FILE,
  ROAD_JUNCTION_FILE, ROAD_CROSSING_FILE, ROAD_CORNER_FILE, ROAD_TSPLIT_FILE, WATERTOWER_FILE,
  CIVIC_POOL, TREES, BUSHES, PALMS, PINES, SMALL_DECOR, ROCKS, STREETLIGHT_FILE,
  TRAFFICLIGHT_FILES, STREET_PROPS, CHIMNEYS, IND_TANK, CONTAINERS, OLD_TOWN_ART, FARM_ART,
  CLIFFS, PEOPLE, buildingForTier, hashCell, normFor, isBillboard, BILLBOARD_SCALE,
  OLD_TOWN_SCALE, FARM_SCALE,
} from './cityModels.js';

// The player avatar is one of the Kenney mini-characters — same model + scale as
// the NPCs walking the streets, so "you" are the same little size as everyone.
const PLAYER_MODEL = 'people/character-male-e.glb';
const PLAYER_HEIGHT = 0.42;   // matches NPC normalisation (normFor people)
const POV_MAX = 10;           // furthest 3rd-person pull-back (kept modest)
import { applyMatrices, extractGeoMat, Y_AXIS } from './cityRender.js';
import CityLife from './CityLife.jsx';

ALL_MODEL_URLS.forEach((u) => useGLTF.preload(u));
useTexture.preload(CUSTOM_IMAGE_URLS);

const SUN = [120, 90, 60];
const X_AXIS = new THREE.Vector3(1, 0, 0);
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
    const onKey = (e) => { if (e.key === 'Escape') setMode('overview'); };
    document.addEventListener('pointerlockchange', onLock);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerlockchange', onLock);
      window.removeEventListener('keydown', onKey);
    };
  }, [mode]);

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
        <color attach="background" args={['#bcd6f2']} />
        {/* At street level, haze hides the far edge of the huge map and grounds
            the view. No fog in the iso overview. */}
        {mode === 'play' && <fog attach="fog" args={['#bcd6f2', 50, 340]} />}

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
        {/* Flat fill kept low so the sun's shadows give the city depth. */}
        <ambientLight intensity={0.55} />
        <hemisphereLight args={[0xffffff, 0x6b7a55, 0.5]} />
        <directionalLight
          position={SUN}
          intensity={1.55}
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
            <Player spawn={[ccx, ccz]} bound={(layout.gridW * TILE) / 2 - 6} />
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

      {/* Centre crosshair while walking + locked. */}
      {mode === 'play' && locked && (
        <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
          <div className="w-1.5 h-1.5 rounded-full bg-white/80 ring-1 ring-black/40" />
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

      <div className="absolute bottom-3 left-3 text-[10px] font-bold uppercase tracking-widest text-white/80 bg-black/40 px-3 py-1.5 rounded pointer-events-none">
        {mode === 'overview'
          ? 'Drag to pan · scroll to zoom · click a lot · 🚶 walk the city'
          : 'WASD move · mouse look · scroll 1st/3rd person · Shift sprint · Esc overview'}
      </div>
    </div>
  );
}

// First-person player: positions the (default) perspective camera and walks it
// with WASD on the ground plane; the mouse looks via PointerLockControls. No
// building collision yet — you can pass through structures. The player is the
// same little Kenney character as the NPCs (height 0.42). Mouse looks (custom
// pointer-lock), WASD walks, and the scroll wheel dollies the camera from first
// person (dist 0) out to a modest third-person/wider view (dist POV_MAX).
function Player({ spawn, bound }) {
  const { camera, gl } = useThree();
  const keys = useRef({});
  const yaw = useRef(Math.PI);     // face into the city on spawn
  const pitch = useRef(-0.05);
  const dist = useRef(0);          // POV: 0 = first person
  const groundPos = useRef(new THREE.Vector3(spawn[0], 0, spawn[1] + 4));
  const avatarRef = useRef();
  const EYE = PLAYER_HEIGHT * 0.92;

  // Player avatar — same model + scale as the street NPCs.
  const { scene } = useGLTF(modelUrl(PLAYER_MODEL));
  const avatar = useMemo(() => extractGeoMat(scene, 'height', PLAYER_HEIGHT), [scene]);

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
      dist.current = Math.max(0, Math.min(POV_MAX, dist.current + e.deltaY * 0.01));
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

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    const k = keys.current;
    // Tiny avatar → modest speeds (world units are ~human-scaled to 0.42 tall).
    const speed = (k.ShiftLeft || k.ShiftRight ? 11 : 4.5) * dt;

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
    if (mf || ms) {
      const dx = fwd.current.x * mf + right.current.x * ms;
      const dz = fwd.current.z * mf + right.current.z * ms;
      const len = Math.hypot(dx, dz) || 1;
      groundPos.current.x = Math.max(-bound, Math.min(bound, groundPos.current.x + (dx / len) * speed));
      groundPos.current.z = Math.max(-bound, Math.min(bound, groundPos.current.z + (dz / len) * speed));
    }

    // Camera sits at the eye and pulls straight back along the look ray as the
    // POV dollies out; kept above ground so it never dips under the street.
    const ex = groundPos.current.x;
    const ez = groundPos.current.z;
    camera.position.set(
      ex - look.current.x * dist.current,
      Math.max(0.25, EYE - look.current.y * dist.current),
      ez - look.current.z * dist.current,
    );
    camera.quaternion.setFromEuler(euler.current);

    if (avatarRef.current) {
      avatarRef.current.position.set(ex, 0, ez);
      avatarRef.current.rotation.y = yaw.current; // face the walk/look direction
      avatarRef.current.visible = dist.current > 0.6; // hidden in first person
    }
  });

  if (!avatar) return null;
  return <mesh ref={avatarRef} geometry={avatar.geometry} material={avatar.material} castShadow visible={false} />;
}

function City({ plots, ownedRows, layout, selectedKey, onSelectPlot, interactive = true, downPos, onReady }) {
  const deeds = useMemo(() => ownedRows.filter((p) => p.tier === 'Landmark'), [ownedRows]);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- positions are stable; rebuild on map/count only
  const plan = useMemo(() => computeScene(plots, deeds, layout), [layout, plots.length, deeds.length]);
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
      <TileLayer cells={plan.pavedCells} color="#d8cdb6" y={0.045} />
      <TileLayer cells={plan.sandCells} color="#e8d8a8" y={0.035} />
      <TileLayer cells={plan.concreteCells} color="#a8a49a" y={0.04} />
      <TileLayer cells={plan.cobbleCells} color="#c2b194" y={0.042} />
      <FieldLayer cells={plan.fieldCells} />
      <CityLife layout={layout} originX={plan.originX} originZ={plan.originZ} islandW={plan.islandW} islandD={plan.islandD} />
      <PlotClickLayer items={plan.clickCells} originX={plan.originX} originZ={plan.originZ} onPick={pick} downPos={downPos} />
      {Object.entries(plan.groups).map(([file, g]) => {
        const clickable = g.pick.some((x) => x != null);
        const onPick = clickable ? pick : undefined;
        if (isBillboard(file)) {
          return <BillboardInstances key={file} url={modelUrl(file)} instances={g.inst} pick={g.pick} onPick={onPick} downPos={downPos} />;
        }
        const [normMode, normV] = normFor(file);
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
            sway={(TREES.includes(file) && !PINES.includes(file)) || BUSHES.includes(file)}
          />
        );
      })}
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
  const clickCells = []; // [worldX, worldZ, key] for the universal click layer
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
      // Checkerboard = classic isometric-game density; the sprite width is
      // matched to the tile diamond so each card sits ON its grid cell.
      if ((x + y) % 2 === 0) {
        add(pick(OLD_TOWN_ART, h), wx(x), wz(y), BILLBOARD_FACING, OLD_TOWN_SCALE, p.key);
      } else if (h % 9 === 0) {
        placeGarden(x, y, h, p.key);
      }
      continue;
    }
    if (x % 2 === 0 && y % 2 === 0) {
      add(GROUND_FILE, wx(x), wz(y), 0, 1, null);             // paved lot
      add(buildingForTier(p.tier, x, y), wx(x), wz(y), faceRoad(x, y, h), 1, p.key);
    } else if (industrial) {
      if (h % 7 < 2) add(pick(CONTAINERS, h >>> 3), wx(x), wz(y), ((h >>> 6) % 4) * HPI, 1, p.key);
      else if (h % 23 === 3) add(pick(CHIMNEYS, h >>> 4), wx(x), wz(y), 0, 1, p.key);
      else if (h % 19 === 5) add(IND_TANK, wx(x), wz(y), rotAny(h), 1, p.key);
    } else if (h % 5 < 2) {
      placeGarden(x, y, h, p.key);                            // sparse greenery between buildings
    }
    // else: open ground — clean breathing room, clickable through the layer
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
          if (!zebra) {
            const side = (h >>> 2) % 2 ? 1 : -1;
            const off = 0.42 * TILE * side;
            if (h % 9 === 1) { // streetlight on the sidewalk, arm over the road
              const lrot = vertical ? (side === 1 ? -HPI : HPI) : (side === 1 ? Math.PI : 0);
              add(STREETLIGHT_FILE, wx(x) + (vertical ? off : 0), wz(y) + (vertical ? 0 : off), lrot, 1, null);
            } else if (h % 13 === 2) { // bench / hydrant / bins
              add(pick(STREET_PROPS, h >>> 4), wx(x) + (vertical ? off : 0), wz(y) + (vertical ? 0 : off), rotAny(h >>> 6), 1, null);
            }
          }
        }
      } else if (cell === 'P') {
        // Pedestrian paving — the grand plaza and the rambla boulevard. Not the
        // KayKit base tile (it's grass-coloured and vanishes into the lawn):
        // PavingLayer draws these cells as warm sandstone instead.
        pavedCells.push([wx(x), wz(y)]);
        const inPlaza = ringDist(x, y) <= plazaR;
        if (inPlaza) {
          // Keep the heart open for the monuments; furnish the rest lightly.
          if (ringDist(x, y) >= 2) {
            if (h % 11 === 0) add(pick(STREET_PROPS, h >>> 3), wx(x), wz(y), rotAny(h >>> 5), 1, null);
            else if (h % 13 === 1) add(STREETLIGHT_FILE, wx(x), wz(y), rotAny(h >>> 4), 1, null);
            else if (h % 17 === 2) add(pick(TREES, h), wx(x), wz(y), rotAny(h), 0.5, null);
          }
        } else {
          // Rambla: a rhythmic line of planter trees + benches down the walk.
          if ((x + y) % 3 === 0) add(pick(TREES, h), wx(x), wz(y), rotAny(h), 0.5, null);
          else if (h % 9 === 0) add(pick(STREET_PROPS, h >>> 3), wx(x), wz(y), rotAny(h >>> 5), 1, null);
        }
      } else if (cell === 'C') {
        // Civic ring: paved, with towers only on the OUTER band of the ring —
        // a full lattice walls the plaza in and towers hide one another.
        add(GROUND_FILE, wx(x), wz(y), 0, 1, null);
        if (x % 2 === 1 && y % 2 === 1 && ringDist(x, y) >= 7) {
          add(pick(CIVIC_POOL, h), wx(x), wz(y), (h % 4) * HPI, 1, null);
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
        } else if (h % 10 < 8) {
          const big = (h % 100 < 60) ? pick(TREES, h) : (h % 100 < 85 ? pick(BUSHES, h >>> 2) : pick(ROCKS, h >>> 3));
          add(big, wx(x), wz(y), rotAny(h), 0.8 + (h % 35) / 100, null);
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
        }
      } else if (cell === 'T') {
        // Pine forest, with clearings.
        if (h % 10 < 7) add(pick(PINES, h), wx(x), wz(y), rotAny(h), 0.8 + (h % 45) / 100, null);
        else if (h % 29 === 0) add(pick(ROCKS, h >>> 3), wx(x), wz(y), rotAny(h), 0.7 + (h % 30) / 100, null);
        else if (h % 13 === 0) add(pick(BUSHES, h >>> 2), wx(x), wz(y), rotAny(h), 0.7, null);
      } else if (cell === 'G') {
        // Open countryside: sparse, calm.
        if (h % 41 === 0) add(pick(BUSHES, h >>> 2), wx(x), wz(y), rotAny(h), 0.6 + (h % 25) / 100, null);
        else if (h % 97 === 3) add(pick(TREES, h), wx(x), wz(y), rotAny(h), 0.7 + (h % 30) / 100, null);
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
    clickCells,
  };
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

// The river: one instanced water tile per 'W' cell, slightly below street
// level so the banks read as a cut, with bridges (road tiles) passing over.
function RiverLayer({ cells }) {
  const ref = useRef();
  const count = cells.length;
  const instances = useMemo(() => cells.map(([x, z]) => [x, z, 0, 1]), [cells]);
  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(TILE * 1.02, TILE * 1.02);
    g.rotateX(-Math.PI / 2);
    return g;
  }, []);
  const material = useMemo(() => new THREE.MeshStandardMaterial({ color: '#4d86c8' }), []);

  useEffect(() => { applyMatrices(ref.current, instances); }, [instances, count]);
  useEffect(() => () => { geometry.dispose(); material.dispose(); }, [geometry, material]);

  if (!count) return null;
  return (
    <instancedMesh ref={ref} args={[geometry, material, count]} position={[0, 0.025, 0]} receiveShadow frustumCulled={false} />
  );
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

  useEffect(() => { applyMatrices(ref.current, instances); }, [instances, count]);
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
    applyMatrices(ref.current, instances);
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

function InstancedModel({ url, normMode, normV, instances, pick, onPick, downPos, sway = false }) {
  const { scene } = useGLTF(url);
  const data = useMemo(() => extractGeoMat(scene, normMode, normV), [scene, normMode, normV]);
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
      _p.set(x, 0, z);
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

  useEffect(() => { applyMatrices(ref.current, instances); }, [instances, data, count]);
  // Dispose the cloned geometry on unmount to avoid leaking GPU memory across
  // re-mounts (the gltf material is shared/cached, so we don't touch it).
  useEffect(() => () => { data?.geometry?.dispose(); }, [data]);

  if (!data || !count) return null;
  return (
    <instancedMesh ref={ref} args={[data.geometry, data.material, count]} castShadow receiveShadow frustumCulled={false} {...pickHandlers(pick, onPick, downPos)} />
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
  return (
    <group>
      {/* Beach shelf — slightly wider than the city, dips into the sea. (The old
          soil box's top sat at y=0, ABOVE the grass plane, so the whole city
          floor rendered brown.) */}
      <mesh position={[0, -0.31, 0]} receiveShadow>
        <boxGeometry args={[w + 7, 0.5, d + 7]} />
        <meshStandardMaterial color="#d9c79c" />
      </mesh>
      {/* Grass the city sits on */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[w, d]} />
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
