// Sets, light and weather: a painted sky, lighting moods, canvas textures, set pieces, sea, light shafts, rain.
import * as THREE from 'three';
import { tmesh, toon, outline, INK } from './toon.js';

// ---------- lighting moods ----------
// Each mood sets the sky, sun/moon, fill, fog and exposure. Pick one per shot with makeStage({ mood }).
export const MOODS = {
  day:      { top: 0x2f7fe0, mid: 0x6aa9f0, horizon: 0xcfe6ff, ground: 0x8fb4d8, sun: [0xfff4e0, 3.0], sunDir: [-4, 7, 5], hemi: [0xcfe4ff, 0x8a7a66, 1.0], fog: [0xcfe2f5, 25, 90], clouds: 0.55, exposure: 1.0, glow: 0.25 },
  golden:   { top: 0x2b4fa8, mid: 0xc77ab0, horizon: 0xffb36b, ground: 0x7a4a5a, sun: [0xffb066, 4.2], sunDir: [-6, 2.4, -5], hemi: [0xffc9a0, 0x5a4a7a, 0.9], fog: [0xf4a07a, 18, 70], clouds: 0.45, cloudCol: 0xffc7a8, exposure: 1.0, glow: 0.9 },
  sunset:   { top: 0x1c2a6b, mid: 0x9a4f8f, horizon: 0xff8a4a, ground: 0x4a2a4a, sun: [0xff8a50, 3.4], sunDir: [-6, 1.2, -6], hemi: [0xff9a80, 0x3a2f6a, 0.8], fog: [0xd77a6a, 15, 60], clouds: 0.5, cloudCol: 0xff9e7a, exposure: 1.0, glow: 0.75 },
  night:    { top: 0x070d24, mid: 0x13245a, horizon: 0x2c4a8a, ground: 0x0b1430, sun: [0x9ab8ff, 1.6], sunDir: [5, 6, -4], hemi: [0x4a64a8, 0x10142a, 0.55], fog: [0x1a2a55, 12, 60], clouds: 0.25, cloudCol: 0x2c3e74, stars: 1, moon: 1, exposure: 1.05, glow: 0.4 },
  storm:    { top: 0x0d1a24, mid: 0x1d3442, horizon: 0x3a5a66, ground: 0x0d1a20, sun: [0x9fc4d8, 1.2], sunDir: [3, 6, -4], hemi: [0x5a7a8a, 0x0c1418, 0.6], fog: [0x223a44, 6, 45], clouds: 1.0, cloudCol: 0x2a3d48, exposure: 1.0, glow: 0.1 },
  interior: { top: 0x1a1410, mid: 0x2a2018, horizon: 0x3a2c20, ground: 0x1a1410, sun: [0xffd7a0, 0.7], sunDir: [-3, 6, 3], hemi: [0xffd9b0, 0x2a1c14, 0.45], fog: [0x2a1c12, 10, 40], clouds: 0, exposure: 1.0, glow: 0 },
  dark:     { top: 0x05070c, mid: 0x0a0e18, horizon: 0x101624, ground: 0x05070c, sun: [0x8fb0ff, 0.25], sunDir: [2, 8, 1], hemi: [0x3a4a78, 0x0a0a10, 0.28], fog: [0x0a0f1a, 6, 30], clouds: 0, exposure: 1.0, glow: 0 },
};

const SKY_V = `varying vec3 vDir; void main(){ vDir = (modelMatrix*vec4(position,1.)).xyz - cameraPosition; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); gl_Position.z = gl_Position.w; }`;
const SKY_F = `
uniform vec3 top, mid, horizon, groundC, sunCol, cloudCol, sunDir, moonDir; uniform float clouds, stars, moon, glow, flash, time;
varying vec3 vDir;
float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
float n2(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(h2(i),h2(i+vec2(1,0)),f.x), mix(h2(i+vec2(0,1)),h2(i+vec2(1,1)),f.x), f.y); }
float fbm(vec2 p){ float a=0.5, s=0.; for(int i=0;i<5;i++){ s+=a*n2(p); p*=2.03; a*=0.5; } return s; }
void main(){
  vec3 d = normalize(vDir); float y = d.y;
  vec3 c = y > 0. ? mix(mix(horizon, mid, smoothstep(0.0, 0.18, y)), top, smoothstep(0.12, 0.75, y)) : mix(horizon, groundC, smoothstep(0.0, -0.1, y));
  float sd = max(dot(d, normalize(sunDir)), 0.);
  c += sunCol * (pow(sd, 6.) * 0.35 + pow(sd, 60.) * 0.6) * glow;
  c += sunCol * smoothstep(0.9993, 0.9996, sd) * glow * 2.0;
  if (y > 0.0 && clouds > 0.) {
    vec2 uv = d.xz / (y + 0.12) * 1.3 + vec2(time*0.01, 0.);
    float f = fbm(uv * 1.1);
    float cov = smoothstep(0.62 - clouds*0.22, 0.72 - clouds*0.2, f);
    float shade = smoothstep(0.5, 0.9, fbm(uv * 1.1 + vec2(0.05, 0.08)));
    vec3 cc = mix(cloudCol, cloudCol * 0.72, shade) + sunCol * pow(sd, 4.) * 0.4 * glow;
    c = mix(c, cc, cov * smoothstep(0.0, 0.12, y));
  }
  if (stars > 0. && y > 0.) {
    vec2 g = d.xz / (y + 0.3) * 160.; vec2 id = floor(g); float r = h2(id);
    float tw = 0.6 + 0.4*sin(time*3. + r*40.);
    c += vec3(1.) * step(0.985, r) * smoothstep(0.35, 0.0, length(fract(g)-0.5)) * tw * stars * smoothstep(0.05, 0.3, y);
  }
  if (moon > 0.) { float md = dot(d, normalize(moonDir));
    c = mix(c, vec3(1.0,0.97,0.88), smoothstep(0.9990, 0.9993, md) * moon);
    c += vec3(0.6,0.7,1.0) * pow(max(md,0.), 200.) * 0.5 * moon; }
  c = mix(c, vec3(0.85,0.9,1.0), flash);
  gl_FragColor = vec4(c, 1.);
  #include <colorspace_fragment>
}`;
export function skyMaterial(m) {
  const C = v => new THREE.Color(v);
  return new THREE.ShaderMaterial({
    uniforms: {
      top: { value: C(m.top) }, mid: { value: C(m.mid) }, horizon: { value: C(m.horizon) }, groundC: { value: C(m.ground) },
      sunCol: { value: C(m.sun[0]) }, cloudCol: { value: C(m.cloudCol ?? 0xffffff) }, sunDir: { value: new THREE.Vector3(...m.sunDir) },
      moonDir: { value: new THREE.Vector3(...(m.moonDir || [0.35, 0.5, -1])) }, clouds: { value: m.clouds || 0 }, stars: { value: m.stars || 0 },
      moon: { value: m.moon || 0 }, glow: { value: m.glow ?? 0.5 }, flash: { value: 0 }, time: { value: 0 },
    },
    vertexShader: SKY_V, fragmentShader: SKY_F, side: THREE.BackSide, depthWrite: false, toneMapped: false,
  });
}

// ---------- canvas textures ----------
const rnd = (s => () => (s = (s * 16807) % 2147483647) / 2147483647)(7);
function canvas(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t; }
const shade = (hex, k) => { const c = new THREE.Color(hex); c.multiplyScalar(k); return '#' + c.getHexString(); };
const texCache = new Map();
const cached = (k, f) => texCache.get(k) || (texCache.set(k, f()), texCache.get(k));
// planks run along v; n planks across the texture
export const planks = (base = 0xa8693a, n = 6, gap = 0x2a160c) => cached('pl' + base + n, () => canvas(512, 1024, (g, w, h) => {
  const pw = w / n;
  for (let i = 0; i < n; i++) {
    const k = 0.82 + rnd() * 0.3; g.fillStyle = shade(base, k); g.fillRect(i * pw, 0, pw, h);
    g.globalAlpha = 0.18; g.strokeStyle = shade(base, 0.6); g.lineWidth = 2;
    for (let j = 0; j < 7; j++) { const x = i * pw + rnd() * pw; g.beginPath(); g.moveTo(x, 0); for (let y = 0; y <= h; y += 64) g.lineTo(x + Math.sin(y * 0.01 + j) * 4, y); g.stroke(); }
    g.globalAlpha = 1;
    const cut = rnd() * h; g.fillStyle = '#' + new THREE.Color(gap).getHexString(); g.fillRect(i * pw, cut, pw, 4);
    g.fillStyle = shade(base, 0.45); for (const y of [cut + 14, cut - 14]) for (const x of [i * pw + 12, (i + 1) * pw - 12]) { g.beginPath(); g.arc(x, y, 3, 0, 7); g.fill(); }
    g.fillStyle = '#' + new THREE.Color(gap).getHexString(); g.fillRect(i * pw, 0, 4, h);
  }
}));
export const brick = (base = 0xa4553a, mortar = 0xd8c8b0) => cached('br' + base, () => canvas(512, 512, (g, w, h) => {
  g.fillStyle = '#' + new THREE.Color(mortar).getHexString(); g.fillRect(0, 0, w, h);
  const bh = 42, bw = 102;
  for (let r = 0; r * bh < h; r++) for (let c = -1; c * bw < w; c++) { g.fillStyle = shade(base, 0.8 + rnd() * 0.35); g.fillRect(c * bw + (r % 2) * bw / 2 + 4, r * bh + 4, bw - 8, bh - 8); }
}));
export const stone = (base = 0x8a8f99) => cached('st' + base, () => canvas(512, 512, (g, w, h) => {
  g.fillStyle = shade(base, 0.6); g.fillRect(0, 0, w, h);
  const bh = 64;
  for (let r = 0; r * bh < h; r++) { let x = -(r % 2) * 50; while (x < w) { const bw = 90 + rnd() * 70; g.fillStyle = shade(base, 0.85 + rnd() * 0.3); g.fillRect(x + 4, r * bh + 4, bw - 8, bh - 8); x += bw; } }
}));
export const wallpaper = (a = 0x6b2f2f, b = 0x7a3a36) => cached('wp' + a + b, () => canvas(256, 256, (g, w, h) => {
  g.fillStyle = '#' + new THREE.Color(a).getHexString(); g.fillRect(0, 0, w, h);
  g.fillStyle = '#' + new THREE.Color(b).getHexString(); for (let x = 0; x < w; x += 64) g.fillRect(x, 0, 28, h);
  g.fillStyle = 'rgba(255,220,150,0.12)'; for (let y = 32; y < h; y += 64) for (let x = 46; x < w; x += 64) { g.beginPath(); g.arc(x, y, 5, 0, 7); g.fill(); }
}));
export const canvasCloth = (base = 0xf2e6c9) => cached('cl' + base, () => canvas(256, 256, (g, w, h) => {
  g.fillStyle = '#' + new THREE.Color(base).getHexString(); g.fillRect(0, 0, w, h);
  g.globalAlpha = 0.08; g.fillStyle = '#000'; for (let i = 0; i < 2000; i++) g.fillRect(rnd() * w, rnd() * h, 2, 1);
  g.globalAlpha = 0.25; g.strokeStyle = shade(base, 0.7); g.lineWidth = 3; for (let y = 0; y < h; y += 64) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
}));
export const tex = (t, rx, ry) => { const c = t.clone(); c.needsUpdate = true; c.repeat.set(rx, ry); return c; };
export const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.75, metalness: 0, ...o });

// ---------- set pieces ----------
const sh = m => { m.castShadow = true; m.receiveShadow = true; return m; };
export function box(w, h, d, mat, pos = [0, 0, 0]) { const m = sh(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat)); m.position.set(...pos); return m; }
export function floor(w, d, mat) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat); m.rotation.x = -Math.PI / 2; m.receiveShadow = true; return m; }
export function barrel(o = {}) {
  const g = new THREE.Group(), H = o.h || 0.75, R = o.r || 0.27;
  const pts = []; for (let i = 0; i <= 12; i++) { const t = i / 12; pts.push(new THREE.Vector2(R * (0.86 + 0.14 * Math.sin(Math.PI * t)), t * H)); }
  const body = tmesh(new THREE.LatheGeometry(pts, 28), std(0xffffff, { map: tex(planks(o.color || 0x9a5a2e, 4), 3, 0.5) }), { w: 0.01 }); g.add(body);
  for (const y of [0.12, 0.88]) { const b = new THREE.Mesh(new THREE.TorusGeometry(R * (0.86 + 0.14 * Math.sin(Math.PI * y)) + 0.004, 0.012, 6, 32), std(0x3a3a40, { metalness: 0.6, roughness: 0.4 })); b.rotation.x = Math.PI / 2; b.position.y = y * H; g.add(sh(b)); }
  const lid = sh(new THREE.Mesh(new THREE.CircleGeometry(R * 0.86, 28), std(0x7a4520))); lid.rotation.x = -Math.PI / 2; lid.position.y = H - 0.001; g.add(lid);
  return g;
}
export function crate(s = 0.5, color = 0xb07a45) {
  const g = new THREE.Group();
  const m = tmesh(new THREE.BoxGeometry(s, s, s), std(0xffffff, { map: tex(planks(color, 4), 1, 0.5) }), { w: 0.01 }); m.position.y = s / 2; g.add(m);
  const bm = std(shade(color, 0.7));
  for (const [x, z, ry] of [[0, s / 2 + 0.006, 0], [0, -s / 2 - 0.006, 0], [s / 2 + 0.006, 0, Math.PI / 2], [-s / 2 - 0.006, 0, Math.PI / 2]]) {
    const b = box(s * 1.35, 0.07, 0.012, bm, [x, s / 2, z]); b.rotation.set(0, ry, Math.PI / 4); g.add(b);
  }
  return g;
}
export function sack(color = 0xcdb184) {
  const pts = []; for (let i = 0; i <= 14; i++) { const t = i / 14; pts.push(new THREE.Vector2(0.2 * Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.1)), 0.7) + (t > 0.85 ? -0.05 : 0), t * 0.45)); }
  const m = tmesh(new THREE.LatheGeometry(pts, 20), std(0xffffff, { map: tex(canvasCloth(color), 2, 1) }), { w: 0.008 }); m.scale.set(1, 1, 0.8); return m;
}
export function ropeCoil(r = 0.22, color = 0xc9a66b) {
  const g = new THREE.Group(), m = std(color, { roughness: 0.9 });
  for (let i = 0; i < 4; i++) { const t = sh(new THREE.Mesh(new THREE.TorusGeometry(r - i * 0.02, 0.025, 8, 36), m)); t.rotation.x = Math.PI / 2; t.position.y = 0.025 + i * 0.045; g.add(t); }
  return g;
}
export function rope(a, b, sag = 0.1, r = 0.012, color = 0xc9a66b) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), M = A.clone().lerp(B, 0.5); M.y -= sag;
  return sh(new THREE.Mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(A, M, B), 24, r, 6), std(color, { roughness: 0.9 })));
}
export function glowSprite(color, size, opacity = 1) {
  const t = cached('glow', () => canvas(128, 128, (g) => { const r = g.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.25, 'rgba(255,255,255,0.45)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 128, 128); }));
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false }));
  s.scale.setScalar(size); return s;
}
// hanging oil lantern with a real warm light (shadows optional) and a glow
export function lantern({ color = 0xffb35a, intensity = 6, dist = 7, shadow = false, chain = 0.3 } = {}) {
  const g = new THREE.Group();
  const frame = std(0x2a2420, { metalness: 0.5, roughness: 0.5 });
  if (chain) { const c = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, chain, 5), frame)); c.position.y = chain / 2 + 0.12; g.add(c); }
  g.add(box(0.15, 0.02, 0.15, frame, [0, 0.12, 0]), box(0.15, 0.02, 0.15, frame, [0, -0.12, 0]));
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) g.add(box(0.012, 0.24, 0.012, frame, [x * 0.07, 0, z * 0.07]));
  const glass = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.22, 0.13), new THREE.MeshBasicMaterial({ color: 0xffd28a, transparent: true, opacity: 0.85 })); g.add(glass);
  const flame = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), new THREE.MeshBasicMaterial({ color: 0xfff1c0 })); flame.scale.y = 1.6; g.add(flame);
  const top = sh(new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.08, 4), frame)); top.position.y = 0.17; top.rotation.y = Math.PI / 4; g.add(top);
  const light = new THREE.PointLight(color, intensity, dist, 1.6); light.position.y = -0.05; g.add(light);
  if (shadow) { light.castShadow = true; light.shadow.mapSize.set(1024, 1024); light.shadow.bias = -0.002; light.shadow.radius = 4; light.shadow.camera.near = 0.15; }
  const glow = glowSprite(color, 0.9, 0.55); g.add(glow);
  g.userData = { light, glow, flame, base: intensity };
  g.flicker = t => { const k = 0.9 + 0.06 * Math.sin(t * 13) + 0.04 * Math.sin(t * 31); light.intensity = intensity * k; glow.material.opacity = 0.5 * k; };
  return g;
}
// soft volumetric light shaft (additive cone); points from its origin down -Y
export function beam({ len = 4, r0 = 0.25, r1 = 1.0, color = 0xbfd8ff, strength = 0.1 } = {}) {
  const geo = new THREE.CylinderGeometry(r0, r1, len, 40, 1, true); geo.translate(0, -len / 2, 0);
  const m = new THREE.ShaderMaterial({
    uniforms: { c: { value: new THREE.Color(color) }, s: { value: strength }, len: { value: len } },
    vertexShader: `varying float vY; varying vec3 vN; varying vec3 vV; void main(){ vY = -position.y; vec4 mv = modelViewMatrix*vec4(position,1.); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }`,
    fragmentShader: `uniform vec3 c; uniform float s, len; varying float vY; varying vec3 vN; varying vec3 vV;
      void main(){ float e = pow(abs(dot(normalize(vN), normalize(vV))), 1.6); float f = smoothstep(0.,0.15*len,vY) * (1.-smoothstep(0.35*len, len, vY));
      gl_FragColor = vec4(c * s * e * f, 1.); }`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.FrontSide, fog: false,
  });
  return new THREE.Mesh(geo, m);
}
// floating dust in a light shaft: deterministic in t
export function dust(n = 120, size = [1, 2, 1], color = 0xfff0d0) {
  const g = new THREE.BufferGeometry(), base = new Float32Array(n * 3), pos = new Float32Array(n * 3);
  for (let i = 0; i < n * 3; i++) base[i] = (rnd() - 0.5) * size[i % 3];
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const p = new THREE.Points(g, new THREE.PointsMaterial({ color, size: 0.018, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false }));
  p.update = t => { for (let i = 0; i < n; i++) { pos[i * 3] = base[i * 3] + Math.sin(t * 0.4 + i) * 0.05; pos[i * 3 + 1] = base[i * 3 + 1] + Math.sin(t * 0.3 + i * 1.7) * 0.06; pos[i * 3 + 2] = base[i * 3 + 2] + Math.cos(t * 0.35 + i) * 0.05; } g.attributes.position.needsUpdate = true; };
  p.update(0); return p;
}
export function rain(n = 1500, area = [16, 10, 16], speed = 14) {
  const g = new THREE.BufferGeometry(), base = new Float32Array(n * 3), pos = new Float32Array(n * 6);
  for (let i = 0; i < n * 3; i++) base[i] = rnd() * area[i % 3] - (i % 3 === 1 ? 0 : area[i % 3] / 2);
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const l = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0xb8d0e0, transparent: true, opacity: 0.35 }));
  l.update = t => { for (let i = 0; i < n; i++) { const x = base[i * 3], z = base[i * 3 + 2]; const y = area[1] - ((base[i * 3 + 1] + t * speed) % area[1]);
    pos.set([x, y, z, x + 0.06, y - 0.35, z], i * 6); } g.attributes.position.needsUpdate = true; };
  l.frustumCulled = false; l.update(0); return l;
}

// ---------- the sea ----------
export function seaHeight(x, z, t, amp = 1) {
  return amp * (0.12 * Math.sin(x * 0.55 + t * 1.1) + 0.09 * Math.sin(z * 0.7 - t * 1.3 + x * 0.2) + 0.05 * Math.sin((x + z) * 1.4 + t * 2.1) + 0.025 * Math.sin(x * 3.1 - z * 2.3 + t * 3.0));
}
export function sea({ size = 120, seg = 160, color = 0x1f6fa8, deep = 0x0d3a66, amp = 1, rough = 0.18 } = {}) {
  const geo = new THREE.PlaneGeometry(size, size, seg, seg); geo.rotateX(-Math.PI / 2);
  const cols = new Float32Array(geo.attributes.position.count * 3); geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: rough, metalness: 0.1, envMapIntensity: 1.2 }));
  m.receiveShadow = true;
  const P = geo.attributes.position, base = P.array.slice(), c1 = new THREE.Color(color), c2 = new THREE.Color(deep), foam = new THREE.Color(0xe8f6ff), tmp = new THREE.Color();
  m.update = t => {
    for (let i = 0; i < P.count; i++) {
      const x = base[i * 3], z = base[i * 3 + 2], y = seaHeight(x, z, t, amp);
      P.array[i * 3 + 1] = y;
      const k = Math.min(1, Math.max(0, (y / amp + 0.18) / 0.4)); tmp.copy(c2).lerp(c1, k); if (y / amp > 0.2) tmp.lerp(foam, Math.min(1, (y / amp - 0.2) * 4));
      cols[i * 3] = tmp.r; cols[i * 3 + 1] = tmp.g; cols[i * 3 + 2] = tmp.b;
    }
    P.needsUpdate = true; geo.attributes.color.needsUpdate = true; geo.computeVertexNormals();
  };
  m.update(0);
  return m;
}

// ---------- a sailing ship (deck you can stand on, mast, sail, rails) ----------
// Deck top is y=0, bow toward -z. Returns { group, sail }
export function ship({ len = 9, beam: bw = 3.2, sails = true, hull = 0x6b3a1e, deckWood = 0xb7804a } = {}) {
  const g = new THREE.Group();
  const deck = new THREE.Mesh(new THREE.BoxGeometry(bw, 0.12, len), [std(0x5a3018), std(0x5a3018), std(0xffffff, { map: tex(planks(deckWood, 8), bw / 1.4, len / 2.8) }), std(0x5a3018), std(0x5a3018), std(0x5a3018)]);
  deck.position.y = -0.06; deck.receiveShadow = true; deck.castShadow = true; g.add(deck);
  // hull sides (outward bulge)
  const hullMat = std(0xffffff, { map: tex(planks(hull, 6), 1, len / 3) });
  for (const s of [-1, 1]) {
    const side = sh(new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.6, len), hullMat)); side.position.set(s * bw / 2, -0.5, 0); side.rotation.z = s * 0.08; g.add(side);
    const stripe = box(0.16, 0.12, len, std(0xd9b44a), [s * (bw / 2 + 0.01), -0.4, 0]); stripe.rotation.z = s * 0.08; g.add(stripe);
    // rail posts + rail
    for (let z = -len / 2 + 0.3; z <= len / 2 - 0.2; z += 0.6) g.add(box(0.07, 0.62, 0.07, std(0x6e3e1c), [s * (bw / 2 - 0.06), 0.31, z]));
    g.add(box(0.12, 0.08, len, std(0x7a4520), [s * (bw / 2 - 0.06), 0.64, 0]));
  }
  g.add(box(bw, 0.62, 0.1, hullMat, [0, 0.31, len / 2]));          // stern rail
  const bow = sh(new THREE.Mesh(new THREE.ConeGeometry(bw / 2, 2.2, 4, 1), hullMat)); bow.rotation.set(-Math.PI / 2, Math.PI / 4, 0); bow.scale.set(1, 1, 0.55); bow.position.set(0, -0.4, -len / 2 - 0.9); g.add(bow);
  let sail = null;
  if (sails) {
    const mast = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.13, 9, 14), std(0x6e3e1c))); mast.position.set(0, 4.5, -0.8); g.add(mast);
    const yard = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, bw * 1.3, 10), std(0x6e3e1c))); yard.rotation.z = Math.PI / 2; yard.position.set(0, 7.2, -0.75); g.add(yard);
    const yard2 = yard.clone(); yard2.position.y = 3.2; g.add(yard2);
    const sg = new THREE.PlaneGeometry(bw * 1.25, 3.9, 20, 12); const p = sg.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); p.setZ(i, -0.55 * (1 - (x / (bw * 0.62)) ** 2) * (1 - (y / 2.1) ** 2)); }
    sg.computeVertexNormals();
    sail = sh(new THREE.Mesh(sg, std(0xffffff, { map: tex(canvasCloth(0xf2e6c9), 3, 3), side: THREE.DoubleSide, roughness: 0.9 }))); sail.position.set(0, 5.2, -0.6); g.add(sail);
    for (const s of [-1, 1]) { g.add(rope([s * (bw / 2 - 0.06), 0.64, 1.2], [0, 8.6, -0.8], 0.05, 0.012)); g.add(rope([s * (bw / 2 - 0.06), 0.64, -2.8], [0, 8.6, -0.8], 0.05, 0.012)); }
    const flag = sh(new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.55, 8, 2), std(0xc0392b, { side: THREE.DoubleSide }))); flag.position.set(0.45, 9.2, -0.8); g.add(flag); g.userData.flag = flag;
  }
  return { group: g, sail };
}
export function wave(flag, t) { const p = flag.geometry.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i) + 0.45; p.setZ(i, Math.sin(x * 6 - t * 8) * 0.06 * x); } p.needsUpdate = true; }

// a box room seen from inside (no wall at +z so the camera can stand there)
export function room({ w = 6, d = 6, h = 3, floorMat, wallMat, ceilMat, back = true, left = true, right = true } = {}) {
  const g = new THREE.Group();
  const f = floor(w, d, floorMat); g.add(f);
  const wall = (W, pos, ry) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(W, h), wallMat); m.position.set(...pos); m.rotation.y = ry; m.receiveShadow = true; g.add(m); return m; };
  if (back) wall(w, [0, h / 2, -d / 2], 0);
  if (left) wall(d, [-w / 2, h / 2, 0], Math.PI / 2);
  if (right) wall(d, [w / 2, h / 2, 0], -Math.PI / 2);
  if (ceilMat) { const c = new THREE.Mesh(new THREE.PlaneGeometry(w, d), ceilMat); c.rotation.x = Math.PI / 2; c.position.y = h; g.add(c); }
  return g;
}

// ---------- scatter: grass that moves in the wind, gravel and pebbles ----------
// grass({ w, d, count, h }) -> InstancedMesh centred on the origin; call .update(t) every frame for wind.
export function grass({ w = 6, d = 6, count = 9000, h = 0.24, base = 0x3f8f2a, tip = 0xb9e46a, hole = null } = {}) {
  const g = new THREE.BufferGeometry();
  // one blade: a thin tapered quad bent forward a little
  const P = [-0.012, 0, 0, 0.012, 0, 0, -0.006, 0.55, 0.02, 0.006, 0.55, 0.02, 0, 1, 0.06];
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  g.setIndex([0, 1, 2, 1, 3, 2, 2, 3, 4]);
  const col = [], b = new THREE.Color(base), tp = new THREE.Color(tip);
  for (let i = 0; i < 5; i++) { const y = P[i * 3 + 1], c = b.clone().lerp(tp, y); col.push(c.r, c.g, c.b); }
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, side: THREE.DoubleSide });
  const uT = { value: 0 };
  mat.onBeforeCompile = sh => {
    sh.uniforms.uT = uT;
    sh.vertexShader = 'uniform float uT;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      vec4 ip = instanceMatrix * vec4(0., 0., 0., 1.);
      float sway = sin(uT * 1.8 + ip.x * 0.9 + ip.z * 0.6) * 0.5 + sin(uT * 3.1 + ip.x * 2.3) * 0.25;
      transformed.x += sway * position.y * position.y * 0.35;
      transformed.z += sway * position.y * position.y * 0.15;`);
  };
  const m = new THREE.InstancedMesh(g, mat, count);
  const M = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3(), c = new THREE.Color();
  let n = 0;
  for (let i = 0; i < count * 3 && n < count; i++) {
    v.set((rnd() - 0.5) * w, 0, (rnd() - 0.5) * d);
    if (hole && hole(v.x, v.z)) continue;
    e.set((rnd() - 0.5) * 0.4, rnd() * Math.PI * 2, (rnd() - 0.5) * 0.4); q.setFromEuler(e);
    const s = h * (0.55 + rnd() * 0.9); sc.set(s * (0.8 + rnd() * 0.6), s, s);
    M.compose(v, q, sc); m.setMatrixAt(n, M);
    c.setHSL(0.25 + (rnd() - 0.5) * 0.05, 0.55, 0.42 + rnd() * 0.18); m.setColorAt(n, c);
    n++;
  }
  m.count = n; m.receiveShadow = true; m.castShadow = false;
  m.update = t => { uT.value = t; };
  return m;
}
// pebbles({ w, d, count, size }) -> chunky little stones (gravel beds, rail ballast, cave floors)
export function pebbles({ w = 4, d = 4, count = 1500, size = 0.05, colors = [0x8a7f74, 0x6f655c, 0xa3968a, 0x7a5f4b, 0x5e5852], hole = null } = {}) {
  const geo = new THREE.IcosahedronGeometry(1, 0);
  const m = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ roughness: 0.9, flatShading: true }), count);
  const M = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3(), c = new THREE.Color();
  let n = 0;
  for (let i = 0; i < count * 3 && n < count; i++) {
    v.set((rnd() - 0.5) * w, 0, (rnd() - 0.5) * d);
    if (hole && hole(v.x, v.z)) continue;
    const s = size * (0.4 + rnd() * 1.2); v.y = s * 0.25;
    e.set(rnd() * 6, rnd() * 6, rnd() * 6); q.setFromEuler(e); sc.set(s * (0.8 + rnd() * 0.6), s * (0.5 + rnd() * 0.4), s * (0.8 + rnd() * 0.6));
    M.compose(v, q, sc); m.setMatrixAt(n, M);
    c.set(colors[Math.floor(rnd() * colors.length)]).multiplyScalar(0.85 + rnd() * 0.3); m.setColorAt(n, c);
    n++;
  }
  m.count = n; m.castShadow = true; m.receiveShadow = true;
  return m;
}

// ---------- bursts: money, confetti, leaves, debris thrown into the air (deterministic in t) ----------
// burst({ kind: 'bills'|'confetti'|'debris', count, origin, t0, speed, spread, up, gravity, size }) -> InstancedMesh;
// call .update(t) every frame (t in the shot's time). Thrown at t0 from origin, tumbling, falling, landing on y=0.
const billTex = () => cached('bill', () => canvas(128, 64, (g, w, h) => {
  g.fillStyle = '#7fbf6a'; g.fillRect(0, 0, w, h); g.strokeStyle = '#2f6b3a'; g.lineWidth = 5; g.strokeRect(4, 4, w - 8, h - 8);
  g.fillStyle = '#cfe8b8'; g.beginPath(); g.ellipse(w / 2, h / 2, 16, 18, 0, 0, 7); g.fill(); g.fillStyle = '#2f6b3a'; g.font = 'bold 26px sans-serif'; g.textAlign = 'center'; g.fillText('$', w / 2, h / 2 + 9);
}));
export function burst({ kind = 'bills', count = 400, origin = [0, 0.5, 0], t0 = 0, speed = 4, spread = 1.2, up = 1, gravity = 3.5, size = 0.12 } = {}) {
  const geo = kind === 'debris' ? new THREE.IcosahedronGeometry(1, 0) : new THREE.PlaneGeometry(1, kind === 'bills' ? 0.5 : 0.6);
  const mat = kind === 'bills' ? new THREE.MeshStandardMaterial({ map: billTex(), side: THREE.DoubleSide, roughness: 0.8 })
    : new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.7, flatShading: kind === 'debris' });
  const m = new THREE.InstancedMesh(geo, mat, count);
  const P = [], c = new THREE.Color(), pal = kind === 'confetti' ? [0xff4d6d, 0xffd23f, 0x3ec1d3, 0x8f6bff, 0x5be37d] : [0x8a7f74, 0x6f655c, 0xa3968a];
  for (let i = 0; i < count; i++) {
    const a = rnd() * Math.PI * 2, el = (rnd() * 0.9 + 0.1) * up, v = speed * (0.4 + rnd() * 0.8);
    P.push({ v: [Math.cos(a) * spread * v * (1 - el * 0.5), el * v, Math.sin(a) * spread * v * (1 - el * 0.5)], spin: [rnd() * 8 - 4, rnd() * 8 - 4, rnd() * 8 - 4], s: size * (0.6 + rnd() * 0.8), delay: rnd() * 0.15 });
    if (kind !== 'bills') { c.set(pal[i % pal.length]); m.setColorAt(i, c); }
  }
  m.castShadow = true; m.frustumCulled = false;
  const M = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), sc = new THREE.Vector3();
  m.update = t => {
    for (let i = 0; i < count; i++) {
      const o = P[i], tt = Math.max(0, t - t0 - o.delay);
      const drag = kind === 'debris' ? 1 : 0.55;   // paper flutters down slower
      p.set(origin[0] + o.v[0] * tt * drag, origin[1] + o.v[1] * tt - 0.5 * gravity * drag * tt * tt, origin[2] + o.v[2] * tt * drag);
      const landed = p.y <= 0.01; if (landed) p.y = 0.01;
      const flut = landed ? 0 : tt;
      e.set(o.spin[0] * flut + (landed ? Math.PI / 2 : 0), o.spin[1] * flut, o.spin[2] * flut); q.setFromEuler(e);
      sc.setScalar(t < t0 ? 0 : o.s); M.compose(p, q, sc); m.setMatrixAt(i, M);
    }
    m.instanceMatrix.needsUpdate = true;
  };
  m.update(0);
  return m;
}

// ---------- real models (glTF/GLB) and HDRI skies ----------
// List what a short uses in shots.js:   export const ASSETS = { sedan: 'assets/kenney/car-kit/sedan.glb', sky: 'assets/polyhaven/hdri/x_1k.hdr' }
// main.js loads them all before the first frame; then model('sedan', {...}) returns a fresh copy, synchronously,
// and makeStage({ hdri: 'sky' }) lights the scene with that sky.
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { clone as skeletonClone } from 'three/addons/utils/SkeletonUtils.js';
export const LOADED = { models: {}, hdri: {} };
export async function preload(map = {}) {
  const gl = new GLTFLoader(), rg = new RGBELoader();
  await Promise.all(Object.entries(map).map(async ([name, path]) => {
    try {
      if (/\.hdr$/i.test(path)) { const t = await rg.loadAsync(path); t.mapping = THREE.EquirectangularReflectionMapping; LOADED.hdri[name] = t; }
      else LOADED.models[name] = (await gl.loadAsync(path)).scene;
    } catch (e) { console.error(`asset "${name}" (${path}) failed to load: ${e.message || e}`); }
  }));
}
// model(name, { scale, height, outline, color, shadows }) -> a copy of a loaded model.
//   height: scale it so it is this many metres tall (handy across kits);  outline: ink width (e.g. 0.008) to match the cast;
//   color: tint every material;  the model stands on y=0, centred on x/z.
export function model(name, o = {}) {
  const src = LOADED.models[name];
  if (!src) { console.error(`model "${name}" is not in ASSETS`); return new THREE.Group(); }
  const m = skeletonClone(src);
  const g = new THREE.Group(); g.add(m);
  m.traverse(c => {
    if (!c.isMesh) return;
    c.castShadow = o.shadows ?? true; c.receiveShadow = true;
    c.material = c.material.clone();
    if (o.color != null) c.material.color = new THREE.Color(o.color);
    if (o.rough != null) c.material.roughness = o.rough;
  });
  const box = new THREE.Box3().setFromObject(m), size = box.getSize(new THREE.Vector3());
  const s = o.height ? o.height / Math.max(size.y, 1e-6) : (o.scale ?? 1);
  m.scale.setScalar(s);
  const b2 = new THREE.Box3().setFromObject(m), c2 = b2.getCenter(new THREE.Vector3());
  m.position.set(-c2.x, -b2.min.y, -c2.z);
  if (o.outline) m.traverse(c => { if (c.isMesh && !c.userData.isOutline) outline(c, o.outline); });
  return g;
}
