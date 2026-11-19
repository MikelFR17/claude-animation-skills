# Visual grammar of the reference shorts

What the most-viewed shorts of this genre do, studied frame by frame from 14 of them (10–35 M views): mine salting, the road-filming drivers, roller coasters, the pink cell, railroads, storm oil, the samurai, the instinct that makes you crash, and others. Most were studied from stills (first frame, thumbnail, 25 / 50 / 75 %); two were measured frame by frame from full uploads (see "Edit and transitions"). Use this as the checklist when planning shots.

## Camera
| Rule | What it looks like | In the engine |
|---|---|---|
| **Wide lens, close to the subject** | Vertical FOV about 60–75°. The character is near the lens and looms, and the set recedes fast behind them. Almost never a long lens. | `shoot(c, 'hero')` (62°), `'worm'` (74°) |
| **Low camera** | Knee height or lower, tilted up, with sky behind the head. Even dialogue shots sit below eye level. | `hero` height 0.55, `worm` 0.12 |
| **Ground level along a line** | Lens just over the rails, road, deck or corridor, looking along it to a vanishing point, with the character standing on the line. | `'ground'` |
| **Dutch tilt** | 10–20° roll on tense or comic beats (the conductor at the platform edge, the chef, the ship under sail). | `'dutch'`, or `roll` on any recipe |
| **Big foreground object** | The pot pouring oil, the cash pile, the barrel, the steering wheel: something huge in the bottom or side third, framing the action. | Put a prop 0.3–0.8 m from the lens |
| **Inside vehicles and rooms** | Very wide shots from the passenger seat or a corner, with the walls and ceiling in frame. | `'insert'`/`'hero'` with `fov` 70+ inside a `room` |
| **Inserts through glass** | A face behind a windshield or window, as a comic beat. | A plane with a transparent material between the camera and the face |
| **Spectacle wide for the payoff** | The cart flying off the track, a mushroom cloud, a giant wave lit by shafts of light: the reveal is a big wide shot. | `'wide'` + effects (`beam`, particles, `flash`) |
| **The thumbnail frame** | The protagonist big and centred, looking at the camera, with the key object in front (the gold, the money, the cannonball). | `t = 0` of shot 1 |

## Composition
- Faces sit in the upper half (about 25–45 % of the height). The caption goes in the band below, at about 55–62 %.
- Three depth layers in every shot: a foreground prop, the characters, then a detailed background (trees, buildings, ships, crowds).
- Leading lines (rails, planks, coaster tracks, roads) point at the subject.
- Two characters: one big in front, one smaller behind (the boss and the sidekick).

## Light and colour
- **High key and saturated:** deep blue skies with stylised white clouds, or a golden or sunset gradient. Never grey.
- **One clear key light** (the sun) plus a strong rim. Shadows are soft but present, with contact shadows under feet and props.
- **Glows that carry information:** a hot rail, headlights, lanterns, a spotlight cone from a mine lamp. Bloom on those only.
- **Mood changes by block:** bright day for the setup, a warm or golden turn, dark and blue for the threat, then a spectacle lit by shafts of light.
- Characters stay fully readable in every light.

## Sets
- Every place is specific and busy: a mine with timber props, lanterns, tubs and gravel; a highway with a guard rail, trucks and grass verges; a station with a glass roof, banners and money bags.
- Ground detail does a lot: gravel, individual rocks, grass that moves, plank seams, scattered props. In the engine: `pebbles()`, `grass()`, `crate`, `barrel`, `sack`, `ropeCoil`.
- Props get outlines too (the pot, the ship rails, the barrels), so the set and the cast read as one style. Use `tmesh(..., { w })` for hero props.
- Big set pieces (trees, vehicles, buildings, coasters) are real models in the references. Primitives can't match them; see "Next step" below.

## Edit and transitions (measured on two full videos)
Measured frame by frame on two full uploads: "Why Drivers Started Filming the Road" (62.3 s) and "Why the Second Draw Always Wins" (56.1 s).

| Measure | Video 1 | Video 2 | Rule |
|---|---|---|---|
| Length | 62.3 s | 56.1 s | **55–62 s**: longer than the usual 30 s Short |
| Hard cuts | 8 | **1** | Hard cuts are rare |
| Places / setups | ~16 | ~12 | A new setup every **3.5–5 s** |
| Camera | always moving | always moving | Every setup has a slow push, dolly, orbit or follow; never a locked-off frame |
| Captions | 1–2 words, change every ~0.3 s | same | One word at a time, like the engine's `mode: 'word'` |
| Audio | -14 LUFS, range 2.2 LU, no silence > 0.25 s | -14 LUFS, range 1.7 LU, no silence | Narration never stops; the mix is flat and loud |

**How they change place (in order of frequency):**
1. **Short crossfade, 0.2–0.3 s**, often while the camera is moving (money pile → highway, day highway → dusk highway, night → office). Engine: `TRANSITIONS` type `dissolve`.
2. **Continuous camera:** the camera keeps moving and the next beat happens in the same shot: a bullet-cam that follows the bullet and then lands on the shooter, a dolly along a line of cars as new cars arrive.
3. **Wipe by a foreground object:** a windshield wiper sweeps the frame and the new place is behind it; the camera passes through glass. Engine: move a prop across the lens, with a `dissolve` under it.
4. **Match cut through a shape:** zoom into a pupil and come out through a round window. Engine: type `zoom`, with the outgoing shot aimed at a round shape and the next shot opening on a similar one.
5. **Particles that fill the frame:** money exploding over the camera, then a dissolve behind it. Engine: `burst({ kind: 'bills' })` + `dissolve`.
6. **Same set relit:** the telegraph office goes from day to night blue in the same camera move, which marks time passing without a cut.
7. **Hard cut:** for impacts, punchlines and the dashcam glitch (with an RGB split).
Whip pans were not seen. Use `dissolve` by default and keep whips for rare comic beats.

**Other effects they use:**
- **Depth of field:** backgrounds are soft behind medium shots. Engine: return `{ dof: { focus, blur } }`.
- **Very wide lenses with barrel distortion** inside cars and rooms. Engine: return `{ lens: 0.2–0.4 }`.
- **Diegetic overlays:** a dashcam frame (REC, timestamp, MPH, wide lens, a little desaturated). Engine: return `{ dashcam: { speed, stamp } }`.
- **Energy and speed effects:** a glowing fire aura and speed streaks around a character at the climax; slow motion on bullets.
- **Comic beats:** a face pressed to a windshield, an object flying past the lens, a character face-down in the dirt.

## Next step for matching the detail
The remaining gap is the set pieces: trees, vehicles, buildings, terrain. The engine now loads real CC0 models (glTF/GLB) and HDRI skies through `kit/assets.py`: Poly Haven for realistic props, trees, ships, rocks and skies, and Kenney for stylised cars, cities, nature, pirates and trains. Quaternius packs come through itch.io or Google Drive, which this network doesn't reach; Poly Pizza blocks automated downloads. Still to come: denser set dressing per location, and optionally AI-generated background plates with depth parallax for single-angle establishing shots.
