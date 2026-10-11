# Koi Flow — a living illustration

A dependency-free, image-based Canvas 2.5D koi journey by Mayank Sarasiya, with AI assistance. Original koi artwork generated with OpenAI.

A continuous scene uses oversized kinetic background words, sequential educational annotations, a persistent body-driven heightfield with pixel refraction and a fading wake. Creator links appear inside the same composition; there are no information cards or opaque ending footer.

## Preview and verification

Node 20+, no dependency installation required.

    npm run check
    npm test
    npm run build
    npm run dev -- --port 5185

Open http://127.0.0.1:5185/dist/index.html for the built experience, /qa-suite.html for the native-scroll dashboard, or /qa.html for frozen-time geometry inspection. The server binds to localhost only. The static production build is dist/.

Read [HEIGHTFIELD-REVIEW.md](HEIGHTFIELD-REVIEW.md) for the current water method, verification and limitations. [REWORK-REVIEW.md](REWORK-REVIEW.md) records the earlier immersive story release. This accepted water feature is based on main commit c4d04592680d42902cb4d1eef386e1df369679d8 and is authorized for a separate feature branch.

## Architecture

- index.html and style.css: three native document chapters, kinetic annotations, integrated credits and responsive composition.
- story.js: separate water/wake rendering and reversible text choreography, respecting pause and reduced motion.
- app.js: the preserved shared swim/scroll clock and fixed fish drawing surface.
- motion.js, spine.js, scroll.js, view-beat.js: accepted swimming field, delayed yaw and scroll choreography.
- pose-3d.js, body-geometry.js, fin-geometry.js: projected geometry supporting painted depth turns.
- view-renderer.js, eye-atlas.js, volume-raster.js, mouth-barbels.js: intrinsic eye paint, opaque body skin, attached fins and mouth-local whiskers.
- reference-fit.js: accepted framing transform. The illustration is 2.5D, not a freely viewable 3D model.

The accepted fish geometry is preserved. canvas-renderer.js and view-renderer.js now publish read-only contour samples for the independent water layer; all other protected animation modules remain byte-identical to the accepted archive. BASELINE-VERIFICATION.json describes that earlier baseline. See HEIGHTFIELD-REVIEW.md for current water implementation and 92-test verification; WATER-PREVIEW-REVIEW.md records superseded experiments. Source artwork and generation prompts are retained. No new runtime backend, libraries, fonts, analytics or external services are required.

## Motion controls

Pause holds swimming and breathing; deliberate scrolling continues posing the fish. Reduced motion holds the original still pose, removes depth travel and suppresses the extra editorial effects. The dialog preference is stored for this browser tab session. Play remains an explicit opt-in under reduced motion.

## Sharing metadata

The 1200 × 630 static preview is assets/koi-flow-preview.png. Metadata targets the existing production hostname. Deployment status is reported separately from source verification.

## Credits and references

Created by **Mayank Sarasiya**. Original fish artwork and matching views were generated with OpenAI image generation. Development, research and testing were assisted by **OpenAI Codex** and **dots**.

- Original visual inspiration: https://www.instagram.com/p/DcwZJw2o-jr/ (user-provided reference; no creator identity inferred).
- Water algorithm adaptations: [jquery.ripples by Pim Schreurs](https://github.com/sirxemic/jquery.ripples) and [WebGL Water by Evan Wallace](https://github.com/evanw/webgl-water), MIT licensed. Custom CPU implementation; neither full library is installed.
- Watched water-motion references: [Pexels: Koi fishes](https://www.pexels.com/video/koi-fishes-856951/) and [Pexels: pond full of koi](https://www.pexels.com/video/slow-motion-video-of-a-pond-full-of-koi-fish-4162439/).
- [Full reference and provenance inventory](REFERENCES.md), including primary fish-fact sources, layout research and the playback limitation on the user-provided YouTube reference.
- [Third-party copyright and MIT license notices](THIRD-PARTY-WATER-LICENSES.txt), retained in the production build.

The on-site “Behind the flow” dialog contains a compact “Credits & sources” expander. References are not bundled footage, installed dependencies or endorsements.
