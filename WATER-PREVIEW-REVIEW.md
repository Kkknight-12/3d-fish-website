# Body-connected water preview

Local review candidate based on accepted release c4d04592680d42902cb4d1eef386e1df369679d8. No commit, push, deployment or Mac copy.

## Changes
- Removed decorative complete oval rings.
- Sampled the accepted deformed trunk/head contour for short open surface ridges.
- Wake packets retain their birth positions, spread slightly and fade over 2.8 seconds. Alternating outline fragments and phase/current/turn response avoid rigid orbiting.
- Background reflection lines bend locally around those packets. This is stylized surface-light displacement, not a physical fluid solver or true scene refraction.
- Deep pitch suppresses surface emissions. Pause freezes the water clock, reduced motion clears wake history, resize resets it.
- Fish renderers only publish read-only contour observations. No fish vertices, paints, eye/fin/barbel geometry, camera/turn logic, or text choreography changed.

## Verification
- 77 tests passed, syntax checks and static build passed.
- Actual cloud Chromium: desktop 1440×900 and mobile logical 390×844 full forward/reverse checkpoints completed without settling failures; fish stayed coherent in observed overhead, turn and front views.
- Pause and reduced-motion canvas samples stabilized across five samples. Existing QA reports an inconclusive aggregate because the dormant encounter canvas is empty; active fish and water hashes themselves remained identical.
- Video uses actual browser screenshots at their measured capture times. Capture cadence is about 10fps and may appear less smooth than the app.

## Limits
- Mobile is responsive viewport testing, not physical mobile hardware.
- Real pond physics are not simulated. This is intentionally quiet; most body glide does not create a strong surface wake.
- The cloud CPU-rendered depth view is slower than the overhead view; no claim of 60fps on all hardware.

## Visibility correction (second preview)
The first preview had a real defect: wakePoints omitted nx/ny, while the background reflection displacement read ny. Nonfinite line coordinates made the background disappear once wakes were emitted. The sampler now returns its normals, and regression tests assert finite samples and >2px reflection displacement after emission. All 79 tests pass.

Separately, contrast was too low and ridges were hidden under the fish. The revised preview has stronger broad reflection bands and an independent transparent surface canvas for body-local crests. No opaque layer or fish-geometry changes were introduced. A frozen same-pose on/off comparison showed a clear visible change (26.3% of the displayed viewport pixels changed by >8 RGB levels). This is a visibility check, not a claim of physical realism.
