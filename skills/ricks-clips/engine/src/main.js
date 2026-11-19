import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { SHOTS, CAPTIONS, DURATION, FADES } from './shots.js';
import { MOODS, skyMaterial } from './world.js';
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
export function makeStage({ mood = 'day', shadowSize = 4, target = [0, 0, 0], fog = true, env = 0.6, overrides = {} } = {}) {
  const m = { ...MOODS[mood], ...overrides };
  const scene = new THREE.Scene();
  scene.environment = envFor(mood + JSON.stringify(overrides), m);
  scene.environmentIntensity = env;
  const sky = new THREE.Mesh(new THREE.SphereGeometry(200, 48, 24), skyMaterial(m));
  sky.frustumCulled = false; sky.renderOrder = -10; scene.add(sky);
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
const bloom = new UnrealBloomPass(new THREE.Vector2(W / 2, H / 2), 0.3, 0.5, 1.0);
const grade = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, uVig: { value: 0.32 }, uSat: { value: 1.12 }, uCon: { value: 1.06 }, uTint: { value: new THREE.Vector3(1, 1, 1) } },
  vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uVig, uSat, uCon; uniform vec3 uTint; varying vec2 vUv;
    void main(){ vec4 c = texture2D(tDiffuse, vUv);
      float l = dot(c.rgb, vec3(0.299,0.587,0.114));
      c.rgb = mix(vec3(l), c.rgb, uSat);
      c.rgb = (c.rgb - 0.5) * uCon + 0.5;
      c.rgb *= uTint;
      vec2 q = vUv - 0.5; q.x *= 0.5625;
      c.rgb *= 1.0 - uVig * smoothstep(0.2, 0.62, length(q));
      gl_FragColor = vec4(clamp(c.rgb, 0., 1.), 1.); }`,
});
composer.addPass(renderPass);
composer.addPass(bloom);
composer.addPass(new OutputPass());
composer.addPass(grade);

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
window.renderAt = (t) => {
  let idx = SHOTS.findIndex(s => t >= s.start && t < s.end);
  if (idx < 0) idx = SHOTS.length - 1;
  const def = SHOTS[idx];
  const shot = getShot(idx);
  const lt = t - def.start;
  const r = shot.update(lt, t) || {};
  const cam = shot.camera;
  cam.aspect = W / H; cam.updateProjectionMatrix();
  const ud = shot.scene.userData;
  if (ud.sky) { ud.sky.position.copy(cam.position); ud.sky.material.uniforms.time.value = t; }
  renderPass.scene = shot.scene; renderPass.camera = cam;
  bloom.strength = r.bloom ?? 0.3;
  bloom.threshold = r.bloomThreshold ?? 1.0;
  CHAR.lo.value = r.charLight?.[0] ?? 0.72; CHAR.hi.value = r.charLight?.[1] ?? 1.0;
  renderer.toneMappingExposure = r.exposure ?? ud.exposure ?? 1.0;
  grade.uniforms.uVig.value = r.vignette ?? 0.32;
  grade.uniforms.uSat.value = r.saturation ?? 1.12;
  grade.uniforms.uTint.value.set(...(r.tint || [1, 1, 1]));
  composer.render();
  // captions: 1-2 words, a small pop on each new word
  const i = CAPTIONS.findLastIndex(c => t >= c[0]);
  const c = CAPTIONS[i];
  const on = c && (c[2] == null || t < c[2]);
  capEl.textContent = on ? c[1] : '';
  const age = on ? t - c[0] : 1;
  capEl.style.transform = `scale(${1 + 0.14 * Math.max(0, 1 - age / 0.09)})`;
  let f = 0;
  for (const [a, b, c2, d] of FADES) if (t >= a && t < d) f = Math.max(f, t < b ? (t - a) / (b - a) : t < c2 ? 1 : (d - t) / (d - c2));
  fadeEl.style.opacity = f;
  flashEl.style.opacity = r.flash || 0;
  hud.textContent = `t=${t.toFixed(2)} shot ${idx}`;
  return idx;
};

// interactive preview: ?t=12.3 for a still, otherwise realtime playback (click to start with audio.m4a)
const qs = new URLSearchParams(location.search);
window.ready = document.fonts.ready.then(() => true);
if (qs.has('t')) window.ready.then(() => window.renderAt(parseFloat(qs.get('t'))));
else if (!qs.has('render')) {
  const audio = new Audio('./audio.m4a');
  let t0 = null;
  document.body.addEventListener('click', () => { audio.currentTime = 0; audio.play(); t0 = performance.now(); });
  const loop = () => { const t = t0 ? ((performance.now() - t0) / 1000) % DURATION : 0; window.renderAt(t); requestAnimationFrame(loop); };
  window.ready.then(loop);
}
