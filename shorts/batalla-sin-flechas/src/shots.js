// THE EDIT. "La batalla ganada sin ninguna flecha": Zhuge Liang and the empty fort (plan.md).
// Shot cuts follow the sentence starts and caption words, so re-timing to the real voice only needs new CAPTIONS + DURATION.
import * as THREE from 'three';
import { makeToon, mixPose, walkPose, talk, blink, POSES, tmesh, toon, INK } from './toon.js';
import { model, lantern, beam, dust, room, box, floor, planks, wallpaper, tex, std, glowSprite, grass, pebbles } from './world.js';
import { lerp, smooth, easeOut, easeIn, easeInOut, range, clamp, V, cam, place, shake, kf } from './anim.js';

export const CAPTIONS = [
  [0.25, 'Año'], [0.52, '*228.*'], [0.80, '*150.000*'], [1.23, 'soldados'], [1.75, 'marchan'],
  [2.23, 'hacia'], [2.61, 'una ciudad'], [3.31, 'casi'], [3.63, '*vacía.*'], [4.46, 'Su defensor,'],
  [5.49, '*Zhuge*'], [5.87, '*Liang,*'], [6.53, 'no tenía'], [7.12, 'ejército'], [7.65, 'para detenerlos.'],
  [9.06, 'Así'], [9.33, 'que hizo'], [9.93, 'algo'], [10.26, '*impensable:*'], [11.17, 'abrió'],
  [11.54, 'las puertas'], [12.30, 'de par'], [12.79, 'en par.'], [13.74, 'Puso'], [14.07, 'a soldados'],
  [14.81, 'disfrazados'], [15.50, 'de campesinos'], [16.35, 'a barrer'], [17.00, 'la calle.'], [18.05, 'Y él'],
  [18.49, 'subió'], [18.87, 'a la'], [19.31, 'muralla,'], [20.07, 'a tocar'], [20.66, 'la *cítara.*'],
  [21.76, 'El general'], [22.46, 'enemigo,'], [23.22, '*Sima*'], [23.55, '*Yi,*'], [24.05, 'frenó'],
  [24.43, 'en seco.'], [25.42, 'Conocía'], [25.90, 'a Zhuge'], [26.50, 'Liang:'], [27.16, '*jamás*'],
  [27.53, 'se arriesgaba.'], [28.84, 'Esto'], [29.16, 'tenía'], [29.54, 'que ser'], [30.08, 'una *trampa.*'],
  [31.24, 'Y retiró'], [31.88, 'a todo'], [32.43, 'su ejército.'], [33.63, 'Sin disparar'], [34.43, 'una sola'],
  [35.03, '*flecha.*'], [35.91, 'Lo curioso:'], [36.89, 'seguramente'], [37.57, '*nunca*'], [37.95, '*pasó.*'],
  [38.27, 'Sima'], [38.60, 'Yi'], [38.82, 'estaba'], [39.25, 'a *cientos*'], [39.95, 'de *kilómetros.*'],
  [41.25, 'Pero'], [41.58, 'la leyenda'], [42.28, 'se volvió'], [42.93, 'la estratagema'], [43.83, 'número'],
  [44.26, '*32.*'], [44.93, '¿Tú'], [45.16, 'habrías'], [45.63, 'entrado?', 46.46],
];
export const DURATION = 46.91;
export const CAPTION_STYLE = { mode: 'group', maxWords: 4, maxChars: 20, y: 0.6 };

// the time a caption word starts (first match at or after `after`): shots and effects are timed to the words
const norm = s => s.replace(/[*.,:;?¿!¡]/g, '').toLowerCase();
const W = (word, after = 0) => { const c = CAPTIONS.find(c => c[0] >= after - 1e-3 && norm(c[1]).split(' ').includes(word)); if (!c) throw new Error('no caption word ' + word); return c[0]; };
const S = { // sentence starts
  hook: 0, defensor: W('su'), impensable: W('así'), barrer: W('puso'), muralla: W('él'), general: W('general'),
  conocia: W('conocía'), trampa: W('esto'), retiro: W('retiró'), flecha: W('disparar'), curioso: W('curioso'),
  leyenda: W('pero'), tu: W('tú'),
};
const T = { marchan: W('marchan'), ciudad: W('ciudad'), abrio: W('abrió'), trampaW: W('trampa'), nunca: W('nunca'), cientos: W('cientos'),
  numero: W('número'), frenó: W('frenó'), cítara: W('cítara'), jamas: W('jamás') };

export const FADES = [[S.curioso - 0.32, S.curioso - 0.1, S.curioso - 0.02, S.curioso + 0.18]];
export const TRANSITIONS = [
  { t: T.marchan, type: 'dissolve' }, { t: T.ciudad, type: 'dissolve' }, { t: S.defensor, type: 'dissolve' },
  { t: T.abrio, type: 'dissolve' }, { t: S.barrer, type: 'dissolve' }, { t: S.muralla, type: 'dissolve' },
  { t: S.general, type: 'dissolve' }, { t: S.trampa, type: 'punch' }, { t: T.trampaW, type: 'zoom' },
  { t: S.retiro, type: 'dissolve' }, { t: S.leyenda, type: 'dissolve' }, { t: S.tu, type: 'dissolve' },
];

// ---------- real CC0 models, skies and PBR textures ----------
const PH = 'assets/polyhaven/';
const m = id => PH + `${id}/${id}_1k.gltf`;
export const ASSETS = {
  teaTable: m('chinese_tea_table'), stool: m('chinese_stool'), screen: m('chinese_screen_panels'), cabinet: m('chinese_cabinet'),
  console: m('chinese_console_table'), broom: m('wooden_broom'), pine: m('pine_tree_01'), boulder: m('boulder_01'),
  rocks: m('rock_moss_set_01'), deadTree: m('dead_tree_trunk'), woodLantern: m('wooden_lantern_01'), lanternM: m('Lantern_01'),
  vase: m('antique_ceramic_vase_01'), vase2: m('ceramic_vase_01'), censer: m('brass_vase_03'), tuft: m('grass_medium_01'),
  barrel: m('Barrel_01'), crate: m('wooden_crate_01'), table: m('wooden_table_02'),
  skyGold: PH + 'hdri/belfast_sunset_puresky_1k.hdr', skyDay: PH + 'hdri/kloppenheim_06_puresky_1k.hdr', skyDusk: PH + 'hdri/qwantani_dusk_2_puresky_1k.hdr',
};
const TL = new THREE.TextureLoader();
async function pbr(id) {
  const ts = await Promise.all(['diff', 'nor_gl', 'rough'].map(k => TL.loadAsync(`${PH}tex/${id}/${id}_${k}_1k.jpg`)));
  ts[0].colorSpace = THREE.SRGBColorSpace; for (const t of ts) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; }
  return ts;
}
const PB = Object.fromEntries(await Promise.all(['japanese_stone_wall', 'castle_wall_slates', 'japanese_cedar_planks', 'coast_sand_rocks_02', 'forrest_ground_01'].map(async id => [id, await pbr(id)])));
function pmat(id, rx = 1, ry = 1, o = {}) {
  const c = t => { const x = t.clone(); x.needsUpdate = true; x.repeat.set(rx, ry); return x; };
  const [d, n, r] = PB[id];
  return new THREE.MeshStandardMaterial({ map: c(d), normalMap: c(n), roughnessMap: c(r), roughness: 1, ...o });
}
// a box whose texture keeps a real-world scale on every face (s metres per tile)
function wbox(w, h, d, id, s, pos, o = {}) {
  const g = new THREE.BoxGeometry(w, h, d), uv = g.attributes.uv;
  const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) { const i = f * 4 + k; uv.setXY(i, uv.getX(i) * dims[f][0] / s, uv.getY(i) * dims[f][1] / s); }
  const mesh = new THREE.Mesh(g, o.mat || pmat(id, 1, 1, o)); mesh.position.set(...pos); mesh.castShadow = mesh.receiveShadow = true; return mesh;
}
function canvasTex(w, h, draw) { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d'), w, h); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }
const put = (parent, name, o, pos, ry = 0) => { const x = model(name, o); x.position.set(...pos); x.rotation.y = ry; parent.add(x); return x; };
const pulse = (t, c, w) => Math.exp(-(((t - c) / w) ** 2));
const P = (...parts) => Object.assign({}, ...parts);
const idle = (t, s = 0) => ({ bob: Math.sin(t * 2 + s) * 0.006, lean: [Math.sin(t * 1.3 + s) * 0.02, Math.sin(t * 0.9 + s) * 0.015] });
let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

// ---------- architecture: a hip roof with upturned corners ----------
function roof(hw, hd, h, ridge = 0.45, color = 0x59626c) {
  const g = new THREE.PlaneGeometry(hw * 2, hd * 2, 48, 30); g.rotateX(-Math.PI / 2);
  const p = g.attributes.position, rw = hw * ridge;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i);
    const ax = clamp((Math.abs(x) - rw) / (hw - rw)), az = clamp(Math.abs(z) / hd), s = Math.max(ax, az);
    const ux = Math.abs(x) / hw, y = h * Math.pow(1 - s, 1.7) + h * 0.12 * s ** 3 + h * 0.5 * Math.pow(ux * az, 7);
    p.setY(i, y);
  }
  g.computeVertexNormals();
  const grp = new THREE.Group();
  const top = new THREE.Mesh(g, pmat('castle_wall_slates', hw * 1.5, hd * 1.5, { color, side: THREE.DoubleSide })); top.castShadow = top.receiveShadow = true; grp.add(top);
  const under = new THREE.Mesh(g, std(0x3a2418, { side: THREE.BackSide })); under.position.y = -0.06; grp.add(under);
  grp.add(tmesh(new THREE.BoxGeometry(rw * 2 + 0.2, 0.16, 0.18), 0x2e3238, { w: 0.01 })).position.y = h + 0.04;
  for (const s of [-1, 1]) { const o = tmesh(new THREE.ConeGeometry(0.12, 0.45, 6), 0x2e3238, { w: 0.008 }); o.position.set(s * (rw + 0.1), h + 0.2, 0); o.rotation.z = -s * 0.5; grp.add(o); }
  return grp;
}
const RED = 0xa8302a, TEAL = 0x2c6a66, GOLD = 0xd9b44a;
function pillar(h, r = 0.16) { const p = tmesh(new THREE.CylinderGeometry(r, r * 1.05, h, 16), std(RED, { roughness: 0.6 }), { w: 0.008 }); p.position.y = h / 2; return p; }
function plaque(text) {
  const t = canvasTex(256, 512, (g, w, h) => { g.fillStyle = '#1c2c55'; g.fillRect(0, 0, w, h); g.strokeStyle = '#d9b44a'; g.lineWidth = 18; g.strokeRect(14, 14, w - 28, h - 28);
    g.fillStyle = '#e8c25a'; g.font = 'bold 170px "WenQuanYi Zen Hei", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; [...text].forEach((ch, i) => g.fillText(ch, w / 2, h * (0.3 + i * 0.4))); });
  return tmesh(new THREE.BoxGeometry(0.7, 1.4, 0.06), std(0xffffff, { map: t }), { w: 0.008 });
}

// gate tower on the wall: two tiers, red pillars, teal beams, curved grey roofs. Front (+z) at z = -1.6, floor at y = 0
function gateTower() {
  const g = new THREE.Group();
  const xs = [-4.2, -2.5, -0.85, 0.85, 2.5, 4.2];
  g.add(wbox(9.8, 0.3, 4.6, 'japanese_cedar_planks', 1.5, [0, 0.15, -3.9], { color: 0x8a5a3a }));
  for (const x of xs) for (const z of [-1.8, -6.0]) { const p = pillar(3.0); p.position.set(x, 0.3, z); g.add(p); }
  // back wall with lattice panels
  const lat = canvasTex(256, 256, (c, w, h) => { c.fillStyle = '#5a1e18'; c.fillRect(0, 0, w, h); c.strokeStyle = '#c9a24a'; c.lineWidth = 6; for (let i = 0; i <= 8; i++) { c.beginPath(); c.moveTo(i * 32, 0); c.lineTo(i * 32, h); c.moveTo(0, i * 32); c.lineTo(w, i * 32); c.stroke(); } });
  lat.wrapS = lat.wrapT = THREE.RepeatWrapping; lat.repeat.set(6, 2);
  g.add(box(8.6, 2.8, 0.1, std(0xffffff, { map: lat }), [0, 1.7, -5.95]));
  for (const s of [-1, 1]) g.add(box(0.1, 2.8, 4.2, std(0xffffff, { map: lat }), [s * 4.25, 1.7, -3.9]));
  // beams
  const beamM = canvasTex(512, 64, (c, w, h) => { c.fillStyle = '#2c6a66'; c.fillRect(0, 0, w, h); c.fillStyle = '#d9b44a'; for (let x = 0; x < w; x += 64) { c.beginPath(); c.ellipse(x + 32, h / 2, 22, 16, 0, 0, 7); c.fill(); } c.fillStyle = '#1c3c5a'; c.fillRect(0, 0, w, 8); c.fillRect(0, h - 8, w, 8); });
  beamM.wrapS = THREE.RepeatWrapping; beamM.repeat.set(4, 1);
  for (const z of [-1.8, -6.0]) g.add(box(9.6, 0.36, 0.3, std(0xffffff, { map: beamM }), [0, 3.3, z]));
  const r1 = roof(6.3, 3.6, 1.5); r1.position.set(0, 3.45, -3.9); g.add(r1);
  // upper tier
  for (const x of [-2.6, -0.9, 0.9, 2.6]) for (const z of [-2.6, -5.2]) { const p = pillar(1.7, 0.13); p.position.set(x, 4.3, z); g.add(p); }
  g.add(box(5.6, 1.5, 2.5, std(0xffffff, { map: lat }), [0, 5.05, -3.9]));
  g.add(box(5.8, 0.3, 0.26, std(0xffffff, { map: beamM }), [0, 6.0, -2.6]));
  const r2 = roof(4.3, 2.6, 1.6, 0.5); r2.position.set(0, 6.1, -3.9); g.add(r2);
  const pl = plaque('西城'); pl.position.set(0, 4.95, -2.55); g.add(pl);
  // front balustrade (low, red) at the wall's edge
  const rail = new THREE.Group(); g.add(rail);
  rail.add(box(11.2, 0.08, 0.12, std(RED), [0, 0.5, -0.12]));
  rail.add(box(11.2, 0.06, 0.1, std(RED), [0, 0.22, -0.12]));
  for (let x = -5.5; x <= 5.51; x += 0.55) rail.add(box(0.07, 0.5, 0.07, std(0x7a221d), [x, 0.25, -0.12]));
  // hanging lanterns
  for (const x of [-3.3, 3.3]) { const l = lantern({ intensity: 1.2, dist: 5, chain: 0.25, mesh: model('woodLantern', { height: 0.45 }), color: 0xffa860 }); l.position.set(x, 2.75, -1.75); g.add(l); }
  return g;
}

// the city wall along x, outer face at z = 0 (the plain is +z), top walkway at y = 6, the gate at x = 0
const WH = 6, GW = 1.9, GH = 4.4;
function cityWall() {
  const g = new THREE.Group(), id = 'japanese_stone_wall', s = 2.2, L = 70;
  const segL = wbox(L / 2 - GW, WH, 7, id, s, [-GW - (L / 2 - GW) / 2, WH / 2, -3.5]); g.add(segL);
  const segR = wbox(L / 2 - GW, WH, 7, id, s, [GW + (L / 2 - GW) / 2, WH / 2, -3.5]); g.add(segR);
  g.add(wbox(GW * 2, WH - GH, 7, id, s, [0, GH + (WH - GH) / 2, -3.5]));
  // gate arch trim + plinth course
  g.add(wbox(L, 0.5, 7.3, 'castle_wall_slates', 1.4, [0, 0.25, -3.5], { color: 0x8a8580 }));
  const arch = tmesh(new THREE.TorusGeometry(GW, 0.12, 8, 24, Math.PI), std(0x6e6a64), { w: 0.006 }); arch.position.set(0, GH - GW * 0.25, 0.02); arch.scale.y = 0.25; g.add(arch);
  // battlements on the outer edge (not in front of the gate tower) and a low inner parapet
  const merlonGeo = new THREE.BoxGeometry(0.75, 0.7, 0.55), baseMat = pmat(id, 6, 0.5);
  for (const sx of [-1, 1]) {
    g.add(wbox(L / 2 - 5.6, 0.6, 0.55, id, s, [sx * (5.6 + (L / 2 - 5.6) / 2), WH + 0.3, -0.28]));
    g.add(wbox(L / 2, 0.55, 0.4, id, s, [sx * L / 4, WH + 0.27, -6.8]));
    for (let x = 6.0; x < L / 2; x += 1.25) { const mm = new THREE.Mesh(merlonGeo, baseMat); mm.position.set(sx * x, WH + 0.95, -0.28); mm.castShadow = mm.receiveShadow = true; g.add(mm); }
  }
  // doors in the passage: hinged at x = +-GW, closed when angle = 0
  const doorTex = pmat('japanese_cedar_planks', 1.2, 2.4, { color: 0x9a3a26 });
  const doors = [];
  for (const sx of [-1, 1]) {
    const hinge = new THREE.Group(); hinge.position.set(sx * GW, 0, -0.9); g.add(hinge);
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(GW, GH - 0.1, 0.22), doorTex); leaf.position.set(-sx * GW / 2, (GH - 0.1) / 2, 0); leaf.castShadow = leaf.receiveShadow = true; hinge.add(leaf);
    const studs = new THREE.InstancedMesh(new THREE.SphereGeometry(0.045, 8, 6), std(GOLD, { metalness: 0.8, roughness: 0.35 }), 7 * 9);
    let k = 0; const M = new THREE.Matrix4();
    for (let i = 0; i < 7; i++) for (let j = 0; j < 9; j++) { M.makeTranslation(-sx * (0.18 + i * (GW - 0.36) / 6), 0.4 + j * (GH - 0.9) / 8, 0.12); studs.setMatrixAt(k++, M); }
    hinge.add(studs);
    const ring = tmesh(new THREE.TorusGeometry(0.1, 0.02, 6, 16), std(GOLD, { metalness: 0.8, roughness: 0.3 }), { w: 0.004 }); ring.position.set(-sx * (GW - 0.25), 2.0, 0.14); hinge.add(ring);
    doors.push({ hinge, sx });
  }
  g.userData.doors = doors;
  g.userData.setDoors = a => doors.forEach(d => { d.hinge.rotation.y = d.sx * -a; });   // a: 0 closed .. ~1.7 open (swing inward)
  // dark passage interior
  g.add(box(GW * 2, 0.05, 7, std(0x2a2622), [0, GH, -3.5]));
  return g;
}
function house(w, d, h, wall = 0xe0d6c2) {
  const g = new THREE.Group();
  g.add(box(w, h, d, std(wall, { roughness: 0.9 }), [0, h / 2, 0]));
  for (const x of [-w / 2, w / 2]) for (const z of [-d / 2, d / 2]) { const p = pillar(h, 0.09); p.position.set(x, 0, z); p.material = std(0x5a2a1a); g.add(p); }
  g.add(box(w * 0.3, h * 0.65, 0.05, std(0x6a2a1e), [0, h * 0.33, d / 2 + 0.03]));
  const r = roof(w / 2 + 0.6, d / 2 + 0.6, h * 0.45, 0.55); r.position.y = h; g.add(r);
  return g;
}

// ---------- the land: dusty plain, the road, hills, pines and rocks ----------
function plain(scene, { trees = true, near = null } = {}) {
  const ground = floor(500, 500, pmat('coast_sand_rocks_02', 160, 160, { color: 0xd6bf9c })); scene.add(ground);
  const road = floor(5, 260, pmat('forrest_ground_01', 2, 100, { color: 0xb59a78 })); road.position.set(0, 0.01, 130); scene.add(road);
  const inner = floor(5, 60, pmat('forrest_ground_01', 2, 24, { color: 0xb59a78 })); inner.position.set(0, 0.01, -35); scene.add(inner);
  // hills on the horizon
  const hm = pmat('coast_sand_rocks_02', 30, 8, { color: 0xb89a7a });
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 + 0.2, r = 150 + (i % 3) * 30;
    const h = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 12), hm); h.scale.set(55 + (i % 4) * 15, 18 + (i % 5) * 7, 40); h.position.set(Math.cos(a) * r, -4, Math.sin(a) * r); h.rotation.y = -a; scene.add(h);
  }
  if (trees) {
    seed = 21;
    for (let i = 0; i < 26; i++) {
      const side = i % 2 ? 1 : -1, x = side * (8 + rnd() * 30), z = 6 + rnd() * 70;
      if (Math.abs(x) < 7) continue;
      put(scene, i % 5 === 0 ? 'deadTree' : 'pine', { height: i % 5 === 0 ? 2.5 : 6 + rnd() * 5 }, [x, 0, z], rnd() * 6);
    }
    for (let i = 0; i < 14; i++) { const x = (rnd() - 0.5) * 50, z = 3 + rnd() * 40; if (Math.abs(x) < 3.5) continue; put(scene, i % 3 ? 'boulder' : 'rocks', { height: 0.4 + rnd() * 1.1 }, [x, 0, z], rnd() * 6); }
    for (let i = 0; i < 10; i++) { put(scene, 'pine', { height: 7 + rnd() * 5 }, [(i % 2 ? 1 : -1) * (14 + rnd() * 20), 0, -12 - rnd() * 30], rnd() * 6); }
  }
  const dry = grass({ w: 30, d: 26, count: 5000, h: 0.3, base: 0x8a7a3a, tip: 0xe0c97a, hole: (x, z) => Math.abs(x) < 3.2 || z < -12.5 });
  dry.position.set(0, 0, 13); scene.add(dry);
  return { ground, dry };
}
function cityInside(scene) {
  seed = 5;
  for (let i = 0; i < 6; i++) for (const sx of [-1, 1]) {
    const hh = house(3.2 + rnd(), 3.0, 2.6 + rnd() * 0.6); hh.position.set(sx * 4.8, 0, -11 - i * 4.6); hh.rotation.y = -sx * Math.PI / 2; scene.add(hh);
  }
  put(scene, 'barrel', { height: 0.7 }, [2.6, 0, -9.5]); put(scene, 'crate', { height: 0.5 }, [-2.8, 0, -10.5], 0.4);
  put(scene, 'vase2', { height: 0.6 }, [3.0, 0, -13], 0.2);
}
// sky + light for the outdoor set. The sun sits low over the plain (+z) so the gate face and the cast are lit
function outdoor(makeStage, mood = 'golden', target = [0, 3, 0], shadowSize = 14) {
  const hdri = { golden: 'skyGold', day: 'skyDay', sunset: 'skyDusk' }[mood];
  const fogc = { golden: 0xe8b48a, day: 0xcfd9e6, sunset: 0xc77a6a }[mood];
  const sunDir = { golden: [-7, 4.2, 9], day: [-5, 8, 6], sunset: [-8, 2.4, 9] }[mood];
  const scene = makeStage({ mood, shadowSize, target, hdri, env: 0.7, overrides: { sunDir, fog: [fogc, 40, 240] } });
  return scene;
}
function fortScene(makeStage, mood = 'golden', o = {}) {
  const scene = outdoor(makeStage, mood, o.target || [0, 3, 0], o.shadowSize || 14);
  const land = plain(scene, o);
  const wall = cityWall(); scene.add(wall);
  const tower = gateTower(); tower.position.y = WH; scene.add(tower);
  cityInside(scene);
  return { scene, wall, tower, land };
}

// ---------- the army: instanced soldiers far away, real toons up front ----------
function army({ cols = 36, rows = 40, sp = 1.3, color = 0x3f4450 } = {}) {
  const n = cols * rows, g = new THREE.Group();
  const parts = [
    [new THREE.CapsuleGeometry(0.21, 0.4, 2, 7), toon(color), 0.78],
    [new THREE.SphereGeometry(0.2, 8, 6), toon(0xfbfaf6), 1.33],
    [new THREE.SphereGeometry(0.218, 8, 4, 0, Math.PI * 2, 0, Math.PI * 0.46), toon(0x2a2d33), 1.35],
    [new THREE.BoxGeometry(0.26, 0.42, 0.12), toon(INK), 0.2],
    [new THREE.CylinderGeometry(0.014, 0.014, 2.6, 5), toon(0x5a4030), 1.2, 0.3],
    [new THREE.ConeGeometry(0.045, 0.22, 6), toon(0xd0d4dc), 2.6, 0.3],
  ].map(([geo, mat, y, x = 0]) => { geo.translate(x, y, 0); const im = new THREE.InstancedMesh(geo, mat, n); im.castShadow = false; im.frustumCulled = false; g.add(im); return im; });
  seed = 3;
  const U = []; for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) U.push({ x: (c - (cols - 1) / 2) * sp + (rnd() - 0.5) * 0.3, z: r * sp + (rnd() - 0.5) * 0.3, ph: rnd() * 6, s: 0.95 + rnd() * 0.1 });
  // banners
  const banners = [];
  const bt = canvasTex(256, 512, (c, w, h) => { c.fillStyle = '#7a1414'; c.fillRect(0, 0, w, h); c.fillStyle = '#111'; c.fillRect(0, 0, w, 40); c.fillRect(0, h - 40, w, 40);
    c.fillStyle = '#f2e6c9'; c.beginPath(); c.arc(w / 2, h / 2, 90, 0, 7); c.fill(); c.fillStyle = '#111'; c.font = 'bold 140px "WenQuanYi Zen Hei", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('魏', w / 2, h / 2 + 6); });
  for (let i = 0; i < 26; i++) {
    const b = new THREE.Group(); const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 4.6, 6), std(0x3a2a1a)); pole.position.y = 2.3; b.add(pole);
    const geo = new THREE.PlaneGeometry(1.1, 2.0, 10, 6); geo.translate(0.58, 0, 0);
    const cloth = new THREE.Mesh(geo, std(0xffffff, { map: bt, side: THREE.DoubleSide, roughness: 0.9 })); cloth.position.y = 3.4; cloth.castShadow = true; b.add(cloth);
    b.userData = { cloth, base: geo.attributes.position.array.slice(), x: ((i % 9) - 4) * cols * sp / 9 + (rnd() - 0.5) * 2, z: 2 + Math.floor(i / 9) * rows * sp / 3.2 + rnd() * 3, ph: rnd() * 6 };
    g.add(b); banners.push(b);
  }
  const M = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), sc = new THREE.Vector3();
  // pose(t, { walk 0..1, face: yaw (PI = toward the city), drift: metres moved so far })
  g.pose = (t, { walk = 1, face = Math.PI, z0 = 0, turn = 0 } = {}) => {
    U.forEach((u, i) => {
      const bob = Math.abs(Math.sin(t * 6 + u.ph)) * 0.06 * walk, sway = Math.sin(t * 6 + u.ph) * 0.04 * walk;
      const yaw = face + turn * smooth(clamp((turn > 0 ? 1 : 0)));
      p.set(u.x, bob, u.z + z0); e.set(0, face + sway, sway * 0.5); q.setFromEuler(e); sc.setScalar(u.s);
      M.compose(p, q, sc); for (const im of parts) im.setMatrixAt(i, M);
    });
    for (const im of parts) im.instanceMatrix.needsUpdate = true;
    banners.forEach(b => {
      const u = b.userData; b.position.set(u.x, Math.abs(Math.sin(t * 6 + u.ph)) * 0.05 * walk, u.z + z0); b.rotation.y = face + Math.PI / 2;
      const pa = u.cloth.geometry.attributes.position, A = u.base;
      for (let k = 0; k < pa.count; k++) { const x = A[k * 3]; pa.setZ(k, Math.sin(x * 4 - t * 6 + u.ph) * 0.12 * x); }
      pa.needsUpdate = true;
    });
  };
  g.pose(0);
  return g;
}
// dust kicked up by the army (soft brown sprites, deterministic in t)
function dustCloud(n = 40, area = [40, 4, 20], color = 0xc9a77c, op = 0.22) {
  const t0 = canvasTex(128, 128, (c) => { const r = c.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, 'rgba(255,255,255,0.9)'); r.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = r; c.fillRect(0, 0, 128, 128); });
  const g = new THREE.Group(), list = [];
  seed = 9;
  for (let i = 0; i < n; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t0, color, transparent: true, opacity: op, depthWrite: false, fog: true })); const u = { x: (rnd() - 0.5) * area[0], y: rnd() * area[1], z: (rnd() - 0.5) * area[2], s: 3 + rnd() * 5, ph: rnd() * 6 }; s.userData = u; g.add(s); list.push(s); }
  g.update = t => list.forEach(s => { const u = s.userData; s.position.set(u.x + Math.sin(t * 0.3 + u.ph) * 1.5, u.y + (t * 0.25 + u.ph) % area[1], u.z); s.scale.setScalar(u.s * (1 + 0.1 * Math.sin(t + u.ph))); });
  g.update(0); return g;
}

// ---------- cast ----------
function addHat(h, kind) {
  const R = h.R, head = h.head, grp = new THREE.Group(); head.add(grp);
  const add = (geo, col, pos = [0, 0, 0], rot = [0, 0, 0], w = 0.009) => { const x = tmesh(geo, col, { w }); x.position.set(...pos); x.rotation.set(...rot); grp.add(x); return x; };
  if (kind === 'scholar') {        // Zhuge Liang's dark silk cap (lun jin) with a ribbon
    add(new THREE.CylinderGeometry(R * 0.62, R * 0.8, R * 0.62, 24), 0x1f2a44, [0, R * 0.9, -R * 0.12], [-0.28, 0, 0]);
    add(new THREE.BoxGeometry(R * 0.9, R * 0.14, R * 0.5), 0x1f2a44, [0, R * 1.22, -R * 0.2], [-0.28, 0, 0]);
    for (const s of [-1, 1]) add(new THREE.BoxGeometry(R * 0.12, R * 1.1, R * 0.03), 0x1f2a44, [s * R * 0.3, R * 0.25, -R * 0.95], [0.2, 0, s * 0.15], 0.006);
  } else if (kind === 'helmet' || kind === 'general') {
    const col = kind === 'general' ? 0x2a2a30 : 0x3a3e46;
    add(new THREE.SphereGeometry(R * 1.07, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.43), col, [0, R * 0.02, -R * 0.03], [-0.22, 0, 0]);
    add(new THREE.TorusGeometry(R * 0.86, R * 0.07, 8, 32), kind === 'general' ? GOLD : 0x23262c, [0, R * 0.62, R * 0.1], [Math.PI / 2 - 0.22, 0, 0], 0.006);
    add(new THREE.SphereGeometry(R * 1.0, 24, 10, Math.PI * 0.7, Math.PI * 0.6, Math.PI * 0.45, Math.PI * 0.3), col, [0, 0, -R * 0.05], [0, 0, 0]);   // neck guard
    add(new THREE.ConeGeometry(R * 0.1, R * 0.5, 8), kind === 'general' ? GOLD : 0x23262c, [0, R * 1.18, -R * 0.15], [-0.22, 0, 0], 0.006);
    if (kind === 'general') { const plume = add(new THREE.SphereGeometry(R * 0.32, 14, 10), 0xc0221e, [0, R * 1.55, -R * 0.45], [-0.6, 0, 0], 0.008); plume.scale.set(0.7, 1.6, 0.7);
      for (const s of [-1, 1]) add(new THREE.BoxGeometry(R * 0.05, R * 0.5, R * 0.35), GOLD, [s * R * 1.0, R * 0.55, -R * 0.1], [0, 0, s * 0.5], 0.005); }
  } else if (kind === 'straw') {
    add(new THREE.ConeGeometry(R * 1.75, R * 0.75, 28, 1, true), 0xd8b46a, [0, R * 0.95, 0], [-0.12, 0, 0]).material.side = THREE.DoubleSide;
  }
  return grp;
}
function fan() {   // white feather fan, held in the right hand
  const g = new THREE.Group();
  const handle = tmesh(new THREE.CylinderGeometry(0.012, 0.014, 0.16, 8), 0x6a3a1c, { w: 0.004 }); handle.position.y = 0.04; g.add(handle);
  const blade = tmesh(new THREE.CylinderGeometry(0.15, 0.15, 0.012, 28), 0xf6f4ee, { w: 0.006 }); blade.rotation.x = Math.PI / 2; blade.scale.set(0.82, 1, 1.25); blade.position.y = 0.26; g.add(blade);
  for (let i = -2; i <= 2; i++) { const f = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.3, 0.003), toon(0xb8b4aa)); f.position.set(i * 0.035, 0.26, 0.008); f.rotation.z = i * 0.12; g.add(f); }
  return g;
}
function spear(len = 2.2) {
  const g = new THREE.Group();
  const s = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, len, 6), toon(0x5a4030)); s.position.y = len * 0.3; g.add(s);
  const tip = tmesh(new THREE.ConeGeometry(0.035, 0.18, 6), 0xd0d4dc, { w: 0.004 }); tip.position.y = len * 0.8 + 0.09; g.add(tip);
  const tass = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), toon(0xb3261e)); tass.position.y = len * 0.8 - 0.04; g.add(tass);
  return g;
}
const ZHUGE = { color: '#efe9da', coatOpen: '#3b4f78', belt: '#3b4f78', lower: '#efe9da', moustache: true, nose: true, size: [0.5, 0.66, 0.46] };
const SIMA = { color: '#3a3a42', sash: '#9a1c1c', belt: '#1a1a1a', buttons: '#d9b44a', lower: '#2a2420', epaulettes: true, moustache: true, nose: true, size: [0.56, 0.64, 0.48] };
const WEI = { color: '#4a505c', belt: '#7a1414', lower: '#2a2a30', size: [0.46, 0.56, 0.5] };
const SHU = { color: '#2f5d50', belt: '#a8302a', lower: '#3a2f2a', size: [0.44, 0.56, 0.5] };
const PEASANT = { color: '#b89a6a', patch: '#8a6a40', belt: '#5a4632', lower: '#6b5a40', size: [0.44, 0.55, 0.5] };
const BOY = { color: '#e3d5b4', belt: '#a8302a', lower: '#e3d5b4', hair: 'bun', hairColor: 0x1a1210, scale: 0.72, size: [0.42, 0.52, 0.42] };
const SCHOLAR = { color: '#5a3a6a', coatOpen: '#e8dcc0', lower: '#5a3a6a', hair: 'bun', hairColor: 0x2a2a2a, nose: true, size: [0.48, 0.62, 0.48] };
function zhuge() { const z = makeToon(ZHUGE); addHat(z, 'scholar'); const f = fan(); f.rotation.set(0.3, 0, -0.2); z.hands.r.add(f); z.fan = f; return z; }
function sima() { const s = makeToon(SIMA); addHat(s, 'general'); return s; }
function soldier(o = WEI, withSpear = true) { const s = makeToon(o); addHat(s, 'helmet'); if (withSpear) { const sp = spear(); sp.rotation.x = 0.1; s.hands.r.add(sp); } return s; }
// sitting cross-legged on the floor (root on the floor)
const SIT = { crouch: 0.3, ll: [1.45, 2.3], rl: [1.45, 2.3] };
const play = (t, k = 1) => ({ ...SIT, la: [0.32, 1.05 + Math.sin(t * 7) * 0.12 * k, 1.05], ra: [0.32, 1.0 + Math.sin(t * 6 + 1.3) * 0.14 * k, 1.1], lean: [0.12, 0], head: [0.14, 0, 0] });
function guqin() {
  const g = new THREE.Group();
  const body = tmesh(new THREE.BoxGeometry(1.15, 0.05, 0.19), std(0x3a1810, { roughness: 0.35 }), { w: 0.005 }); body.position.y = 0.025; g.add(body);
  for (let i = 0; i < 7; i++) { const s = new THREE.Mesh(new THREE.BoxGeometry(1.08, 0.004, 0.003), std(0xf2e2b0, { emissive: 0x332a10 })); s.position.set(0, 0.053, -0.07 + i * 0.023); g.add(s); }
  for (let i = 0; i < 13; i++) { const d = new THREE.Mesh(new THREE.SphereGeometry(0.006, 6, 4), std(0xf4f0e0)); d.position.set(-0.45 + i * 0.065, 0.052, 0.085); g.add(d); }
  return g;
}
function incense() {   // censer with rising smoke
  const g = new THREE.Group();
  put(g, 'censer', { height: 0.2 }, [0, 0, 0]);
  const tx = canvasTex(64, 64, c => { const r = c.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,255,255,0.7)'); r.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = r; c.fillRect(0, 0, 64, 64); });
  const puffs = []; for (let i = 0; i < 18; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tx, color: 0xe8e4dc, transparent: true, opacity: 0.4, depthWrite: false })); g.add(s); puffs.push(s); }
  g.update = t => puffs.forEach((s, i) => { const k = (t * 0.35 + i / puffs.length) % 1; s.position.set(Math.sin(k * 7 + i) * 0.06 * k * 3, 0.22 + k * 1.3, Math.cos(k * 5 + i) * 0.04); s.scale.setScalar(0.05 + k * 0.3); s.material.opacity = 0.45 * (1 - k) * Math.min(1, k * 6); });
  g.update(0); return g;
}
// Zhuge's spot on the wall: seated behind the guqin on a low table, in front of the gate tower, facing the plain
function zhugeSpot(scene) {
  const z = zhuge(); z.root.position.set(0, WH, -1.05); scene.add(z.root);
  const tbl = model('teaTable', { height: 0.3 }); tbl.scale.set(1.45, 1, 0.75); tbl.position.set(0, WH, -0.55); scene.add(tbl);
  const q = guqin(); q.position.set(0, WH + 0.3, -0.55); scene.add(q);
  const inc = incense(); inc.position.set(0.85, WH, -0.55); scene.add(inc);
  const boyA = makeToon(BOY), boyB = makeToon(BOY);
  boyA.root.position.set(-1.0, WH, -1.25); boyB.root.position.set(1.0, WH, -1.3); boyA.root.rotation.y = 0.15; boyB.root.rotation.y = -0.15; scene.add(boyA.root, boyB.root);
  return { z, q, inc, boyA, boyB };
}
function zhugeLive(Z, t, { k = 1, face = {} } = {}) {
  Z.z.pose(play(t, k)); Z.z.fan.visible = false;
  Z.z.setFace({ eyes: blink(t, 2) ? 'closed' : 'half', brows: 'flat', mouth: 'smile', look: [0, 0.3], ...face });
  Z.inc.update(t);
  Z.boyA.pose(P(POSES.stand, idle(t, 1), { la: [0.3, 0.7, 1.4], ra: [0.3, 0.7, 1.4] })); Z.boyB.pose(P(POSES.stand, idle(t, 2), { la: [0.3, 0.7, 1.4], ra: [0.3, 0.7, 1.4] }));
  Z.boyA.setFace({ eyes: blink(t, 4) ? 'closed' : 'open', brows: 'worried', mouth: 'flat', look: [0.6, 0] }); Z.boyB.setFace({ eyes: blink(t, 6) ? 'closed' : 'open', brows: 'worried', mouth: 'wavy', look: [-0.5, 0] });
}

// ============ 1. Thumbnail + hook: Zhuge Liang at his guqin on the wall, golden hour (0 - "marchan") ============
function shotHook({ makeStage }) {
  const F = fortScene(makeStage, 'golden', { target: [0, 6, -1], shadowSize: 6 });
  const Z = zhugeSpot(F.scene);
  const C = cam(48);
  return { scene: F.scene, camera: C, update(t) {
    F.land.dry.update(t);
    zhugeLive(Z, t, { k: 0.6, face: { eyes: t < 0.9 ? 'open' : (blink(t, 2) ? 'closed' : 'half'), look: t < 0.9 ? [0, 0] : [0, 0.3], mouth: 'smirk' } });
    place(C, [0.05 + t * 0.03, 6.75 + t * 0.03, 1.55 - t * 0.12], [0, 6.95, -1.0]);
    return { bloom: 0.45, exposure: 1.0, dof: { focus: 2.5, blur: 0.4 } };
  } };
}

// ============ 2. 150.000 soldiers march across the plain ("marchan" - "ciudad") ============
function shotArmy({ makeStage }) {
  const scene = outdoor(makeStage, 'golden', [0, 0, 40], 12);
  const land = plain(scene, { trees: true });
  const A = army({ cols: 40, rows: 44 }); scene.add(A);
  const dc = dustCloud(50, [60, 5, 60]); scene.add(dc);
  const sm = sima(); scene.add(sm.root);
  const front = [-3, -1.6, 1.6, 3].map(x => { const s = soldier(); s.root.position.x = x; scene.add(s.root); return s; });
  const C = cam(66);
  return { scene, camera: C, update(t) {
    land.dry.update(t);
    const z0 = 36 - t * 1.3;
    A.pose(t, { walk: 1, z0: z0 + 3 }); dc.position.set(0, 0, z0 + 28); dc.update(t);
    sm.root.position.set(0, 0, z0); sm.root.rotation.y = Math.PI; sm.pose(P(walkPose(t * 6, 0.8), { la: [0.3, 0.4, 0.9] }));
    sm.setFace({ eyes: 'half', brows: 'angry', mouth: 'flat', look: [0, 0] });
    front.forEach((s, i) => { s.root.position.z = z0 + 1.6; s.root.rotation.y = Math.PI; s.pose(walkPose(t * 6 + i, 0.8, { ra: [0.2, 0.5, 0.6] })); s.setFace({ eyes: 'open', brows: 'angry', mouth: 'flat' }); });
    place(C, [1.2, 0.28 + t * 0.12, z0 - 2.6 + t * 0.15], [0.2, 1.3 + t * 0.1, z0 + 6]);
    return { bloom: 0.4, exposure: 1.05 };
  } };
}

// ============ 3. The city: an empty wall, closed gate, dust blowing ("ciudad" - "Su defensor") ============
function shotCityWide({ makeStage }) {
  const F = fortScene(makeStage, 'golden', { target: [0, 4, 0], shadowSize: 16 });
  const dc = dustCloud(14, [30, 1.5, 10], 0xd8bc90, 0.14); dc.position.set(0, 0, 8); F.scene.add(dc);
  F.wall.userData.setDoors(0);
  const C = cam(60);
  return { scene: F.scene, camera: C, update(t) {
    F.land.dry.update(t); dc.update(t);
    place(C, [3.0 - t * 0.35, 0.55 + t * 0.15, 17 - t * 1.0], [0, 6.0, -2]);
    return { bloom: 0.4, exposure: 1.0 };
  } };
}

// ---------- on the wall: Zhuge standing, his few soldiers ----------
function wallTopCast(scene) {
  const z = zhuge(); z.root.position.set(0.4, WH, -1.2); scene.add(z.root);
  const men = [[-1.2, -1.1], [-2.2, -1.5], [2.0, -1.2]].map(([x, zz], i) => { const s = soldier(SHU); s.root.position.set(x, WH, zz); scene.add(s.root); return s; });
  return { z, men };
}
// ============ 4. "Su defensor, Zhuge Liang, no tenía ejército" ============
function shotDefender({ makeStage }) {
  const F = fortScene(makeStage, 'golden', { target: [0, 6, -1], shadowSize: 6 });
  const K = wallTopCast(F.scene);
  const C = cam(58);
  const tNo = W('tenía') - S.defensor;
  return { scene: F.scene, camera: C, update(t) {
    F.land.dry.update(t);
    K.z.root.rotation.y = 0.1; K.z.pose(P(POSES.stand, idle(t), { ra: [0.35, 0.9, 1.6], la: [0.25, 0.4, 0.9] })); K.z.fan.rotation.z = -0.2 + Math.sin(t * 2.2) * 0.25;
    K.z.setFace({ eyes: blink(t, 1) ? 'closed' : 'half', brows: 'flat', mouth: 'smile', look: [0.25, 0] });
    const scared = smooth(range(t, tNo - 0.3, tNo + 0.2));
    K.men.forEach((s, i) => {
      s.root.rotation.y = [0.3, 0.5, -0.4][i];
      s.pose(mixPose(P(POSES.stand, idle(t, i), { ra: [0.25, 0.4, 0.5] }), P(POSES.scared, { bob: Math.sin(t * 30 + i) * 0.004 }), scared));
      s.setFace({ eyes: scared > 0.5 ? 'wide' : 'open', brows: 'worried', mouth: scared > 0.5 ? 'wavy' : 'flat', sweat: scared > 0.5, look: [i === 2 ? -0.6 : 0.6, -0.2] });
    });
    const sh = shake(t, 0.8, 3);
    place(C, [1.5 - t * 0.12 + sh[0], 6.6 + sh[1], 2.2 - t * 0.12], [0.1, 6.95, -1.2]);
    return { bloom: 0.4, exposure: 1.02, dof: { focus: 3.2, blur: 0.3 } };
  } };
}

// ============ 5. "Así que hizo algo impensable": the fan points down at the gate, the soldiers gasp ============
function shotIdea({ makeStage }) {
  const F = fortScene(makeStage, 'golden', { target: [0, 6, -1], shadowSize: 6 });
  const K = wallTopCast(F.scene);
  const C = cam(62);
  return { scene: F.scene, camera: C, update(t) {
    F.land.dry.update(t);
    const pt = smooth(range(t, 0.6, 1.1));
    K.z.root.rotation.y = 0.35; K.z.pose(mixPose(P(POSES.stand, { ra: [0.35, 0.9, 1.6] }), P(POSES.stand, { ra: [0.25, 1.35, 0.1], lean: [0.05, 0] }), pt));
    K.z.fan.rotation.z = -0.2;
    K.z.setFace({ eyes: 'half', brows: pt > 0.5 ? 'smug' : 'flat', mouth: pt > 0.5 ? 'smirk' : 'smile', look: [0.5, 0] });
    K.men.forEach((s, i) => { s.root.rotation.y = [0.9, 0.8, -0.6][i]; s.pose(P(POSES.scared, idle(t * 3, i), { la: [0.7, 0.9, 2.3], ra: [0.7, 0.9, 2.3] }));
      s.setFace({ eyes: 'wide', brows: 'worried', mouth: pt > 0.5 ? 'o' : 'wavy', sweat: true, look: [i === 2 ? -0.7 : 0.7, 0] }); });
    place(C, [-1.7 + t * 0.15, 6.4, 1.2 - t * 0.05], [0.0, 7.0, -1.3], -0.2);
    return { bloom: 0.4, exposure: 1.02 };
  } };
}

// ============ 6. The gate doors swing open, from inside the passage ("abrió" - "Puso") ============
function shotGateOpen({ makeStage }) {
  const F = fortScene(makeStage, 'golden', { target: [0, 2, -2], shadowSize: 10 });
  const pass = new THREE.PointLight(0xffb070, 3, 9, 1.5); pass.position.set(0, 3.6, -4); F.scene.add(pass);
  const C = cam(70);
  return { scene: F.scene, camera: C, update(t) {
    F.land.dry.update(t);
    const open = easeInOut(range(t, 0.15, 1.9)) * 1.55;
    F.wall.userData.setDoors(open);
    const sh = shake(t, 0.5 + pulse(t, 1.95, 0.08) * 6, 5);
    place(C, [0.0 + sh[0], 0.45 + sh[1], -6.2 + t * 0.35], [0, 1.4, 10]);
    return { bloom: 0.5, exposure: 1.05, lens: 0.25, vignette: 0.45 };
  } };
}

// ============ 7. Disguised soldiers sweep the road in front of the open gate ("Puso" - "Y él") ============
function shotSweep({ makeStage }) {
  const F = fortScene(makeStage, 'golden', { target: [0, 1, 2], shadowSize: 6 });
  F.wall.userData.setDoors(1.55);
  const sweepers = [[-1.1, 2.4, 0.6], [1.0, 3.6, -0.5], [0.3, 6.5, 0.2]].map(([x, z, ry]) => {
    const s = makeToon(PEASANT); addHat(s, 'straw'); s.root.position.set(x, 0, z); s.root.rotation.y = ry; F.scene.add(s.root);
    const br = model('broom', { height: 1.3 }); br.position.set(0, -0.15, 0); br.rotation.set(0.5, 0, 0.25); s.hands.r.add(br);
    return s;
  });
  const dc = dustCloud(10, [3, 0.4, 2], 0xd8bc90, 0.25); dc.position.set(0, 0, 3.5); F.scene.add(dc);
  const C = cam(56);
  const tLook = W('campesinos') - S.barrer;
  return { scene: F.scene, camera: C, update(t) {
    F.land.dry.update(t); dc.update(t * 2);
    sweepers.forEach((s, i) => {
      const k = Math.sin(t * 3.2 + i * 1.7);
      const look = i === 0 && t > tLook && t < tLook + 1.6;
      s.pose(P(POSES.stand, { lean: [0.35, 0.1 * k], crouch: 0.05, ra: [0.2, 1.0 + 0.35 * k, 0.4], la: [0.25, 0.9 + 0.3 * k, 0.6], head: look ? [0, -0.9, 0] : [0.15, 0, 0], ll: [0.2, 0.1], rl: [-0.2, 0.2] }));
      s.setFace(look ? { eyes: 'wide', brows: 'worried', mouth: 'wavy', sweat: true, look: [-0.75, 0] } : { eyes: blink(t, i) ? 'closed' : 'half', brows: 'worried', mouth: 'flat', look: [0, 0.6], sweat: i === 1 });
    });
    place(C, [2.6 - t * 0.2, 0.55, 9.2 - t * 0.35], [-0.2, 1.6, 1.0]);
    return { bloom: 0.45, exposure: 1.0, dof: { focus: 6.5, blur: 0.25 } };
  } };
}

// ============ 8. He climbs to the wall and plays the guqin: worm's-eye up at the tower, gate wide open ("Y él" - "El general") ============
function shotZither({ makeStage }) {
  const F = fortScene(makeStage, 'golden', { target: [0, 6, -1], shadowSize: 8 });
  F.wall.userData.setDoors(1.55);
  const Z = zhugeSpot(F.scene);
  const sw = makeToon(PEASANT); addHat(sw, 'straw'); sw.root.position.set(1.4, 0, 2.2); sw.root.rotation.y = -0.4; F.scene.add(sw.root);
  const br = model('broom', { height: 1.3 }); br.position.set(0, -0.15, 0); br.rotation.set(0.5, 0, 0.25); sw.hands.r.add(br);
  const C = cam(64);
  const tPlay = T.cítara - S.muralla;
  return { scene: F.scene, camera: C, update(t) {
    F.land.dry.update(t);
    zhugeLive(Z, t, { k: smooth(range(t, tPlay - 0.6, tPlay)), face: { eyes: 'closed', mouth: 'smile', brows: 'flat' } });
    const k = Math.sin(t * 3.2); sw.pose(P(POSES.stand, { lean: [0.35, 0.1 * k], ra: [0.2, 1.0 + 0.35 * k, 0.4], la: [0.25, 0.9 + 0.3 * k, 0.6], head: [0.15, 0, 0] })); sw.setFace({ eyes: 'half', brows: 'worried', mouth: 'flat', look: [0, 0.6] });
    const push = easeInOut(range(t, 0, 3.6));
    place(C, [lerp(-2.5, -0.9, push), lerp(0.4, 4.2, push), lerp(9.5, 4.0, push)], [0, lerp(5.2, 6.8, push), -1.0]);
    return { bloom: 0.5, exposure: 1.0 };
  } };
}

// ============ 9. Sima Yi raises his hand: the army stops dead ("El general" - "Conocía") ============
function shotHalt({ makeStage }) {
  const scene = outdoor(makeStage, 'golden', [0, 0, 26], 10);
  const land = plain(scene);
  const A = army({ cols: 36, rows: 36 }); scene.add(A);
  const dc = dustCloud(40, [50, 4, 40]); scene.add(dc);
  const sm = sima(); sm.root.position.set(0, 0, 24); sm.root.rotation.y = Math.PI; scene.add(sm.root);
  const front = [-1.5, 1.5, -3, 3].map(x => { const s = soldier(); s.root.position.set(x, 0, 26); s.root.rotation.y = Math.PI; scene.add(s.root); return s; });
  const C = cam(70);
  const tStop = T.frenó - S.general;
  return { scene, camera: C, update(t) {
    land.dry.update(t);
    const walk = 1 - smooth(range(t, tStop - 0.1, tStop + 0.25));
    const drift = Math.min(t, tStop) * 1.3 + (t > tStop ? 0.15 * easeOut(range(t, tStop, tStop + 0.3)) : 0);
    const z0 = 27 - drift;
    A.pose(t, { walk, z0: z0 + 2.5 }); dc.position.set(0, 0, z0 + 22); dc.update(t);
    sm.root.position.z = z0 - 1.4;
    const hand = smooth(range(t, tStop - 0.35, tStop));
    sm.pose(mixPose(walkPose(t * 6, 0.8), P(POSES.stand, { ra: [0.5, 2.5, 0.3], lean: [-0.05, 0] }), hand));
    sm.setFace(hand > 0.5 ? { eyes: 'half', brows: 'angry', mouth: 'frown', look: [0, 0.1] } : { eyes: 'open', brows: 'angry', mouth: 'flat' });
    front.forEach((s, i) => { s.root.position.z = z0 + (i < 2 ? 0 : 0.6) + (t > tStop ? -0.12 * pulse(t, tStop + 0.15, 0.1) : 0);
      s.pose(mixPose(walkPose(t * 6 + i, 0.8, { ra: [0.2, 0.5, 0.6] }), P(POSES.stand, { ra: [0.2, 0.5, 0.6], lean: [0.12 * pulse(t, tStop + 0.12, 0.1), 0] }), 1 - walk));
      s.setFace({ eyes: t > tStop ? 'wide' : 'open', brows: t > tStop ? 'raised' : 'angry', mouth: t > tStop ? 'o' : 'flat' }); });
    const sh = shake(t, pulse(t, tStop + 0.1, 0.1) * 6 + 0.4, 2);
    place(C, [0.9 + sh[0], 0.25 + sh[1], z0 - 4.6 + Math.min(t, tStop) * 1.3 * 0.9], [0, 1.55, z0 - 1.2]);
    return { bloom: 0.4, exposure: 1.05 };
  } };
}

// ============ 10. Over Sima Yi's shoulder: the open gate, the tiny figure playing ("Conocía" - "Esto") ============
function shotOTS({ makeStage }) {
  const F = fortScene(makeStage, 'golden', { target: [0, 3, 3], shadowSize: 12 });
  F.wall.userData.setDoors(1.55);
  const Z = zhugeSpot(F.scene);
  const sweep = [[-1.4, 2.5], [1.3, 3.2]].map(([x, z]) => { const s = makeToon(PEASANT); addHat(s, 'straw'); s.root.position.set(x, 0, z); F.scene.add(s.root); const br = model('broom', { height: 1.3 }); br.position.y = -0.15; br.rotation.set(0.5, 0, 0.25); s.hands.r.add(br); return s; });
  const sm = sima(); sm.root.position.set(0.6, 0, 26); sm.root.rotation.y = Math.PI + 0.05; F.scene.add(sm.root);
  const C = cam(40);
  const tJ = T.jamas - S.conocia;
  return { scene: F.scene, camera: C, update(t) {
    F.land.dry.update(t);
    zhugeLive(Z, t, { face: { eyes: 'closed' } });
    sweep.forEach((s, i) => { const k = Math.sin(t * 3.2 + i * 2); s.pose(P(POSES.stand, { lean: [0.35, 0.1 * k], ra: [0.2, 1.0 + 0.35 * k, 0.4], la: [0.25, 0.9 + 0.3 * k, 0.6] })); s.setFace({ eyes: 'half', mouth: 'flat', brows: 'worried', look: [0, 0.6] }); });
    const turn = smooth(range(t, tJ, tJ + 0.4));
    sm.pose(P(POSES.stand, { head: [0, lerp(0, -0.7, turn), 0], la: [0.9, -0.2, 2.2], ra: [0.9, -0.2, 2.2] }));
    sm.setFace({ eyes: 'half', brows: 'worried', mouth: 'frown', look: [lerp(0, -1, turn), 0] });
    place(C, [1.6 + t * 0.05, 1.95, 28.6 - t * 0.35], [-0.2, 5.0, 0]);
    return { bloom: 0.45, exposure: 1.02, dof: { focus: 24, blur: 0.2 } };
  } };
}

// ============ 11. "Esto tenía que ser una trampa": Sima Yi close, sweating, eyes darting ============
function shotSuspect({ makeStage }) {
  const scene = outdoor(makeStage, 'golden', [0, 1, 24], 6);
  const land = plain(scene);
  const A = army({ cols: 30, rows: 24 }); scene.add(A); A.pose(0, { walk: 0, z0: 27 });
  const sm = sima(); sm.root.position.set(0, 0, 24); sm.root.rotation.y = Math.PI; scene.add(sm.root);
  const C = cam(52);
  return { scene, camera: C, update(t) {
    land.dry.update(t); A.pose(t, { walk: 0, z0: 27 });
    const dart = Math.sin(t * 5) > 0 ? 0.7 : -0.7;
    sm.pose(P(POSES.think, { head: [0.05, 0, Math.sin(t * 3) * 0.04] }));
    sm.setFace({ eyes: 'open', brows: 'worried', mouth: 'wavy', sweat: true, look: [dart, 0.1] });
    const sh = shake(t, 1.2, 8);
    place(C, [0.35 + sh[0], 1.55 + sh[1], 21.9 + t * 0.12], [0, 1.6, 24], 0.22);
    return { bloom: 0.35, exposure: 0.95, vignette: 0.55, tint: [1.05, 0.95, 0.9], dof: { focus: 2.2, blur: 0.5 } };
  } };
}

// ============ 12. The trap he imagines: red eyes in the dark gate passage ("trampa" - "Y retiró") ============
function shotAmbush({ makeStage }) {
  const scene = makeStage({ mood: 'dark', fog: true, shadowSize: 4, target: [0, 1, -3], env: 0.2 });
  scene.userData.sun.intensity = 0.15; scene.userData.hemi.intensity = 0.35;
  const id = 'japanese_stone_wall';
  scene.add(wbox(0.6, 5, 14, id, 2.2, [-GW - 0.3, 2.5, -4], { color: 0x6a6a72 }), wbox(0.6, 5, 14, id, 2.2, [GW + 0.3, 2.5, -4], { color: 0x6a6a72 }));
  scene.add(floor(10, 20, pmat('forrest_ground_01', 3, 6, { color: 0x6a5a48 })));
  const shadowMen = [];
  for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) {
    const s = makeToon({ color: '#141418', lower: '#0c0c10', size: [0.46, 0.56, 0.5], skin: 0x2a2a30 }); addHat(s, 'helmet');
    s.root.position.set((c - 1) * 1.05 + (r % 2) * 0.3, 0, -1.5 - r * 1.6); scene.add(s.root); shadowMen.push(s);
  }
  const red = new THREE.PointLight(0xff3020, 6, 9, 1.6); red.position.set(0, 2.5, 1.5); scene.add(red);
  const C = cam(60);
  return { scene, camera: C, update(t) {
    shadowMen.forEach((s, i) => { const on = t > 0.15 + (i % 6) * 0.06; s.pose(P(POSES.stand, { ra: [0.3, 1.1, 0.5], la: [0.3, 1.0, 0.8], lean: [0.08, 0] })); s.setFace({ eyes: on ? 'red' : 'closed', brows: 'angry', mouth: 'flat' }); });
    red.intensity = 2 + 4 * smooth(range(t, 0, 0.6));
    place(C, [0, 1.3, 3.2 - t * 0.6], [0, 1.4, -3]);
    return { bloom: 0.9, bloomThreshold: 0.6, exposure: 1.1, vignette: 0.65, tint: [1.15, 0.85, 0.85], charLight: [0.25, 0.6] };
  } };
}

// ============ 13. The whole army turns back. From above Zhuge's shoulder, sunset ("Y retiró" - "Sin disparar") ============
function shotRetreat({ makeStage }) {
  const F = fortScene(makeStage, 'sunset', { target: [0, 6, 6], shadowSize: 10 });
  F.wall.userData.setDoors(1.55);
  const Z = zhugeSpot(F.scene);
  const A = army({ cols: 44, rows: 40 }); F.scene.add(A);
  const dc = dustCloud(50, [70, 6, 60]); F.scene.add(dc);
  const C = cam(56);
  return { scene: F.scene, camera: C, update(t) {
    F.land.dry.update(t);
    zhugeLive(Z, t, { face: { eyes: 'closed', mouth: 'smile' } });
    const turn = smooth(range(t, 0.1, 0.7));
    const z0 = 34 + easeIn(range(t, 0.6, 2.4)) * 3;
    A.pose(t, { walk: 0.5 + turn * 0.5, z0, face: lerp(Math.PI, 0, turn) }); dc.position.set(0, 0, z0 + 20); dc.update(t);
    place(C, [-1.1 - t * 0.1, 7.75 + t * 0.12, -2.4 - t * 0.25], [0.5, 5.0, 26]);
    return { bloom: 0.5, exposure: 1.0 };
  } };
}

// ============ 14. Insert: a full quiver on a soldier's back walking away; not one arrow fired ("Sin disparar" - "Lo curioso") ============
function quiver() {
  const g = new THREE.Group();
  const q = tmesh(new THREE.CylinderGeometry(0.075, 0.06, 0.55, 16), 0x6a3a1c, { w: 0.006 }); q.position.y = 0.27; g.add(q);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.078, 0.078, 0.04, 16), toon(GOLD)); band.position.y = 0.45; g.add(band);
  for (let i = 0; i < 14; i++) {
    const a = i * 2.4, r = 0.045 * Math.sqrt((i + 0.5) / 14);
    const ar = new THREE.Group(); ar.position.set(Math.cos(a) * r, 0.45, Math.sin(a) * r); ar.rotation.set((Math.random() - 0.5) * 0.1, 0, (Math.random() - 0.5) * 0.1); g.add(ar);
    const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.32, 5), toon(0xc8a46a)); sh.position.y = 0.1; ar.add(sh);
    for (let k = 0; k < 3; k++) { const f = new THREE.Mesh(new THREE.PlaneGeometry(0.03, 0.08), toon(k === 0 ? 0xf4f0e8 : 0xb3261e, { side: THREE.DoubleSide })); f.position.y = 0.23; f.rotation.y = k * 2.1; f.translateX(0.015); ar.add(f); }
  }
  return g;
}
function shotQuiver({ makeStage }) {
  const scene = outdoor(makeStage, 'sunset', [0, 1, 30], 5);
  const land = plain(scene);
  const A = army({ cols: 30, rows: 30 }); scene.add(A);
  const dc = dustCloud(30, [40, 4, 30]); scene.add(dc);
  const s = soldier(WEI, false); scene.add(s.root);
  const qv = quiver(); qv.position.set(0.1, 0.6, -0.18); qv.rotation.set(-0.25, 0, -0.45); s.torso.add(qv);
  const bow = tmesh(new THREE.TorusGeometry(0.42, 0.012, 6, 24, Math.PI * 0.9), 0x5a3418, { w: 0.004 }); bow.rotation.set(0, Math.PI / 2, Math.PI / 2); bow.position.set(0, -0.05, 0); s.hands.l.add(bow);
  const C = cam(40);
  return { scene, camera: C, update(t) {
    land.dry.update(t);
    const z = 30 + t * 1.1;
    A.pose(t, { walk: 1, z0: z + 1.5, face: 0 }); dc.position.set(0, 0, z + 18); dc.update(t);
    s.root.position.set(0, 0, z); s.root.rotation.y = 0; s.pose(walkPose(t * 6, 0.8));
    s.setFace({ eyes: 'half', brows: 'flat', mouth: 'flat' });
    place(C, [0.55, 1.25, z - 1.25 - t * 0.12], [0.05, 1.1, z]);
    return { bloom: 0.5, exposure: 1.0, dof: { focus: 1.35, blur: 0.5 } };
  } };
}

// ---------- the historian's study: a map scroll on the table, lantern light ----------
function mapTexture() {
  return canvasTex(1024, 512, (g, w, h) => {
    g.fillStyle = '#e9dcb8'; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(120,90,50,0.08)'; for (let i = 0; i < 4000; i++) g.fillRect(Math.random() * w, Math.random() * h, 2, 2);
    g.strokeStyle = '#5a4a3a'; g.lineWidth = 3;
    const mtn = (x, y, s) => { g.beginPath(); g.moveTo(x - s, y); g.lineTo(x, y - s * 1.2); g.lineTo(x + s, y); g.stroke(); g.beginPath(); g.moveTo(x - s * 0.4, y - s * 0.5); g.lineTo(x, y - s * 0.2); g.stroke(); };
    [[150, 160, 30], [210, 140, 24], [260, 190, 28], [380, 120, 26], [430, 150, 20], [520, 330, 28], [600, 300, 22], [700, 120, 24], [120, 360, 26], [300, 400, 22], [820, 380, 26]].forEach(a => mtn(...a));
    g.strokeStyle = '#4a7aa0'; g.lineWidth = 6; g.beginPath(); g.moveTo(0, 260); g.bezierCurveTo(250, 220, 420, 300, 600, 240); g.bezierCurveTo(760, 190, 880, 260, 1024, 230); g.stroke();
    g.lineWidth = 4; g.beginPath(); g.moveTo(560, 512); g.bezierCurveTo(600, 420, 680, 380, 760, 300); g.stroke();
    g.strokeStyle = '#7a3a2a'; g.lineWidth = 10; g.strokeRect(14, 14, w - 28, h - 28);
    g.fillStyle = '#2a2018'; g.font = 'bold 34px serif'; g.textAlign = 'center';
    g.fillText('Xicheng', 190, 300); g.fillText('Wan', 840, 330);
  });
}
function studyScene(makeStage) {
  const scene = makeStage({ mood: 'interior', shadowSize: 3, target: [0, 0.8, 0], env: 0.35 });
  scene.userData.sun.intensity = 0;
  const R = room({ w: 7, d: 6, h: 3.2, floorMat: pmat('japanese_cedar_planks', 3, 3, { color: 0x9a6a48 }), wallMat: std(0xffffff, { map: tex(wallpaper(0x5a2a22, 0x63302a), 6, 3) }) }); scene.add(R);
  put(scene, 'screen', { height: 1.7 }, [-1.9, 0, -2.6], 0.2);
  put(scene, 'cabinet', { height: 2.2 }, [2.3, 0, -2.6], -0.1);
  put(scene, 'vase', { height: 0.55 }, [-2.8, 0, -1.8]);
  put(scene, 'stool', { height: 0.5 }, [0.9, 0, -1.4], 0.4);
  const desk = put(scene, 'console', { height: 0.8 }, [0, 0, -0.2]); desk.scale.z *= 2.6;
  const win = new THREE.Mesh(new THREE.CircleGeometry(0.55, 40), new THREE.MeshBasicMaterial({ color: 0xcfe0ff })); win.position.set(0.9, 2.0, -2.98); scene.add(win);
  const day = new THREE.SpotLight(0xcfe2ff, 14, 9, 0.4, 0.6, 1.2); day.position.set(0.9, 2.1, -2.7); day.target.position.set(0, 0.8, 0); day.castShadow = true; day.shadow.mapSize.set(1024, 1024); scene.add(day, day.target);
  const shaft = beam({ len: 4, r0: 0.45, r1: 1.1, color: 0xcfe2ff, strength: 0.05 }); shaft.position.set(0.9, 2.0, -2.9); shaft.rotation.x = -1.15; scene.add(shaft);
  const motes = dust(50, [1.2, 1.4, 1.2]); motes.position.set(0.4, 1.4, -1.2); scene.add(motes);
  const lamp = lantern({ intensity: 4, dist: 6, shadow: true, chain: 0.5, mesh: model('woodLantern', { height: 0.5 }) }); lamp.position.set(-0.9, 2.3, 0.1); scene.add(lamp);
  return { scene, lamp, motes };
}
// ============ 15. "Lo curioso: seguramente nunca pasó": the map, Sima Yi's pin is hundreds of km away ("Lo curioso" - "Pero") ============
function shotMap({ makeStage }) {
  const H = studyScene(makeStage); const { scene, lamp, motes } = H;
  const map = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.8), std(0xffffff, { map: mapTexture(), roughness: 0.9 })); map.rotation.x = -Math.PI / 2; map.position.set(0, 0.805, 0); map.receiveShadow = true; scene.add(map);
  for (const s of [-1, 1]) { const roll = tmesh(new THREE.CylinderGeometry(0.03, 0.03, 0.88, 14), 0x7a3a1c, { w: 0.004 }); roll.rotation.x = Math.PI / 2; roll.position.set(s * 0.82, 0.83, 0); scene.add(roll); }
  const toMap = (u, v) => V(-0.8 + u * 1.6, 0.81, -0.4 + v * 0.8);
  const pin = (u, v, col) => { const g = new THREE.Group(); const st = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.14, 6), toon(0x333333)); st.position.y = 0.07; g.add(st); const fl = tmesh(new THREE.BoxGeometry(0.06, 0.04, 0.004), col, { w: 0.003 }); fl.position.set(0.03, 0.12, 0); g.add(fl); g.position.copy(toMap(u, v)); scene.add(g); return g; };
  const pZ = pin(190 / 1024, 1 - 0.0 - 330 / 512, 0x2f5d50), pS = pin(840 / 1024, 1 - 0.0 - 360 / 512, 0x9a1c1c);
  pZ.position.z = toMap(0, 330 / 512).z; pS.position.z = toMap(0, 360 / 512).z;
  const dashes = []; for (let i = 0; i < 28; i++) { const k = i / 27; const d = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.002, 0.006), toon(0xb3261e)); d.position.lerpVectors(pZ.position, pS.position, k); d.position.y = 0.812; d.position.z -= Math.sin(k * Math.PI) * 0.06; d.lookAt(pS.position.x, 0.812, pS.position.z); scene.add(d); dashes.push(d); }
  const sch = makeToon(SCHOLAR); sch.root.position.set(-0.45, 0, -0.95); sch.root.rotation.y = 0.35; scene.add(sch.root);
  const C = cam(46);
  const tC = T.cientos - S.curioso, tN = T.nunca - S.curioso;
  return { scene, camera: C, update(t) {
    lamp.flicker(t); motes.update(t);
    const draw = range(t, tC - 0.9, tC + 0.6); dashes.forEach((d, i) => d.visible = i / dashes.length < draw);
    sch.pose(P(POSES.stand, { ra: [0.25, 1.15, 0.5], lean: [0.2, 0], la: [0.2, 0.3, 0.7] }));
    sch.setFace({ eyes: blink(t, 3) ? 'closed' : 'open', brows: t > tN ? 'raised' : 'flat', mouth: t > tN ? 'smirk' : 'flat', look: [0.5, 0.6], nose: true });
    const pan = easeInOut(range(t, tC - 1.0, tC + 0.9));
    place(C, [lerp(-0.85, 0.55, pan), 1.55, 0.95], [lerp(-0.55, 0.65, pan), 0.85, 0.05]);
    return { bloom: 0.45, exposure: 1.2, vignette: 0.45 };
  } };
}
// ============ 16. The legend became stratagem no. 32: bamboo slips, one rises and glows ("Pero" - "¿Tú") ============
function slipTex(num, label) {
  return canvasTex(64, 512, (g, w, h) => { g.fillStyle = '#d9c78a'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(90,70,30,0.25)'; g.fillRect(0, 0, 4, h); g.fillRect(w - 4, 0, 4, h);
    g.fillStyle = '#1a1410'; g.textAlign = 'center'; g.font = 'bold 30px serif'; g.fillText(num, w / 2, 44);
    if (label) { g.font = 'bold 54px "WenQuanYi Zen Hei", sans-serif'; [...label].forEach((ch, i) => g.fillText(ch, w / 2, 130 + i * 90)); } });
}
function shotSlips({ makeStage }) {
  const H = studyScene(makeStage); const { scene, lamp, motes } = H;
  const slips = [];
  for (let i = 0; i < 36; i++) {
    const n = i + 1, mat = std(0xffffff, { map: slipTex(n, n === 32 ? '空城計' : null), roughness: 0.7 });
    const sl = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.42, 0.006), mat); sl.rotation.x = -Math.PI / 2; sl.position.set(-0.72 + i * 0.041, 0.808, 0.02); sl.castShadow = sl.receiveShadow = true; scene.add(sl); slips.push(sl);
  }
  for (const z of [-0.13, 0.17]) { const cord = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.004, 0.008), toon(0x8a2a1a)); cord.position.set(0, 0.812, z); scene.add(cord); }
  const glow = glowSprite(0xffd27a, 0.7, 0); scene.add(glow);
  const C = cam(42);
  const tN = T.numero - S.leyenda;
  return { scene, camera: C, update(t) {
    lamp.flicker(t); motes.update(t);
    const up = easeOut(range(t, tN - 0.4, tN + 0.3)), s = slips[31];
    s.position.set(-0.72 + 31 * 0.041, 0.808 + up * 0.35, 0.02 + up * 0.15); s.rotation.x = lerp(-Math.PI / 2, -0.25, up); s.material.emissive = new THREE.Color(0x3a2a08).multiplyScalar(up);
    glow.position.copy(s.position); glow.material.opacity = up * 0.55;
    const push = easeInOut(range(t, 0, tN + 0.6));
    place(C, [lerp(-0.4, 0.38, push), lerp(1.45, 1.22, push), lerp(1.2, 0.85, push)], [lerp(-0.2, 0.55, push), lerp(0.82, 1.0, push), 0.0]);
    return { bloom: 0.7, bloomThreshold: 0.8, exposure: 1.2, vignette: 0.5 };
  } };
}
// ============ 17. "¿Tú habrías entrado?": back on the wall at dusk, he stops playing and looks at you ============
function shotClose({ makeStage }) {
  const F = fortScene(makeStage, 'sunset', { target: [0, 6, -1], shadowSize: 6 });
  const Z = zhugeSpot(F.scene);
  const C = cam(46);
  return { scene: F.scene, camera: C, update(t) {
    F.land.dry.update(t);
    const stop = smooth(range(t, 0.2, 0.7));
    zhugeLive(Z, t, { k: 1 - stop, face: stop > 0.5 ? { eyes: blink(t, 5) ? 'closed' : 'open', brows: 'raised', mouth: 'smirk', look: [0, 0] } : { eyes: 'closed' } });
    Z.z.pose(mixPose(play(t, 1), P(SIT, { la: [0.32, 1.05, 1.05], ra: [0.32, 1.0, 1.1], head: [-0.05, 0, 0.06], lean: [0.05, 0] }), stop));
    place(C, [0.1, 6.95, 1.1 - t * 0.12], [0, 6.98, -1.0]);
    return { bloom: 0.55, exposure: 1.0, dof: { focus: 2.0, blur: 0.4 } };
  } };
}

export const SHOTS = [
  { start: 0, end: T.marchan, build: shotHook },
  { start: T.marchan, end: T.ciudad, build: shotArmy },
  { start: T.ciudad, end: S.defensor, build: shotCityWide },
  { start: S.defensor, end: S.impensable, build: shotDefender },
  { start: S.impensable, end: T.abrio, build: shotIdea },
  { start: T.abrio, end: S.barrer, build: shotGateOpen },
  { start: S.barrer, end: S.muralla, build: shotSweep },
  { start: S.muralla, end: S.general, build: shotZither },
  { start: S.general, end: S.conocia, build: shotHalt },
  { start: S.conocia, end: S.trampa, build: shotOTS },
  { start: S.trampa, end: T.trampaW, build: shotSuspect },
  { start: T.trampaW, end: S.retiro, build: shotAmbush },
  { start: S.retiro, end: S.flecha, build: shotRetreat },
  { start: S.flecha, end: S.curioso, build: shotQuiver },
  { start: S.curioso, end: S.leyenda, build: shotMap },
  { start: S.leyenda, end: S.tu, build: shotSlips },
  { start: S.tu, end: 999, build: shotClose },
];
