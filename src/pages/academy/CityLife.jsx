import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import {
  TILE, CARS, PEOPLE, SAIL_BOATS, SPEED_BOATS, MOORED_BOATS, BUOYS,
  modelUrl, normFor, hashCell,
} from './cityModels.js';
import { extractGeoMat, Y_AXIS } from './cityRender.js';

/**
 * The animated layer of the academy city: driving cars, walking pedestrians,
 * circling gulls, drifting clouds and sailing boats. Everything is GPU-
 * instanced; per-frame work is only matrix recomposition for a few hundred
 * instances. The static city (buildings, roads, props) lives in CityMap3D.
 */
export default function CityLife({ layout, originX, originZ, islandW, islandD }) {
  return (
    <group>
      {CARS.map((file, i) => (
        <RoadMovers
          key={file}
          url={modelUrl(file)}
          norm={normFor(file)}
          count={34}
          kind="drive"
          seed={101 + i * 17}
          layout={layout}
          originX={originX}
          originZ={originZ}
        />
      ))}
      {PEOPLE.map((file, i) => (
        <RoadMovers
          key={file}
          url={modelUrl(file)}
          norm={normFor(file)}
          count={20}
          kind="walk"
          seed={501 + i * 13}
          layout={layout}
          originX={originX}
          originZ={originZ}
        />
      ))}
      {PEOPLE.map((file, i) => (
        <PathWalkers
          key={`path-${file}`}
          url={modelUrl(file)}
          norm={normFor(file)}
          count={16}
          seed={901 + i * 11}
          layout={layout}
          originX={originX}
          originZ={originZ}
        />
      ))}
      <Birds islandW={islandW} />
      <Clouds islandW={islandW} />
      {SAIL_BOATS.map((file, i) => (
        <OrbitBoats key={file} file={file} count={3} ringPad={8} speedMul={1} seed={61 + i * 7} islandW={islandW} islandD={islandD} />
      ))}
      {SPEED_BOATS.map((file, i) => (
        <OrbitBoats key={file} file={file} count={2} ringPad={26} speedMul={2.6} seed={113 + i * 11} islandW={islandW} islandD={islandD} />
      ))}
      <Harbour islandD={islandD} />
    </group>
  );
}

const ROAD_TOP = 0.1; // road tiles are thin slabs; movers ride on the surface

// Build the per-instance route parameters for cars/pedestrians. Each mover
// travels one drivable run from the plan — city streets stay in town,
// highways go coast to coast — wrapping within that road's span. Pedestrians
// only use sidewalks of roads flagged walkable (city streets).
function buildRoutes(count, layout, originX, originZ, kind, seed) {
  const { carRoads = [] } = layout;
  const all = carRoads.map((r) => ({
    axis: r.axis,
    w: r.cell * TILE - (r.axis === 'z' ? originX : originZ),
    a: r.a * TILE - (r.axis === 'z' ? originZ : originX),
    b: r.b * TILE - (r.axis === 'z' ? originZ : originX),
    walk: r.walk !== false,
  }));
  const roads = kind === 'walk' ? all.filter((r) => r.walk) : all;
  if (!roads.length) return [];
  const out = [];
  for (let i = 0; i < count; i += 1) {
    const h = hashCell(seed + i * 7, seed * 3 + i * 11);
    const road = roads[h % roads.length];
    const dir = (h >>> 3) % 2 ? 1 : -1;
    const laneMag = kind === 'drive' ? 0.21 * TILE : 0.42 * TILE;
    // Cars keep to their direction's lane; pedestrians use either sidewalk.
    const laneSide = kind === 'drive' ? dir : ((h >>> 9) % 2 ? 1 : -1);
    out.push({
      road,
      dir,
      lane: laneMag * laneSide,
      speed: kind === 'drive' ? 3.2 + ((h >>> 5) % 100) / 100 * 2.8 : 0.5 + ((h >>> 5) % 100) / 100 * 0.55,
      s: road.a + (((h >>> 8) % 1000) / 1000) * (road.b - road.a),
      phase: ((h >>> 12) % 628) / 100,
      scale: kind === 'drive' ? 1 : 0.9 + ((h >>> 16) % 25) / 100,
    });
  }
  return out;
}

// Promenade walkers: stroll along the plan's pedestrian polylines (the rambla
// arms, a lap of the plaza, the beach boardwalk). Open paths ping-pong,
// closed loops wrap, and each walker keeps a small sideways offset so a
// crowd doesn't collapse into single file.
function buildPathRoutes(count, layout, originX, originZ, seed) {
  const paths = (layout.walkPaths || []).map((path) => {
    const pts = path.map(([cx, cy]) => [cx * TILE - originX, cy * TILE - originZ]);
    const segs = [];
    let total = 0;
    for (let i = 0; i < pts.length - 1; i += 1) {
      const dx = pts[i + 1][0] - pts[i][0];
      const dz = pts[i + 1][1] - pts[i][1];
      const len = Math.hypot(dx, dz) || 1;
      segs.push({ x: pts[i][0], z: pts[i][1], dx: dx / len, dz: dz / len, len, start: total });
      total += len;
    }
    const closed = pts.length > 2
      && pts[0][0] === pts[pts.length - 1][0] && pts[0][1] === pts[pts.length - 1][1];
    return { segs, total, closed };
  }).filter((p) => p.segs.length);
  if (!paths.length) return [];
  const out = [];
  for (let i = 0; i < count; i += 1) {
    const h = hashCell(seed * 5 + i * 19, seed + i * 3);
    const path = paths[h % paths.length];
    out.push({
      path,
      s: (((h >>> 7) % 1000) / 1000) * path.total,
      dir: (h >>> 4) % 2 ? 1 : -1,
      speed: 0.45 + ((h >>> 5) % 100) / 100 * 0.5,
      side: ((((h >>> 10) % 100) / 100) - 0.5) * 1.1,
      phase: ((h >>> 12) % 628) / 100,
      scale: 0.9 + ((h >>> 16) % 25) / 100,
    });
  }
  return out;
}

function PathWalkers({ url, norm, count, seed, layout, originX, originZ }) {
  const { scene } = useGLTF(url);
  const [normMode, normV] = norm;
  const data = useMemo(() => extractGeoMat(scene, normMode, normV), [scene, normMode, normV]);
  const routes = useMemo(
    () => buildPathRoutes(count, layout, originX, originZ, seed),
    [count, layout, originX, originZ, seed],
  );
  const ref = useRef();

  useFrame((state, dtRaw) => {
    const mesh = ref.current;
    if (!mesh || !routes.length) return;
    const dt = Math.min(dtRaw, 0.1);
    const t = state.clock.elapsedTime;
    for (let i = 0; i < routes.length; i += 1) {
      const r = routes[i];
      const { path } = r;
      r.s += r.dir * r.speed * dt;
      if (path.closed) {
        if (r.s > path.total) r.s -= path.total;
        else if (r.s < 0) r.s += path.total;
      } else if (r.s > path.total) {
        r.s = path.total; r.dir = -1;        // stroll back the way they came
      } else if (r.s < 0) {
        r.s = 0; r.dir = 1;
      }
      let seg = path.segs[path.segs.length - 1];
      for (let k = 0; k < path.segs.length; k += 1) {
        if (r.s <= path.segs[k].start + path.segs[k].len) { seg = path.segs[k]; break; }
      }
      const along = r.s - seg.start;
      const x = seg.x + seg.dx * along - seg.dz * r.side;
      const z = seg.z + seg.dz * along + seg.dx * r.side;
      const heading = Math.atan2(seg.dx, seg.dz) + (r.dir === 1 ? 0 : Math.PI);
      const y = ROAD_TOP + Math.abs(Math.sin(t * 7 + r.phase)) * 0.04;
      _p.set(x, y, z);
      _q.setFromAxisAngle(Y_AXIS, heading + Math.sin(t * 3.5 + r.phase) * 0.07);
      _s.setScalar(r.scale);
      _m.compose(_p, _q, _s);
      mesh.setMatrixAt(i, _m);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  if (!data || !count || !routes.length) return null;
  return (
    <instancedMesh ref={ref} args={[data.geometry, data.material, routes.length]} castShadow receiveShadow frustumCulled={false} />
  );
}

const _m = new THREE.Matrix4();
const _p = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();

function RoadMovers({ url, norm, count, kind, seed, layout, originX, originZ }) {
  const { scene } = useGLTF(url);
  const [normMode, normV] = norm;
  const data = useMemo(() => extractGeoMat(scene, normMode, normV), [scene, normMode, normV]);
  const routes = useMemo(
    () => buildRoutes(count, layout, originX, originZ, kind, seed),
    [count, layout, originX, originZ, kind, seed],
  );
  const ref = useRef();

  useFrame((state, dtRaw) => {
    const mesh = ref.current;
    if (!mesh) return;
    const dt = Math.min(dtRaw, 0.1); // tab-refocus spikes shouldn't teleport anyone
    const t = state.clock.elapsedTime;
    for (let i = 0; i < routes.length; i += 1) {
      const r = routes[i];
      r.s += r.dir * r.speed * dt;
      if (r.s > r.road.b) r.s = r.road.a;
      else if (r.s < r.road.a) r.s = r.road.b;
      const x = r.road.axis === 'z' ? r.road.w + r.lane : r.s;
      const z = r.road.axis === 'z' ? r.s : r.road.w + r.lane;
      let rotY = r.road.axis === 'z'
        ? (r.dir === 1 ? 0 : Math.PI)
        : (r.dir === 1 ? Math.PI / 2 : -Math.PI / 2);
      let y = ROAD_TOP;
      if (kind === 'walk') {
        y += Math.abs(Math.sin(t * 7 + r.phase)) * 0.04; // step bob
        rotY += Math.sin(t * 3.5 + r.phase) * 0.07;      // gait sway
      }
      _p.set(x, y, z);
      _q.setFromAxisAngle(Y_AXIS, rotY);
      _s.setScalar(r.scale);
      _m.compose(_p, _q, _s);
      mesh.setMatrixAt(i, _m);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  if (!data || !count) return null;
  return (
    <instancedMesh ref={ref} args={[data.geometry, data.material, count]} castShadow receiveShadow frustumCulled={false} />
  );
}

// A dozen gulls circling over the island.
function Birds({ islandW }) {
  const ref = useRef();
  const birds = useMemo(() => {
    const arr = [];
    for (let i = 0; i < 16; i += 1) {
      const h = hashCell(901 + i * 3, 77 + i * 31);
      arr.push({
        cx: (((h >>> 4) % 100) / 100 - 0.5) * islandW * 0.6,
        cz: (((h >>> 9) % 100) / 100 - 0.5) * islandW * 0.6,
        r: 16 + ((h >>> 14) % 100) / 100 * 62,
        w: (0.07 + ((h >>> 6) % 100) / 100 * 0.1) * ((h >>> 5) % 2 ? 1 : -1),
        y: 9 + ((h >>> 11) % 100) / 100 * 6,
        phase: ((h >>> 7) % 628) / 100,
      });
    }
    return arr;
  }, [islandW]);
  const geometry = useMemo(() => new THREE.BoxGeometry(0.95, 0.05, 0.24), []);
  const material = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false }), []);

  useFrame((state) => {
    const mesh = ref.current;
    if (!mesh) return;
    const t = state.clock.elapsedTime;
    for (let i = 0; i < birds.length; i += 1) {
      const b = birds[i];
      const a = t * b.w + b.phase;
      _p.set(b.cx + Math.cos(a) * b.r, b.y + Math.sin(t * 2.1 + b.phase) * 0.5, b.cz + Math.sin(a) * b.r);
      // Face along the tangent of the circle; flap = wing-stretch pulse.
      _q.setFromAxisAngle(Y_AXIS, -a + (b.w > 0 ? 0 : Math.PI));
      const flap = 0.7 + Math.abs(Math.sin(t * 6 + b.phase)) * 0.5;
      _s.set(1, 1, flap);
      _m.compose(_p, _q, _s);
      mesh.setMatrixAt(i, _m);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return <instancedMesh ref={ref} args={[geometry, material, birds.length]} frustumCulled={false} />;
}

// Soft clouds drifting across the island, well above the skyline.
function Clouds({ islandW }) {
  const ref = useRef();
  const clouds = useMemo(() => {
    const arr = [];
    for (let i = 0; i < 10; i += 1) {
      const h = hashCell(601 + i * 5, 13 + i * 23);
      arr.push({
        x: (((h >>> 3) % 200) / 100 - 1) * (islandW * 0.7),
        z: (((h >>> 8) % 200) / 100 - 1) * (islandW * 0.45),
        y: 21 + ((h >>> 13) % 100) / 100 * 9,
        speed: 0.6 + ((h >>> 5) % 100) / 100 * 0.7,
        scale: 6 + ((h >>> 10) % 100) / 100 * 6,
        rot: ((h >>> 6) % 628) / 100,
      });
    }
    return arr;
  }, [islandW]);
  const geometry = useMemo(() => {
    const lobe = (sx, sy, sz, tx, ty, tz) => {
      const g = new THREE.SphereGeometry(1, 10, 8);
      g.scale(sx, sy, sz);
      g.translate(tx, ty, tz);
      return g.toNonIndexed();
    };
    return mergeGeometries([
      lobe(1.2, 0.55, 0.9, 0, 0, 0),
      lobe(0.85, 0.45, 0.7, 1.15, -0.08, 0.25),
      lobe(0.8, 0.4, 0.65, -1.05, -0.1, -0.2),
    ], false);
  }, []);
  const material = useMemo(
    () => new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.82, depthWrite: false, toneMapped: false }),
    [],
  );

  useFrame((state, dtRaw) => {
    const mesh = ref.current;
    if (!mesh) return;
    const dt = Math.min(dtRaw, 0.1);
    const limit = islandW * 0.85 + 30;
    for (let i = 0; i < clouds.length; i += 1) {
      const c = clouds[i];
      c.x += c.speed * dt;
      if (c.x > limit) c.x = -limit;
      _p.set(c.x, c.y, c.z);
      _q.setFromAxisAngle(Y_AXIS, c.rot);
      _s.setScalar(c.scale);
      _m.compose(_p, _q, _s);
      mesh.setMatrixAt(i, _m);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return <instancedMesh ref={ref} args={[geometry, material, clouds.length]} frustumCulled={false} />;
}

const _roll = new THREE.Quaternion();
const X_AXIS = new THREE.Vector3(1, 0, 0);

// Real Kenney watercraft lapping the island on elliptical courses — sailboats
// close in, speedboats further out and faster.
function OrbitBoats({ file, count, ringPad, speedMul, seed, islandW, islandD }) {
  const { scene } = useGLTF(modelUrl(file));
  const [normMode, normV] = normFor(file);
  const data = useMemo(() => extractGeoMat(scene, normMode, normV), [scene, normMode, normV]);
  const boats = useMemo(() => Array.from({ length: count }, (_, i) => {
    const h = hashCell(seed + i * 9, 41 + i * 13);
    return {
      rx: islandW / 2 + ringPad + (h % 14),
      rz: islandD / 2 + ringPad + ((h >>> 4) % 14),
      w: (0.028 + ((h >>> 5) % 100) / 100 * 0.03) * ((i % 2) ? 1 : -1) * speedMul,
      phase: ((h >>> 7) % 628) / 100,
    };
  }), [count, ringPad, speedMul, seed, islandW, islandD]);
  const ref = useRef();

  useFrame((state) => {
    const mesh = ref.current;
    if (!mesh) return;
    const t = state.clock.elapsedTime;
    for (let i = 0; i < boats.length; i += 1) {
      const b = boats[i];
      const a = t * b.w + b.phase;
      const x = Math.cos(a) * b.rx;
      const z = Math.sin(a) * b.rz;
      const y = -0.36 + Math.sin(t * 1.3 + b.phase) * 0.05;
      const heading = Math.atan2(Math.cos(a) * b.rz, -Math.sin(a) * b.rx) + (b.w < 0 ? Math.PI : 0);
      _p.set(x, y, z);
      _q.setFromAxisAngle(Y_AXIS, heading);
      _roll.setFromAxisAngle(X_AXIS, Math.sin(t * 1.1 + b.phase) * 0.06);
      _q.multiply(_roll);
      _s.setScalar(1);
      _m.compose(_p, _q, _s);
      mesh.setMatrixAt(i, _m);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  if (!data || !count) return null;
  return <instancedMesh ref={ref} args={[data.geometry, data.material, count]} frustumCulled={false} />;
}

// The little harbour off the river mouth on the south coast: moored fishing
// boats, a tug, a houseboat and a couple of buoys, all riding the swell.
function Harbour({ islandD }) {
  const moored = useMemo(() => {
    const out = [];
    MOORED_BOATS.forEach((file, i) => {
      out.push({ file, x: -34 + i * 16, z: islandD / 2 + 10 + (hashCell(i, 5) % 12), phase: i * 1.7, head: (hashCell(i, 9) % 628) / 100 });
    });
    BUOYS.forEach((file, i) => {
      out.push({ file, x: -20 + i * 26, z: islandD / 2 + 4, phase: 2 + i, head: 0 });
    });
    return out;
  }, [islandD]);
  return (
    <group>
      {moored.map((m) => <BobbingModel key={m.file + m.x} {...m} />)}
    </group>
  );
}

function BobbingModel({ file, x, z, phase, head }) {
  const { scene } = useGLTF(modelUrl(file));
  const [normMode, normV] = normFor(file);
  const data = useMemo(() => extractGeoMat(scene, normMode, normV), [scene, normMode, normV]);
  const ref = useRef();
  useFrame((state) => {
    const mesh = ref.current;
    if (!mesh) return;
    const t = state.clock.elapsedTime;
    mesh.position.set(x, -0.36 + Math.sin(t * 1.1 + phase) * 0.05, z);
    mesh.rotation.set(Math.sin(t * 0.9 + phase) * 0.05, head + Math.sin(t * 0.4 + phase) * 0.08, 0);
  });
  if (!data) return null;
  return <mesh ref={ref} geometry={data.geometry} material={data.material} />;
}
