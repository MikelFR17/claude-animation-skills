# Visual grammar of the reference shorts

What the most-viewed shorts of this genre do, studied frame by frame from 14 of them (10–35 M views): mine salting, the road-filming drivers, roller coasters, the pink cell, railroads, storm oil, the samurai, the instinct that makes you crash, and others. Only stills were available (first frame, thumbnail, 25 / 50 / 75 %), so cut timing and transitions are inferred, not measured. Use this as the checklist when planning shots.

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

## Edit and transitions (inferred)
- A hard cut on almost every sentence, often on single words for comic beats.
- Fast camera moves hide some cuts: whip pans and quick push-ins. In the engine: `TRANSITIONS` (`whip-left/right/up/down`, `punch`, `flash`, `blur`).
- One spectacle moment per short, usually at the reveal.

## Next step for matching the detail
The remaining gap is the set pieces: trees, vehicles, buildings, terrain. The plan is to load real CC0 models (glTF) and HDRI skies. This needs the session's network to allow the model libraries (Poly Haven, Kenney, Quaternius, Poly Pizza), or packs the user supplies. Optionally, AI-generated background plates with depth parallax for single-angle establishing shots.
