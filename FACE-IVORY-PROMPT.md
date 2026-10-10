# Ivory face texture refinement (v4)

## Generation record

- Tool: built-in `image_gen.imagegen` (one edit call).
- Model/version: not exposed by the tool response; no specific model/version is asserted.
- Transparent background: `true`.
- Edit target / reference image 1: `assets/koi-face-proof-v3.png`.
- Original identity reference / image 2: `assets/koi-original.png`.
- Saved alternate output: `assets/koi-face-proof-v4-ivory.png`.
- Output format: 1302 × 1208 pixels, RGBA, actual transparency.
- This generation did not overwrite v3.

## Exact submitted prompt

Use case: precise-object-edit. Create ONE refined face-only transparent texture for an existing 3D koi, editing image 1. Image 1 is the EDIT TARGET and exact canvas, framing, head silhouette, eye centers/sizes, nostrils and mouth position registration to preserve. Image 2 is ONLY the ORIGINAL FISH IDENTITY reference: study its head at the far right. Keep image 1 front-facing pose, facial geometry, feature placement and full isolated face footprint exactly unchanged. Change ONLY the painted markings to match image 2 more faithfully. In image 2 the forehead has a single prominent connected irregular vermilion-red central patch, with a largely plain warm ivory snout and ivory cheeks around the eyes; there is much less mottling/speckling than image 1. Remove the scattered red freckles and most gold stippling from the snout and front cheeks. Preserve one central organic connected red forehead patch, situated above the ivory snout, and restrained cool blue-gray scale color along outer temples/upper crown. Keep fine soft traditional painted texture and delicate scale detail on the crown, but smooth unscaled ivory skin on the snout. No additional fins, body, barbels, background, labels, or water. Preserve image 1's exact mouth and both golden eyes with dark pupils. Transparent background with real alpha. Same canvas proportions and composition as image 1, no reframing, no zoom, no rotation, no crop.

## Output assessment

The output substantially reduces gold stippling and scattered cheek/snout red markings. It retains a connected central forehead patch and cleaner ivory cheeks/snout. The central red area remains larger and more scaly than the original reference, so this is a closer approximation rather than exact identity reproduction.

Canvas dimensions match v3. Eye and mouth registration appear closely preserved visually, but exact pixel registration was not established. Nonzero-alpha bounding boxes changed from v3 `(0, 0, 1254, 1184)` to v4 `(33, 39, 1255, 1158)`. These boxes include any faint edge pixels and do not by themselves measure feature displacement.
