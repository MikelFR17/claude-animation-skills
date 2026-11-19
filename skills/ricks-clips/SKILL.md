---
name: ricks-clips
description: Creates cinematic history, science and experiment Shorts (9:16, 30-50 s), from research and a full production plan through to a rendered mp4. Covers title, hook, timed script, shot list, synced captions, sound design, AI image prompts, sources, A/B hooks and a QC checklist. Renders it in code with three.js as flat cartoon characters (white round heads, drawn faces, thick black outlines) acting in fully lit 3D sets (golden hour, sunset, storms, lantern-lit interiors, light shafts), with a synthesised score, ambience and sound effects. Use when the user runs /ricks-clips or asks for a Short or reel about a historical oddity, how something actually worked, a strange experiment or a "why did people use to…" fact.
---

# /ricks-clips: cinematic history, science and experiment Shorts

## Mission
Work as creative director, Shorts scriptwriter, fact researcher, virtual director of photography, pacing editor and sound designer. The goal is a vertical Short with very high retention and the quality of a premium micro-documentary: visually immersive, narratively tense, accurate and very shareable.

**Voice:** do not imitate the voice or style of a specific person, brand or channel, and use no copyrighted material. Write in an original, consistent editorial voice: calm, precise, a little dry, and confident enough to let the facts be surprising. The *look* (flat outlined characters in lit 3D sets) is a genre, not a copy: invent your own characters, places and jokes every time.

```
┌──────────────────────┐
│ ░ top safe zone ░    │
│   lit 3D set + mood  │  golden · sunset · night · storm · lantern interior · light shafts
│    ◉ ◉       ◉ ◉     │  flat cartoon cast, thick outlines, faces that act
│   ( ≡≡ )    ( ▓▓ )   │
│ "rats ATE the food," │  ≤4 words a line, the spoken word lit, centred at 60 %
│ ▓ lower third: UI ▓  │  nothing essential down here
└──────────────────────┘
```

## Format (always)
- Vertical 9:16, 1080 × 1920. **30 to 50 s.** Never pad to hit the length: clarity first.
- Language: whatever the user asks; **default neutral Spanish**. The worked example is in English.
- One central idea per video.
- **Title** of 60 characters or fewer, built on curiosity without misleading clickbait.
- **The first frame is the thumbnail:** one strong shot that reads on a phone and matches the final reveal. The patterns that work: the protagonist big and centred looking at the camera, with the key object in the foreground (the gold, the cannonball, the money, the cat).
- **Captions** large, at most 3 to 5 words per line, synced word by word or in short groups, centred or in the upper safe zone. **Nothing essential in the lower third** (that's the YouTube UI). The engine default: groups of 4, the spoken word in yellow, `*key*` words always in yellow, centred at 60 % of the height.

## Narrative structure
| Block | Time | What has to happen |
|---|---|---|
| **1. Hook** | 0:00–0:02 | A striking image plus one line that sets up a threat, a paradox, a mystery or an extreme consequence. Pattern (don't copy it): "In [place/era], [subject] discovered something that [unexpected consequence]." No intro, no greeting, no context. |
| **2. Complication** | 0:02–0:12 | Why it seems impossible, dangerous, strange or counter-intuitive. One concrete fact: a date, a scale, a mechanism or a tangible consequence. A new shot every 1 to 3 s. |
| **3. Escalation** | 0:12–0:28 | The real mechanism: cause, effect, limit, risk or human decision. Then a **twist**, a detail that makes the viewer rethink what came before. One line of tension; no digressions. |
| **4. Reveal** | 0:28–0:40 | The explanation or outcome, visual and memorable. A short **pause, a music change or a held shot right before it** (`silence` in `sound.json`, a `FADES` dip). It answers exactly what the hook promised. |
| **5. Close** | last 3–6 s | A short conclusion, a wider implication or a concrete question, over an image that invites comments or a rewatch (the example: the cat turns to the camera). No "like and subscribe" unless asked. |

## Script rules
- Write for the ear: short, concrete, rhythmic sentences. About 2.5 words a second (75 to 125 words for 30 to 50 s).
- Use visual language ("the metal buckled", "three metres off the ground") rather than abstractions.
- Prefer numbers, scales, contrasts and human consequences.
- **Something new every 5 to 8 s:** a fact, a twist, a new place, a consequence or a partial reveal.
- No filler, empty adjectives, repetition or long academic explanations.
- **Never invent facts.** If something is uncertain, say so ("according to the sources available", "the most accepted explanation is…"). Keep documented fact, scientific theory, interpretation, folklore and hypothesis clearly apart, in the script and in the sources table.
- Suffering, death, weapons, experiments on people or tragedies: treat them with respect. No gratuitous gore, no mockery, no exploitative dramatisation (the characters' cartoon style helps: show consequences, not wounds).
- If the topic is too broad, choose the most visual, concrete and surprising angle and say in one line why. Asked for "samurai and thunder", don't tell the history generically: find the single counter-intuitive detail, make it an immediate threat, build tension with concrete images and end on a reveal that recasts everything before it.

## Visual direction
**Read `reference.md` before planning shots.** It holds the camera, composition, light and set grammar of the reference shorts: wide lenses close to the subject, low and ground-level cameras, dutch tilts, big foreground props, a spectacle wide for the payoff.
- Every sentence has a visual reason. The video must work **without sound and without captions**.
- Alternate wide, medium, macro detail and reaction/context shots. Cut every 1 to 3 s.
- Subtle camera moves: slow push-in, short pan, parallax, gentle dolly, a shake only on impacts.
- Keep period, geography, materials, costume, architecture and physics consistent.
- Cinematic light that serves the story: controlled contrast, atmosphere, particles, smoke, dust, water, fire, fog, directional light. Change the mood from block to block (warm hook → dark problem → cool shaft of light → storm → warm reveal).
- On-screen text only reinforces a number, name, date or key idea (`*starred*` in the captions, or a prop like the "BANNED" stamp).

## Sound design
Every block gets music (genre, instruments, intensity, in/out), ambience, sound effects, and silence where it helps. `sound.py` synthesises all of it from `sound.json`:
- **music styles:** `mystery` (pad, sparse piano, shimmer: hooks), `tension` (low ostinato + ticks: problems), `drive` (ostinato + taiko: escalation), `dark` (drone + heartbeat: threat), `warm` (major pad + piano: a soft turn), `reveal` (big swell into a held chord), `none`
- **ambience:** `sea wind rain storm room hold crowd fire machine night`
- **sfx:** `whoosh swish impact boom hit riser click tick thunder splash stamp creak squeak meow purr pop bell coins glass`
- **silence:** `[[start, end]]` cuts music and ambience. Use it just before the reveal.

The music follows the emotional curve and never fights the voice: in the final mix it ducks under the narration.

## Deliverable (every request)
Write `plan.md` in the project before building anything; `engine/plan.md` is the filled-in example to copy. It has these 12 sections:
1. **Title** (≤60 characters)
2. **Concept in one sentence**
3. **Hook for the first 2 seconds** (image + line)
4. **Full narrated script** with timestamps, by block
5. **Shot list** table: `Time | Narration | Shot / action | Camera | Light and colour | On-screen text | Sound`
6. **Synced captions** with times and highlighted words
7. **Sound design** by block (music, ambience, sfx, silence)
8. **AI image/video prompt in English for every shot**, with a shared style line (so the plan also works with other generators)
9. **Negative prompt**: artefacts, illegible text, bad anatomy, character drift, visible brands, anachronisms
10. **Sources and certainty**: each claim marked as fact, interpretation, folklore or hypothesis, with links
11. **Three alternative hooks** for A/B tests
12. **Final QC checklist** (below)

Then build it with the engine (below) and hand over the mp4 together with the plan. If the user only wants the plan, stop after `plan.md`.

## Quality control (before handing over)
- Does the hook hold in the first 2 seconds?
- Is the opening promise resolved at the end?
- Does every second add information, tension or emotion?
- Are the captions readable, synced and above the lower third?
- Are the shots varied and visually consistent (same cast, same period)?
- Is any fact invented, exaggerated or unsourced?
- Does the close invite a comment, a thought or another video?
- Does it work with the sound off?

---

## Production: the engine
A worked example comes with it. `engine/` is a finished 31 s short, **"Why Every Old Ship Had a Cat"**, with its `plan.md`, `sound.json` and 11 shots: sailors hauling at golden hour, the cat on a barrel, rats in a dark hold lit by a lantern and a shaft of daylight, a rat chewing rope, a sick sailor, the cat pouncing into the light, a sailor petting it at sunset, a night storm with lightning, a 1975 navy order stamped "BANNED", and the cat turning to the camera.

### First use
This skill's folder is the "Base directory" Claude Code shows when it loads it.
```bash
SKILL_DIR="<base directory of this skill>"
KIT=$(python3 -c 'import os,sys;print(os.path.realpath(os.path.join(sys.argv[1],"..","..","kit")))' "$SKILL_DIR")
[ -d "$KIT/node_modules/three" ] || bash "$KIT/setup.sh"
PY="$KIT/.venv/bin/python"     # only after: bash "$KIT/setup.sh" --voice  (free voice + word timings, ~1 GB once)
```
Needs ffmpeg, Node, and Python 3.9+ with numpy. Rendering uses WebGL in headless Chrome. With `GL=swiftshader` (software, no GPU) it runs at about 1 s a frame at 720x1280, so a 30 s short takes about 15 minutes. `CHROME_PATH=/path/to/chrome` uses a Chrome/Chromium you already have.

### Files
| File | What |
|---|---|
| `plan.md` | The 12-section plan (the example's). Copy it and replace everything. |
| `src/shots.js` | **The edit.** `CAPTIONS` (`[start, token, end?]`; `*word*` highlights), `CAPTION_STYLE` (`mode: 'group'\|'word'`, `maxWords`, `maxChars`, `y`, `size`, `highlight`, `accent`), `FADES` (dips to black), `TRANSITIONS` (`[{t, type, dur?}]` centred on a cut: **`dissolve`** (the default way to change place), **`zoom`** (match cut through a round shape), `punch` `flash` `blur` `whip-left/right/up/down`), `DURATION`, the cast, one function per shot and `SHOTS` (`{start, end, build}`). `build({makeStage})` returns `{scene, camera, update(t)}`; `update` may return `{exposure, bloom, bloomThreshold, vignette, saturation, tint:[r,g,b], flash, charLight:[lo,hi], dof:{focus, blur}, lens, dashcam:{speed, stamp}}`. |
| `src/toon.js` | **The cast.** `makeToon(outfit)` → `{root, setFace(f), pose(p), hands}`. Outfit: `color`, `stripes`, `lower`, `belt`, `buttons`, `double`, `tie`, `collar`, `coatOpen`, `sash`, `patch`, `hat` (`captain sailor beanie bandana tricorn tophat cowboy`), `hatColor`, `hair` (`bowl short bun bald`), `hairColor`, `skin`, `moustache`, `nose`, `epaulettes`, `size: [bodyW, bodyH, legLen]`, `scale`. Face: `eyes` (`open wide half sleepy closed happy dot red`), `brows` (`flat angry worried raised smug none`), `mouth` (`smile grin smirk flat frown wavy teeth o shout cat`), `open` 0–1, `look: [x, y]`, `sweat`, `blush`. Pose: `la`/`ra` `[out, forward, elbow]`, `ll`/`rl` `[forward, knee]`, `lean`, `turn`, `head`, `crouch`, `bob`; presets in `POSES`, `mixPose`, `walkPose`, `talk`, `blink`. Also `makeCat()` and `makeRat()`. |
| `src/world.js` | **Sets and light.** `MOODS` (`day golden sunset night storm interior dark`): painted sky, clouds, sun glow, stars, moon. Textures `planks brick stone wallpaper canvasCloth` (+ `tex`). Set pieces `ship`, `sea` + `seaHeight`, `room`, `barrel crate sack ropeCoil rope box floor`, `lantern` (real light + glow + `flicker`), `beam` (light shaft), `dust`, `rain`, `glowSprite`. Scatter: `grass({w, d, count, h, hole})` (instanced, wind via `.update(t)`) and `pebbles({w, d, count, size, hole})`. Bursts: `burst({kind: 'bills'|'confetti'|'debris', count, origin, t0, speed})` with `.update(t)`. |
| `src/main.js` | Renderer, `makeStage({mood, shadowSize, target, env, overrides})`, bloom, grade, captions, fades, lightning flash, `window.renderAt(t)`. |
| `src/anim.js` | `kf`, easings, `range`, `cam(fov)`, `place(camera, pos, look, roll)`, `shake`, and **`shoot(camera, recipe, {target, dist, yaw, height, fov, roll, lookUp})`** with recipes `hero` (low and wide, the default), `worm`, `ground`, `dutch`, `insert`, `wide`, `ots`. |
| `sound.json`, `sound.py` | The cue sheet and the synthesiser (score, ambience, sfx, silences) → `audio/sound.wav`. |
| `tts.py` | Free Kokoro voice in English or Spanish → `audio/vo_kokoro.wav` + `audio/lines.json`. |
| `captions.py` | Timings → `CAPTIONS`: from `kit/words.py` (exact, English), `--lines audio/lines.json script.json` (any language) or `--estimate script.json` (no voice yet). |

### Steps
1. **Research and plan.** Pick the angle, check every fact (search; at least one solid source per claim), and write `plan.md` with all 12 sections. Write the narration into `script.json` (a list of sentences).
2. **Project.** Copy the engine (`<project>` must not exist yet) and link the shared packages:
   ```bash
   cp -R "$SKILL_DIR/engine" <project> && rm -f <project>/node_modules && ln -s "$KIT/node_modules" <project>/node_modules
   ```
3. **Voice.** Best is the user's own recording: `ffmpeg -i <take> -ac 1 -ar 44100 audio/vo.wav`. Otherwise, from the project: `"$PY" tts.py` (English) or `"$PY" tts.py em_alex 1.05 es` (Spanish; `ef_dora` for a female voice), then `cp audio/vo_kokoro.wav audio/vo.wav`. For the browser preview, also save it as `audio.m4a`.
4. **Captions.** English: `"$PY" "$KIT/words.py" audio/vo.wav script.json`, then `python3 captions.py audio/vo.words.json`. Any language with `tts.py`: `python3 captions.py --lines audio/lines.json script.json`. No voice yet: `python3 captions.py --estimate script.json`. Paste `CAPTIONS` and `DURATION` into `src/shots.js`, then star the key words (`'in *1975.*'`).
5. **Shots.** Turn the shot list into code: one function per row, cutting on sentence or caption starts. Build a helper per location (like `deckScene`, `holdScene`) and reuse it. For each shot choose the mood, the cast and what they do (pose + expression that matches the line), and the camera move.
   - `update(t)` must depend only on `t`: renders start mid-shot. Sea, ship, rain, dust and flicker all take `t`.
   - Faces only read from the front: put the camera on the side the character faces (+z before you rotate `root`). Keep ropes, posts and lamps from crossing faces.
   - Keep faces and key props out of the caption line (around y 700 to 840 of 1280) and away from the edges.
   - Dark scenes need practical lights: a `lantern` near the action (shadow on for one), a spotlight + `beam` + `dust` for a shaft of daylight, `hemi.intensity` around 0.9.
   - Lightning: a short `pulse` on the sun's intensity, `sky.material.uniforms.flash` and the returned `flash`/`exposure`.
   - The first frame (t = 0) is the thumbnail: frame it like one.
   - Use `shoot()` recipes instead of hand-placing cameras: `hero` for most shots, `ground` along rails, roads and decks, `worm` for anyone powerful or high up, `dutch` on tense or comic beats, `wide` for the spectacle. Put a big prop near the lens in at least a third of the shots.
   - Edit like the references (measured, see `reference.md`): **few hard cuts**, a new setup every 3.5–5 s, and **the camera always moving**. Change place with a 0.25 s `dissolve`, a `zoom` through a round shape, a prop wiping across the lens, or a `burst` filling the frame. Keep hard cuts for impacts and punchlines.
   - Soft backgrounds on medium shots (`dof`), barrel distortion inside cars and rooms (`lens` 0.2–0.4).
   - Ground detail: `pebbles()` on gravel and cave floors, `grass()` on verges and fields (keep `count` under ~30k), and outlines (`tmesh`) on hero props.
6. **Sound.** Write `sound.json` from the plan's sound table (one music block per narrative block, ambience per location, a sfx on every cut and key action, a silence before the reveal), then `python3 sound.py`.
7. **Stills.** `node render.mjs stills 0,1.5,5,9,13 stills` (add `GL=swiftshader` without a GPU). Look at every shot and fix framing, faces and light before a full render.
8. **Render and mix.** `node render.mjs video silent.mp4 30`, then mix voice and sound (the bed ducks under the voice), level to -14 LUFS and scale to 1080x1920:
   ```bash
   ffmpeg -i silent.mp4 -i audio/vo.wav -i audio/sound.wav -filter_complex "[1:a]aformat=channel_layouts=stereo,asplit=2[vo][sc];[2:a][sc]sidechaincompress=threshold=0.03:ratio=8:attack=20:release=350[bed];[vo][bed]amix=inputs=2:normalize=0:duration=longest,loudnorm=I=-14:TP=-1.5[a]" -map 0:v -map "[a]" -vf scale=1080:1920:flags=lanczos -c:v libx264 -crf 17 -pix_fmt yuv420p -c:a aac -b:a 192k -shortest <name>.mp4
   ```
   Without a voice: `ffmpeg -i silent.mp4 -i audio/sound.wav -map 0:v -map 1:a -vf scale=1080:1920:flags=lanczos -c:v libx264 -crf 17 -pix_fmt yuv420p -c:a aac -b:a 192k -af loudnorm=I=-16:TP=-1.5 -shortest <name>.mp4`.
9. **QC and hand over.** Go through the checklist on the finished mp4 (watch a contact sheet of one frame per shot, and check the opening frame as a thumbnail), then hand over the mp4, `plan.md` and the title.

For a live preview, serve the project (`python3 -m http.server 8000`) and open `index.html` (click to play with `audio.m4a`), or `index.html?t=14.5` for one frame.
