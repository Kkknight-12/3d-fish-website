# Koi Flow — credits, references and provenance

## Creator and assistance
Created by **Mayank Sarasiya**. Original koi artwork, matching views and face artwork were generated with **OpenAI image generation**. Generation prompts are retained in ARTWORK-PROMPT.md, VIEW-PROMPTS.md and the source's related prompt documents. **OpenAI Codex** and **dots** assisted development, research, iteration and testing. No third-party photograph or reference video is embedded as the koi artwork.

## Visual inspiration and observation
- Original visual inspiration supplied by the creator: https://www.instagram.com/p/DcwZJw2o-jr/ . Attribution is to this exact post; its author has not been independently identified here.
- Watched water reference: https://www.pexels.com/video/koi-fishes-856951/ . Near-body elongated disturbance and a localized head/surface event informed the water design.
- Watched water reference: https://www.pexels.com/video/slow-motion-video-of-a-pond-full-of-koi-fish-4162439/ . Irregular overlapping near-body water warping informed the design.
- Additional user-provided water reference: https://www.youtube.com/shorts/4TFn4W6Q8rI . Playback did not succeed in the review environment; no observations from that video are claimed.
- Layout research recorded during the story rework: https://lenis.dev/ (typographic hierarchy and sequential annotations) and https://www.apple.com/airpods-pro/ (isolated subject and closer-look storytelling). Some Apple media did not play; only visible layout/transitions informed the work. Lenis is not installed.

Reference links acknowledge inspiration and observation, not permission to redistribute the linked media. No reference footage is bundled.

## Adapted water algorithms and licenses
- **jquery.ripples**, Pim Schreurs: https://github.com/sirxemic/jquery.ripples . Source studied: https://github.com/sirxemic/jquery.ripples/blob/master/src/main.js . License: https://github.com/sirxemic/jquery.ripples/blob/master/LICENSE . Copyright (c) 2017 Pim Schreurs, MIT.
- **WebGL Water**, Evan Wallace: https://github.com/evanw/webgl-water . Source studied: https://github.com/evanw/webgl-water/blob/master/water.js . File header: Copyright 2011 Evan Wallace, released under the MIT license.

The custom CPU solver in heightfield-water.js adapts persistent height/velocity wave evolution, surface-gradient optical resampling and old-footprint/new-footprint displacement concepts. It uses typed arrays and Canvas/SVG integration with the existing fish renderer. Neither full project, jQuery nor a new rendering framework is installed. The fish renderer remains the project's Canvas/WebGL code using browser-native APIs. Full copyright and permission notices are in [THIRD-PARTY-WATER-LICENSES.txt](THIRD-PARTY-WATER-LICENSES.txt), shipped with the static build.

## Educational facts — primary sources
- Smithsonian National Zoo, Japanese koi: https://nationalzoo.si.edu/animals/japanese-koi — ornamental carp, origin and diet.
- San Diego Zoo, koi: https://animals.sandiegozoo.org/animals/koi — lifespan and care context.
- NOAA, fish facts: https://www.fisheries.noaa.gov/national/outreach-and-education/fun-facts-about-fascinating-fish — body/tail propulsion and fin roles.
- SRAC / University of Florida IFAS koi and goldfish handout: https://shellfish.ifas.ufl.edu/wp-content/uploads/Handout-2_SRAC_koi-and-goldfish.pdf — spawning, external fertilization and adhesive eggs.
- Tempero et al. (2006): https://rsnz.onlinelibrary.wiley.com/doi/10.1080/00288330.2006.9517446 — study-specific developing-egg estimates for sampled feral female koi, not a universal number per spawn or surviving offspring.

The illustrated anatomy, motion, heightfield and eggs-to-fry diagrams are stylized, not biological or fluid-dynamics simulations.

## Implementation audit
package.json has no runtime dependencies. No remotely hosted fonts, analytics or media are required. Artwork files and prompts are local; reference sites are ordinary outbound links. Browser-native Canvas 2D, WebGL fallback infrastructure, SVG filters and DOM controls provide rendering and interaction. Latest water verification: 92 automated tests plus cloud-browser visual checks; see HEIGHTFIELD-REVIEW.md for reproducible steps and limitations.
