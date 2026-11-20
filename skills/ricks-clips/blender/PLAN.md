# Blender pipeline for /ricks-clips: build plan

**Who this is for:** a Claude Code session running on the user's own PC, which has Blender installed. The cloud session that wrote this plan can't run Blender on that machine. Build it in the milestones below and test each one with real renders before moving on.

**Goal:** render the shorts in Blender instead of three.js:
- **Sets:** realistic, densely dressed sets (Poly Haven models, HDRI skies, PBR textures).
- **Light:** real light (global illumination, soft shadows, volumetric shafts, practical lights).
- **Cast:** 3D cartoon characters that act as expressively as the reference shorts.
- **Speed:** rendered on the user's GPU.

Keep the *creative* rules exactly as they are now. They live in `../SKILL.md` (format, narrative structure, script rules, the 12-section `plan.md`) and `../reference.md` (camera, composition, light, edit grammar measured on the reference videos). This plan only replaces the renderer.

---

## 0. The machine
- Windows, NVIDIA RTX 2060 (6 GB VRAM), repo at `E:\claude-animation-skills`, Git Bash available.
- Blender from `winget install BlenderFoundation.Blender`, usually at `C:\Program Files\Blender Foundation\Blender <ver>\blender.exe` and often not on PATH. Find it, and store the path in `kit/blender_path.txt` (gitignored) so later runs reuse it.
- Run everything headless: `"<blender.exe>" -b --factory-startup -P skills/ricks-clips/blender/rc/render_short.py -- <args>`. In Git Bash, quote the path; arguments after `--` reach the script via `sys.argv`.
- Also on this machine: ffmpeg, Node (only for the old engine), Python 3.12 (system, for `post.py`, `sound.py`, `kit/assets.py`).
- **GPU setup inside every render script:** `prefs = bpy.context.preferences.addons['cycles'].preferences`, `compute_device_type = 'OPTIX'` (fall back to `'CUDA'`), `get_devices()`, enable every GPU device, `scene.cycles.device = 'GPU'`. For EEVEE nothing is needed.
- **VRAM budget, 6 GB:** 1k textures (`kit/assets.py model <id> 1k`), at most ~40 unique props per shot (instances are free), HDRI at 1k–2k.

## 1. Files to create
```
skills/ricks-clips/blender/
  PLAN.md               this file
  rc/                   a Python package imported inside Blender (add its parent folder to sys.path at the top of render_short.py)
    render_short.py     entry point: loads a short file, builds each shot as its own Blender scene, renders frame ranges to PNG
    stage.py            world and light moods (port of MOODS in ../engine/src/world.js), HDRI, sun, fog and volumetrics, render settings
    assets.py           glTF import with a cache, put(name, pos, rot, height), downloads through kit/assets.py if missing
    toon.py             the character builder: geometry, toon materials, outlines, rig, face (section 3)
    acting.py           the action library, lip sync, blinks, idle life (section 4)
    camera.py           the camera recipes (port of shoot() in ../engine/src/anim.js), moves, shake, depth of field
    fx.py               ocean, rain, dust motes, light shafts, bursts (bills/confetti/debris), lightning
    post.py             runs in system Python, not Blender: captions, transitions, joins shots, mixes audio, writes the mp4
  examples/
    ship_cat.py         the port of the current example (../engine/src/shots.js + ../engine/plan.md)
```

## 2. The short file (what a short looks like)
A plain Python module, structurally the same as `shots.js`, so all the existing planning carries over:
```python
DURATION = 30.75
FPS = 30
CAPTIONS = [(0.25, 'For *centuries,*'), ...]            # same format as shots.js, *stars* highlight a word
CAPTION_STYLE = dict(mode='group', max_words=4, max_chars=18, y=0.6)
TRANSITIONS = [dict(t=19.98, type='dissolve')]           # dissolve / zoom / flash / punch, as in the old engine
FADES = [(19.86, 19.98, 20.02, 20.2)]
ASSETS = dict(ship='polyhaven/dutch_ship_large_01', skyGold='hdri/belfast_sunset_puresky', ...)
SOUND = 'sound.json'                                     # reused unchanged: ../engine/sound.py makes audio/sound.wav

def shot_deck_wide(ctx):                                 # ctx: scene, mood helpers, asset put(), toon(), acting, camera
    ctx.stage('golden', hdri='skyGold')
    ship = ctx.put('ship', (0, -4.64, 0), rot_z=90)
    a = ctx.toon(SAILOR_A, at=(1.0, 0, 1.75), face=180)
    ctx.act.haul(a, 0, 3.2)                              # keyframes over the shot's local seconds
    ctx.cam.shoot('hero', target=(0.25, 1.15, 2.3), dist=2.4, move='push', amount=0.3)

SHOTS = [dict(start=0.0, end=3.2, build=shot_deck_wide), ...]
```
- Each shot becomes its own Blender scene with frames `0 .. (end-start)*FPS`. Rendering per shot means a changed shot re-renders alone: cache by a hash of the shot function's source plus the shared modules.
- **Transition handles:** render each shot 0.3 s past both ends, so `post.py` has frames to crossfade.
- **Everything is keyframed.** No per-frame Python handlers, so renders are deterministic and can start on any frame.

## 3. The 3D characters: same design, far more expressive
**Look (keep it):** a white round head, a drawn face, an egg body that *is* the outfit (colours, stripes, buttons, belt, tie, collar), black limbs, round black hands and shoes, thick dark outlines. Hats and hair as in `../engine/src/toon.js` (captain, sailor, beanie, bandana, tricorn, tophat, cowboy, bowl, bun…). Port the outfit options 1:1 so `SAILOR_A` etc. work unchanged.

**Geometry:**
- **Head:** a UV sphere (radius 0.26). **Body:** an egg made with bmesh from the same profile as `toon.js`. Clothes as a generated image texture (Pillow, or Blender's own image API) mapped on the egg's cylindrical UVs, or as simple material slots for stripes, belt and buttons.
- **Limbs, for curvy "rubber-hose" arms and legs:** a thin tube mesh (radius 0.016) skinned to **bendy bones** (B-Bones, 6–8 segments) with ease in and out, so limbs bend in smooth arcs instead of a hard elbow. Round hands and oval shoes sit at the ends.
- **Outline:** inverted hull, which is fast and matches the cast in the old engine. A Solidify modifier (thickness ≈ 0.012, flip normals, material offset) with a black emission material that culls front faces. Add it to the character, the hats and hero props.
- **Toon shading (EEVEE):** Principled → Shader to RGB → Color Ramp with 3 constant bands (0.6 / 0.85 / 1.0 of the albedo) → Emission, mixed with a little flat emission so a character never falls into black. The old engine clamps character light between 0.72 and 1.0 of the albedo; aim for the same readability. In Cycles, use a flat Emission plus a soft Diffuse at about 30 %.

**Rig (one armature per character):**
- **Bones:** `root`, `hips`, `spine` (2 bones, so the egg can bend and squash), `neck`, `head`, `arm.L/R` and `forearm.L/R` (bendy), `hand.L/R`, `thigh.L/R` and `shin.L/R` (bendy), `foot.L/R`.
- **IK** on arms and legs, with hand and foot controllers and pole targets, so hands can stay on a prop (rope, cup, sack, clipboard) and feet stay planted while the body moves.
- **Squash and stretch:** scale on `spine` with volume preservation (Stretch To or a scale driver: y up, x and z down), plus a `head` scale for takes.
- **Props:** a hand bone owns a `Child Of` constraint per prop, keyed on and off for pick-ups and hand-offs.

**Face, built as geometry so every part animates:**
- **Eyes:** flattened white spheres with an outline, pupils as black discs driven by a `look` controller (an empty), eyelids as half-shells that rotate. That gives open, half, sleepy, closed, and blinks.
- **Brows:** curve objects with shape keys: flat, angry, worried, raised, smug (asymmetric).
- **Mouth:** a curve or mesh with shape keys for expressions (rest, smile, grin, smirk, frown, wavy, shout, teeth) and **visemes** for lip sync (`A/I`, `E`, `O`, `U`, `M/B/P`, `F/V`, `L`, rest).
- **Extras** as toggles: moustache, nose, sweat drop, blush, red angry eyes.
- **Placement:** all face parts sit on the sphere with a Shrinkwrap so they follow the head's turns.

## 4. Acting: what makes them expressive
The reference characters always **do something physical with props**: they haul a sack over the shoulder with the whole body bent, sip from a steaming cup while gesturing with the other hand, write on a clipboard, crawl through a tunnel. Every shot needs an action, never a statue.

**`acting.py`:** each function takes `(char, start_s, dur_s, **params)` and inserts keyframes with eased Bezier curves:
- **Locomotion:** `walk(path, speed)` with contact, down, passing and up poses, a 2–3 cm body bounce, an arm swing opposite to the legs and a head bob. Also `run`, `tiptoe`, `crawl`, `jump`, `fall`, `stumble`.
- **Props:** `pick_up(prop)`, `carry(prop, style='shoulder'|'hug'|'hand')`, `put_down`, `drink(cup)`, `write(clipboard)`, `count_money`, `haul(rope)`, `push(obj)`, `throw(obj)`, `dig(shovel)`.
- **Talk and gesture:** `talk(beats)` puts a gesture on stressed words: open palm, chop, point, count on fingers, shrug, hands on hips, arms crossed, chin stroke, facepalm.
- **Reactions:** `take` (a surprise: anticipate down, then pop up with head stretch and wide eyes, then settle), `scared` (jump back and shake), `laugh` (body bounce, eyes closed), `celebrate` (arms up and hop), `slump` (sad), `nod`, `head_shake`, `double_take`.
- **Life:** `idle(char)` across the whole shot (breathing on the spine scale, small weight shifts, blinks every 2–4 s, occasional look-arounds). Layer it under every other action.
- **Lip sync:** `lipsync(char, words)` from the word timings (`kit/words.py`, or `captions.py --lines`). Map letters to visemes at 12–15 shapes a second, ease between them, hold `M/B/P` closed for 2 frames, and add a jaw and head nod on stressed syllables. Only the speaking character moves its mouth; the others react.

**Animation rules (check every shot):**
- **Anticipation** before big moves (a dip before a jump, a wind-up before a throw).
- **Overshoot and settle:** 1–2 frames past the target, then back.
- **Arcs:** hands and heads travel on curves, never straight lines.
- **Offset timing:** head leads, body follows, hands last; hats and hair lag 2–3 frames.
- **Moving holds:** never freeze; keep a 1–2 % drift and breathing even when "still".
- **Squash and stretch** on landings, takes and laughs. Keep volume.
- **Silhouette:** poses read in black, with arms off the body and a clear line of action, and the body tilted toward the action (bending 30–60° when lifting or hauling, as in the references).
- **Faces carry the line:** brows hit emphasis words, eyes look at whatever matters, and blinks happen on cuts and changes of thought.

## 5. Sets, light and effects
- **Realistic sets** (the user's standing preference): Poly Haven models and PBR textures first, Kenney only when nothing realistic exists, kept small or in the background. Dress densely, with a foreground prop, the characters and a busy background in every shot (`../reference.md`). Add readable signage and in-world screens (CAM monitors, notices) as text objects or generated textures.
- **`stage.py` moods** (port of MOODS: day, golden, sunset, night, storm, interior, dark):
  - an HDRI for ambient light and reflections;
  - a sun with an angle of 1–3° for soft shadows;
  - colour management "AgX" with a "Punchy" look, or Filmic, matched to the old grade (saturation about +12 %, a light vignette in post);
  - fog and volumetrics with a low-density Volume Scatter in the world (or a cube), and spot or area lights through windows and hatches for shafts.
- **Practical lights:** lanterns and lamps are an emissive mesh plus a point light (a soft shadow on the main one only), and bloom (EEVEE) or glare in post.
- **`fx.py`:**
  - **Ocean** with the Ocean modifier (animated, foam via vertex colours or a dynamic paint mask), plus a ship-bob helper reading wave height.
  - **Rain** as a particle system with stretched streaks. **Dust motes** in light shafts.
  - **Bursts** of bills, confetti or debris with rigid body or particles (ballistic, deterministic seed).
  - **Lightning:** keyed sun strength and an emissive bolt mesh.
- **`camera.py`:**
  - port `RECIPES` (hero, worm, ground, dutch, insert, wide, ots) with the same parameters;
  - convert vertical FOV to focal length with `sensor_fit='VERTICAL'`;
  - moves (push, pull, dolly, orbit, follow a character or object) as keyframes with ease;
  - shake via F-curve Noise modifiers on impacts;
  - depth of field with a focus object on the subject and f/2.8–5.6 for medium shots;
  - **the camera never stops** (`../reference.md`: a new setup every 3.5–5 s, few hard cuts).
- **Render settings:**
  - **Default, EEVEE (Next):** raytracing on, soft shadows, volumetrics, 64 samples, about 1–3 s a frame on an RTX 2060 at 1080x1920.
  - **Hero shots, optional:** Cycles, 64–128 samples, OptiX denoise, adaptive sampling, about 8–20 s a frame.
  - **Output:** PNG 8-bit sequences per shot into `<project>/renders/shotNN/`.

## 6. Post (`post.py`, system Python with Pillow and fontTools)
- **Captions:** the same rules as now (groups of up to 4 words, the spoken word in yellow, `*key*` words always yellow, white with a thick black outline, centred at 60 % of the height, a small pop on each new group). The font is Montserrat ExtraBold. Convert `kit/node_modules/@fontsource/montserrat/files/montserrat-latin-800-normal.woff2` to TTF once with `fontTools` (`pip install fonttools brotli`).
- **Transitions:** `dissolve` (a crossfade over the handles), `zoom` (scale up and radially blur the outgoing shot into the next), `flash`, `punch`, and fades to black.
- **Join:** pipe frames to ffmpeg (libx264, crf 17, yuv420p, 30 fps).
- **Audio:** mix `audio/vo.wav` and `audio/sound.wav` with the ducking command in `../SKILL.md` step 9, loudness -14 LUFS.

## 7. Milestones (stop and show a render at each)
1. **M0, environment:** find Blender and its version; check OptiX/CUDA is seen; check ffmpeg; install `pillow fonttools brotli` in system Python. Download the example's assets with `kit/assets.py`. Report the GPU name and Blender version.
2. **M1, one still:** the galleon deck at golden hour (HDRI, sun, fog), densely dressed, with one character standing in a `hero` shot. Compare against `../reference.md` and the old engine still at t=0.5. Tune toon shading and outline width until the character reads like the old cast. Report seconds per frame in EEVEE.
3. **M2, the character:** rig, face and the action library. A 10 s test clip in a simple lit set:
   - walk in, then stop with an overshoot;
   - talk a line with gestures and lip sync;
   - a `take` reaction;
   - pick up a sack and carry it on the shoulder;
   - sip from a cup, then point at the camera.

   Check it against the animation rules in section 4 frame by frame (a contact sheet at 6 fps).
4. **M3, port the example:** `examples/ship_cat.py` from `../engine/src/shots.js`, with the same beats, captions and sound, but with acting in every shot:
   - sailors hauling with full-body effort;
   - the captain gesturing;
   - the cat stretching and pouncing with squash and stretch;
   - the sick sailor swaying;
   - the officer stamping with anticipation.
5. **M4, post and final:** captions, transitions, sound and the mp4. Run the QC checklist from `../SKILL.md` on it.
6. **M5, document:** a "Blender renderer" section in `../SKILL.md` with the commands, the short-file format, the action library reference and the measured render times. Commit and push.

## 8. Things that will bite
- The Poly Haven galleon is 34 m long. In the old engine its main deck sits 4.64 m above the keel, and the clear deck is |x| < 2.4, -3.5 < z < 4.5 with the mainmast at 0,0 (bow toward +z after a 90° turn). Blender is Z-up, so convert: three.js `(x, y, z)` becomes Blender `(x, -z, y)`.
- glTF import brings each asset as a hierarchy. Join it or parent it under one empty per asset and use **linked duplicates** for repeated props to save VRAM.
- EEVEE volumetrics are view-dependent and cost a lot. Keep `volumetric_tile_size` at 8 and the volume range short (e.g. 0.1–40 m).
- The inverted-hull outline needs `use_backface_culling` on its material, and a material offset so it doesn't inherit the toon shader.
- Keep each shot's scene self-contained, so a crash or change in one shot doesn't force others to re-render.
- Don't commit renders, `.blend` caches or downloaded assets: add `skills/ricks-clips/blender/**/renders/` and `*.blend1` to `.gitignore`.
