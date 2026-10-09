# Matching koi views

Generated on 2026-10-09 with the built-in OpenAI image generation tool, with transparent backgrounds. No API key or paid video service was used. The tool does not expose a verifiable model version. Original RGBA PNGs are preserved; WebP copies are compressed browser textures.

## Frontal view — assets/koi-front.png

Identity reference: assets/koi-original.png.

```text
Use case: illustration-story
Asset type: a transparent frontal view of the SAME butterfly koi for an illustrated multi-view web animation.
Input image 1: identity and painting-style reference. This fish is the same individual; preserve its ivory and icy blue scales, warm gold flecks, irregular vermilion forehead patch, dark amber eyes, delicate barbels, and flowing ivory fins with blue shadow and fine ink rays.
Primary request: Draw this koi swimming directly TOWARD THE VIEWER, head-on from eye level, as if it has turned to look through the screen. The broad rounded face, both eyes and circular koi mouth are clearly visible in proper foreshortened anatomy. Its mouth is slightly OPEN as a small natural oval with dark interior, delicate cream lips, no teeth. Keep it serene and recognizable, not human or cartoon.
Composition/framing: square canvas. Entire single fish and all fins fit with clear transparent margins. Nose/mouth centered near x=50%, y=58%; head/eyes near y=45–53%. Body and tall flowing tail recede behind the head toward the upper middle; long pectoral fins spread gracefully left/right like translucent silk wings. Do not draw a vertically rotated top view. This is a genuine front camera angle with front-facing nose, visible chin, eyes to either side, foreshortened body, trailing tail behind. Approximate subject bounds x=12–88%, y=12–88%.
Style/medium: match the input's sophisticated hand-painted gouache, delicate blue-grey ink contours and natural-history detail exactly. Fins ivory with pale blue shadows, fine translucent edges; no plastic/CG gloss. The vermilion forehead pattern stays irregular, with smaller red marks near cheeks. Warm gold scale flecks.
Scene/backdrop: genuinely transparent alpha, isolated subject; no water, cast shadow or scenery.
Constraints: one complete fish only, same identity and palette, no lettering, logo, watermark, bubbles, background or extra fish.
```

## Three-quarter view — assets/koi-quarter.png

References: assets/koi-original.png and assets/koi-front.png.

```text
Use case: illustration-story
Asset type: transparent three-quarter transition view of the same butterfly koi, matching two supplied painted views.
Input image 1 is the original overhead identity reference. Input image 2 is the frontal view to match closely in head size, facial markings, palette, silk fins and illustration detail.
Primary request: draw ONE intermediate camera view: the fish has rotated from its overhead pose toward the viewer, now about 40 degrees away from directly front-facing, with its nose turned slightly to the viewer's LEFT. We see a genuine foreshortened three-quarter face and receding body, not a rotated flat top view. The nearer eye and rounded ivory cheek are clear, both eyes remain visible, and the small natural koi mouth is just slightly open. Tail and long fins recede upward and to the RIGHT behind it.
Composition: square transparent canvas. Full fish fits with margins. Match image 2 registration: nose near x=50%, y=72%, face around x=50%, y=60%, pectoral fins fan left and right below the midline, long trailing tail flows above. Keep face sized like image 2 so this can transition into it without a large jump.
Identity invariants: same irregular vermilion forehead blotch, ivory scales with icy-blue bands and small gold flecks, dark amber eyes, two delicate barbels, ivory fins with pale blue shadows and fine blue-grey ink contours. Match the hand-painted gouache/natural-history style and light level; no plastic, CG gloss or cartoon.
Constraints: genuine transparent alpha, one fish only, complete fins and tail, no text, watermark, water, shadow, scene, extra fish or background.
```

The additional views interpret the same irregular red forehead marking, blue/ivory scales, gold flecks, amber eyes and silk fins. Generated views are not geometrically exact views of one 3D surface; pattern placement and fin outlines vary. The current renderer maps a crop of the frontal painting onto a curved head surface and uses separate pectoral-fin patches. The three-quarter painting is preserved but unused. The exact generation prompts above are unchanged. This is a procedural painted-depth approximation; face stretch and fin seams remain visible at some angles. See [KNOWN-ISSUES.md](KNOWN-ISSUES.md).

