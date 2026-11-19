// Usage (from the project folder):
//   node render.mjs stills 0.5,3,7.2 out_dir             -> PNG stills
//   node render.mjs shots out.mp4 [fps]                  -> renders shot by shot into .cache/ and joins them; a shot whose
//                                                          code did not change is reused, so editing one shot re-renders only it
//   node render.mjs video out.mp4 [fps] [from] [to]      -> one straight render (no cache)
// Add --preview anywhere for half resolution, hard shadows, no depth of field and 15 fps by default (much faster).
// GL=swiftshader forces software WebGL (no GPU). CHROME_PATH=/path/to/chrome uses a browser you already have.
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));       // works on Windows too
const argv = process.argv.slice(2);
const PREVIEW = argv.includes('--preview');
const [mode, a, b, c, d] = argv.filter(x => x !== '--preview');

const types = { '.html': 'text/html', '.js': 'text/javascript', '.woff2': 'font/woff2', '.m4a': 'audio/mp4', '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json', '.bin': 'application/octet-stream', '.png': 'image/png', '.jpg': 'image/jpeg', '.hdr': 'application/octet-stream', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  fs.readFile(p, (e, buf) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'content-type': types[path.extname(p)] || 'application/octet-stream' }); res.end(buf); });
}).listen(0);
const port = server.address().port;

const GL = process.env.GL === 'swiftshader' ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] : ['--enable-gpu'];
const browser = await chromium.launch({ args: [...GL, '--ignore-gpu-blocklist'], ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
const page = await browser.newPage({ viewport: { width: 720, height: 1280 } });
page.on('console', m => { if (m.type() === 'error' || (m.type() === 'warning' && !/GPU stall|GL Driver/.test(m.text()))) console.log('[page]', m.text()); });
page.on('pageerror', e => console.log('[pageerror]', e.message));
await page.goto(`http://localhost:${port}/index.html?render=1${PREVIEW ? '&preview=1' : ''}`);
await page.waitForFunction(() => window.renderAt && window.ready);
await page.evaluate(() => window.ready);
const clip = { x: 0, y: 0, width: 720, height: 1280 };
const png = () => page.screenshot({ clip, type: 'png' });
const jpg = () => page.screenshot({ clip, type: 'jpeg', quality: 95 });   // much faster to encode than PNG; x264 re-encodes anyway

// frames n0..n1-1 at fps -> mp4 (no audio)
async function encode(out, fps, n0, n1, label = '') {
  const ff = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', PREVIEW ? 'veryfast' : 'medium', '-crf', PREVIEW ? '23' : '17', '-pix_fmt', 'yuv420p', '-r', String(fps), out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const T0 = Date.now();
  for (let n = n0; n < n1; n++) {
    await page.evaluate(t => window.renderAt(t), n / fps);
    const buf = await jpg();
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if ((n - n0) % 30 === 0) console.log(`${label}frame ${n}/${n1} ${((Date.now() - T0) / (n - n0 + 1)).toFixed(0)} ms/frame`);
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
}

if (mode === 'stills') {
  fs.mkdirSync(b, { recursive: true });
  for (const t of a.split(',').map(Number)) {
    const t0 = Date.now();
    await page.evaluate(t => window.renderAt(t), t);
    fs.writeFileSync(path.join(b, `t_${t.toFixed(2)}.png`), await png());
    console.log('still', t, Date.now() - t0, 'ms');
  }
} else if (mode === 'shots') {
  const fps = Number(b || (PREVIEW ? 15 : 30));
  const info = await page.evaluate(() => window.SHOT_INFO());
  const trans = await page.evaluate(() => window.TRANSITION_TIMES);
  const srcDir = path.join(ROOT, 'src');
  // code every shot shares: every file in src/ and index.html, with the shot functions taken out of shots.js
  let shared = fs.readFileSync(path.join(srcDir, 'shots.js'), 'utf8');
  for (const s of info) shared = shared.split(s.src).join('');
  for (const f of fs.readdirSync(srcDir).sort()) if (f !== 'shots.js') shared += fs.readFileSync(path.join(srcDir, f), 'utf8');
  shared += fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8') + (PREVIEW ? 'preview' : 'final') + fps;
  const assetsList = shared.match(/assets\/[^'"]+/g) || [];
  for (const p of new Set(assetsList)) { try { shared += fs.statSync(path.join(ROOT, p)).mtimeMs; } catch {} }
  const cache = path.join(ROOT, '.cache'); fs.mkdirSync(cache, { recursive: true });
  const parts = [];
  for (let i = 0; i < info.length; i++) {
    const s = info[i];
    const n0 = Math.round(s.start * fps), n1 = Math.round(s.end * fps);
    if (n1 <= n0) continue;
    // a transition on either edge mixes in the neighbouring shot, so it joins the key
    const edge = trans.some(t => Math.abs(t - s.start) < 0.6) ? info[i - 1]?.src || '' : '';
    const edge2 = trans.some(t => Math.abs(t - s.end) < 0.6) ? info[i + 1]?.src || '' : '';
    const key = crypto.createHash('sha1').update(shared + s.src + edge + edge2 + `${n0}-${n1}`).digest('hex').slice(0, 12);
    const file = path.join(cache, `shot${String(i).padStart(2, '0')}_${key}.mp4`);
    if (fs.existsSync(file)) console.log(`shot ${i}: unchanged, reused`);
    else { console.log(`shot ${i}: rendering ${n1 - n0} frames`); await encode(file, fps, n0, n1, `  shot ${i} `); }
    parts.push(file);
  }
  const list = path.join(cache, 'list.txt');
  fs.writeFileSync(list, parts.map(p => `file '${p.replace(/\\/g, '/').replace(/'/g, "'\\''")}'`).join('\n'));
  const r = spawnSync('ffmpeg', ['-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', a], { stdio: 'inherit' });
  if (r.status === 0) console.log('wrote', a);
  // keep the cache small: drop clips no current shot uses
  const keep = new Set(parts.map(p => path.basename(p)));
  for (const f of fs.readdirSync(cache)) if (f.endsWith('.mp4') && !keep.has(f)) fs.unlinkSync(path.join(cache, f));
} else {
  const fps = Number(b || (PREVIEW ? 15 : 30)), dur = await page.evaluate(() => window.DURATION);
  const from = Number(c || 0), to = Math.min(Number(d || dur), dur);
  await encode(a, fps, Math.round(from * fps), Math.floor(to * fps));
}
await browser.close();
server.close();
