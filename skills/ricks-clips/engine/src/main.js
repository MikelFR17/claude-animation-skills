import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import * as EDIT from './shots.js';
const { SHOTS, CAPTIONS, DURATION, FADES } = EDIT;
// TRANSITIONS (optional export of shots.js): [{ t, type, dur? }] centred on a cut at t.
//   whip-left / whip-right / whip-up / whip-down : a fast pan blur that hides the cut (0.24 s)
//   punch : a quick zoom-in into the new shot (0.2 s)      flash : a white pop (0.16 s)      blur : a soft radial dissolve (0.3 s)
//   dissolve : a short crossfade between the two shots (0.3 s) - the references' most common way to change place
//   zoom : rush into the centre of the outgoing shot and land in the next (0.5 s) - aim it at an eye, a window, a hole
//          and open the next shot on a similar round shape (match cut)
const TRANSITIONS = EDIT.TRANSITIONS || [];
import { MOODS, skyMaterial, preload, LOADED } from './world.js';
import { CHAR } from './toon.js';

const W = 720, H = 1280;
const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(1);
renderer.setSize(W, H);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById('stage').prepend(renderer.domElement);

// one image-based light per mood, made from its own sky
const pmrem = new THREE.PMREMGenerator(renderer);
const envs = new Map();
function envFor(name, m) {
  if (envs.has(name)) return envs.get(name);
  const s = new THREE.Scene(); const sky = new THREE.Mesh(new THREE.SphereGeometry(20, 48, 24), skyMaterial(m)); sky.material.toneMapped = true; s.add(sky);
  const e = pmrem.fromScene(s, 0.03).texture; envs.set(name, e); return e;
}

// makeStage({ mood: 'golden', shadowSize: 4, target: [0,0,0] }) -> a scene with sky, sun/moon, fill, fog and env lighting.
// scene.userData: { sky, sun, hemi, mood } — tweak per shot (e.g. sun.intensity for lightning, sky.material.uniforms.flash).
// hdri: name of a .hdr in ASSETS - it lights everything (reflections, ambient). hdriBackground: true shows it as the sky
// instead of the painted one (photographic skies; the painted sky usually suits the cartoon look better).
const hdriEnvs = new Map();
function hdriEnv(name) {
  if (!hdriEnvs.has(name)) { const t = LOADED.hdri[name]; hdriEnvs.set(name, t ? pmrem.fromEquirectangular(t).texture : null); }
  return hdriEnvs.get(name);
}
export function makeStage({ mood = 'day', shadowSize = 4, target = [0, 0, 0], fog = true, env = 0.6, overrides = {}, hdri = null, hdriBackground = false } = {}) {
  const m = { ...MOODS[mood], ...overrides };
  const scene = new THREE.Scene();
  scene.environment = (hdri && hdriEnv(hdri)) || envFor(mood + JSON.stringify(overrides), m);
  scene.environmentIntensity = env;
  if (hdri && hdriBackground && LOADED.hdri[hdri]) { scene.background = LOADED.hdri[hdri]; scene.backgroundIntensity = m.exposure ?? 1; }
  const sky = new THREE.Mesh(new THREE.SphereGeometry(200, 48, 24), skyMaterial(m));
  sky.frustumCulled = false; sky.renderOrder = -10; if (!(hdri && hdriBackground)) scene.add(sky);
  const hemi = new THREE.HemisphereLight(m.hemi[0], m.hemi[1], m.hemi[2]); scene.add(hemi);
  const sun = new THREE.DirectionalLight(m.sun[0], m.sun[1]);
  sun.position.set(target[0] + m.sunDir[0], target[1] + m.sunDir[1], target[2] + m.sunDir[2]);
  sun.target.position.set(...target);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  const c = sun.shadow.camera; c.left = c.bottom = -shadowSize; c.right = c.top = shadowSize; c.near = 0.1; c.far = 40;
  sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.03; sun.shadow.radius = 3;
  scene.add(sun, sun.target);
  if (fog && m.fog) scene.fog = new THREE.Fog(m.fog[0], m.fog[1], m.fog[2]);
  scene.userData = { sky, sun, hemi, mood: m, exposure: m.exposure ?? 1 };
  return scene;
}

// ---------- post: bloom for practical lights, then a grade (contrast, saturation, warm/cool split, vignette) ----------
const rt = new THREE.WebGLRenderTarget(W, H, { samples: 4, type: THREE.HalfFloatType });
const composer = new EffectComposer(renderer, rt);
const renderPass = new RenderPass(new THREE.Scene(), new THREE.PerspectiveCamera());
const bokeh = new BokehPass(new THREE.Scene(), new THREE.PerspectiveCamera(), { focus: 2, aperture: 0, maxblur: 0.01 });
const bloom = new UnrealBloomPass(new THREE.Vector2(W / 2, H / 2), 0.3, 0.5, 1.0);
const grade = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, uVig: { value: 0.32 }, uSat: { value: 1.12 }, uCon: { value: 1.06 }, uTint: { value: new THREE.Vector3(1, 1, 1) }, uLens: { value: 0 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uVig, uSat, uCon, uLens; uniform vec3 uTint; varying vec2 vUv;
    void main(){ vec2 d = vUv - 0.5; vec2 da = d * vec2(0.5625, 1.); float r2 = dot(da, da);
      vec2 uv = 0.5 + d * (1. + uLens * r2) / (1. + uLens * 0.3);   // barrel distortion: very wide lenses in cars and rooms
      vec4 c = texture2D(tDiffuse, clamp(uv, 0.001, 0.999));
      float l = dot(c.rgb, vec3(0.299,0.587,0.114));
      c.rgb = mix(vec3(l), c.rgb, uSat);
      c.rgb = (c.rgb - 0.5) * uCon + 0.5;
      c.rgb *= uTint;
      vec2 q = vUv - 0.5; q.x *= 0.5625;
      c.rgb *= 1.0 - uVig * smoothstep(0.2, 0.62, length(q));
      gl_FragColor = vec4(clamp(c.rgb, 0., 1.), 1.); }`,
});
// transitions: directional motion blur + slide (whip), zoom punch, both centred on a cut
const trans = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, uDir: { value: new THREE.Vector2(0, 0) }, uZoom: { value: 1 }, uRad: { value: 0 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
  fragmentShader: `uniform sampler2D tDiffuse; uniform vec2 uDir; uniform float uZoom, uRad; varying vec2 vUv;
    void main(){ vec2 c = (vUv - 0.5) / uZoom + 0.5; vec4 acc = vec4(0.);
      for (int i = 0; i < 32; i++) { float k = float(i) / 31. - 0.5;
        vec2 p = c + uDir * k + (c - 0.5) * uRad * k;
        acc += texture2D(tDiffuse, clamp(p, 0.001, 0.999)); }
      gl_FragColor = acc / 32.; }`,
});
composer.addPass(renderPass);
composer.addPass(bokeh);
composer.addPass(bloom);
composer.addPass(new OutputPass());
composer.addPass(grade);
composer.addPass(trans);

// ---------- captions ----------
// CAPTIONS is a list of [start, token, end?] (a token is a word or a short group like "a cannonball").
// CAPTION_STYLE (optional export of shots.js):
//   mode 'group' (default): lines of up to maxWords words, broken at punctuation; the word being said lights up.
//   mode 'word': one token at a time (the classic reel look).
//   y: centre of the caption as a fraction of the frame height. Keep it at 0.62 or above the lower third (0.66),
//   where the YouTube/Instagram UI sits. Wrap a word in *asterisks* to colour it (numbers, names, dates).
const CS = { mode: 'group', maxWords: 4, maxChars: 24, y: 0.6, size: 52, color: '#ffffff', highlight: '#ffd23f', accent: '#ffd23f', ...(EDIT.CAPTION_STYLE || {}) };
const bare = s => s.replace(/\*/g, '');
const GROUPS = [];
{
  let cur = [];
  const words = ids => ids.map(j => bare(CAPTIONS[j][1])).join(' ');
  CAPTIONS.forEach((c, i) => {
    if (cur.length) {
      const next = words([...cur, i]);
      if (next.split(/\s+/).length > CS.maxWords || next.length > CS.maxChars) { GROUPS.push(cur); cur = []; }
    }
    cur.push(i);
    if (/[.,?!;:]$/.test(bare(c[1])) || c[2] != null) { GROUPS.push(cur); cur = []; }
  });
  if (cur.length) GROUPS.push(cur);
}
const groupOf = new Map(); GROUPS.forEach((g, k) => g.forEach(i => groupOf.set(i, k)));
const esc = s => s.replace(/[&<>]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[ch]));
function tokenHTML(tok, state) {
  return tok.split(/\s+/).map(w => {
    const acc = /^\*.*\*[.,?!;:]?$/.test(w) || /^\*/.test(w);
    const col = state === 'now' ? CS.highlight : acc ? CS.accent : CS.color;
    return `<span style="color:${col}">${esc(bare(w))}</span>`;
  }).join(' ');
}
function drawCaption(t) {
  capEl.style.top = `${CS.y * 1280}px`; capEl.style.fontSize = `${CS.size}px`;
  const i = CAPTIONS.findLastIndex(c => t >= c[0]);
  const c = CAPTIONS[i];
  const on = c && (c[2] == null || t < c[2]);
  if (!on) { capEl.innerHTML = ''; return; }
  let start = c[0], html;
  if (CS.mode === 'word') html = tokenHTML(c[1], 'solo');
  else {
    const g = GROUPS[groupOf.get(i)]; start = CAPTIONS[g[0]][0];
    html = g.map(j => tokenHTML(CAPTIONS[j][1], j === i ? 'now' : 'other')).join(' ');
  }
  capEl.innerHTML = html;
  const age = t - start;
  capEl.style.transform = `translateY(-50%) scale(${1 + 0.12 * Math.max(0, 1 - age / 0.1)})`;
}

// ---------- timeline ----------
const capEl = document.getElementById('cap');
const fadeEl = document.getElementById('fade');
const flashEl = document.getElementById('flash');
const hud = document.getElementById('hud');
const built = new Map();
function getShot(i) {
  if (!built.has(i)) built.set(i, SHOTS[i].build({ makeStage, W, H }));
  return built.get(i);
}

window.DURATION = DURATION;
const dashEl = document.getElementById('dash');
const xfadeEl = document.getElementById('xfade'), xctx = xfadeEl.getContext('2d');
function shotIndex(t) { let i = SHOTS.findIndex(s => t >= s.start && t < s.end); return i < 0 ? SHOTS.length - 1 : i; }
// render shot idx at global time t into the WebGL canvas; returns what update() returned
function renderShot(idx, t, extra) {
  const def = SHOTS[idx];
  const shot = getShot(idx);
  const r = shot.update(t - def.start, t) || {};
  const cam = shot.camera;
  cam.aspect = W / H; cam.updateProjectionMatrix();
  const ud = shot.scene.userData;
  if (ud.sky) { ud.sky.position.copy(cam.position); ud.sky.material.uniforms.time.value = t; }
  renderPass.scene = bokeh.scene = shot.scene; renderPass.camera = bokeh.camera = cam;
  // depth of field: return { dof: { focus: metres to the subject, blur: 0..1 } } - soft backgrounds like the references
  const dof = r.dof;
  bokeh.enabled = !!(dof && (dof.blur ?? 0.5) > 0);
  if (bokeh.enabled) { bokeh.uniforms.focus.value = dof.focus ?? cam.position.length(); bokeh.uniforms.aperture.value = 0.0025 * (dof.blur ?? 0.5); bokeh.uniforms.maxblur.value = 0.012 * (dof.blur ?? 0.5) + 0.002; bokeh.uniforms.nearClip.value = cam.near; bokeh.uniforms.farClip.value = cam.far; }
  bloom.strength = r.bloom ?? 0.3;
  bloom.threshold = r.bloomThreshold ?? 1.0;
  CHAR.lo.value = r.charLight?.[0] ?? 0.72; CHAR.hi.value = r.charLight?.[1] ?? 1.0;
  renderer.toneMappingExposure = r.exposure ?? ud.exposure ?? 1.0;
  grade.uniforms.uVig.value = r.vignette ?? 0.32;
  grade.uniforms.uSat.value = r.saturation ?? 1.12;
  grade.uniforms.uTint.value.set(...(r.tint || [1, 1, 1]));
  grade.uniforms.uLens.value = r.lens ?? 0;
  extra(r);
  composer.render();
  return r;
}

window.renderAt = (t) => {
  const idx = shotIndex(t);
  // transitions
  let dir = [0, 0], zoom = 1, rad = 0, tflash = 0, xf = null;
  for (const tr of TRANSITIONS) {
    const d = tr.dur ?? ({ punch: 0.2, flash: 0.16, blur: 0.3, dissolve: 0.3, zoom: 0.5 }[tr.type] ?? 0.24), x = (t - tr.t) / (d / 2);
    if (Math.abs(x) >= 1) continue;
    const k = 1 - Math.abs(x), e = k * k * (3 - 2 * k);
    if (tr.type.startsWith('whip')) {
      const v = { 'whip-left': [-1, 0], 'whip-right': [1, 0], 'whip-up': [0, 1], 'whip-down': [0, -1] }[tr.type];
      dir = [v[0] * 0.2 * e, v[1] * 0.14 * e];
    } else if (tr.type === 'punch') { if (x > 0) zoom = 1 + 0.12 * (1 - x) ** 2; rad = 0.08 * e; }
    else if (tr.type === 'flash') tflash = Math.max(tflash, e * 0.9);
    else if (tr.type === 'blur') rad = 0.22 * e;
    else if (tr.type === 'dissolve' || tr.type === 'zoom') { const u = (x + 1) / 2; xf = { a: shotIndex(tr.t - 1e-3), b: shotIndex(tr.t + 1e-3), k: u * u * (3 - 2 * u), zoom: tr.type === 'zoom', u }; }
  }
  const setTrans = () => {
    trans.enabled = dir[0] !== 0 || dir[1] !== 0 || zoom !== 1 || rad !== 0;
    trans.uniforms.uDir.value.set(dir[0], dir[1]); trans.uniforms.uZoom.value = zoom; trans.uniforms.uRad.value = rad;
  };
  // dissolve: render the outgoing shot, keep it in a 2D canvas on top, render the incoming one under it
  if (xf && xf.a !== xf.b) {
    // zoom: rush into the centre of the outgoing shot (aim it at an eye, a window, a hole) and land in the next one
    if (xf.zoom) { zoom = 1 + 3 * xf.u ** 2; rad = 0.25 * xf.u; xf.k = Math.min(1, Math.max(0, (xf.u - 0.35) / 0.4)); }
    renderShot(xf.a, t, setTrans);
    if (xf.zoom) { zoom = 1 + 0.6 * (1 - xf.u) ** 2; rad = 0.2 * (1 - xf.u); }
    xctx.clearRect(0, 0, W, H); xctx.drawImage(renderer.domElement, 0, 0, W, H);
    xfadeEl.style.opacity = 1 - xf.k;
  } else xfadeEl.style.opacity = 0;
  const r = renderShot(xf && xf.a !== xf.b ? xf.b : idx, t, setTrans);
  // dashcam overlay: return { dashcam: { speed: 54, stamp: '11/07/2026 06:41:53 AM' } }
  if (r.dashcam) {
    dashEl.style.display = 'block';
    dashEl.innerHTML = `<span class="rec">● REC</span><span class="spd">${Math.round(r.dashcam.speed ?? 0)} MPH</span><br><span>${r.dashcam.stamp || ''}</span><span class="spd">FRONT · 1080P</span>`;
  } else dashEl.style.display = 'none';
  drawCaption(t);
  let f = 0;
  for (const [a, b, c2, d] of FADES) if (t >= a && t < d) f = Math.max(f, t < b ? (t - a) / (b - a) : t < c2 ? 1 : (d - t) / (d - c2));
  fadeEl.style.opacity = f;
  flashEl.style.opacity = Math.max(r.flash || 0, tflash);
  hud.textContent = `t=${t.toFixed(2)} shot ${idx}`;
  return idx;
};

// interactive preview: ?t=12.3 for a still, otherwise realtime playback (click to start with audio.m4a)
const qs = new URLSearchParams(location.search);
window.ready = Promise.all([document.fonts.ready, preload(EDIT.ASSETS || {})]).then(() => true);
if (qs.has('t')) window.ready.then(() => window.renderAt(parseFloat(qs.get('t'))));
else if (!qs.has('render')) {
  const audio = new Audio('./audio.m4a');
  let t0 = null;
  document.body.addEventListener('click', () => { audio.currentTime = 0; audio.play(); t0 = performance.now(); });
  const loop = () => { const t = t0 ? ((performance.now() - t0) / 1000) % DURATION : 0; window.renderAt(t); requestAnimationFrame(loop); };
  window.ready.then(loop);
}
