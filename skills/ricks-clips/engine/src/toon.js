// Flat cartoon people and animals: white round heads with drawn faces, egg-shaped bodies in clothes,
// black stick limbs, thick black outlines. Toon-shaded so they sit in lit 3D sets and still read as 2D.
import * as THREE from 'three';
import { lerp, clamp } from './anim.js';

export const INK = 0x14100e;

// ---------- toon shading + outlines ----------
const ramp = (() => {
  const d = new Uint8Array([120, 120, 120, 255, 200, 200, 200, 255, 255, 255, 255, 255]);
  const t = new THREE.DataTexture(d, 3, 1); t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t;
})();
// Characters keep their flat colours whatever the light does: shading is clamped between CHAR.lo and CHAR.hi of the
// albedo and skips tone mapping, so a white head stays white in golden hour and readable in a dark hold.
// Shots can return { charLight: [lo, hi] } to change it per shot.
export const CHAR = { lo: { value: 0.72 }, hi: { value: 1.0 } };
export function charify(m) {
  m.toneMapped = false;
  m.onBeforeCompile = sh => {
    sh.uniforms.charLo = CHAR.lo; sh.uniforms.charHi = CHAR.hi;
    sh.fragmentShader = 'uniform float charLo, charHi;\n' + sh.fragmentShader.replace('#include <opaque_fragment>',
      'outgoingLight = clamp(outgoingLight, diffuseColor.rgb * charLo, diffuseColor.rgb * charHi + totalEmissiveRadiance);\n#include <opaque_fragment>');
  };
  return m;
}
const matCache = new Map();
export function toon(color, opts = {}) {
  const key = color + JSON.stringify(opts);
  if (!opts.map && matCache.has(key)) return matCache.get(key);
  const m = charify(new THREE.MeshToonMaterial({ color, gradientMap: ramp, ...opts }));
  if (!opts.map) matCache.set(key, m);
  return m;
}
export const inkMat = new THREE.MeshBasicMaterial({ color: INK });

const outlineMat = new THREE.ShaderMaterial({
  uniforms: { w: { value: 0.014 } },
  vertexShader: `uniform float w; void main(){ vec4 mv = modelViewMatrix*vec4(position,1.);
    vec3 n = normalize(normalMatrix*normal); mv.xyz += n * w * clamp(-mv.z*0.45, 0.6, 3.0);
    gl_Position = projectionMatrix*mv; }`,
  fragmentShader: `void main(){ gl_FragColor = vec4(0.078,0.063,0.055,1.); }`,
  side: THREE.BackSide,
});
// adds an inverted-hull outline to a mesh; w is in world units at ~2 m from camera
export function outline(mesh, w = 0.012) {
  const m = w === 0.012 ? outlineMat : outlineMat.clone();
  if (w !== 0.012) m.uniforms = { w: { value: w } };
  const o = new THREE.Mesh(mesh.geometry, m);
  o.castShadow = false; o.receiveShadow = false; o.userData.isOutline = true;
  mesh.add(o);
  return mesh;
}
export function tmesh(geo, color, { w = 0.012, shadow = true, opts } = {}) {
  const m = new THREE.Mesh(geo, typeof color === 'object' ? color : toon(color, opts));
  m.castShadow = shadow; m.receiveShadow = true;
  if (w > 0) outline(m, w);
  return m;
}
function stick(len, r = 0.016) {
  const g = new THREE.CylinderGeometry(r, r, len, 8); g.translate(0, -len / 2, 0);
  const m = new THREE.Mesh(g, inkMat); m.castShadow = true; return m;
}
function dot(r) { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 8), inkMat); m.castShadow = true; return m; }

// ---------- faces (canvas, drawn in "degrees" on the front of the head) ----------
const FACE_PHI = 150, FACE_THETA = 120, FS = 512;
const faceCache = new Map();
export function faceTexture(f) {
  const key = JSON.stringify(f);
  if (faceCache.has(key)) return faceCache.get(key);
  const cv = document.createElement('canvas'); cv.width = cv.height = FS;
  const g = cv.getContext('2d');
  g.translate(FS / 2, FS / 2); g.scale(FS / FACE_PHI, FS / FACE_THETA);
  g.lineCap = g.lineJoin = 'round';
  const ink = '#14100e';
  const eyes = f.eyes || 'open', brows = f.brows || 'none', mouth = f.mouth || 'smile';
  const lx = clamp(f.look?.[0] || 0, -1, 1), ly = clamp(f.look?.[1] || 0, -1, 1);
  const ex = f.eyeGap ?? 16, ey = f.eyeY ?? -2, er = f.eyeR ?? 10;
  if (f.blush) { g.fillStyle = 'rgba(255,120,120,0.45)'; for (const s of [-1, 1]) { g.beginPath(); g.ellipse(s * (ex + 8), ey + 13, 7, 4, 0, 0, 7); g.fill(); } }
  for (const s of [-1, 1]) {
    const x = s * ex;
    g.lineWidth = 1.7; g.strokeStyle = ink; g.fillStyle = ink;
    if (eyes === 'closed') { g.beginPath(); g.moveTo(x - er * 0.8, ey + 1); g.quadraticCurveTo(x, ey + 4, x + er * 0.8, ey + 1); g.stroke(); continue; }
    if (eyes === 'happy') { g.lineWidth = 2.2; g.beginPath(); g.moveTo(x - er * 0.75, ey + 2); g.quadraticCurveTo(x, ey - 7, x + er * 0.75, ey + 2); g.stroke(); continue; }
    if (eyes === 'dot') { g.beginPath(); g.ellipse(x + lx * 2, ey + ly * 2, 3.2, 3.6, 0, 0, 7); g.fill(); continue; }
    const r = eyes === 'wide' ? er * 1.18 : er;
    g.fillStyle = '#fff'; g.beginPath(); g.ellipse(x, ey, r, r * 1.05, 0, 0, 7); g.fill(); g.stroke();
    const pr = eyes === 'wide' ? r * 0.28 : r * 0.42;
    const px = x + lx * (r - pr - 1.2), py = ey + ly * (r - pr - 1.2);
    if (eyes === 'red') {
      g.fillStyle = '#ff2a1a'; g.beginPath(); g.ellipse(x, ey, r * 0.92, r * 0.95, 0, 0, 7); g.fill();
      g.fillStyle = '#ffd0a0'; g.beginPath(); g.ellipse(x, ey, r * 0.35, r * 0.35, 0, 0, 7); g.fill();
    } else {
      g.fillStyle = ink; g.beginPath(); g.ellipse(px, py, pr, pr * 1.05, 0, 0, 7); g.fill();
      g.fillStyle = '#fff'; g.beginPath(); g.ellipse(px - pr * 0.35, py - pr * 0.4, pr * 0.28, pr * 0.28, 0, 0, 7); g.fill();
    }
    if (eyes === 'half' || eyes === 'sleepy') {   // upper lid
      const cut = eyes === 'sleepy' ? 0.15 : -0.15;
      g.save(); g.beginPath(); g.ellipse(x, ey, r + 0.9, r * 1.05 + 0.9, 0, 0, 7); g.clip();
      g.fillStyle = f.skin || '#fff'; g.fillRect(x - r - 2, ey - r - 2, 2 * r + 4, r + 2 + cut * r * 2);
      g.restore();
      g.lineWidth = 1.9; g.beginPath(); g.moveTo(x - r, ey + cut * r * 2); g.lineTo(x + r, ey + cut * r * 2); g.stroke();
      g.lineWidth = 1.7; g.beginPath(); g.ellipse(x, ey, r, r * 1.05, 0, 0, 7); g.stroke();
    }
  }
  // brows
  g.lineWidth = 2.6; g.strokeStyle = ink;
  const by = ey - er - 4.5;
  for (const s of [-1, 1]) {
    const x = s * ex; let a = 0, dy = 0;
    if (brows === 'none') break;
    if (brows === 'angry') { a = 0.45; dy = 2; } else if (brows === 'worried') { a = -0.4; dy = -1; }
    else if (brows === 'raised') { dy = -4; } else if (brows === 'smug') { a = s < 0 ? 0.25 : -0.15; dy = s < 0 ? 1 : -2; }
    else if (brows === 'flat') { dy = 1; }
    const hw = 6.5, inner = x - s * hw, outer = x + s * hw;
    g.beginPath(); g.moveTo(outer, by + dy - a * hw * 0.6); g.lineTo(inner, by + dy + a * hw * 0.6); g.stroke();
  }
  // moustache
  if (f.moustache) {
    g.fillStyle = f.moustache === true ? ink : f.moustache;
    g.beginPath(); g.moveTo(0, 11); g.bezierCurveTo(-6, 7, -14, 9, -15, 16); g.bezierCurveTo(-9, 13, -4, 15, 0, 14);
    g.bezierCurveTo(4, 15, 9, 13, 15, 16); g.bezierCurveTo(14, 9, 6, 7, 0, 11); g.fill();
  }
  // mouth
  const my = f.mouthY ?? (f.moustache ? 21 : 18), open = clamp(f.open || 0, 0, 1);
  g.lineWidth = 2; g.strokeStyle = ink; g.fillStyle = '#5a1712';
  const mw = f.mouthW ?? 7;
  if (open > 0.05 || mouth === 'shout' || mouth === 'o') {
    const h = mouth === 'o' ? 5 : mouth === 'shout' ? 9 : 2 + open * 6, w = mouth === 'o' ? 3.6 : mw * (mouth === 'shout' ? 1.1 : 0.85);
    g.beginPath();
    if (mouth === 'smile' || mouth === 'grin') { g.moveTo(-w, my - 1); g.quadraticCurveTo(0, my - 1 + h * 1.6, w, my - 1); g.closePath(); }
    else g.ellipse(0, my + h * 0.3, w, h * 0.6, 0, 0, 7);
    g.fill(); g.stroke();
    if (mouth !== 'o') { g.save(); g.clip(); g.fillStyle = '#e35a52'; g.beginPath(); g.ellipse(0, my + h * 0.95, w * 0.6, h * 0.35, 0, 0, 7); g.fill(); g.restore(); }
  } else if (mouth === 'smile') { g.beginPath(); g.moveTo(-mw, my - 1); g.quadraticCurveTo(0, my + 5, mw, my - 1); g.stroke(); }
  else if (mouth === 'grin') {
    g.fillStyle = '#fff'; g.beginPath(); g.moveTo(-mw * 1.4, my - 2); g.quadraticCurveTo(0, my + 9, mw * 1.4, my - 2); g.closePath(); g.fill(); g.stroke();
    g.lineWidth = 1; g.beginPath(); g.moveTo(-mw * 1.3, my + 0.5); g.quadraticCurveTo(0, my + 3, mw * 1.3, my + 0.5); g.stroke();
  }
  else if (mouth === 'smirk') { g.beginPath(); g.moveTo(-mw * 0.7, my + 1); g.quadraticCurveTo(mw * 0.3, my + 2.5, mw, my - 2); g.stroke(); }
  else if (mouth === 'frown') { g.beginPath(); g.moveTo(-mw, my + 3); g.quadraticCurveTo(0, my - 3, mw, my + 3); g.stroke(); }
  else if (mouth === 'wavy') { g.beginPath(); g.moveTo(-mw, my); g.quadraticCurveTo(-mw / 2, my - 2.5, 0, my); g.quadraticCurveTo(mw / 2, my + 2.5, mw, my); g.stroke(); }
  else if (mouth === 'teeth') {
    g.fillStyle = '#fff'; g.beginPath(); g.rect(-mw, my - 3, mw * 2, 6); g.fill(); g.stroke();
    g.lineWidth = 0.9; g.beginPath(); g.moveTo(-mw, my); g.lineTo(mw, my); for (let i = -2; i <= 2; i++) { g.moveTo(i * mw / 3, my - 3); g.lineTo(i * mw / 3, my + 3); } g.stroke();
  }
  else if (mouth === 'cat') { g.beginPath(); g.moveTo(-5, my); g.quadraticCurveTo(-2.5, my + 3, 0, my); g.quadraticCurveTo(2.5, my + 3, 5, my); g.stroke(); }
  else { g.beginPath(); g.moveTo(-mw * 0.8, my); g.lineTo(mw * 0.8, my); g.stroke(); }
  if (f.sweat) {
    g.fillStyle = '#9fd8ff'; g.strokeStyle = '#3d7fb8'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(34, -26); g.quadraticCurveTo(40, -14, 34, -12); g.quadraticCurveTo(28, -14, 34, -26); g.fill(); g.stroke();
  }
  if (f.nose) { g.lineWidth = 1.6; g.beginPath(); g.moveTo(-1.5, 6); g.quadraticCurveTo(2.5, 9, -1, 11); g.stroke(); }
  if (f.catNose) { g.fillStyle = '#f08a8a'; g.beginPath(); g.moveTo(-2.5, 9); g.lineTo(2.5, 9); g.lineTo(0, 12); g.closePath(); g.fill(); g.lineWidth = 1; g.stroke();
    g.lineWidth = 0.8; for (const s of [-1, 1]) for (const k of [-1, 1]) { g.beginPath(); g.moveTo(s * 8, 13 + k); g.lineTo(s * 24, 11 + k * 4); g.stroke(); } }
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  faceCache.set(key, tex);
  return tex;
}
function faceShell(R) {
  const p = THREE.MathUtils.degToRad(FACE_PHI), th = THREE.MathUtils.degToRad(FACE_THETA);
  const g = new THREE.SphereGeometry(R * 1.004, 40, 32, Math.PI / 2 - p / 2, p, Math.PI / 2 - th / 2, th);
  const m = charify(new THREE.MeshToonMaterial({ gradientMap: ramp, transparent: true, alphaTest: 0.35, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
  const mesh = new THREE.Mesh(g, m); mesh.renderOrder = 2;
  return mesh;
}

// ---------- clothes on the egg body ----------
function bodyTexture(o) {
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 512;
  const g = cv.getContext('2d');
  const front = x => 256 + x * 256 / Math.PI;       // u=0.5 is the front of the lathe
  g.fillStyle = o.color; g.fillRect(0, 0, 512, 512);
  if (o.stripes) { g.fillStyle = o.stripes; for (let y = 40; y < 470; y += 46) g.fillRect(0, 512 - y - 18, 512, 18); }
  if (o.lower) { g.fillStyle = o.lower; g.fillRect(0, 512 - 130, 512, 130); }   // trousers showing at the bottom
  if (o.belt) { g.fillStyle = o.belt; g.fillRect(0, 512 - 150, 512, 24); g.fillStyle = '#d9b44a'; g.fillRect(front(0) - 14, 512 - 152, 28, 28); g.fillStyle = o.belt; g.fillRect(front(0) - 7, 512 - 145, 14, 14); }
  if (o.coatOpen) { g.fillStyle = o.coatOpen; g.beginPath(); g.moveTo(front(-0.32), 0); g.lineTo(front(0.32), 0); g.lineTo(front(0.18), 512); g.lineTo(front(-0.18), 512); g.fill();
    g.strokeStyle = '#14100e'; g.lineWidth = 4; g.beginPath(); g.moveTo(front(-0.32), 0); g.lineTo(front(-0.18), 512); g.moveTo(front(0.32), 0); g.lineTo(front(0.18), 512); g.stroke(); }
  if (o.tie) { g.fillStyle = o.tie; g.beginPath(); g.moveTo(front(-0.07), 0); g.lineTo(front(0.07), 0); g.lineTo(front(0.1), 260); g.lineTo(front(0), 300); g.lineTo(front(-0.1), 260); g.fill(); }
  if (o.collar) { g.fillStyle = o.collar; g.beginPath(); g.moveTo(front(-0.5), 0); g.lineTo(front(0), 90); g.lineTo(front(0.5), 0); g.fill(); }
  if (o.buttons) { for (let i = 0; i < 4; i++) { const y = 80 + i * 75; for (const s of o.double ? [-0.16, 0.16] : [0]) { g.fillStyle = o.buttons; g.beginPath(); g.arc(front(s), y, 9, 0, 7); g.fill(); g.strokeStyle = 'rgba(0,0,0,.4)'; g.lineWidth = 2; g.stroke(); } } }
  if (o.sash) { g.strokeStyle = o.sash; g.lineWidth = 34; g.beginPath(); g.moveTo(front(-0.6), 20); g.lineTo(front(0.6), 380); g.stroke(); }
  if (o.epaulettes) { /* meshes, see below */ }
  if (o.patch) { g.fillStyle = o.patch; g.fillRect(front(0.25), 300, 40, 36); g.strokeStyle = 'rgba(0,0,0,.35)'; g.setLineDash([6, 5]); g.lineWidth = 2; g.strokeRect(front(0.25), 300, 40, 36); g.setLineDash([]); }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}

// ---------- hats and hair ----------
function hat(kind, R, o) {
  const g = new THREE.Group();
  const add = (geo, col, pos = [0, 0, 0], rot = [0, 0, 0], w = 0.01) => { const m = tmesh(geo, col, { w }); m.position.set(...pos); m.rotation.set(...rot); g.add(m); return m; };
  const c = o.hatColor;
  if (kind === 'captain') {       // peaked cap
    add(new THREE.CylinderGeometry(R * 0.95, R * 0.82, R * 0.42, 32), c || 0x1d2b4f, [0, R * 0.78, -R * 0.06], [-0.18, 0, 0]);
    add(new THREE.CylinderGeometry(R * 0.84, R * 0.84, R * 0.12, 32), 0xd9b44a, [0, R * 0.6, -R * 0.02], [-0.18, 0, 0], 0.006);
    add(new THREE.CylinderGeometry(R * 0.55, R * 0.62, R * 0.04, 24, 1, false, 0, Math.PI), 0x111111, [0, R * 0.56, R * 0.38], [-0.05, Math.PI / 2 + Math.PI / 2, 0], 0.006).scale.set(1, 1, 1.2);
    add(new THREE.SphereGeometry(R * 0.11, 12, 8), 0xf2d060, [0, R * 0.78, R * 0.78], [0, 0, 0], 0.006);
  } else if (kind === 'sailor') {  // round white cap
    add(new THREE.CylinderGeometry(R * 0.86, R * 0.86, R * 0.26, 32), c || 0xf4f4f0, [0, R * 0.8, -R * 0.05], [-0.25, 0, 0.12]);
    add(new THREE.CylinderGeometry(R * 0.88, R * 0.88, R * 0.08, 32), 0x1d2b4f, [0, R * 0.68, -R * 0.02], [-0.25, 0, 0.12], 0.006);
  } else if (kind === 'beanie') {
    const b = add(new THREE.SphereGeometry(R * 1.04, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.42), c || 0xc0392b, [0, R * 0.05, -R * 0.02], [-0.25, 0, 0]);
    add(new THREE.TorusGeometry(R * 0.82, R * 0.1, 8, 32), c || 0xc0392b, [0, R * 0.62, R * 0.12], [Math.PI / 2 - 0.25, 0, 0], 0.008);
  } else if (kind === 'bandana') {
    add(new THREE.SphereGeometry(R * 1.035, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.4), c || 0xb3261e, [0, 0, 0], [-0.35, 0, 0]);
    add(new THREE.ConeGeometry(R * 0.18, R * 0.5, 8), c || 0xb3261e, [R * 0.2, R * 0.25, -R * 1.0], [-2.2, 0, 0.4]);
  } else if (kind === 'tricorn') {
    add(new THREE.CylinderGeometry(R * 0.7, R * 0.8, R * 0.5, 24), c || 0x2a1f1a, [0, R * 0.95, -R * 0.05], [-0.1, 0, 0]);
    const brim = add(new THREE.CylinderGeometry(R * 1.45, R * 1.45, R * 0.06, 3), c || 0x2a1f1a, [0, R * 0.72, -R * 0.05], [-0.1, Math.PI / 6 + Math.PI, 0]);
    add(new THREE.TorusGeometry(R * 1.05, R * 0.05, 6, 3), 0xd9b44a, [0, R * 0.76, -R * 0.05], [Math.PI / 2 - 0.1, 0, Math.PI / 6 + Math.PI / 2], 0.004);
    add(new THREE.SphereGeometry(R * 0.14, 12, 8), 0xf4f4f0, [0, R * 0.95, R * 0.62], [0, 0, 0], 0.006);
  } else if (kind === 'tophat') {
    add(new THREE.CylinderGeometry(R * 0.6, R * 0.62, R * 1.0, 28), c || 0x1a1a1a, [0, R * 1.25, 0]);
    add(new THREE.CylinderGeometry(R * 1.0, R * 1.0, R * 0.06, 28), c || 0x1a1a1a, [0, R * 0.76, 0]);
    add(new THREE.CylinderGeometry(R * 0.625, R * 0.625, R * 0.16, 28), 0x8a1f1f, [0, R * 0.86, 0], [0, 0, 0], 0.004);
  } else if (kind === 'cowboy') {
    add(new THREE.CylinderGeometry(R * 0.6, R * 0.7, R * 0.6, 24), c || 0x7a4a26, [0, R * 0.98, 0]);
    const b = add(new THREE.TorusGeometry(R * 1.05, R * 0.2, 8, 32), c || 0x7a4a26, [0, R * 0.7, 0], [Math.PI / 2, 0, 0]); b.scale.set(1, 1, 0.3);
  }
  return g;
}
function hair(kind, R, color) {
  const g = new THREE.Group();
  if (kind === 'bowl' || kind === 'short') {
    const cap = tmesh(new THREE.SphereGeometry(R * 1.05, 32, 16, 0, Math.PI * 2, 0, Math.PI * (kind === 'bowl' ? 0.42 : 0.33)), color, { w: 0.008 });
    cap.rotation.x = -0.35; g.add(cap);
    if (kind === 'bowl') { const back = tmesh(new THREE.SphereGeometry(R * 1.04, 24, 12, Math.PI * 0.15, Math.PI * 0.7, 0.4, 1.3), color, { w: 0.008 }); back.rotation.y = Math.PI; g.add(back); }
  } else if (kind === 'bun') {
    const cap = tmesh(new THREE.SphereGeometry(R * 1.05, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.4), color, { w: 0.008 }); cap.rotation.x = -0.3; g.add(cap);
    const bun = tmesh(new THREE.SphereGeometry(R * 0.35, 16, 12), color, { w: 0.008 }); bun.position.set(0, R * 0.9, -R * 0.45); g.add(bun);
  } else if (kind === 'bald') {
    for (const s of [-1, 1]) { const tuft = tmesh(new THREE.SphereGeometry(R * 0.3, 12, 8), color, { w: 0.006 }); tuft.scale.set(0.6, 0.8, 1.2); tuft.position.set(s * R * 0.92, R * 0.05, -R * 0.2); g.add(tuft); }
  }
  return g;
}

// ---------- the person ----------
// outfit: { color, lower, belt, stripes, buttons, double, tie, collar, coatOpen, sash, patch, hat, hatColor, hair, hairColor,
//           skin, size: [bodyW, bodyH, legLen], scale, moustache, nose, epaulettes, face: {...defaults} }
export function makeToon(o = {}) {
  const [BW, BH, LL] = o.size || [0.44, 0.58, 0.5];
  const R = o.headR || 0.26, s = o.scale || 1;
  const root = new THREE.Group(); root.scale.setScalar(s);
  const hips = new THREE.Group(); hips.position.y = LL; root.add(hips);
  const torso = new THREE.Group(); hips.add(torso);
  // egg body
  const pts = [];
  for (let i = 0; i <= 24; i++) { const t = i / 24; const r = BW / 2 * Math.pow(Math.sin(Math.PI * t), 0.6) * (1.06 - 0.18 * t); pts.push(new THREE.Vector2(Math.max(r, 0.0005), -0.06 + t * BH)); }
  const body = tmesh(new THREE.LatheGeometry(pts, 40, Math.PI), toon(0xffffff, { map: bodyTexture({ color: '#3b6fb6', ...o, color: o.color || '#3b6fb6' }) }), { w: 0.013 });
  torso.add(body);
  // head
  const neck = new THREE.Group(); neck.position.y = BH - 0.06 + R * 0.62; torso.add(neck);
  const head = tmesh(new THREE.SphereGeometry(R, 40, 28), o.skin || 0xfbfaf6, { w: 0.013 }); neck.add(head);
  const face = faceShell(R); head.add(face);
  if (o.hair) head.add(hair(o.hair, R, o.hairColor || 0x2a1d17));
  if (o.hat) head.add(hat(o.hat, R, o));
  if (o.epaulettes) for (const sx of [-1, 1]) { const e = tmesh(new THREE.CylinderGeometry(0.06, 0.07, 0.025, 16), 0xd9b44a, { w: 0.006 }); e.position.set(sx * BW * 0.4, BH * 0.78, 0); e.rotation.z = sx * 0.6; torso.add(e); }
  // arms
  const arm = (sx) => {
    const sh = new THREE.Group(); sh.position.set(sx * BW * 0.42, BH * 0.62, 0); torso.add(sh);
    const up = stick(0.24); sh.add(up);
    const el = new THREE.Group(); el.position.y = -0.24; sh.add(el); el.add(dot(0.016));
    const lo = stick(0.22); el.add(lo);
    const hand = new THREE.Group(); hand.position.y = -0.22; el.add(hand);
    const fist = dot(0.032); hand.add(fist);
    return { sh, el, hand };
  };
  const leg = (sx) => {
    const hp = new THREE.Group(); hp.position.set(sx * BW * 0.17, 0.02, 0); hips.add(hp);
    hp.add(stick(LL * 0.52, 0.018));
    const kn = new THREE.Group(); kn.position.y = -LL * 0.52; hp.add(kn); kn.add(dot(0.018));
    kn.add(stick(LL * 0.48, 0.018));
    const ft = new THREE.Group(); ft.position.y = -LL * 0.48 + 0.02; kn.add(ft);
    const shoe = tmesh(new THREE.SphereGeometry(0.05, 14, 10), o.shoe || INK, { w: 0 }); shoe.scale.set(0.85, 0.55, 1.5); shoe.position.set(0, 0, 0.025); ft.add(shoe);
    return { hp, kn, ft };
  };
  const L = arm(1), Rr = arm(-1), LL_ = leg(1), RL = leg(-1);
  const blob = new THREE.Mesh(new THREE.CircleGeometry(BW * 0.75, 24), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22, depthWrite: false }));
  blob.rotation.x = -Math.PI / 2; blob.position.y = 0.004; root.add(blob);
  root.traverse(m => { if (m.isMesh && !m.userData.isOutline && m !== blob && m.material !== inkMat) m.castShadow = true; });

  const faceDefaults = { eyes: 'open', brows: 'flat', mouth: 'smile', moustache: o.moustache, nose: o.nose, ...(o.face || {}) };
  const h = {
    root, hips, torso, head, neck, R, BH, LL, BW,
    // face: { eyes, brows, mouth, open, look:[x,y], sweat, blush, moustache }
    setFace(f = {}) {
      const ff = { ...faceDefaults, ...f };
      if (ff.look) ff.look = ff.look.map(v => Math.round(v * 4) / 4);
      ff.open = Math.round((ff.open || 0) * 4) / 4;
      if (o.skin) ff.skin = '#' + new THREE.Color(o.skin).getHexString();
      face.material.map = faceTexture(ff); face.material.needsUpdate = face.material.userData.k !== JSON.stringify(ff); face.material.userData.k = JSON.stringify(ff);
      if (o.skin) face.material.color.set(0xffffff);
    },
    // pose: { lean:[x,z], turn, head:[x,y,z], la:[out,fwd,bend], ra:[...], ll:[fwd,bend], rl:[...], bob, crouch }
    pose(p = {}) {
      const P = { ...POSES.stand, ...p };
      hips.position.y = LL - (P.crouch || 0) + (P.bob || 0);
      torso.rotation.set(P.lean[0], P.turn || 0, P.lean[1]);
      neck.rotation.set(P.head[0], P.head[1], P.head[2]);
      const A = (a, v, sx) => { a.sh.rotation.set(-v[1], 0, sx * v[0]); a.el.rotation.set(-v[2], 0, 0); };
      A(L, P.la, 1); A(Rr, P.ra, -1);
      const G = (l, v) => { l.hp.rotation.set(-v[0], 0, 0); l.kn.rotation.set(v[1], 0, 0); l.ft.rotation.set(-(v[0] - v[1]) * 0.6, 0, 0); };
      G(LL_, P.ll); G(RL, P.rl);
    },
    hands: { l: L.hand, r: Rr.hand },
  };
  h.setFace(); h.pose();
  return h;
}

// poses are plain objects; mixPose(a, b, t) blends them
export const POSES = {
  stand: { lean: [0, 0], turn: 0, head: [0, 0, 0], la: [0.18, 0.05, 0.15], ra: [0.18, 0.05, 0.15], ll: [0, 0], rl: [0, 0], bob: 0, crouch: 0 },
  hips: { la: [0.9, -0.2, 2.2], ra: [0.9, -0.2, 2.2] },
  wave: { ra: [2.4, 0.2, 0.6], la: [0.18, 0.05, 0.15] },
  point: { ra: [0.3, 1.45, 0.05] },
  shrug: { la: [0.6, 0.6, 1.9], ra: [0.6, 0.6, 1.9], head: [0, 0, 0.12] },
  armsUp: { la: [2.6, 0.3, 0.3], ra: [2.6, 0.3, 0.3] },
  think: { ra: [0.35, 0.9, 2.5], la: [0.5, 0.6, 1.7], head: [0.08, 0, -0.1] },
  pull: { la: [0.15, 1.3, 0.4], ra: [0.15, 1.15, 0.5], lean: [-0.3, 0], ll: [0.5, 0.1], rl: [-0.35, 0.2] },
  scared: { la: [0.7, 0.9, 2.1], ra: [0.7, 0.9, 2.1], lean: [-0.12, 0], head: [-0.05, 0, 0] },
  stamp: { ra: [0.3, 1.0, 0.9], la: [0.4, 0.7, 0.9], lean: [0.12, 0] },
  pet: { ra: [0.2, 1.1, 0.5], lean: [0.25, 0], crouch: 0.06 },
};
export function mixPose(a, b, t) {
  const A = { ...POSES.stand, ...a }, B = { ...POSES.stand, ...b }, out = {};
  for (const k in A) out[k] = Array.isArray(A[k]) ? A[k].map((v, i) => lerp(v, B[k][i], t)) : lerp(A[k], B[k], t);
  return out;
}
export function walkPose(phase, amt = 1, extra = {}) {
  const s = Math.sin(phase), c = Math.cos(phase);
  return { ...extra, ll: [s * 0.5 * amt, Math.max(0, -c) * 0.7 * amt], rl: [-s * 0.5 * amt, Math.max(0, c) * 0.7 * amt],
    la: [0.18, -s * 0.5 * amt, 0.3], ra: [0.18, s * 0.5 * amt, 0.3], bob: Math.abs(c) * 0.025 * amt, lean: [0.05 * amt, 0] };
}
// talking: mouth open from a time, a rate and a seed
export const talk = (t, on = 1, seed = 0) => on ? clamp(0.5 + 0.5 * Math.sin(t * 17 + seed) * Math.sin(t * 5.3 + seed * 2), 0, 1) : 0;
export const blink = (t, seed = 0) => ((t + seed * 1.37) % 3.1) < 0.12;

// ---------- a cat in the same style ----------
export function makeCat(o = {}) {
  const col = o.color || 0xf08a2c, root = new THREE.Group();
  const body = tmesh(new THREE.SphereGeometry(0.16, 28, 18), col, { w: 0.01 }); body.scale.set(0.95, 0.8, 1.45); body.position.y = 0.17; root.add(body);
  const belly = tmesh(new THREE.SphereGeometry(0.12, 20, 12), 0xfff3e0, { w: 0 }); belly.scale.set(0.9, 0.7, 1.4); belly.position.set(0, 0.12, 0.03); root.add(belly);
  const neck = new THREE.Group(); neck.position.set(0, 0.3, 0.17); root.add(neck);
  const head = tmesh(new THREE.SphereGeometry(0.135, 32, 22), col, { w: 0.01 }); neck.add(head);
  const face = faceShell(0.135); head.add(face);
  for (const s of [-1, 1]) {
    const ear = tmesh(new THREE.ConeGeometry(0.055, 0.1, 4), col, { w: 0.008 }); ear.position.set(s * 0.075, 0.115, -0.01); ear.rotation.set(-0.1, Math.PI / 4, s * -0.35); head.add(ear);
    const inner = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.06, 4), toon(0xf5a0a0)); inner.position.set(0, -0.012, 0.022); ear.add(inner);
  }
  const stripeMat = toon(o.stripe || 0xc4621a);
  for (let i = 0; i < 3; i++) { const st = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.012, 6, 24, Math.PI), stripeMat); st.position.set(0, 0.17, -0.1 + i * 0.09); st.scale.set(0.95, 0.82, 1); body.add(st.clone()); }
  const legs = [];
  for (const [x, z] of [[-0.07, 0.13], [0.07, 0.13], [-0.07, -0.13], [0.07, -0.13]]) {
    const l = new THREE.Group(); l.position.set(x, 0.12, z); root.add(l);
    const st = tmesh(new THREE.CylinderGeometry(0.028, 0.03, 0.12, 10), col, { w: 0.007 }); st.position.y = -0.06; l.add(st);
    const paw = tmesh(new THREE.SphereGeometry(0.034, 10, 8), 0xfff3e0, { w: 0.006 }); paw.scale.set(1, 0.6, 1.2); paw.position.set(0, -0.115, 0.01); l.add(paw);
    legs.push(l);
  }
  const tail = new THREE.Group(); tail.position.set(0, 0.22, -0.2); root.add(tail);
  const segs = [];
  let parent = tail;
  for (let i = 0; i < 6; i++) { const g = new THREE.Group(); g.position.y = i ? 0.055 : 0; parent.add(g); const m = tmesh(new THREE.CylinderGeometry(0.022, 0.026, 0.06, 8), i === 5 ? (o.tip || col) : col, { w: 0.006 }); m.position.y = 0.03; g.add(m); segs.push(g); parent = g; }
  root.traverse(m => { if (m.isMesh && !m.userData.isOutline) m.castShadow = true; });
  const c = {
    root, head, neck, body, legs,
    setFace(f = {}) { face.material.map = faceTexture({ eyes: 'open', brows: 'none', mouth: 'cat', catNose: true, eyeGap: 17, eyeR: 9, eyeY: 0, mouthY: 15, ...f }); face.material.needsUpdate = true; },
    // tail: swish 0..1 phase, lift
    tail(t, amt = 1, up = 0.6) { tail.rotation.set(-2.1 + up, 0, 0); segs.forEach((s, i) => { s.rotation.set(0.25 * (1 - up), 0, Math.sin(t * 3 - i * 0.6) * 0.25 * amt); }); },
    sit(k) { body.rotation.x = -0.55 * k; body.position.set(0, 0.17 + 0.03 * k, -0.05 * k); legs[2].position.y = legs[3].position.y = 0.12 - 0.04 * k; neck.position.set(0, 0.3 + 0.1 * k, 0.17 - 0.02 * k); },
    loaf(k) { root.scale.y = 1 - 0.18 * k; legs.forEach(l => l.visible = k < 0.5); },
    run(phase, amt = 1) { legs.forEach((l, i) => l.rotation.x = Math.sin(phase + (i < 2 ? 0 : Math.PI) + (i % 2) * 0.6) * 0.8 * amt); body.rotation.x = Math.sin(phase * 2) * 0.05 * amt; },
  };
  c.setFace(); c.tail(0);
  return c;
}

// ---------- a rat (small, grey, pink ears, thin tail; eyes glow in the dark) ----------
export function makeRat(o = {}) {
  const root = new THREE.Group(), col = o.color || 0x7d7a80;
  const body = tmesh(new THREE.SphereGeometry(0.07, 20, 14), col, { w: 0.006 }); body.scale.set(0.9, 0.75, 1.5); body.position.y = 0.055; root.add(body);
  const head = tmesh(new THREE.ConeGeometry(0.05, 0.11, 16), col, { w: 0.006 }); head.rotation.x = Math.PI / 2; head.position.set(0, 0.07, 0.12); root.add(head);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), toon(0xf08a9a)); nose.position.set(0, 0.07, 0.175); root.add(nose);
  for (const s of [-1, 1]) {
    const ear = tmesh(new THREE.CircleGeometry(0.028, 16), 0xf2a0b0, { w: 0.004 }); ear.material.side = THREE.DoubleSide; ear.position.set(s * 0.035, 0.115, 0.09); ear.rotation.y = s * 0.4; root.add(ear);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.011, 8, 6), new THREE.MeshBasicMaterial({ color: o.glow ? 0xff3322 : 0x111111 })); eye.position.set(s * 0.024, 0.088, 0.13); root.add(eye);
  }
  const pts = []; for (let i = 0; i <= 10; i++) pts.push(new THREE.Vector3(Math.sin(i * 0.6) * 0.03, 0.03 + Math.sin(i * 0.3) * 0.02, -0.09 - i * 0.022));
  const tail = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 20, 0.006, 5), toon(0xd68a96)); root.add(tail);
  root.traverse(m => { if (m.isMesh) m.castShadow = true; });
  return { root, body, tail, scurry(t) { body.position.y = 0.055 + Math.abs(Math.sin(t * 22)) * 0.012; tail.rotation.y = Math.sin(t * 9) * 0.3; } };
}
