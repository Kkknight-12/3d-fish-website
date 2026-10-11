# Koi heightfield water preview

Accepted water feature, 2026-10-11, based on main commit c4d04592680d42902cb4d1eef386e1df369679d8. Supersedes WATER-PREVIEW-REVIEW.md's rejected decorative wake versions. The user authorized committing and pushing this version to a separate feature branch.

## Design and implementation
Persistent aspect-correct 224-long-edge CPU height/velocity grid; fixed 1/60s integration with at most six catch-up steps, edge absorption and damping. Actual deformed fish contours distribute old-minus-new pressure. Tail dipoles align with travel. Height gradients bilinearly resample immutable stationary red reflected-environment pixels at a bounded 560-long-edge output resolution. Soft slope lighting makes the displacement readable. A small SVG displacement of the fish layer is head-masked; no optical output feeds back into fish geometry. Text remains above the optical layer.

Final requested tuning changes wave coefficient .23 to .18, approximately 12% slower outward propagation, without slowing fish or clocks. Lighting gain 560 to 620 and soft cap 26 to 29 make it modestly clearer. Prior accepted appearance retained separately before tuning.

## Reproduce testing
1. Node 20+: npm run check; npm test; npm run build. Current result: 92 tests pass.
2. Serve project root: python3 -m http.server 5188 --bind 127.0.0.1. Open /dist/index.html for the actual experience; /qa-suite.html for QA.
3. Run Desktop 1440 x 900 and Mobile 390 x 844, Full forward + reverse at 1800 px/s. Inspect all thirteen checkpoints, especially turns, renderer handoffs and end/reverse. Numeric settling does not replace viewing the animation.
4. Pause + verify pixels, then Hide/Show water for comparison. This freezes identical fish pose/time and switches only optical layers. Compare actual normal-size browser images, not enlarged diagnostics. Resume and observe propagation after the body passes.
5. Reduce motion ON should produce zero wave energy, no optical filter and a still fish; OFF restores motion. Resize should rebuild buffers cleanly.
6. Watch rapid reversals for blanket energy bursts. Reset forcing history on renderer switches/teleports while allowing existing waves to decay. Cap forcing by elapsed time.

## Automated regressions
scripts/heightfield.test.mjs tests propagation beyond source, decay, finite arrays, moving/stationary pressure, bounded catch-up, pause, actual displaced pixel output with lighting disabled, immutable source, resize/reset and wave decay without a fish. scripts/water-motion.test.mjs retains regressions from earlier rejected versions: finite x/y/nx/ny/edge and actual nonzero distortion. Missing sampler normals had produced NaNs despite generic tests passing. Do not accept a test that only measures a synthetic curve amplitude as proof of refraction.

## Actual browser findings and limits
Full desktop/mobile journeys were viewed. No new doubled face/fins or squeezing observed. Reduced motion gave energy 0. Pause held active water/fish pixels; aggregate QA reports INCONCLUSIVE because a dormant encounter canvas is empty, so it must not be described as a complete aggregate pass. Stage and fish layer bounds matched exactly in the browser. Measured normal-map PNG/href work was about 2-3ms; a sampled total water render was 16.5ms. These are samples, not a performance guarantee. Mobile logical-viewport app intervals around 50ms (~20fps) are separate from screenshot-capture rate. Not tested on physical mobile hardware. CPU optical simulation is stylized, not scientific fluid dynamics; forcing is sampled per render despite fixed simulation steps. No cross-origin source readback is needed: pressure mask and reflected source are generated locally.

Research references and MIT notices: THIRD-PARTY-WATER-LICENSES.txt. User YouTube reference could not play, so it was not claimed as watched.

## Steady-fish calming revision
The latest requested change separates actual body translation from idle deformation. Both renderers publish their pre-deformation layout center as waterTranslation. WaterTravel normalizes its speed by viewport span, ignores drift below .008 span/s, and eases propagation from coefficient .07 at rest to .18 during travel. Rise time .35s, settling time 1.2s; wave buffers are not reset by this transition. Fish clocks, optical gain and text are unchanged. Zero elapsed time holds the coupling. Source switches seed translation history, and teleports do not create a false speed burst.

Focused tests cover steady → traveling → reverse → steady, tiny idle drift, teleport rejection, cadence equivalence, pause, and a measured wave radius showing slower physical grid propagation with the calm coefficient. This tests the actual solver rather than only the control value. The runtime exposes data-wave-coefficient and data-travel-speed on #water for read-only observation. Compare the live same-pose idle view before and after, then use native scrolling to verify acceleration and smooth settling. The pre-change accepted source is preserved separately for comparison.
