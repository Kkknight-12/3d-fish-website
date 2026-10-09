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

The built-in OpenAI image tool made the original overhead painting and matching frontal and three-quarter paintings without an API key. Its exact model version is not exposed. Generated PNGs and browser WebPs remain in `assets/`. The current renderer loads only `koi.webp` and `koi-front.webp`; the quarter painting is preserved but unused.

[ARTWORK-PROMPT.md](ARTWORK-PROMPT.md) preserves the original generation prompt; [VIEW-PROMPTS.md](VIEW-PROMPTS.md) preserves both matching-view prompts. The original PNG, runtime WebP, wave baseline `motion.js` and original prompt remain unchanged.

Visual inspiration came from [Marina Budarina's reel](https://www.instagram.com/reel/DcwZJw2o-jr/): illustrated koi, flowing video and bold red typography. Its actual animation implementation is unknown.

## Actual animation

`motion.js` holds the preserved 10-second fin/tail field. `spine.js` applies it to six delayed yaw bones with bounded head velocity and constant-length spine segments. The original overhead view uses adaptive Canvas texture triangles by default; `?renderer=webgl` requests a 72×36 GPU mesh. Context loss switches to animated Canvas on the same clock.

`pose-3d.js` adds six delayed pitch bones. The head reaches 90 degrees while the tail remains curved behind it. Local lateral and dorsal coordinates project the painted body and curling fins around this spatial spine. A single curved head uses a cropped frontal painting on a hemispherical surface. During the encounter the body mesh excludes the complete original head and gill paint (`u ≥ .825`, `.36 ≤ v ≤ .70`), while retaining the surrounding fin pixels. The curved head overlaps the neck by .025 artwork-width units to close the oblique alpha/surface gap. Front-side pectoral-fin patches belong to the same rig. No whole-fish opacity dissolve is used.

`view-renderer.js` sorts up to 952 alpha-aware texture triangles by average depth and draws them on Canvas. It fits projected painted bounds, including fins, into the viewport without stretching their proportions. Head surfaces use back-face culling. Its target is 30 artwork drawings per second on the shared RAF clock; this is not a claim of universal device performance. Both routes cap DPR at 1.5 and use a 1.1-million-pixel budget.

The mouth uses a localized monotone vertical deformation of painted lips over a 3.6-second breath. It does not simulate physical jaws or gills. Generated paint still has a visible neck/material boundary and stretches on the shallow head surface. The early original head is more detailed than this approximated camera turn; a seamless shared painted identity is not achieved. The body is a depth surface, not a complete anatomical model; average-depth sorting can approximate fin occlusion. Original and curved-head renderers hand off at the encounter boundaries, so paint identity there is approximate.

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

The current code passed 32 automated tests, syntax checks and the static build. Browser checks exercised desktop and mobile-sized viewports, pause, reduced motion and forward/reverse scrolling. Later visual review still identified stretched or duplicated face paint and thin or disconnected fin fragments during the turn. Automated checks do not establish visual acceptance. Hardware touch and native OS preference switching were not exercised.
