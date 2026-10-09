# Known issues and verification scope

This checkpoint preserves an original illustrated koi with flowing fins, a delayed spine and a turn toward the viewer. It is an unfinished procedural approximation, not a seamless animated anatomical model.

## Current visual defects

- Face paint stretches during oblique and frontal poses. Some transition states can read as a doubled face or a stretched head patch. The painted head and neck do not maintain one seamless identity across the turn.
- Thin extra fin fragments and disconnected fin shapes remain visible at some angles. A gap can appear where the right pectoral fin meets the body.
- Average-depth sorting of painted triangles approximates fin occlusion. It does not provide complete anatomical geometry or exact transparency ordering.
- The overhead and frontal artwork were generated separately. Their markings and fin shapes differ; deforming them cannot produce exact views of one fish.

The current tail motion and overall turn are the preserved baseline. Repairing face and fin defects should avoid changing that accepted choreography. Water effects remain deferred.

## How it is animated

The overhead artwork is deformed by a six-bone spine and the preserved ten-second fin/tail field. The encounter adds delayed pitch, projected painted body and fins, and a cropped frontal painting on a curved head surface. Local lip deformation gives an approximate 3.6-second breathing cycle. Canvas is the default; an optional WebGL route deforms the overhead artwork. This is not generated video.

## Verification limits

The current implementation passed 32 automated tests, JavaScript syntax checks and the static build. Browser verification covered pause, reduced-motion controls, desktop and mobile-sized layouts, bounded framing and forward/reverse scrolling. Later visual review confirmed the face and fin defects listed above; passing mathematical and control tests does not mean the visuals are finished.

Mobile layout was checked in desktop Chrome viewports. Hardware touch and native operating-system preference switching were not exercised. Frame pacing and artwork draw cadence vary by device; no universal frame-rate claim is made. The precise animation method of the inspirational reel is unknown.

The OpenAI generation tool did not expose a verifiable model version. Original PNGs, compressed browser WebPs and exact generation prompts are retained in this repository.
