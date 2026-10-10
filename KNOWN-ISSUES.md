# Verification scope and remaining limits

Revision 6 retains the closed body, attached pectoral fans, and accepted motion from revision 5. Fixed intrinsic eyes and a single original dorsal forehead material replace the former face/eye chart dissolve.

## Remaining visual limits

- This is a painted 2.5D procedural approximation rather than a fully anatomical skinned model or generated video.
- Small low-angle muzzle facets and a pale cheek rim near frontal angles remain visible in enlarged crops. The ivory muzzle is simpler than the original illustration.
- Frontal whiskers now follow the mouth corners. Their delicate tips can be less apparent in downscaled views; they remain an illustrated approximation. The original top-view pair retires before the new pair appears.
- Broad butterfly fins, flowing tail folds, and average-depth Canvas sorting remain illustrative approximations. Water/background effects remain deferred.
- Spatial WebGL batching remains an unused experimental module; the tested encounter renderer uses Canvas.

## Verification

66 automated tests, JavaScript syntax checks, and the static build pass. The eye repair preserves the body facets, fin/tail geometry, and protected motion modules. Tests cover finite closed geometry, attached roots, preserved projections/tail, eye-chart metric/tessellation error, and bounded volume raster overlap.

Baseline Mac Chrome checks covered native forward/reverse journeys at 1180×757 and 390×844, the user-reported desktop retreat progress `.911177` (expected 59.138° head pitch), and eight-second frontal idle. Both eyes remained intact in the reviewed forward/reverse retreat captures. Pause froze the swim clock and produced five identical visible-canvas samples; resume and in-app reduced motion passed at 1180×757 and 320×662. Installed browser code and all 31 production files were checked against source/dist/HTTP hashes.

Cloud review additionally covered dense frozen 5° angle sweeps, the exact retreat pose, and independent visual review of actual forward/reverse and idle motion recordings. Recordings captured only the artwork canvas (1165×564 under the 1180×757 page viewport); typography, layout, and controls were documented in separate screenshots. These evidence files and local backups are excluded from this repository.

Responsive checks use logical desktop Chrome viewports rather than physical phones or touch hardware. No universal frame-rate guarantee is made. OS motion-preference switching and a new genuine GPU context-loss test were not established; in-app reduced motion and available Canvas/static fallbacks were checked separately. The OpenAI generation tool did not expose a verifiable model version. Original artwork and exact generation prompts remain in the repository.

The focused whisker restoration adds no new image and preserves the accepted eyes, forehead, anatomy, fin/tail motion, scroll path, and fitting transform. Local tests verify lip-root attachment across 736 poses (maximum numeric error below `1e-12`) and separation from the eye centers. New Mac browser checks at 1180×757 inspect 25 forward/reverse checkpoints through shallow handover, frontal idle, and retreat, plus pause/resume and in-app reduced motion. The earlier mobile checks belong to the preserved baseline. This does not establish anatomical accuracy or physical-device performance.
