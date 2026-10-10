# Koi Flow — a living illustration

A dependency-free, image-based Canvas 2.5D koi journey by Mayank Sarasiya, with AI assistance. Original koi artwork generated with OpenAI.

A continuous scene uses oversized kinetic background words, sequential educational annotations, visible water-light contours and a fish-reactive wake. Creator links appear inside the same composition; there are no information cards or opaque ending footer.

## Preview and verification

Node 20+, no dependency installation required.

    npm run check
    npm test
    npm run build
    npm run dev -- --port 5185

Open http://127.0.0.1:5185/dist/index.html for the built experience, /qa-suite.html for the native-scroll dashboard, or /qa.html for frozen-time geometry inspection. The server binds to localhost only. The static production build is dist/.

Read [REWORK-REVIEW.md](REWORK-REVIEW.md) for sources, verification scope and limitations. This is the accepted immersive content update. Further water refinement remains deferred.

## Architecture

- index.html and style.css: three native document chapters, kinetic annotations, integrated credits and responsive composition.
- story.js: separate water/wake rendering and reversible text choreography, respecting pause and reduced motion.
- app.js: the preserved shared swim/scroll clock and fixed fish drawing surface.
- motion.js, spine.js, scroll.js, view-beat.js: accepted swimming field, delayed yaw and scroll choreography.
- pose-3d.js, body-geometry.js, fin-geometry.js: projected geometry supporting painted depth turns.
- view-renderer.js, eye-atlas.js, volume-raster.js, mouth-barbels.js: intrinsic eye paint, opaque body skin, attached fins and mouth-local whiskers.
- reference-fit.js: accepted framing transform. The illustration is 2.5D, not a freely viewable 3D model.

All 15 protected animation modules match approved commit 2314c775b89422d858d6aa4fd51c81d16bcedeff. See BASELINE-VERIFICATION.json. Source artwork and generation prompts are retained. No new runtime backend, libraries, fonts, analytics or external services are required.

## Motion controls

Pause holds swimming and breathing; deliberate scrolling continues posing the fish. Reduced motion holds the original still pose, removes depth travel and suppresses the extra editorial effects. The dialog preference is stored for this browser tab session. Play remains an explicit opt-in under reduced motion.

## Sharing metadata

The 1200 × 630 static preview is assets/koi-flow-preview.png. Metadata targets the existing production hostname. Deployment status is tracked separately from local build validation.
