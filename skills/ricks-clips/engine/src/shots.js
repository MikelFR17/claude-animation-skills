// THE EDIT. Example short: "Why every old ship had a cat" (31 s, 11 shots). The plan behind it is plan.md.
// Each shot: build({ makeStage }) -> { scene, camera, update(t) }. update gets the time inside the shot and may
// return { exposure, bloom, bloomThreshold, vignette, saturation, tint:[r,g,b], flash }.
import * as THREE from 'three';
import { makeToon, makeCat, makeRat, mixPose, walkPose, talk, blink, POSES, tmesh, toon } from './toon.js';
import { model, sea, seaHeight, sack, ropeCoil, rope, lantern, beam, dust, rain, room, box, floor,
  planks, wallpaper, stone, tex, std, glowSprite } from './world.js';
import { kf, lerp, smooth, easeOut, easeIn, easeInOut, range, clamp, V, cam, place, shake } from './anim.js';

export const CAPTIONS = [
  [0.25, 'For *centuries,*'], [1.45, 'almost'], [1.91, 'every'], [2.32, 'ship'], [2.67, 'had'],
  [2.96, 'one'], [3.26, 'crew'], [3.61, 'member'], [4.07, 'who'], [4.36, 'never'],
  [4.77, 'pulled'], [5.23, 'a single'], [5.91, 'rope.'], [6.71, 'The *cat.*'], [7.75, 'Down'],
  [8.10, 'in the'], [8.63, 'hold,'], [9.26, '*rats*'], [9.61, 'ate'], [9.91, 'the food,'],
  [10.83, 'chewed'], [11.29, 'the ropes'], [11.99, 'and spread'], [12.75, '*disease.*'], [13.71, 'One'],
  [14.01, 'good'], [14.36, 'cat'], [14.65, 'could'], [15.06, 'save'], [15.41, 'the whole'],
  [16.11, 'voyage.'], [17.02, 'Sailors'], [17.53, 'even'], [17.88, 'believed'], [18.45, 'cats'],
  [18.80, 'brought'], [19.32, '*luck.*'], [20.12, 'And if'], [20.65, 'one'], [20.95, 'fell'],
  [21.30, 'overboard,'], [22.20, 'a *storm*'], [22.83, 'was coming.'], [24.03, 'The Royal'], [24.73, 'Navy'],
  [25.08, 'only'], [25.43, 'banned'], [25.89, 'ship'], [26.24, 'cats'], [26.59, 'in *1975.*'],
  [27.63, 'Would'], [28.04, 'you'], [28.33, 'have'], [28.68, 'sailed'], [29.14, 'without'],
  [29.66, 'one?', 30.30],
];
export const DURATION = 30.75;
// lines of up to 4 words, the spoken word in yellow, *starred* words always yellow; centred above the lower third
export const CAPTION_STYLE = { mode: 'group', maxWords: 4, maxChars: 18, y: 0.6 };
// [fadeInStart, fullStart, fullEnd, fadeOutEnd] dips to black
export const FADES = [[19.86, 19.98, 20.02, 20.2]];

// real CC0 models (python3 kit/assets.py model <id> / hdri <id>), loaded before the first frame
const PH = 'assets/polyhaven/';
export const ASSETS = {
  ship: PH + 'dutch_ship_large_01/dutch_ship_large_01_1k.gltf', cannon: PH + 'cannon_01/cannon_01_1k.gltf',
  barrel: PH + 'wine_barrel_01/wine_barrel_01_1k.gltf', barrel2: PH + 'barrel_03/barrel_03_1k.gltf', wine: PH + 'wine_barrel_01/wine_barrel_01_1k.gltf',
  crate: PH + 'wooden_crate_01/wooden_crate_01_1k.gltf', crate2: PH + 'wooden_crate_02/wooden_crate_02_1k.gltf', chest: PH + 'treasure_chest/treasure_chest_1k.gltf',
  lanternM: PH + 'Lantern_01/Lantern_01_1k.gltf', table: PH + 'WoodenTable_01/WoodenTable_01_1k.gltf', chair: PH + 'WoodenChair_01/WoodenChair_01_1k.gltf',
  frame: PH + 'fancy_picture_frame_01/fancy_picture_frame_01_1k.gltf', shelf: PH + 'Shelf_01/Shelf_01_1k.gltf', candles: PH + 'brass_candleholders/brass_candleholders_1k.gltf',
  skyGold: PH + 'hdri/belfast_sunset_puresky_1k.hdr', skyDusk: PH + 'hdri/qwantani_dusk_2_puresky_1k.hdr', skyStorm: PH + 'hdri/approaching_storm_1k.hdr',
};
const LANT = () => model('lanternM', { height: 0.38 });

// ---------- cast ----------
const SAILOR_A = { color: '#f4f1ea', stripes: '#22396b', lower: '#2c3e66', hat: 'bandana', hatColor: 0xb3261e, size: [0.44, 0.56, 0.5] };
const SAILOR_B = { color: '#f4f1ea', stripes: '#22396b', lower: '#5a4632', hat: 'beanie', hatColor: 0x2f5d50, size: [0.5, 0.6, 0.48], moustache: true, nose: true };
const SAILOR_C = { color: '#cfa36a', lower: '#3b2f2a', belt: '#3a2618', hair: 'bowl', hairColor: 0x3a2416, size: [0.42, 0.56, 0.52] };
const CAPTAIN = { color: '#1f2d55', buttons: '#e8c25a', double: true, belt: '#151515', lower: '#1a1a22', hat: 'tricorn', epaulettes: true, moustache: true, nose: true, size: [0.54, 0.64, 0.48] };
const OFFICER = { color: '#1c2747', buttons: '#e8c25a', double: true, collar: '#f4f4f0', tie: '#111', hat: 'captain', size: [0.48, 0.62, 0.5], nose: true };

const idle = (t, s = 0) => ({ bob: Math.sin(t * 2 + s) * 0.006, lean: [Math.sin(t * 1.3 + s) * 0.02, Math.sin(t * 0.9 + s) * 0.015] });
const pulse = (t, c, w) => Math.exp(-(((t - c) / w) ** 2));   // a bump centred on c
const P = (...parts) => Object.assign({}, ...parts);

// the ship rides the swell: call every frame with the same t the sea uses
function ride(g, t, amp = 1, z = 0) {
  g.position.y = seaHeight(0, z, t, amp) * 0.6;
  g.rotation.z = Math.sin(t * 0.9) * 0.025 * amp;
  g.rotation.x = Math.sin(t * 0.7 + 1) * 0.018 * amp;
}
function deckScene(makeStage, mood, { amp = 1, shadowSize = 4, target = [0, 0, 1] } = {}) {
  const hdri = { golden: 'skyGold', sunset: 'skyDusk', storm: 'skyStorm' }[mood];
  const scene = makeStage({ mood, shadowSize, target, hdri, env: 0.8 });
  const ocean = sea({ amp, color: mood === 'storm' ? 0x2a5a66 : mood === 'night' ? 0x1a3d73 : 0x2a7fb8, deep: mood === 'storm' ? 0x0c2228 : 0x0d3a66 });
  ocean.position.y = -2.4; scene.add(ocean);
  // the Poly Haven galleon: 34 m long, bow toward +z, main deck lifted to y = 0 (clear deck: |x| < 2.4, -3.5 < z < 4.5, mainmast at 0,0)
  const group = new THREE.Group(); scene.add(group);
  const hull = model('ship'); hull.rotation.y = Math.PI / 2; hull.position.y = -4.64; group.add(hull);
  return { scene, ocean, S: { group } };
}
function deckClutter(g) {
  const put = (name, o, pos, ry = 0) => { const m = model(name, o); m.position.set(...pos); m.rotation.y = ry; g.add(m); return m; };
  const b1 = put('barrel', { height: 0.75 }, [-1.05, 0, 1.6]);
  const b2 = put('barrel2', { height: 0.62 }, [-1.35, 0, 2.25], 1);
  put('wine', { height: 0.55 }, [-1.85, 0, 1.95], 0.4);
  const c1 = put('crate', { height: 0.55 }, [1.25, 0, 3.3], 0.3);
  put('crate2', { height: 0.45 }, [1.35, 0.55, 3.25], -0.2);
  put('chest', { height: 0.5 }, [-1.9, 0, 0.6], 1.3);
  put('cannon', { height: 0.75 }, [1.9, 0, -1.1], Math.PI / 2);
  put('cannon', { height: 0.75 }, [-1.9, 0, -1.6], -Math.PI / 2);
  const coil = ropeCoil(); coil.position.set(0.9, 0, 1.9); g.add(coil);
  return { b1, b2, c1 };
}
const haul = (t, s = 0) => { const k = Math.sin(t * 3.2 + s); return P(POSES.pull, { lean: [-0.25 - 0.12 * k, 0], la: [0.15, 1.25 + 0.15 * k, 0.4 - 0.2 * k], ra: [0.15, 1.1 - 0.15 * k, 0.55 + 0.2 * k], crouch: 0.03 + 0.02 * k }); };

// ============ 1. Golden hour at sea, sailors hauling a line (0 - 3.2) ============
function shotDeckWide({ makeStage }) {
  const { scene, ocean, S } = deckScene(makeStage, 'golden', { shadowSize: 5 });
  const g = S.group; deckClutter(g);
  g.add(rope([0.1, 11, 0.2], [-0.05, 0.95, 1.6], 0.3, 0.016));
  g.add(rope([-0.05, 0.95, 1.6], [0.0, 0.02, 3.6], 0.5, 0.016));
  const a = makeToon(SAILOR_A), b = makeToon(SAILOR_B), c = makeToon(SAILOR_C), cap = makeToon(CAPTAIN);
  a.root.position.set(0.25, 0, 1.75); b.root.position.set(0.28, 0, 2.45); c.root.position.set(0.3, 0, 3.05);
  for (const s of [a, b, c]) { s.root.rotation.y = Math.PI; g.add(s.root); }
  cap.root.position.set(-0.85, 0, 0.6); cap.root.rotation.y = 0.9; g.add(cap.root);
  const C = cam(46);
  return { scene, camera: C, update(t) {
    ocean.update(t + 3); ride(g, t + 3);
    [a, b, c].forEach((s, i) => { s.pose(haul(t, i * 0.7)); s.setFace({ eyes: blink(t, i) ? 'closed' : 'open', brows: 'angry', mouth: 'teeth', sweat: i === 1 }); });
    cap.pose(P(POSES.hips, idle(t))); cap.setFace({ brows: 'smug', mouth: 'smirk', eyes: 'half', look: [0.5, 0] });
    place(C, [1.0 - t * 0.06, 1.2 + t * 0.03, -0.55 + t * 0.15], [0.05, 1.05, 2.4]);
    return { bloom: 0.45, exposure: 1.0 };
  } };
}

// ============ 2. Medium: two sailors strain on the line, then look over (3.2 - 6.6) ============
function shotHaul({ makeStage }) {
  const { scene, ocean, S } = deckScene(makeStage, 'golden', { shadowSize: 3, target: [0, 0, 2] });
  const g = S.group; deckClutter(g);
  g.add(rope([0.1, 11, 0.2], [-0.05, 0.95, 1.6], 0.3, 0.016));
  g.add(rope([-0.05, 0.95, 1.6], [0.0, 0.02, 3.6], 0.5, 0.016));
  const a = makeToon(SAILOR_A), b = makeToon(SAILOR_B);
  a.root.position.set(0.25, 0, 1.75); b.root.position.set(0.28, 0, 2.45);
  for (const s of [a, b]) { s.root.rotation.y = Math.PI * 0.92; g.add(s.root); }
  const C = cam(46);
  return { scene, camera: C, update(t) {
    ocean.update(t + 6.2); ride(g, t + 6.2);
    const stop = smooth(range(t, 1.3, 1.7));      // "never pulled a single rope" - they stop and look over
    [a, b].forEach((s, i) => {
      s.pose(mixPose(haul(t, i * 0.8), P(POSES.stand, { la: [0.2, 0.9, 0.6], ra: [0.2, 0.8, 0.7], head: [0, 0.3, 0], turn: 0.12 }), stop));
      s.setFace(stop < 0.5 ? { brows: 'angry', mouth: 'teeth', sweat: true, eyes: blink(t, i) ? 'closed' : 'open' }
        : { brows: i ? 'angry' : 'flat', mouth: i ? 'frown' : 'flat', eyes: i ? 'open' : 'half', look: [1, 0.25], sweat: true });
    });
    const sh = shake(t, 0.6, 2);
    place(C, [0.85 + sh[0], 1.2 + sh[1], -0.05 + t * 0.06], [0.1, 1.05, 2.2]);
    return { bloom: 0.45 };
  } };
}

// ============ 3. The cat: loafing on a barrel in the sun (6.6 - 7.7) ============
function shotCatHero({ makeStage }) {
  const { scene, ocean, S } = deckScene(makeStage, 'golden', { shadowSize: 2, target: [-1, 0.7, 1.6] });
  const g = S.group; const { b1 } = deckClutter(g);
  const cat = makeCat(); cat.root.position.set(-1.05, 0.76, 1.6); cat.root.rotation.y = 0.5; g.add(cat.root);
  cat.loaf(0.4);
  const C = cam(34);
  return { scene, camera: C, update(t) {
    ocean.update(t + 9); ride(g, t + 9);
    cat.tail(t, 0.7, 0.2); cat.neck.rotation.set(0, 0.25 + Math.sin(t * 0.8) * 0.05, 0.06);
    cat.setFace({ eyes: t > 0.55 && t < 0.68 ? 'closed' : 'half', look: [0.5, 0], brows: 'none' });
    place(C, [-0.25 + t * 0.05, 1.0, 2.75 - t * 0.12], [-1.0, 0.98, 1.6]);
    return { bloom: 0.5 };
  } };
}

// ---------- the hold: dark wood, a swinging lantern, a shaft of daylight from the hatch ----------
function holdScene(makeStage) {
  const scene = makeStage({ mood: 'dark', fog: true, shadowSize: 3, target: [0, 0, 0], env: 0.25 });
  scene.userData.sun.intensity = 0.0; scene.userData.hemi.intensity = 0.9; scene.fog.near = 9;
  const wood = std(0xffffff, { map: tex(planks(0x6a3e22, 6), 3, 2) }), wall = std(0xffffff, { map: tex(planks(0x5a3420, 7), 2, 1) });
  const R = room({ w: 6, d: 7, h: 2.6, floorMat: wood, wallMat: wall, ceilMat: std(0xffffff, { map: tex(planks(0x4a2a18, 8), 2, 2) }) }); scene.add(R);
  for (let z = -3; z <= 3; z += 1.2) R.add(box(6, 0.18, 0.2, std(0x3a2214), [0, 2.5, z]));
  for (const x of [-1.6, 1.6]) for (let z = -3; z <= 2; z += 2.4) R.add(box(0.2, 2.6, 0.2, std(0x3a2214), [x, 1.3, z]));
  // daylight through the hatch
  const hatchLight = new THREE.SpotLight(0xcfe2ff, 40, 8, 0.36, 0.5, 1.3); hatchLight.position.set(0.3, 3.6, -0.6); hatchLight.target.position.set(0.1, 0, 0.3);
  hatchLight.castShadow = true; hatchLight.shadow.mapSize.set(1024, 1024); hatchLight.shadow.bias = -0.001;
  scene.add(hatchLight, hatchLight.target);
  const shaft = beam({ len: 3.4, r0: 0.35, r1: 0.95, color: 0xbcd6ff, strength: 0.22 }); shaft.position.set(0.3, 2.65, -0.6); shaft.rotation.x = -0.27; scene.add(shaft);
  const motes = dust(60, [0.9, 2.0, 0.9]); motes.position.set(0.2, 1.2, -0.2); scene.add(motes);
  const lamp = lantern({ intensity: 7, dist: 7, shadow: true, chain: 0.4, mesh: LANT() }); lamp.position.set(-1.3, 1.85, 0.6); scene.add(lamp);
  const lamp2 = lantern({ intensity: 6, dist: 6, chain: 0.4, mesh: LANT() }); lamp2.position.set(1.4, 1.85, -2.2); scene.add(lamp2);
  // cargo
  const props = new THREE.Group(); scene.add(props);
  const put = (name, o, pos, ry = 0) => { const m = model(name, o); m.position.set(...pos); m.rotation.y = ry; props.add(m); return m; };
  [[-2.2, -2.6, 'barrel'], [-1.55, -2.9, 'barrel2'], [-2.45, -1.85, 'wine'], [-2.5, -1.2, 'barrel']].forEach(([x, z, n], i) => put(n, { height: n === 'wine' ? 0.6 : 0.8 }, [x, 0, z], i));
  put('chest', { height: 0.5 }, [-0.4, 0, -2.85], 0.2);
  [[2.1, -2.6, 0.7, 'crate'], [2.3, -1.7, 0.55, 'crate2'], [2.1, -2.5, 0.5, 'crate2']].forEach(([x, z, s, n], i) => put(n, { height: s }, [x, i === 2 ? 0.7 : 0, z], i * 0.4));
  [[1.0, -2.8], [1.35, -2.5], [0.7, -2.4], [1.1, -2.2]].forEach(([x, z], i) => { const s = sack(); s.position.set(x, 0, z); s.rotation.y = i * 1.3; props.add(s); });
  return { scene, lamp, motes, shaft, props };
}
function bread() { const b = tmesh(new THREE.SphereGeometry(0.09, 16, 10), 0xd99a4e, { w: 0.006 }); b.scale.set(1, 0.6, 1.6); return b; }

// ============ 4. Rats in the hold, eating the stores (7.7 - 10.8) ============
function shotHold({ makeStage }) {
  const H = holdScene(makeStage); const { scene, lamp, motes } = H;
  const rats = [0, 1, 2, 3].map(i => { const r = makeRat({ glow: i === 3 }); scene.add(r.root); return r; });
  const loaf = bread(); loaf.position.set(0.95, 0.47, -2.45); scene.add(loaf);
  const loaf2 = bread(); loaf2.position.set(0.2, 0.05, -1.0); loaf2.rotation.y = 0.8; scene.add(loaf2);
  const C = cam(44);
  return { scene, camera: C, update(t) {
    lamp.rotation.z = Math.sin(t * 1.6) * 0.12; lamp.flicker(t); motes.update(t);
    rats[0].root.position.set(0.95, 0.42, -2.25); rats[0].root.rotation.y = Math.PI + 0.2; rats[0].body.rotation.x = Math.sin(t * 14) * 0.08;
    const run = (r, a, b, t0, t1) => { const k = range(t, t0, t1); r.root.position.copy(a.clone().lerp(b, k)); r.root.rotation.y = Math.atan2(b.x - a.x, b.z - a.z); r.scurry(t); };
    run(rats[1], V(-2.5, 0, 1.2), V(0.4, 0, -0.85), 0, 1.4);
    if (t > 1.4) { rats[1].root.position.set(0.4, 0, -0.85); rats[1].root.rotation.y = -0.5; rats[1].body.rotation.x = Math.sin(t * 14) * 0.08; }
    run(rats[2], V(2.6, 0, 0.6), V(-2.6, 0, -0.5), 0.5, 2.9);
    rats[3].root.position.set(-2.0, 0, -1.4); rats[3].root.rotation.y = 0.6;
    place(C, [0.9 - t * 0.1, 0.45 + t * 0.03, 2.4 - t * 0.2], [0.1, 0.45, -1.3]);
    return { bloom: 0.55, exposure: 1.15, vignette: 0.45 };
  } };
}

// ============ 5. A rat chews a rope (10.8 - 12.6) ============
function shotChew({ makeStage }) {
  const H = holdScene(makeStage); const { scene, lamp, motes } = H;
  const coil = ropeCoil(0.25); coil.position.set(0.15, 0, 0.2); scene.add(coil);
  const end = rope([0.4, 0.2, 0.2], [0.8, 0.02, 0.65], 0.05, 0.025); scene.add(end);
  const fibres = new THREE.Group(); scene.add(fibres);
  for (let i = 0; i < 9; i++) { const f = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.06), std(0xd8b880)); f.position.set(0.47 + (i % 3) * 0.02, 0.21, 0.25 + i * 0.008); f.rotation.set(i, i * 2, i * 3); fibres.add(f); }
  const rat = makeRat(); rat.root.position.set(0.62, 0.0, 0.42); rat.root.rotation.y = -2.4; scene.add(rat.root); rat.root.scale.setScalar(1.15);
  const C = cam(30);
  return { scene, camera: C, update(t) {
    lamp.rotation.z = Math.sin(t * 1.6 + 2) * 0.12; lamp.flicker(t); motes.update(t);
    rat.body.rotation.x = -0.15 + Math.abs(Math.sin(t * 16)) * 0.12; rat.tail.rotation.y = Math.sin(t * 4) * 0.25;
    fibres.children.forEach((f, i) => { const k = (t * 1.3 + i * 0.13) % 1; f.position.y = 0.21 - k * 0.2; f.visible = k < 0.98; });
    place(C, [1.35 + t * 0.05, 0.5, 1.6 - t * 0.08], [0.5, 0.15, 0.35]);
    return { bloom: 0.5, exposure: 1.2, vignette: 0.5 };
  } };
}

// ============ 6. A sick sailor slumped on a crate (12.6 - 13.7) ============
function shotSick({ makeStage }) {
  const H = holdScene(makeStage); const { scene, lamp, motes } = H;
  const seat = model('crate', { height: 0.45 }); seat.position.set(-0.4, 0, -0.5); scene.add(seat);
  const guy = makeToon({ ...SAILOR_C, skin: 0xc8e6a0 }); guy.root.position.set(-0.4, 0.45 - 0.5 * 0.52, -0.42); guy.root.rotation.y = 0.35; scene.add(guy.root);
  const C = cam(36);
  return { scene, camera: C, update(t) {
    lamp.rotation.z = Math.sin(t * 1.6 + 4) * 0.12; lamp.flicker(t); motes.update(t);
    const sway = Math.sin(t * 2.2) * 0.04;
    guy.pose({ ll: [1.45, 1.5], rl: [1.35, 1.45], lean: [0.28, sway], la: [0.35, 0.75, 1.9], ra: [0.3, 0.6, 2.1], head: [0.12, 0, -sway * 2] });
    guy.setFace({ eyes: 'sleepy', brows: 'worried', mouth: 'wavy', sweat: true, look: [0, 0.5] });
    place(C, [0.55, 1.15, 1.75 - t * 0.12], [-0.4, 0.85, -0.4]);
    return { bloom: 0.4, exposure: 1.15, vignette: 0.48, tint: [0.95, 1.04, 0.92] };
  } };
}

// ============ 7. The cat drops into the light, the rats scatter (13.7 - 17.0) ============
function shotPounce({ makeStage }) {
  const H = holdScene(makeStage); const { scene, lamp, motes } = H;
  const cat = makeCat(); scene.add(cat.root);
  const rats = [0, 1, 2, 3, 4].map(() => { const r = makeRat(); scene.add(r.root); return r; });
  const spots = [[0.5, 0.2], [-0.4, 0.5], [0.9, -0.4], [-0.6, -0.5], [0.15, 0.85]];
  const C = cam(42);
  return { scene, camera: C, update(t) {
    lamp.rotation.z = Math.sin(t * 1.6 + 1) * 0.12; lamp.flicker(t); motes.update(t);
    // jump from the crate stack (right) to the middle of the light shaft
    const jt = range(t, 0.35, 1.05), from = V(2.1, 1.2, -2.3), to = V(0.15, 0, -0.1);
    const pos = from.clone().lerp(to, jt); pos.y += Math.sin(Math.PI * jt) * 0.7 * (1 - jt * 0.3);
    if (t < 0.35) pos.copy(from);
    cat.root.position.copy(pos); cat.root.rotation.y = t < 1.05 ? Math.atan2(to.x - from.x, to.z - from.z) : lerp(-1.2, 0.35, smooth(range(t, 1.05, 1.6)));
    const air = t > 0.35 && t < 1.05;
    cat.run(air ? 1.2 : 0, air ? 1 : 0); cat.legs.forEach((l, i) => { if (air) l.rotation.x = i < 2 ? -1.0 : 1.0; });
    cat.sit(t > 1.6 ? smooth(range(t, 1.6, 2.0)) : 0);
    cat.tail(t, 1.0, air ? 0.9 : 0.6);
    cat.setFace(t < 1.6 ? { eyes: 'open', brows: 'angry', mouth: 'o' } : { eyes: 'half', brows: 'smug', mouth: 'cat', look: [0.25, 0] });
    const land = smooth(range(t, 1.0, 1.3)), squash = pulse(t, 1.08, 0.07);
    cat.root.scale.set(1 + squash * 0.18, 1 - squash * 0.25, 1 + squash * 0.18);
    rats.forEach((r, i) => {
      const [sx, sz] = spots[i], a = Math.atan2(sx, sz), dist = easeIn(range(t, 0.9 + i * 0.04, 1.9)) * 3.5;
      r.root.position.set(0.15 + sx * (0.5 + dist), 0, -0.1 + sz * (0.5 + dist));
      r.root.rotation.y = t < 0.9 ? a + Math.PI + Math.sin(t * 3 + i) * 0.3 : a;
      if (t < 0.9) r.body.rotation.x = Math.sin(t * 14 + i) * 0.08; else r.scurry(t + i);
    });
    const sh = shake(t, pulse(t, 1.1, 0.12) * 6, 4);
    const push = smooth(range(t, 1.1, 2.6));
    place(C, [lerp(1.6, 0.7, push) + sh[0], lerp(0.9, 0.32, push) + sh[1], lerp(2.4, 1.25, push)], [lerp(0.6, 0.15, smooth(range(t, 0.3, 1.2))), lerp(0.6, 0.3, push), -0.15]);
    return { bloom: 0.6, exposure: 1.2, vignette: 0.45 };
  } };
}

// ============ 8. Sunset: a sailor pets the cat (17.0 - 19.98) ============
function shotLuck({ makeStage }) {
  const { scene, ocean, S } = deckScene(makeStage, 'sunset', { shadowSize: 2.5, target: [0.6, 0, 1.2] });
  const g = S.group;
  const cat = makeCat(); cat.root.position.set(0.8, 0, 1.3); cat.root.rotation.y = 0.1; g.add(cat.root); cat.sit(1);
  const man = makeToon(SAILOR_B); man.root.position.set(0.25, 0, 1.3); man.root.rotation.y = 1.2; g.add(man.root);
  const C = cam(38);
  return { scene, camera: C, update(t) {
    ocean.update(t + 20); ride(g, t + 20, 0.8);
    const k = Math.sin(t * 4.2);
    man.pose(P(POSES.pet, { crouch: 0.16, lean: [0.2, 0], ll: [0.9, 1.5], rl: [0.3, 1.0], ra: [0.15, 1.05 + 0.12 * k, 0.5], la: [0.5, 0.3, 1.5], head: [-0.05, 0.2, 0] }));
    man.setFace({ eyes: 'happy', brows: 'raised', mouth: 'smile', open: talk(t, t > 0.4 && t < 1.6) * 0.6 });
    cat.neck.rotation.set(-0.15 + k * 0.06, 0.25, 0.1); cat.tail(t, 0.6, 0.9);
    cat.setFace({ eyes: 'happy', mouth: 'cat', blush: true });
    place(C, [1.9 - t * 0.05, 1.3, 3.2 - t * 0.08], [0.5, 0.55, 1.2]);
    return { bloom: 0.6, exposure: 1.0 };
  } };
}

// ============ 9. Night storm: a sailor stares overboard (19.98 - 21.95) ============
function shotOverboard({ makeStage }) {
  const { scene, ocean, S } = deckScene(makeStage, 'storm', { amp: 2.2, shadowSize: 3, target: [1, 0, 1] });
  const g = S.group;
  const man = makeToon(SAILOR_A); man.root.position.set(2.2, 0, 0.9); man.root.rotation.y = Math.PI / 2 + 0.3; g.add(man.root);
  const lamp = lantern({ intensity: 7, dist: 6, shadow: true, chain: 0.35, mesh: LANT() }); lamp.position.set(1.2, 2.0, 0.4); g.add(lamp);
  const wet = rain(1800, [14, 10, 14], 16); wet.position.set(0, -2, 0); scene.add(wet);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.42, 32), new THREE.MeshBasicMaterial({ color: 0xdff2ff, transparent: true, depthWrite: false })); ring.rotation.x = -Math.PI / 2; scene.add(ring);
  const sun = scene.userData.sun, sky = scene.userData.sky;
  const C = cam(44);
  return { scene, camera: C, update(t) {
    ocean.update(t + 30); ride(g, t + 30, 2.2); lamp.rotation.z = Math.sin(t * 2.2) * 0.25 - g.rotation.z; lamp.flicker(t); wet.update(t);
    const fl = Math.max(pulse(t, 0.95, 0.05), pulse(t, 1.15, 0.07) * 0.7);
    sun.intensity = 1.2 + fl * 9; sky.material.uniforms.flash.value = fl * 0.7;
    const rk = range(t, 0.2, 1.9); ring.position.set(5.2, -2.3 + seaHeight(5.2, 1.0, t + 30, 2.2), 1.2); ring.scale.setScalar(0.5 + rk * 2.5); ring.material.opacity = (1 - rk) * 0.9;
    man.pose(P(POSES.scared, { lean: [0.15, -0.1], head: [0.12, 0, 0], la: [0.6, 1.2, 0.6], ra: [0.6, 1.0, 0.8] }));
    man.setFace({ eyes: 'wide', brows: 'worried', mouth: 'o', look: [0, 0.75], sweat: true });
    const sh = shake(t, 2, 7);
    place(C, [3.7 + sh[0], 1.6 + sh[1], 2.0], [2.15, 1.05, 0.85], g.rotation.z * 0.5);
    return { bloom: 0.55, exposure: 1.1 + fl * 0.6, vignette: 0.42, flash: fl * 0.35 };
  } };
}

// ============ 10. Wide: the ship in the storm, lightning (21.95 - 23.95) ============
function shotStormWide({ makeStage }) {
  const { scene, ocean, S } = deckScene(makeStage, 'storm', { amp: 3, shadowSize: 8, target: [0, 0, 0] });
  const g = S.group;
  const lamp = lantern({ intensity: 9, dist: 8, chain: 0.35, mesh: LANT() }); lamp.position.set(1.2, 2.0, 0.6); g.add(lamp);
  const lamp2 = lantern({ intensity: 8, dist: 8, chain: 0, mesh: LANT() }); lamp2.position.set(0, 3.6, -8); g.add(lamp2);
  const wet = rain(2500, [30, 16, 30], 18); wet.position.set(0, -3, 0); scene.add(wet);
  const bolt = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([[-9, 22, -30], [-7, 16, -29], [-10, 11, -30], [-8, 5, -29], [-9.5, -1, -30]].map(p => new THREE.Vector3(...p))), 30, 0.12, 5), new THREE.MeshBasicMaterial({ color: 0xeaf4ff }));
  scene.add(bolt);
  const sun = scene.userData.sun, sky = scene.userData.sky;
  const C = cam(48);
  return { scene, camera: C, update(t) {
    ocean.update(t + 40); ride(g, t + 40, 3); wet.update(t); lamp.flicker(t); lamp2.flicker(t + 1);
    lamp.rotation.z = Math.sin(t * 2.2) * 0.3;
    const fl = Math.max(pulse(t, 0.45, 0.05), pulse(t, 0.62, 0.06) * 0.8);
    bolt.visible = fl > 0.25;
    sun.intensity = 1.2 + fl * 10; sky.material.uniforms.flash.value = fl * 0.8;
    place(C, [24 - t * 0.8, 5, 28 - t * 0.6], [0, 5, 0]);
    return { bloom: 0.6, exposure: 1.05 + fl * 0.5, vignette: 0.42, flash: fl * 0.3 };
  } };
}

// ============ 11. 1975: the Navy officer stamps the ban, the cat is not impressed (23.95 - end) ============
function paperTexture(stamped) {
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 680; const g = cv.getContext('2d');
  g.fillStyle = '#f3ead6'; g.fillRect(0, 0, 512, 680);
  g.fillStyle = '#2a2a2a'; g.font = 'bold 40px serif'; g.textAlign = 'center'; g.fillText('ADMIRALTY ORDER', 256, 80);
  g.font = '30px serif'; g.fillText('1975', 256, 125);
  g.fillStyle = 'rgba(40,40,40,.55)'; for (let i = 0; i < 9; i++) g.fillRect(70, 180 + i * 38, 372 - (i % 3) * 50, 10);
  g.font = 'bold 30px serif'; g.fillStyle = '#2a2a2a'; g.fillText('NO ANIMALS ON BOARD', 256, 580);
  if (stamped) { g.save(); g.translate(256, 300); g.rotate(-0.25); g.strokeStyle = '#c62828'; g.lineWidth = 12; g.strokeRect(-190, -60, 380, 120); g.fillStyle = '#c62828'; g.font = 'bold 92px sans-serif'; g.fillText('BANNED', 0, 32); g.restore(); }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
function shotOrder({ makeStage }) {
  const scene = makeStage({ mood: 'interior', shadowSize: 3, target: [0, 0.8, 0], env: 0.4 });
  scene.userData.sun.intensity = 0;
  const R = room({ w: 6, d: 6, h: 3, floorMat: std(0xffffff, { map: tex(planks(0x7a4a2a, 7), 3, 3) }), wallMat: std(0xffffff, { map: tex(wallpaper(0x2f4a3a, 0x365544), 6, 3) }) }); scene.add(R);
  R.add(box(6, 0.9, 0.05, std(0xffffff, { map: tex(planks(0x5a3420, 10), 3, 0.5) }), [0, 0.45, -2.97]));
  // round porthole window with a cool daylight shaft
  const win = new THREE.Mesh(new THREE.CircleGeometry(0.45, 40), new THREE.MeshBasicMaterial({ color: 0xcfe6ff })); win.position.set(1.4, 1.85, -2.97); R.add(win);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.47, 0.06, 10, 40), std(0xc9a24a, { metalness: 0.8, roughness: 0.3 })); rim.position.copy(win.position); rim.position.z += 0.02; R.add(rim);
  const day = new THREE.SpotLight(0xcfe2ff, 25, 9, 0.35, 0.6, 1.2); day.position.set(1.4, 1.9, -2.6); day.target.position.set(0.3, 0.7, 0.6); day.castShadow = true; day.shadow.mapSize.set(1024, 1024); scene.add(day, day.target);
  const shaft = beam({ len: 4, r0: 0.4, r1: 1.0, color: 0xcfe2ff, strength: 0.06 }); shaft.position.set(1.4, 1.85, -2.9); shaft.rotation.x = -1.2; shaft.rotation.z = 0.25; scene.add(shaft);
  // portrait
  const put = (name, o, pos, ry = 0) => { const m = model(name, o); m.position.set(...pos); m.rotation.y = ry; scene.add(m); return m; };
  put('frame', { height: 0.95 }, [-1.3, 1.45, -2.93]);
  put('shelf', { height: 1.9 }, [-2.45, 0, -2.4], Math.PI / 2);
  put('chair', { height: 0.95 }, [0.05, 0, -1.25], 0);
  put('chest', { height: 0.5 }, [2.2, 0, -2.4], -0.4);
  put('barrel', { height: 0.8 }, [-2.3, 0, 0.4]);
  put('candles', { height: 0.3 }, [0.6, 0.84, -0.32]);
  const hang = lantern({ intensity: 2.5, dist: 5, chain: 0.5, mesh: LANT() }); hang.position.set(1.6, 2.3, -1.4); scene.add(hang);
  // desk
  const desk = new THREE.Group(); scene.add(desk);
  desk.add(box(2.2, 0.08, 1.0, std(0xffffff, { map: tex(planks(0x6a3a1c, 5), 1, 1) }), [0, 0.8, 0]));
  desk.add(box(2.1, 0.72, 0.9, std(0x55301a), [0, 0.38, -0.02]));
  const lampG = new THREE.Group(); lampG.position.set(-0.75, 0.84, -0.2); desk.add(lampG);
  lampG.add(tmesh(new THREE.CylinderGeometry(0.03, 0.08, 0.35, 12), std(0xc9a24a, { metalness: 0.8, roughness: 0.3 }), { w: 0.006 }));
  const shade = tmesh(new THREE.CylinderGeometry(0.1, 0.2, 0.14, 20, 1, true), std(0x1f7a4a, { side: THREE.DoubleSide }), { w: 0.006 }); shade.position.y = 0.36; lampG.add(shade);
  const bulb = glowSprite(0xffd28a, 0.9, 0.6); bulb.position.y = 0.3; lampG.add(bulb);
  const lampLight = new THREE.PointLight(0xffc27a, 4, 5, 1.5); lampLight.position.y = 0.28; lampLight.castShadow = true; lampLight.shadow.mapSize.set(1024, 1024); lampLight.shadow.bias = -0.002; lampG.add(lampLight);
  const paperBlank = paperTexture(false), paperStamped = paperTexture(true);
  const paper = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.56), std(0xffffff, { map: paperBlank })); paper.rotation.set(-Math.PI / 2, 0, 0.08); paper.position.set(0.05, 0.842, 0.18); paper.receiveShadow = true; desk.add(paper);
  const officer = makeToon(OFFICER); officer.root.position.set(0.05, 0, -0.75); scene.add(officer.root);
  const stamp = new THREE.Group(); scene.add(stamp);
  stamp.add(tmesh(new THREE.CylinderGeometry(0.05, 0.05, 0.03, 16), 0x8a1a1a, { w: 0.005 }));
  const handle = tmesh(new THREE.CylinderGeometry(0.02, 0.025, 0.12, 12), 0x5a3420, { w: 0.005 }); handle.position.y = 0.075; stamp.add(handle);
  const knob = tmesh(new THREE.SphereGeometry(0.035, 12, 8), 0x5a3420, { w: 0.005 }); knob.position.y = 0.15; stamp.add(knob);
  const cat = makeCat({ color: 0x3a3a40, stripe: 0x24242a, tip: 0xf4f4f0 }); cat.root.position.set(0.75, 0.84, 0.15); cat.root.rotation.y = -2.2; scene.add(cat.root); cat.sit(1);
  const C = cam(38);
  const tStamp = 1.48;   // "banned" (25.43) minus shot start
  return { scene, camera: C, update(t) {
    const down = pulse(t, tStamp, 0.09), lifted = t < tStamp ? smooth(range(t, 0.6, tStamp - 0.15)) : 1 - smooth(range(t, tStamp + 0.15, tStamp + 0.6));
    const sy = 0.842 + 0.015 + lerp(0.45, 0.12, lifted) * (1 - down) + 0.0;
    stamp.position.set(0.05 + 0.02, t > tStamp - 0.05 && t < tStamp + 0.2 ? 0.857 : sy, 0.16);
    paper.material.map = t > tStamp ? paperStamped : paperBlank;
    officer.pose(P(POSES.stamp, { ra: [0.25, lerp(0.7, 1.2, lifted), lerp(1.4, 0.6, lifted)], lean: [0.12 + down * 0.1, 0] }));
    officer.setFace({ brows: t > tStamp ? 'angry' : 'flat', mouth: t > tStamp + 0.1 ? 'smirk' : 'flat', eyes: blink(t, 3) ? 'closed' : 'open', look: [0, 0.6] });
    // the stamp follows the officer's right hand
    officer.root.updateMatrixWorld(true); const hp = officer.hands.r.getWorldPosition(new THREE.Vector3());
    stamp.position.x = lerp(hp.x, 0.07, 0.6); stamp.position.z = lerp(hp.z, 0.16, 0.6);
    // closing question (27.63 = 3.68 s in): the cat turns to the camera and the camera pushes in on it
    const close = smooth(range(t, 3.55, 4.6));
    cat.root.rotation.y = lerp(-2.2, 0.3, close); cat.neck.rotation.set(0.05, lerp(t > tStamp ? 0.5 : 0.2, 0, close), 0); cat.tail(t, 0.8, 0.5);
    cat.setFace(close > 0.5 ? { eyes: blink(t, 5) ? 'closed' : 'open', look: [0, 0], mouth: 'cat', brows: 'raised' }
      : { eyes: t > tStamp + 0.3 ? 'half' : 'open', look: [-0.75, -0.25], mouth: t > tStamp + 0.3 ? 'flat' : 'cat' });
    const sh = shake(t, pulse(t, tStamp, 0.08) * 5, 9);
    const cp = [0.55 + sh[0], 1.35 + sh[1], 2.2 - Math.min(t, 3.6) * 0.12], cl = [0.15, 1.0, -0.1];
    place(C, [lerp(cp[0], 1.0, close), lerp(cp[1], 1.2, close), lerp(cp[2], 1.4, close)], [lerp(cl[0], 0.8, close), lerp(cl[1], 1.1, close), lerp(cl[2], 0.25, close)]);
    return { bloom: 0.5, exposure: 1.25, vignette: 0.42 };
  } };
}

export const SHOTS = [
  { start: 0.0, end: 3.2, build: shotDeckWide },
  { start: 3.2, end: 6.6, build: shotHaul },
  { start: 6.6, end: 7.7, build: shotCatHero },
  { start: 7.7, end: 10.8, build: shotHold },
  { start: 10.8, end: 12.6, build: shotChew },
  { start: 12.6, end: 13.7, build: shotSick },
  { start: 13.7, end: 17.0, build: shotPounce },
  { start: 17.0, end: 19.98, build: shotLuck },
  { start: 19.98, end: 21.95, build: shotOverboard },
  { start: 21.95, end: 23.95, build: shotStormWide },
  { start: 23.95, end: 99, build: shotOrder },
];
