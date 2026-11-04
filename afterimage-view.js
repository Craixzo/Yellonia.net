/* ==============================================================
   afterimage-view.js - the 3D clip and live viewer (afterimage-view.html)

     afterimage-view.html?code=neon-harbor-falcon   a clip
     afterimage-view.html?live=L3                   a live event (needs a Discord login)

   THE MAP
     Put the 3D map at  maps/<mapId>.glb  (mapId comes from the game's Config module,
     e.g. maps/scarsen.glb). Without it, players move over a plain grid.
     Better: run the Scanner from Studio's Command Bar and the map comes from Afterimage
     itself (GET /maps/<mapId>), no file needed. The .glb is only used when there's no scan.
     If a .glb sits in the wrong place, add maps/<mapId>.json:
       { "offset": [0, 0, 0], "scale": 1, "rotateY": 0 }
     (offset in studs, rotateY in degrees). See the README for how to export the map.

   CONTENTS
     1. SETTINGS ......... colors, sizes, camera
     2. PAGE ............. title strip, errors
     3. SCENE ............ renderer, lights, map
     4. PLAYERS .......... bodies, aim lines, labels, vehicles
     5. TIME ............. interpolation between samples
     6. CAMERA ........... map, freecam, follow, their view
     7. DRAW ............. players, shots, kill-distance lines
     8. TIMEBAR .......... play/pause, speed, seeking, kill ticks
     9. SIDE PANEL ....... players, selected player + CatWatcher, kill feed
    10. CLIP ............. load a clip, real video switch
    11. LIVE ............. watch a live event over the websocket
    12. MAIN LOOP
   ============================================================== */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

const AI = window.AI;
const $ = (id) => document.getElementById(id);
const el = AI.el;


/* ---------- 1. SETTINGS ---------- */
const LOOK = {
  background: 0x0c0d0f,
  fog: 0x0c0d0f,
  fogFar: 2600,            /* studs; things further away fade out */
  grid: 0x1c1f23,
  lime: 0xbed215,
  shot: 0xf0f2ec,
  aimLength: 40,           /* studs */
  killLineSeconds: 3,      /* how long a kill's distance line stays up */
  shotSeconds: 0.18,
  povFov: 70,
  followDistance: 22,
  liveKeepSeconds: 300,
};


/* ---------- 2. PAGE ---------- */
const params = new URLSearchParams(location.search);
const clipCode = (params.get('code') || '').toLowerCase();
const liveId = params.get('live');

function fail(title, text, button) {
  $('ai-title').textContent = title;
  $('ai-viewer').hidden = true;
  const box = $('ai-missing');
  box.hidden = false;
  box.replaceChildren();
  if (button === 'login') box.appendChild(AI.loginCard(title, text));
  else {
    box.appendChild(el('h2', null, title));
    box.appendChild(el('p', null, text));
    const a = el('a', 'button-primary', 'Back to Afterimage'); a.href = 'afterimage.html';
    box.appendChild(a);
  }
}


/* ---------- 3. SCENE ---------- */
const viewport = $('ai-viewport');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
viewport.prepend(renderer.domElement);

const labels = new CSS2DRenderer({ element: $('ai-labels') });

const scene = new THREE.Scene();
scene.background = new THREE.Color(LOOK.background);
scene.fog = new THREE.Fog(LOOK.fog, 400, LOOK.fogFar);
scene.add(new THREE.HemisphereLight(0xc9d6e6, 0x1a1b1e, 1.6));
const sun = new THREE.DirectionalLight(0xffffff, 1.6);
sun.position.set(300, 600, 200);
scene.add(sun);

const camera = new THREE.PerspectiveCamera(55, 16 / 10, 0.5, 8000);
camera.position.set(120, 140, 160);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.12;
controls.maxDistance = 4000;

function resize() {
  const w = viewport.clientWidth, h = viewport.clientHeight;
  if (!w || !h) return;
  renderer.setSize(w, h, false);
  labels.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(viewport);

let grid = null;
function drawGrid(center, size) {
  if (grid) scene.remove(grid);
  grid = new THREE.Group();
  const lines = new THREE.GridHelper(size, Math.round(size / 20), LOOK.grid, LOOK.grid);
  lines.position.set(center.x, center.y - 3, center.z);
  grid.add(lines);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshStandardMaterial({ color: 0x111316, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(center.x, center.y - 3.05, center.z);
  grid.add(ground);
  scene.add(grid);
}

/* The map, in this order:
     1. a scan from the Roblox Scanner module, kept on Afterimage (GET /maps/<mapId>)
     2. a 3D file in the site's maps/ folder (maps/<mapId>.glb)
     3. a plain grid (already drawn) */
async function loadMap(mapId) {
  if (!mapId) { $('ai-loading').hidden = true; return false; }
  $('ai-loading').hidden = false;
  if (await loadScan(mapId)) { $('ai-loading').hidden = true; return true; }
  return loadGlb(mapId);
}

async function loadGlb(mapId) {
  let fix = { offset: [0, 0, 0], scale: 1, rotateY: 0 };
  try {
    const r = await fetch('maps/' + mapId + '.json');
    if (r.ok) fix = Object.assign(fix, await r.json());
  } catch (e) { /* no calibration file: that's fine */ }
  return new Promise((resolve) => {
    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
    loader.load('maps/' + mapId + '.glb', (gltf) => {
      const map = gltf.scene;
      map.scale.setScalar(fix.scale || 1);
      map.rotation.y = THREE.MathUtils.degToRad(fix.rotateY || 0);
      map.position.set(fix.offset[0] || 0, fix.offset[1] || 0, fix.offset[2] || 0);
      map.traverse((o) => { if (o.isMesh) { o.matrixAutoUpdate = false; o.updateMatrix(); } });
      scene.add(map);
      $('ai-loading').hidden = true;
      resolve(true);
    }, (p) => {
      if (p.total) $('ai-loading').textContent = 'Loading the map… ' + Math.round(p.loaded / p.total * 100) + '%';
    }, () => { $('ai-loading').hidden = true; resolve(false); });
  });
}

/* ----- scanned maps -----
   Each part: [shape, x,y,z, rx,ry,rz, sx,sy,sz, color, material, transparency]
   shape: 0 block, 1 wedge, 2 corner wedge, 3 cylinder, 4 ball, 5 mesh/union (drawn as a box) */
const METALS = ['Metal', 'DiamondPlate', 'CorrodedMetal', 'Foil'];
const GLASSY = ['Glass', 'ForceField'];

function wedgeGeometry() {
  /* Roblox wedge: full bottom and back (+Z), sloping down to the front (-Z) */
  const A = [-0.5, -0.5, -0.5], B = [0.5, -0.5, -0.5], C = [-0.5, -0.5, 0.5], Dd = [0.5, -0.5, 0.5], E = [-0.5, 0.5, 0.5], F = [0.5, 0.5, 0.5];
  const tris = [A, Dd, B, A, C, Dd, C, F, Dd, C, E, F, A, B, F, A, F, E, A, E, C, B, Dd, F];
  const g = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(tris.flat(), 3));
  g.computeVertexNormals();
  return g;
}
function cornerWedgeGeometry() {
  /* close enough: square bottom, peak over one corner */
  const P1 = [-0.5, -0.5, -0.5], P2 = [0.5, -0.5, -0.5], P3 = [0.5, -0.5, 0.5], P4 = [-0.5, -0.5, 0.5], T = [0.5, 0.5, -0.5];
  const tris = [P1, P2, P3, P1, P3, P4, P1, T, P2, P2, T, P3, P3, T, P4, P4, T, P1];
  const g = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(tris.flat(), 3));
  g.computeVertexNormals();
  return g;
}

const SHAPES = [
  () => new THREE.BoxGeometry(1, 1, 1),
  wedgeGeometry,
  cornerWedgeGeometry,
  () => new THREE.CylinderGeometry(0.5, 0.5, 1, 18).rotateZ(Math.PI / 2),   /* Roblox cylinders lie along X */
  () => new THREE.SphereGeometry(0.5, 16, 12),
  () => new THREE.BoxGeometry(1, 1, 1),
];
const KINDS = {
  solid: () => new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0 }),
  metal: () => new THREE.MeshStandardMaterial({ roughness: 0.4, metalness: 0.6 }),
  neon:  () => new THREE.MeshBasicMaterial({ toneMapped: false }),
  glass: () => new THREE.MeshStandardMaterial({ roughness: 0.1, metalness: 0.1, transparent: true, opacity: 0.4, depthWrite: false }),
};

async function loadScan(mapId) {
  if (!base) return false;
  let map;
  try {
    $('ai-loading').textContent = 'Loading the map…';
    const r = await fetch(base + '/maps/' + encodeURIComponent(mapId));
    if (!r.ok) return false;
    map = await r.json();
  } catch (e) { return false; }
  if (!map || !Array.isArray(map.parts)) return false;

  const group = new THREE.Group();
  group.name = 'scanned-map';
  const kindOf = (row) => {
    const mat = map.materials[row[11]] || '';
    if (mat === 'Neon') return 'neon';
    if (row[12] > 0.05 || GLASSY.includes(mat)) return 'glass';
    if (METALS.includes(mat)) return 'metal';
    return 'solid';
  };
  /* count first, then fill one InstancedMesh per shape + kind */
  const counts = {};
  map.parts.forEach((row) => { const k = row[0] + '|' + kindOf(row); counts[k] = (counts[k] || 0) + 1; });
  const meshes = {}, fill = {};
  Object.keys(counts).forEach((k) => {
    const [shape, kind] = k.split('|');
    const material = KINDS[kind]();
    if (shape === '1' || shape === '2') material.side = THREE.DoubleSide;
    const mesh = new THREE.InstancedMesh((SHAPES[shape] || SHAPES[0])(), material, counts[k]);
    mesh.matrixAutoUpdate = false;
    meshes[k] = mesh; fill[k] = 0;
    group.add(mesh);
  });
  const m4 = new THREE.Matrix4(), pos = new THREE.Vector3(), quat = new THREE.Quaternion(), scl = new THREE.Vector3(), eul = new THREE.Euler(0, 0, 0, 'YXZ'), col = new THREE.Color();
  map.parts.forEach((row) => {
    const k = row[0] + '|' + kindOf(row);
    pos.set(row[1], row[2], row[3]);
    quat.setFromEuler(eul.set(row[4], row[5], row[6], 'YXZ'));
    scl.set(row[7] || 0.01, row[8] || 0.01, row[9] || 0.01);
    m4.compose(pos, quat, scl);
    meshes[k].setMatrixAt(fill[k], m4);
    meshes[k].setColorAt(fill[k], col.setHex(row[10]));
    fill[k]++;
  });
  Object.values(meshes).forEach((m) => { m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; m.computeBoundingSphere(); });

  if (map.terrain) group.add(...terrainMeshes(map.terrain));
  scene.add(group);
  return true;
}

/* Terrain: a height map with each sample's colour, plus see-through water */
function terrainMeshes(t) {
  const out = [];
  const build = (heightOf, colorOf, material) => {
    const positions = [], colors = [], index = [], vid = new Int32Array(t.w * t.h).fill(-1);
    const c = new THREE.Color();
    for (let gz = 0; gz < t.h; gz++) for (let gx = 0; gx < t.w; gx++) {
      const i = gz * t.w + gx, y = heightOf(i);
      if (y == null) continue;
      vid[i] = positions.length / 3;
      positions.push(t.x0 + gx * t.step, y, t.z0 + gz * t.step);
      c.setHex(colorOf(i)); colors.push(c.r, c.g, c.b);
    }
    for (let gz = 0; gz < t.h - 1; gz++) for (let gx = 0; gx < t.w - 1; gx++) {
      const a = vid[gz * t.w + gx], b = vid[gz * t.w + gx + 1], cc = vid[(gz + 1) * t.w + gx], d = vid[(gz + 1) * t.w + gx + 1];
      if (a < 0 || b < 0 || cc < 0 || d < 0) continue;
      index.push(a, cc, b, b, cc, d);
    }
    if (!index.length) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    g.setIndex(index);
    g.computeVertexNormals();
    return new THREE.Mesh(g, material);
  };
  const land = build((i) => t.heights[i], (i) => t.palette[t.mats[i]] ?? 0x5a6b45,
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }));
  if (land) out.push(land);
  const water = build((i) => t.water[i], () => t.waterColor || 0x0c545c,
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.15, metalness: 0.2, transparent: true, opacity: 0.7, depthWrite: false }));
  if (water) out.push(water);
  return out;
}


/* ---------- 4. PLAYERS ---------- */
let D = null;                 /* the data: { rate, players, vehicles, frames, events } */
const bodies = new Map();     /* pid -> { group, mat, aim, label, nameEl, hpEl } */
const cars = new Map();       /* vid -> { group, label } */
const bodyGeo = new THREE.CapsuleGeometry(0.9, 2.8, 4, 10);
const headGeo = new THREE.SphereGeometry(0.6, 14, 10);
const visorGeo = new THREE.BoxGeometry(0.8, 0.25, 0.3);

function colorOf(pid) { return (D.players[pid] && D.players[pid].c) || '#949ba4'; }
function nameOf(pid) { return pid == null ? 'World' : (D.players[pid] && D.players[pid].n) || 'Player'; }

function bodyFor(pid) {
  if (bodies.has(pid)) return bodies.get(pid);
  const color = new THREE.Color(colorOf(pid));
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.55, emissive: color, emissiveIntensity: 0.25, transparent: true });
  const group = new THREE.Group();
  const torso = new THREE.Mesh(bodyGeo, mat); torso.position.y = -0.6; group.add(torso);
  const head = new THREE.Mesh(headGeo, mat); head.position.y = 2.1; group.add(head);
  const visor = new THREE.Mesh(visorGeo, new THREE.MeshBasicMaterial({ color: LOOK.lime })); visor.position.set(0, 2.15, -0.55); group.add(visor);
  scene.add(group);

  const aimGeo = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(6), 3));
  const aim = new THREE.Line(aimGeo, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.45 }));
  aim.frustumCulled = false;
  scene.add(aim);

  const tag = el('div', 'ai-tag');
  tag.style.setProperty('--team', colorOf(pid));
  const nameEl = el('span', 'ai-tag-name', nameOf(pid));
  const hpEl = el('span', 'ai-tag-hp'); hpEl.appendChild(el('i'));
  tag.appendChild(nameEl); tag.appendChild(hpEl);
  tag.addEventListener('click', () => select(pid, true));
  const label = new CSS2DObject(tag);
  label.position.y = 3.6;
  group.add(label);

  const b = { group, mat, aim, label, tag, nameEl, hpEl };
  bodies.set(pid, b);
  return b;
}

function carFor(vid) {
  if (cars.has(vid)) return cars.get(vid);
  const meta = (D.vehicles && D.vehicles[vid]) || { n: 'Vehicle', s: [6, 4, 12] };
  const geo = new THREE.BoxGeometry(meta.s[0], meta.s[1], meta.s[2]);
  const group = new THREE.Group();
  group.add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0x23262b, roughness: 0.8, transparent: true, opacity: 0.85 })));
  group.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: LOOK.lime, transparent: true, opacity: 0.6 })));
  group.rotation.order = 'YXZ';
  const tag = el('div', 'ai-tag ai-tag-car', meta.n);
  const label = new CSS2DObject(tag);
  label.position.y = meta.s[1] / 2 + 1.5;
  group.add(label);
  scene.add(group);
  const c = { group, label };
  cars.set(vid, c);
  return c;
}


/* ---------- 5. TIME ---------- */
let t = 0, t0 = 0, t1 = 0, playing = false, speed = 1;
let atLiveEdge = true;

function indexFrames(from) {
  for (let i = from || 0; i < D.frames.length; i++) {
    const f = D.frames[i];
    if (f.byPid) continue;
    f.byPid = new Map(f.p.map((row) => [row[0], row]));
    f.byVid = new Map((f.v || []).map((row) => [row[0], row]));
  }
  t0 = D.frames.length ? D.frames[0].t : 0;
  t1 = D.frames.length ? D.frames[D.frames.length - 1].t : 0;
}

function frameIndexAt(time) {   /* the last frame at or before time */
  let lo = 0, hi = D.frames.length - 1;
  if (hi < 0) return -1;
  if (time <= D.frames[0].t) return 0;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (D.frames[mid].t <= time) lo = mid; else hi = mid - 1;
  }
  return lo;
}

const lerp = (a, b, k) => a + (b - a) * k;
function lerpAngle(a, b, k) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * k;
}

/* The state of everyone at this moment, blended between the two nearest samples */
function stateAt(time) {
  const i = frameIndexAt(time);
  if (i < 0) return { players: new Map(), vehicles: new Map() };
  const A = D.frames[i], B = D.frames[Math.min(i + 1, D.frames.length - 1)];
  const k = B.t > A.t ? THREE.MathUtils.clamp((time - A.t) / (B.t - A.t), 0, 1) : 0;
  const players = new Map(), vehicles = new Map();
  A.byPid.forEach((a, pid) => {
    const b = B.byPid.get(pid);
    if (!b || Math.hypot(b[1] - a[1], b[3] - a[3]) > 60) { players.set(pid, a); return; }   /* respawned: don't slide across the map */
    players.set(pid, [pid, lerp(a[1], b[1], k), lerp(a[2], b[2], k), lerp(a[3], b[3], k), lerpAngle(a[4], b[4], k),
      lerpAngle(a[5], b[5], k), lerp(a[6], b[6], k), k < 0.5 ? a[7] : b[7], k < 0.5 ? a[8] : b[8],
      lerp(a[9], b[9], k), lerp(a[10], b[10], k), lerp(a[11], b[11], k), lerpAngle(a[12], b[12], k), lerp(a[13], b[13], k)]);
  });
  A.byVid.forEach((a, vid) => {
    const b = B.byVid.get(vid) || a;
    vehicles.set(vid, [vid, lerp(a[1], b[1], k), lerp(a[2], b[2], k), lerp(a[3], b[3], k), lerpAngle(a[4], b[4], k), lerpAngle(a[5], b[5], k), lerpAngle(a[6], b[6], k)]);
  });
  return { players, vehicles };
}

const dirOf = (yaw, pitch) => new THREE.Vector3(-Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch));


/* ---------- 6. CAMERA ---------- */
let mode = 'free', followPid = null, lastFollowPos = null;
const HINTS = {
  map: 'Drag to move, scroll to zoom.',
  free: 'Drag to look around, right-drag to move, scroll to zoom.',
  follow: 'Following {name}. Drag to look around them.',
  pov: 'Seeing what {name} saw.',
};

function setMode(next) {
  if ((next === 'follow' || next === 'pov') && followPid == null) followPid = defaultPid();
  mode = next;
  document.querySelectorAll('.ai-mode').forEach((b) => b.classList.toggle('is-on', b.dataset.mode === mode));
  $('ai-hint').textContent = HINTS[mode].replace('{name}', nameOf(followPid));
  controls.enabled = mode !== 'pov';
  camera.fov = mode === 'pov' ? LOOK.povFov : 55;
  camera.updateProjectionMatrix();
  if (mode === 'map') {
    controls.minPolarAngle = 0; controls.maxPolarAngle = 0.0001;
    controls.mouseButtons = { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN };
    controls.touches = { ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_PAN };
    const c = controls.target.clone();
    camera.position.set(c.x, c.y + 420, c.z + 0.01);
  } else {
    controls.minPolarAngle = 0; controls.maxPolarAngle = Math.PI * 0.49;
    controls.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN };
    controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
  }
  if (mode === 'follow') lastFollowPos = null;
}
document.querySelector('.ai-hud-mode').addEventListener('click', (e) => {
  const b = e.target.closest('.ai-mode');
  if (b) setMode(b.dataset.mode);
});

function defaultPid() {
  if (D.clipperPid != null && D.players[D.clipperPid]) return D.clipperPid;
  const k = killCounts();
  let best = null;
  Object.keys(D.players).forEach((pid) => { pid = Number(pid); if (best == null || (k[pid] || 0) > (k[best] || 0)) best = pid; });
  return best;
}

function placeCamera(state) {
  const row = followPid != null && state.players.get(followPid);
  if (mode === 'follow' && row) {
    const pos = new THREE.Vector3(row[1], row[2] + 2, row[3]);
    if (!lastFollowPos) {
      const back = dirOf(row[4], 0).multiplyScalar(-LOOK.followDistance);
      camera.position.copy(pos).add(back).add(new THREE.Vector3(0, 9, 0));
    } else camera.position.add(pos.clone().sub(lastFollowPos));
    controls.target.copy(pos);
    lastFollowPos = pos;
  } else if (mode === 'pov' && row) {
    camera.position.set(row[9], row[10], row[11]);
    camera.lookAt(camera.position.clone().add(dirOf(row[12], row[13])));
  }
}

function frameAction() {   /* point the camera at the action when a clip opens */
  const f = D.frames[0];
  if (!f || !f.p.length) return;
  const box = new THREE.Box3();
  f.p.forEach((r) => box.expandByPoint(new THREE.Vector3(r[1], r[2], r[3])));
  const c = box.getCenter(new THREE.Vector3());
  const size = Math.max(80, box.getSize(new THREE.Vector3()).length());
  controls.target.copy(c);
  camera.position.set(c.x + size * 0.6, c.y + size * 0.7, c.z + size * 0.8);
  if (!grid) drawGrid(c, Math.max(600, Math.ceil(size * 4 / 100) * 100));
}


/* ---------- 7. DRAW ---------- */
const shotGeo = new THREE.BufferGeometry();
shotGeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(600 * 6), 3));
const shotLines = new THREE.LineSegments(shotGeo, new THREE.LineBasicMaterial({ color: LOOK.shot, transparent: true, opacity: 0.85 }));
shotLines.frustumCulled = false;
scene.add(shotLines);

const killLines = [];   /* pooled: { line, label, tag } */
function killLine(i) {
  if (killLines[i]) return killLines[i];
  const geo = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(6), 3));
  const line = new THREE.Line(geo, new THREE.LineDashedMaterial({ color: LOOK.lime, dashSize: 2.5, gapSize: 1.5, transparent: true }));
  line.frustumCulled = false;
  const tag = el('div', 'ai-tag ai-tag-kill');
  const label = new CSS2DObject(tag);
  scene.add(line); scene.add(label);
  killLines[i] = { line, label, tag };
  return killLines[i];
}

let selectedKill = null;

function draw() {
  const state = stateAt(t);
  const seen = new Set();
  state.players.forEach((row, pid) => {
    seen.add(pid);
    const b = bodyFor(pid);
    const dead = row[7] <= 0 || (row[8] & 8);
    b.group.visible = true;
    b.group.position.set(row[1], row[2], row[3]);
    b.group.rotation.y = row[4];
    b.mat.opacity = dead ? 0.25 : 1;
    b.tag.classList.toggle('is-dead', !!dead);
    b.tag.classList.toggle('is-follow', pid === followPid);
    b.hpEl.firstChild.style.width = Math.max(0, Math.min(100, row[7])) + '%';
    const hide = mode === 'pov' && pid === followPid;
    b.group.visible = !hide;
    b.label.visible = !hide;
    const from = new THREE.Vector3(row[9], row[10], row[11]);
    const to = from.clone().add(dirOf(row[12], row[13]).multiplyScalar(LOOK.aimLength));
    const p = b.aim.geometry.attributes.position;
    p.setXYZ(0, from.x, from.y, from.z); p.setXYZ(1, to.x, to.y, to.z); p.needsUpdate = true;
    b.aim.visible = !dead && !hide;
  });
  bodies.forEach((b, pid) => { if (!seen.has(pid)) { b.group.visible = false; b.label.visible = false; b.aim.visible = false; } });

  const seenCars = new Set();
  state.vehicles.forEach((row, vid) => {
    seenCars.add(vid);
    const c = carFor(vid);
    c.group.visible = true; c.label.visible = true;
    c.group.position.set(row[1], row[2], row[3]);
    c.group.rotation.set(row[4], row[5], row[6], 'YXZ');
  });
  cars.forEach((c, vid) => { if (!seenCars.has(vid)) { c.group.visible = false; c.label.visible = false; } });

  /* shots in the last moment */
  const sp = shotGeo.attributes.position;
  let n = 0;
  for (const e of D.events) {
    if (e.k !== 'shot' || e.t > t || e.t < t - LOOK.shotSeconds || !e.o || !e.h) continue;
    if (n >= 600) break;
    sp.setXYZ(n * 2, e.o[0], e.o[1], e.o[2]); sp.setXYZ(n * 2 + 1, e.h[0], e.h[1], e.h[2]);
    n++;
  }
  shotGeo.setDrawRange(0, n * 2);
  sp.needsUpdate = true;

  /* kill distance lines: recent kills, plus the one picked in the feed */
  let k = 0;
  for (const e of D.events) {
    if (e.k !== 'kill' || !e.ap || !e.bp) continue;
    const recent = e.t <= t && t - e.t < LOOK.killLineSeconds;
    if (!recent && e !== selectedKill) continue;
    const L = killLine(k++);
    const pos = L.line.geometry.attributes.position;
    pos.setXYZ(0, e.ap[0], e.ap[1] + 1, e.ap[2]); pos.setXYZ(1, e.bp[0], e.bp[1] + 1, e.bp[2]); pos.needsUpdate = true;
    L.line.computeLineDistances();
    L.line.material.opacity = e === selectedKill ? 1 : 1 - (t - e.t) / LOOK.killLineSeconds;
    L.line.visible = true; L.label.visible = true;
    L.label.position.set((e.ap[0] + e.bp[0]) / 2, (e.ap[1] + e.bp[1]) / 2 + 3, (e.ap[2] + e.bp[2]) / 2);
    L.tag.textContent = AI.distance(e.d) + (e.hs ? ' · headshot' : '');
    if (k >= 20) break;
  }
  for (let i = k; i < killLines.length; i++) { killLines[i].line.visible = false; killLines[i].label.visible = false; }

  placeCamera(state);
  updateSide(state);
}


/* ---------- 8. TIMEBAR ---------- */
const playBtn = $('ai-play');
function setPlaying(on) {
  playing = on;
  playBtn.classList.toggle('is-playing', on);
  playBtn.setAttribute('aria-label', on ? 'Pause' : 'Play');
}
playBtn.addEventListener('click', () => {
  if (!playing && !liveId && t >= t1 - 0.05) t = t0;
  setPlaying(!playing);
});
$('ai-speed').addEventListener('change', (e) => { speed = Number(e.target.value) || 1; });
document.addEventListener('keydown', (e) => {
  if (e.target.closest('input, textarea, select')) return;
  if (e.code === 'Space') { e.preventDefault(); playBtn.click(); }
  if (e.code === 'ArrowLeft') seek(t - 2);
  if (e.code === 'ArrowRight') seek(t + 2);
});

function seek(time) {
  t = THREE.MathUtils.clamp(time, t0, t1);
  atLiveEdge = !!liveId && t >= t1 - 1.5;
}

const bar = $('ai-timebar');
function seekFromPointer(e) {
  const r = bar.getBoundingClientRect();
  seek(t0 + THREE.MathUtils.clamp((e.clientX - r.left) / r.width, 0, 1) * (t1 - t0));
}
bar.addEventListener('pointerdown', (e) => { bar.setPointerCapture(e.pointerId); seekFromPointer(e); });
bar.addEventListener('pointermove', (e) => { if (bar.hasPointerCapture(e.pointerId)) seekFromPointer(e); });

function drawTicks() {
  const marks = $('ai-marks');
  marks.replaceChildren();
  const span = t1 - t0 || 1;
  D.events.forEach((e) => {
    if (e.k !== 'kill' || e.t < t0 || e.t > t1) return;
    const tick = el('span', 'ai-tick');
    tick.style.left = ((e.t - t0) / span * 100) + '%';
    tick.style.background = e.a == null ? '#949ba4' : colorOf(e.a);
    marks.appendChild(tick);
  });
}

function updateTimebar() {
  const span = t1 - t0 || 1;
  const pct = ((t - t0) / span * 100) + '%';
  $('ai-fill').style.width = pct;
  $('ai-head').style.left = pct;
  $('ai-time').textContent = liveId
    ? (atLiveEdge ? 'Live' : '-' + AI.clock(t1 - t) + ' behind')
    : AI.clock(t - t0) + ' / ' + AI.clock(t1 - t0);
}


/* ---------- 9. SIDE PANEL ---------- */
function killCounts(upTo) {
  const k = {};
  D.events.forEach((e) => { if (e.k === 'kill' && e.a != null && (upTo == null || e.t <= upTo)) k[e.a] = (k[e.a] || 0) + 1; });
  return k;
}
function deathCounts(upTo) {
  const d = {};
  D.events.forEach((e) => { if (e.k === 'kill' && (upTo == null || e.t <= upTo)) d[e.b] = (d[e.b] || 0) + 1; });
  return d;
}

let rows = new Map();
function buildTeams() {
  const box = $('ai-teams');
  box.replaceChildren();
  rows = new Map();
  const teams = {};
  Object.keys(D.players).forEach((pid) => {
    const p = D.players[pid];
    const key = p.t || 'No team';
    (teams[key] = teams[key] || { color: p.c, list: [] }).list.push(Number(pid));
  });
  Object.keys(teams).sort().forEach((name) => {
    const team = teams[name];
    const wrap = el('div', 'ai-team');
    wrap.style.setProperty('--team', team.color);
    const head = el('div', 'ai-team-head');
    head.appendChild(el('span', null, name));
    head.appendChild(el('span', null, 'K / D'));
    wrap.appendChild(head);
    team.list.sort((a, b) => nameOf(a).localeCompare(nameOf(b))).forEach((pid) => {
      const btn = el('button', 'ai-player');
      btn.type = 'button';
      const nm = el('span', 'ai-player-name', nameOf(pid));
      const kd = el('span', 'ai-player-kd', '0 / 0');
      btn.appendChild(nm); btn.appendChild(kd);
      btn.addEventListener('click', () => select(pid, true));
      wrap.appendChild(btn);
      rows.set(pid, { btn, kd });
    });
    box.appendChild(wrap);
  });
}

let lastSideUpdate = 0;
function updateSide(state) {
  const now = performance.now();
  if (now - lastSideUpdate < 200) return;
  lastSideUpdate = now;
  const k = killCounts(t), d = deathCounts(t);
  rows.forEach((r, pid) => {
    r.kd.textContent = (k[pid] || 0) + ' / ' + (d[pid] || 0);
    const row = state.players.get(pid);
    r.btn.classList.toggle('is-dead', !row || row[7] <= 0);
    r.btn.classList.toggle('is-follow', pid === followPid);
  });
  /* score: kills per team so far */
  const perTeam = {};
  D.events.forEach((e) => {
    if (e.k !== 'kill' || e.t > t || e.a == null) return;
    const p = D.players[e.a]; if (!p) return;
    perTeam[p.t || 'No team'] = perTeam[p.t || 'No team'] || { n: 0, c: p.c };
    perTeam[p.t || 'No team'].n++;
  });
  const score = $('ai-score');
  score.replaceChildren();
  Object.keys(perTeam).forEach((team) => {
    const s = el('span', null, team + ' ');
    const b = el('b', null, String(perTeam[team].n));
    b.style.color = perTeam[team].c;
    s.appendChild(b);
    score.appendChild(s);
  });
  score.hidden = !score.children.length;
  if (followPid != null) fillPlayerCard(followPid, k, d);
}

function buildFeed() {
  const list = $('ai-feed');
  list.replaceChildren();
  D.events.filter((e) => e.k === 'kill').slice(-200).reverse().forEach((e) => {
    const li = el('li');
    const btn = el('button');
    btn.type = 'button';
    btn.appendChild(el('span', 'ai-feed-time', liveId ? AI.clock(e.t - t0) : AI.clock(e.t - t0)));
    const line = el('span', 'ai-feed-line');
    const a = el('strong', null, e.a == null ? 'World' : nameOf(e.a)); if (e.a != null) a.style.color = colorOf(e.a);
    const v = el('strong', null, nameOf(e.b)); v.style.color = colorOf(e.b);
    line.appendChild(a); line.appendChild(el('span', 'ai-feed-arrow', '→')); line.appendChild(v);
    btn.appendChild(line);
    btn.appendChild(el('span', 'ai-feed-weapon', [e.w, e.a != null && e.d ? AI.distance(e.d) : '', e.hs ? 'headshot' : ''].filter(Boolean).join(' · ')));
    btn.addEventListener('click', () => {
      selectedKill = e;
      seek(e.t - 2);
      if (e.a != null) select(e.a, false);
      if (mode === 'pov' || mode === 'map') setMode('free');
      if (mode === 'free' && e.ap && e.bp) {
        const mid = new THREE.Vector3((e.ap[0] + e.bp[0]) / 2, (e.ap[1] + e.bp[1]) / 2, (e.ap[2] + e.bp[2]) / 2);
        const span = Math.max(40, e.d * 1.1);
        controls.target.copy(mid);
        camera.position.set(mid.x + span * 0.5, mid.y + span * 0.55, mid.z + span * 0.6);
      }
      setPlaying(true);
    });
    li.appendChild(btn);
    list.appendChild(li);
  });
  if (!list.children.length) list.appendChild(el('li', 'ai-note', 'No kills yet.'));
}

function select(pid, follow) {
  followPid = pid;
  if (follow && mode !== 'pov') setMode('follow');
  else $('ai-hint').textContent = HINTS[mode].replace('{name}', nameOf(followPid));
  lastFollowPos = null;
  $('ai-player-card').hidden = false;
  fillPlayerCard(pid, killCounts(t), deathCounts(t));
  loadCatWatcher(pid);
}

function fillPlayerCard(pid, k, d) {
  $('ai-pc-name').textContent = nameOf(pid);
  $('ai-pc-team').textContent = (D.players[pid] && D.players[pid].t) || 'No team';
  $('ai-player-card').style.setProperty('--team', colorOf(pid));
  const mine = D.events.filter((e) => e.k === 'kill' && e.a === pid && e.t <= t);
  const shots = D.events.filter((e) => e.k === 'shot' && e.a === pid && e.t <= t).length;
  const longest = mine.reduce((m, e) => Math.max(m, e.d || 0), 0);
  const stats = $('ai-pc-stats');
  stats.replaceChildren();
  [['Kills', k[pid] || 0], ['Deaths', d[pid] || 0], ['Shots', shots], ['Longest kill', longest ? AI.distance(longest) : '—']].forEach((s) => {
    const w = el('div'); w.appendChild(el('dt', null, s[0])); w.appendChild(el('dd', null, String(s[1]))); stats.appendChild(w);
  });
}

const cwCache = new Map();
function loadCatWatcher(pid) {
  const text = $('ai-pc-cw-text');
  const box = $('ai-pc-catwatcher');
  box.className = 'ai-catwatcher';
  if (!clipCode) { text.textContent = 'Shown on clips.'; return; }
  const show = (r) => {
    if (followPid !== pid) return;
    if (!r.success) { text.textContent = r.msg || 'Couldn\'t check.'; return; }
    if (!r.connected) { text.textContent = 'Not connected yet.'; return; }
    if (!r.result) { text.textContent = 'No record.'; return; }
    box.classList.add('is-' + (r.result.status || 'clear'));
    text.replaceChildren(document.createTextNode(r.result.summary || r.result.status || ''));
    if (r.result.link) { const a = el('a', 'text-link', ' Open'); a.href = r.result.link; a.target = '_blank'; a.rel = 'noopener'; text.appendChild(a); }
  };
  if (cwCache.has(pid)) return show(cwCache.get(pid));
  text.textContent = 'Checking…';
  AI.get('/clips/' + clipCode + '/players/' + pid + '/catwatcher').then((r) => { cwCache.set(pid, r); show(r); });
}


/* ---------- 10. CLIP ---------- */
let base = '';
async function openClip() {
  const s = await AI.session();
  base = s.base || '';
  const r = await AI.get('/clips/' + encodeURIComponent(clipCode));
  if (!r.success) return fail('No clip with that code', 'It may have expired: clips are kept for 30 days. Check the code and try again.');
  const c = r.clip;
  D = r.data;
  document.title = (c.event || c.place) + ' | Afterimage | Yellonia';
  $('ai-kind').textContent = 'Clip';
  $('ai-title').textContent = c.event || c.place;
  $('ai-sub').textContent = [c.place, 'Clipped by ' + c.by, new Date(c.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }),
    c.kills + (c.kills === 1 ? ' kill' : ' kills'), c.longestKill ? 'longest ' + AI.distance(c.longestKill) : ''].filter(Boolean).join(' · ');
  $('ai-code').textContent = c.code;
  $('ai-expires').textContent = 'Deleted in ' + AI.daysLeft(c.expiresAt) + ' days';
  $('ai-title-side').hidden = false;
  $('ai-copy').addEventListener('click', () => {
    navigator.clipboard.writeText(location.origin + location.pathname + '?code=' + c.code).catch(() => {});
    $('ai-copied').textContent = 'Copied';
    setTimeout(() => { $('ai-copied').textContent = 'Copy link'; }, 1500);
  });
  $('ai-viewer').hidden = false;
  resize();
  start(c.mapId);
  setupVideo(c);
}

function setupVideo(c) {
  const sw = $('ai-view-switch');
  const note = $('ai-video-note');
  const show = (view) => {
    sw.querySelectorAll('.ai-chip').forEach((b) => b.classList.toggle('is-on', b.dataset.view === view));
    $('ai-video-box').hidden = view !== 'video';
    viewport.hidden = view === 'video';
    $('ai-controls').hidden = view === 'video';
    if (view === 'video') setPlaying(false); else $('ai-video').pause();
  };
  sw.addEventListener('click', (e) => { const b = e.target.closest('.ai-chip'); if (b && !b.disabled) show(b.dataset.view); });
  const videoBtn = sw.querySelector('[data-view="video"]');
  const apply = (state) => {
    sw.hidden = state === 'none' || state === 'failed';
    videoBtn.disabled = state !== 'ready';
    note.textContent = state === 'ready' ? '' : 'The video is on its way…';
    if (state === 'ready') { $('ai-video').src = base + '/clips/' + c.code + '/video'; note.textContent = 'Real footage from ' + c.by + '\'s screen.'; }
  };
  apply(c.video);
  if (c.video === 'waiting' || c.video === 'processing') {
    let tries = 0;
    const poll = setInterval(async () => {
      const r = await AI.get('/clips/' + c.code);
      if (r.success) apply(r.clip.video);
      if (!r.success || ['ready', 'failed', 'none'].includes(r.clip.video) || ++tries > 40) clearInterval(poll);
    }, 5000);
  }
}


/* ---------- 11. LIVE ---------- */
async function openLive() {
  const s = await AI.session();
  base = s.base || '';
  if (!s.success) return fail('Afterimage isn\'t connected', s.msg || '');
  if (!s.loggedIn) return fail('Log in to watch live', 'Live events are for Yellonia members. Log in with the Discord account you use in the Yellonia server.', 'login');
  $('ai-kind').textContent = 'Live';
  $('ai-live-badge').hidden = false;
  $('ai-speed').hidden = true;
  const ws = new WebSocket(await AI.wsUrl('kind=live&id=' + encodeURIComponent(liveId)));
  let started = false;
  ws.onmessage = (msg) => {
    const m = JSON.parse(msg.data);
    if (m.type === 'error') { ws.close(); return fail('Can\'t watch this one', m.msg); }
    if (m.type === 'ended') { $('ai-live-badge').textContent = 'Ended'; return; }
    if (m.type === 'hello') {
      D = { rate: m.rate, players: m.players || {}, vehicles: m.vehicles || {}, frames: m.frames || [], events: m.events || [] };
      $('ai-title').textContent = m.event;
      $('ai-sub').textContent = m.place + ' · ' + m.delay + ' seconds behind the game';
      $('ai-live-badge').textContent = 'Live · ' + m.delay + ' s delay';
      document.title = m.event + ' | Live | Afterimage | Yellonia';
      $('ai-viewer').hidden = false;
      resize();
      indexFrames(0);
      started = true;
      start(m.mapId);
      return;
    }
    if (m.type === 'chunk' && started) {
      const from = D.frames.length;
      D.frames.push(...m.frames);
      D.events.push(...m.events);
      Object.assign(D.players, m.players || {});
      Object.assign(D.vehicles, m.vehicles || {});
      /* keep the last few minutes only */
      const cut = (D.frames.length ? D.frames[D.frames.length - 1].t : 0) - LOOK.liveKeepSeconds;
      let drop = 0;
      while (drop < D.frames.length && D.frames[drop].t < cut) drop++;
      if (drop) D.frames.splice(0, drop);
      D.events = D.events.filter((e) => e.t >= cut);
      indexFrames(Math.max(0, from - drop));
      if (Object.keys(D.players).length !== rows.size) buildTeams();
      if (m.events.some((e) => e.k === 'kill')) buildFeed();
      drawTicks();   /* the window slides, so the ticks move every second */
    }
  };
  ws.onclose = () => { if (started) $('ai-live-badge').textContent = 'Disconnected · refresh to reconnect'; };
}


/* ---------- 12. MAIN LOOP ---------- */
async function start(mapId) {
  indexFrames(0);
  buildTeams();
  buildFeed();
  drawTicks();
  frameAction();
  if (await loadMap(mapId) && grid) { scene.remove(grid); grid = null; }
  setMode('free');
  t = liveId ? t1 : t0;
  setPlaying(true);
  let last = performance.now();
  const loop = (now) => {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (playing) {
      if (liveId && atLiveEdge) t = Math.max(t0, t1 - 0.4);   /* stay just behind the newest sample */
      else t += dt * speed;
      if (t >= t1) { t = t1; if (!liveId) setPlaying(false); else atLiveEdge = true; }
    }
    draw();
    updateTimebar();
    if (mode !== 'pov') controls.update();
    renderer.render(scene, camera);
    labels.render(scene, camera);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

if (clipCode) openClip();
else if (liveId) openLive();
else fail('Nothing to show', 'Open a clip from the Afterimage page, or paste its code there.');
