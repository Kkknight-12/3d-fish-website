# Koi Flow — motion study 001

An original OpenAI-generated butterfly koi swims over a red editorial page with three native-scrolling chapters. Its head leads, body curves, and tail follows. Near the end it pitches toward the viewer and breathes. This is a procedural illustrated approximation of the reference's flowing fish effect. Water remains deferred.

## Local preview

Run the commands below from the project folder. Choose a free local port; the example uses **http://127.0.0.1:5180/**.

Node 20+, no dependencies or install step:

```sh
npm run check
npm test
npm run build
npm run dev -- --port 5180
```

The server binds only to 127.0.0.1 and refuses an occupied port. The build is a collection of static files in `dist/`.

## Artwork and prompts

The built-in OpenAI image tool made the original overhead painting and matching frontal and three-quarter paintings without an API key. Its exact model version is not exposed. Generated PNGs and browser WebPs remain in `assets/`. The current renderer loads only `koi.webp` and `koi-face-proof-v4-ivory.png`; the quarter painting is preserved but unused.

[ARTWORK-PROMPT.md](ARTWORK-PROMPT.md) preserves the original generation prompt; [VIEW-PROMPTS.md](VIEW-PROMPTS.md) preserves both matching-view prompts. [FRONT-VOLUME-PROMPT.md](FRONT-VOLUME-PROMPT.md), [FACE-PROOF-PROMPT.md](FACE-PROOF-PROMPT.md), and [FACE-IVORY-PROMPT.md](FACE-IVORY-PROMPT.md) record the later frontal texture work. The earlier PNGs remain as generation references; the original PNG, runtime WebP, wave baseline `motion.js`, and original prompt remain unchanged.

Visual inspiration came from [Marina Budarina's reel](https://www.instagram.com/reel/DcwZJw2o-jr/): illustrated koi, flowing video and bold red typography. Its actual animation implementation is unknown.

## Actual animation

`motion.js` holds the preserved 10-second fin/tail field. `spine.js` applies it to six delayed yaw bones with bounded head velocity and constant-length spine segments. The original overhead view uses adaptive Canvas texture triangles by default; `?renderer=webgl` requests a 72×36 GPU mesh. Context loss switches to animated Canvas on the same clock.

`pose-3d.js` adds six delayed pitch bones. A single continuous closed body/head surface follows interpolated bones and preserves the original dorsal paint. A face-only texture supplies the otherwise unseen anterior anatomy. Source-UV-isolated pectorals remain attached through a continuous masked collar. There is no independently overlaid head.

`view-renderer.js` draws the original painted fin/tail sheet and a 1,540-triangle closed body/head volume on Canvas. It culls back faces and sorts visible triangles by average depth. `reference-fit.js` keeps the accepted fitting transform and path while anatomy changes; it never paints its reference geometry. The target is 30 artwork drawings per second on the shared RAF clock. Both routes cap DPR at 1.5 and use a 1.1-million-pixel budget; device performance varies.

The mouth uses localized lip deformation over a 3.6-second breathing cycle. A fixed intrinsic eye/skin atlas anchors both eyes to the same cheek surface and retains the original forehead marking throughout the turn. The generated lower face approximates unseen anatomy. Small muzzle facets, a pale cheek rim, average-depth fin sorting, and missing frontal whiskers remain limitations; see [KNOWN-ISSUES.md](KNOWN-ISSUES.md).

## Native scroll and controls

Three chapters occupy actual document space, around 0.84–0.86 viewport heights each. Typography, numbers, circles and separators travel with the document; the fish, header and controls overlay the viewport. No wheel/touch interception or extra animation timer is used.

Native scroll follows a 0.14-second response. Fish choreography traverses sharp jumps with bounded progress velocity; the page itself keeps scrolling freely. Pitch starts around progress .54, reaches the front near .78, retreats after .86 and reaches zero near .99. Reversing scroll reverses these targets. Pause freezes swimming and breathing while deliberate scroll continues posing the fish.

Reduced motion starts with the original still pose, removes spatial travel and suppresses the encounter. The dialog can override the OS preference for this tab session. Play is an explicit swimming opt-in with the reduced layout. Keyboard controls, skip link, image description and native dialog are included. There is no audio, tracking, external font or CDN.

For teaching: start with HTML/CSS chapters, then modify one `spine.js` wave/bone parameter, one `scroll.js` path point, or one `pose-3d.js` pitch response. `motion.js` is the baseline oracle; WebGL duplicates its field in the shader. Pause intermediate positions and compare forward/reverse scrolling.

## Verification and limits

See [KNOWN-ISSUES.md](KNOWN-ISSUES.md) for current visual limitations and verification scope. Local screenshots and experimental evidence are excluded from version control.

- `?qa=spine` projects the same spatial bones and fitting transform without paint.
- `?renderer=webgl&qa=lose-context` loses only this app's context to exercise fallback.
- `?profile=1` records rolling 180-RAF windows after warmup; RAF cadence and CPU submission are separate from artwork draw cadence and GPU completion.
- `#encounter` exposes pitch, pose progress, mouth opening and fitted bounds. Its old values can remain after the Canvas is cleared; `waveSeconds` is the active spatial-wave clock; `#fish` describes the overhead route and may remain unchanged while that route is hidden.

Revision 6 passes 61 automated tests, JavaScript syntax checks, and the static build. Mac browser checks exercised native forward/reverse scrolling at 1180×757 and 390×844, the reported retreat progress `.911177`, and eight-second frontal idle animation. Pause/resume and in-app reduced motion passed at 1180×757 and 320×662. All 30 built production files matched their source and localhost HTTP bytes. Cloud review additionally covered frozen 5° angle sweeps and canvas-only motion recordings. Physical mobile hardware, native OS preference switching, and a new genuine GPU context-loss test were not exercised.

## Source guide

| Files | Role |
| --- | --- |
| `index.html`, `style.css`, `app.js` | Editorial chapters, responsive layout, controls, and the shared animation clock. |
| `motion.js`, `spine.js`, `scroll.js`, `view-beat.js` | Preserved swimming field, yaw bones, native-scroll path, and encounter timing. |
| `pose-3d.js`, `body-geometry.js`, `fin-geometry.js` | Delayed pitch bones, continuous closed skin, and smooth rooted pectoral fans. |
| `eye-atlas.js`, `volume-raster.js`, `view-renderer.js` | Fixed eye charts baked into opaque skin, volume texture padding/edge overlap, and Canvas painting. |
| `head-geometry.js`, `reference-fit.js` | Face registration/proof geometry and the preserved framing reference. |
| `spatial-painter.js` | Retained experimental GPU batching; it is not selectable by the app. |
| `qa.html`, `qa-pose.html`, `qa-suite.html`, `qa-suite.js` | Fixed-angle, exact-viewport, and real-page native-scroll QA harnesses. Excluded from the production build. |
| `scripts/*.test.mjs`, `scripts/build.mjs`, `scripts/serve.mjs` | Geometry/control regression checks, static packaging, and the loopback preview server. |

The QA harnesses are source tools. Their downloaded recordings, screenshots, JSON observations, local backups, generated `dist/`, dependencies, credentials, and private notes stay outside version control.

## Latest repair: revision 6 (2026-10-10)

The closed body/head and smooth attached pectorals from revision 5 preserve the accepted movement, path, scale, and original tail. Unsupported secondary planar fin fragments and top-view barbels are trimmed during the depth turn.

Revision 6 repairs the squeezed/erased eyes at retreat progress `.911177` (about 59.138° head pitch in the reported desktop viewport). Each eye has one fixed intrinsic chart on the existing cheek surface. Eyes and original dorsal paint are baked into one opaque skin atlas so neighboring expanded triangles cannot erase the pupils. The original red forehead marking stays fixed; the former displaced face/eye chart dissolve is removed.

Volume-only edge-normal raster overlap and replicated texture padding cover snout triangle seams while retaining the original fin/tail rasterization. Eye subdivision is reduced from eight to four steps after projection-error checks, lowering volume triangles from 3,268 to 1,540. No new artwork was generated for revision 6.
