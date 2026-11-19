---
name: ricks-clips
description: Makes a story-explainer short (9:16) in the style of the Rick's Clips-type channels, entirely in code with three.js. Flat cartoon people (white round heads with drawn faces, egg bodies in clothes, black stick limbs, thick black outlines) acting in fully lit 3D sets (ships, holds, offices, streets, castles) with cinematic light: golden hour, sunset, moonlit night, storms with lightning, warm lantern interiors and shafts of light. One word on screen at a time in heavy white type with a black outline. Use when the user runs /ricks-clips or asks for a "why did people used to…", "how X actually worked", "the job nobody wants" kind of history/curiosity short with cartoon characters.
---

# /ricks-clips

```
┌──────────────────────┐
│  sunset sky, clouds  │  real 3D set: ship deck, hold, cabin, street...
│      ◉ ◉   ◉ ◉       │  flat cartoon people, black outlines, big eyes
│     ( ≡≡ ) ( ▓▓ )    │  lighting moods: golden, sunset, night, storm,
│      /  \   /  \     │  interior lamps, light shafts, lightning, rain
│       "voyage."      │  ONE word at a time, white, black outline
└──────────────────────┘
```

**What the popular reels on this kind of channel share** (studied from the most-viewed shorts, 10–35 M views: "The Ancient Jar That Warned an Empire", "Why Perfect Railroads Don't Work", "The Job Nobody Wants in Japan", "Why Sailors Carried Storm Oil", "What the Grave Bell Really Meant"):
- **Topic:** one odd fact from history, work or science, told as a mini story. Titles are "Why…", "How… Worked", "The… That…", "What… Really Meant".
- **Characters:** flat 2D-looking people with white circle heads, white eyes with black outlines and dot pupils, thick brows, small mouths, an egg-shaped body that *is* the outfit (stripes, uniform, buttons), thin black stick arms and legs, and a hat or hair that says who they are. They act: they pull, point, shrug, sweat and react.
- **Sets:** detailed lit 3D places with depth (a prison block, a ship deck at sea, a castle wall at night, a Japanese prize counter, an office). There's always a background.
- **Light does the mood:** warm golden hour, purple sunset, blue moonlight with warm practical lamps, cool god rays through a window, dark storms.
- **Camera:** close, slightly low, wide-ish lens, slow push-ins; a new shot every 1–3 s.
- **Captions:** 1 word (or "a cannonball", "the whole") at a time, heavy white type with a thick black outline at about 70 % of frame height. Punctuation stays ("check.", "furious,").

A worked example comes with it: `engine/` is a finished 28 s short, **"Why every old ship had a cat"** (11 shots: sailors hauling at golden hour, the cat loafing on a barrel, rats in a dark hold lit by a lantern and a shaft of daylight, a rat chewing rope, a sick sailor, the cat pouncing into the light, a sailor petting it at sunset, a night storm with lightning, a 1975 navy order stamped "BANNED"). It ships without a voiceover; the captions are timed by estimate until you add one. Not affiliated with any channel; "the style" means the format and look.

## First use
This skill's folder is the "Base directory" Claude Code shows when it loads it.
```bash
SKILL_DIR="<base directory of this skill>"
KIT=$(python3 -c 'import os,sys;print(os.path.realpath(os.path.join(sys.argv[1],"..","..","kit")))' "$SKILL_DIR")
[ -d "$KIT/node_modules/three" ] || bash "$KIT/setup.sh"
PY="$KIT/.venv/bin/python"     # only after: bash "$KIT/setup.sh" --voice  (free voice + word timings, ~1 GB once)
```
Needs ffmpeg, Node and Python 3.9+. It renders with WebGL in headless Chrome. With `GL=swiftshader` (software, no GPU) it still runs at about 1 s a frame at 720x1280, so a 30 s short takes about 15 minutes. `CHROME_PATH=/path/to/chrome` uses a Chrome/Chromium you already have.

## The engine
| File | What |
|---|---|
| `src/shots.js` | **The edit.** `CAPTIONS` (`[start, text, end?]`), `FADES` (dips to black), `DURATION`, the cast (outfit objects), one function per shot and the `SHOTS` list (`{start, end, build}`). A shot's `build({makeStage})` returns `{scene, camera, update(t)}`; `update` gets the time inside the shot and may return `{exposure, bloom, bloomThreshold, vignette, saturation, tint:[r,g,b], flash, charLight:[lo,hi]}`. |
| `src/toon.js` | **The characters.** `makeToon(outfit)` → `{root, setFace(f), pose(p), hands}`. Outfit: `color`, `stripes`, `lower`, `belt`, `buttons`, `double`, `tie`, `collar`, `coatOpen`, `sash`, `patch`, `hat` (`captain sailor beanie bandana tricorn tophat cowboy`), `hatColor`, `hair` (`bowl short bun bald`), `hairColor`, `skin`, `moustache`, `nose`, `epaulettes`, `size: [bodyW, bodyH, legLen]`, `scale`. Face: `eyes` (`open wide half sleepy closed happy dot red`), `brows` (`flat angry worried raised smug none`), `mouth` (`smile grin smirk flat frown wavy teeth o shout cat`), `open` 0–1 (talking), `look: [x, y]`, `sweat`, `blush`. Pose: `la`/`ra` arms `[out, forward, elbow]`, `ll`/`rl` legs `[forward, knee]`, `lean: [fwd, side]`, `turn`, `head: [x, y, z]`, `crouch`, `bob`. Presets in `POSES` (`stand hips wave point shrug armsUp think pull scared stamp pet`), `mixPose(a, b, k)`, `walkPose(phase)`, `talk(t)`, `blink(t)`. Also `makeCat()` (`sit loaf run tail setFace`) and `makeRat()`. |
| `src/world.js` | **Sets and light.** `MOODS` (`day golden sunset night storm interior dark`): painted sky with clouds, sun glow, stars and moon. Canvas textures `planks brick stone wallpaper canvasCloth` (+ `tex(t, rx, ry)`). Set pieces `ship` (deck at y=0, mast, sail, rails, flag), `sea` + `seaHeight`, `room`, `barrel crate sack ropeCoil rope box floor`, `lantern` (real warm point light + glow + `flicker(t)`), `beam` (volumetric light shaft), `dust`, `rain`, `glowSprite`. |
| `src/main.js` | Renderer, `makeStage({mood, shadowSize, target, env, overrides})`, bloom, grade (saturation, contrast, vignette, tint), captions with a small pop, fades and lightning flash, `window.renderAt(t)`. |
| `src/anim.js` | `kf` keyframes, easings, `range`, `cam(fov)`, `place(camera, pos, look, roll)`, `shake`. |
| `captions.py` | Word timings → `CAPTIONS` in this style (1 word, small words ride with the next). `--estimate script.json` times them without a voice. |

## Steps
1. **Script.** Use the user's script, or draft one in the format: a hook that states the odd fact ("For centuries, almost every ship had one crew member who never pulled a single rope."), the reveal ("The cat."), the problem it solved, the mechanism, a twist or superstition, and a closing fact that lands ("The Royal Navy only banned ship cats in 1975."). About 2.6 words a second (65 to 80 words for 28 s). Check the facts; keep claims you can't verify out.
2. **Project.** Copy the engine to a new folder (`<project>` must not exist yet) and link the shared packages:
   ```bash
   cp -R "$SKILL_DIR/engine" <project> && rm -f <project>/node_modules && ln -s "$KIT/node_modules" <project>/node_modules
   ```
   Write the script into `<project>/script.json` as a list of sentences.
3. **Voice.** Best is the user's own recording: `ffmpeg -i <take> -ac 1 -ar 44100 <project>/audio/vo.wav`. Otherwise the free Kokoro voice, from the project: `"$PY" "$SKILL_DIR/../stick-figure/engine/tools/tts_kokoro.py" am_michael 1.1` writes `audio/vo_kokoro.wav`; copy it to `audio/vo.wav`. For the browser preview, also save it as `audio.m4a`.
4. **Captions.** `"$PY" "$KIT/words.py" audio/vo.wav script.json` writes `audio/vo.words.json`; `python3 captions.py audio/vo.words.json` prints `CAPTIONS` and `DURATION` to paste into `src/shots.js`. No voice yet? `python3 captions.py --estimate script.json` gives even timings and the start of every sentence.
5. **Shots.** One shot per beat, 1 to 3.5 s each (9 to 12 for 30 s), cutting on sentence or caption starts. For each beat pick: **a set** (reuse the `deckScene`/`holdScene` pattern: build a helper per location and reuse it across shots), **a mood** (`golden` for the hook, `dark`/`interior` with lanterns for problems, `storm`/`night` for danger, `sunset` for a warm turn), **who's in it and what they do** (a pose plus an expression that matches the line), and **a camera move** (slow push-in, slightly low, characters big in frame).
   - `update(t)` must depend only on `t`: renders start mid-shot. Moving things (sea, ship, rain, dust, flicker) all take `t`.
   - Faces only read from the front: put the camera on the side the character faces (a character faces +z before you rotate `root`). Keep ropes, posts and lamps from crossing faces.
   - Keep faces and key props out of the caption band (y about 840 to 940 of 1280) and away from the edges.
   - Dark scenes need practical lights: a `lantern` near the action (shadow on for one of them), a `beam` with a spotlight for a shaft of daylight, `dust` in it, and `hemi.intensity` around 0.9 so the far wall still reads.
   - Characters stay readable in any light (their shading is clamped). In a very dark shot return `charLight: [0.45, 1]` to let them fall into shadow more.
   - Lightning: a short `pulse` on the sun's intensity, `sky.material.uniforms.flash` and the returned `flash`/`exposure`.
6. **Stills.** From the project: `node render.mjs stills 1.5,5,9,13 stills` (add `GL=swiftshader` without a GPU). Look at every shot before a full render and fix framing, faces and light.
7. **Render.** `node render.mjs video silent.mp4 30`, then add the voice, level it and scale to 1080x1920:
   ```bash
   ffmpeg -i silent.mp4 -i audio/vo.wav -map 0:v -map 1:a -vf scale=1080:1920:flags=lanczos -c:v libx264 -crf 17 -pix_fmt yuv420p -af "apad,loudnorm=I=-14:TP=-1.5" -c:a aac -b:a 192k -shortest <name>.mp4
   ```
   Without a voice: `ffmpeg -i silent.mp4 -vf scale=1080:1920:flags=lanczos -c:v libx264 -crf 17 -pix_fmt yuv420p <name>.mp4`.
8. **Hand over** the mp4 path and a title in the channel's format ("Why Every Old Ship Had a Cat").

For a live preview, serve the project (`python3 -m http.server 8000`) and open `index.html` (click to play with `audio.m4a`), or `index.html?t=14.5` for one frame.

## Style checklist
- Every shot has a real place behind the characters, with depth and something in the foreground or background (barrels, rails, crates, lamps).
- Light tells the mood and changes from beat to beat: warm → dark and lamp-lit → cool shaft of light → stormy → warm interior.
- Characters are big in frame, look at each other or at the thing that matters, and react with their face (brows do most of the work).
- One word at a time, white with a thick black outline, popping in on the beat.
