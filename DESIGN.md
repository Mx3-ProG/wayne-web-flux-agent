# Wayne Glass

Wayne Glass is the shared visual system for Wayne Web Flux. It borrows the
clarity, depth and tactile feedback of native Apple interfaces without copying
their chrome.

## Principles

1. **Calm first.** Content sits on a near-black canvas. Only floating controls
   use glass; content panels use quiet opaque surfaces.
2. **One obvious action.** Every screen has one primary red action. Secondary
   actions stay neutral.
3. **Touch is the baseline.** Interactive targets are at least 44px and never
   depend on hover.
4. **Depth communicates structure.** Borders, blur and shadows indicate layers,
   not decoration.
5. **Editorial outside, utilitarian inside.** Fraunces is reserved for marketing
   and emotional headings. The product interface uses Inter.

## Tokens

- Canvas: `#070708`
- Elevated canvas: `#0d0d10`
- Primary text: `#f7f5f2`
- Secondary text: `#a8a4aa`
- Wayne red: `#ef233c`
- Wayne red highlight: `#ff6378`
- Success: `#56d39b`
- Hairline: `rgba(255,255,255,.10)`
- Glass: `rgba(24,24,29,.72)` with 22px blur and 160% saturation
- Radii: 12px controls, 18px cards, 24px major surfaces, 999px pills
- Spacing: 4, 8, 12, 16, 24, 32, 48, 64px
- Motion: 180ms interactions, 320ms panels, ease-out

## Responsive rules

- Mobile-first reference width: 390px.
- Mobile navigation is a safe-area-aware floating bottom tab bar.
- Desktop navigation is a compact fixed rail from 980px.
- Content width is fluid, capped at 1240px.
- Grids collapse at 760px; editor preview becomes an explicit tab below 1024px.
- Glass blur is reduced when reduced transparency or reduced motion is requested.

## Storefront engine V2

`resolveStorefrontPresentation()` is the only authority for storefront visuals.
The editor preview, draft, published page and FLUX generation all consume its
semantic tokens and curated recipes. Storefront components must never read a
merchant color to build an independent palette.

### Merchant appearance contract

`PageAppearance` contains only `accent`, `mode` (`light` or `dark`) and
`allowVisitorModeToggle`. Historical `colors.primary` remains readable during
the transition, but is converted to `accent`. The resolver derives background,
surface, elevated surface, text, muted text, border, accent text, navigation,
hero and footer tokens. It adjusts unsafe accents to 3:1 against the canvas and
chooses accent text at 4.5:1 or better. The editor exposes every correction.

Section backgrounds may still be colors, gradients, images or videos. Their
text treatment is resolved at the section boundary: light surfaces receive dark
text, dark surfaces receive light text, mixed gradients receive a protective
veil and media overlays have a safe minimum.

### Kits and composition profiles

| Kit | Profile | Composition intent |
| --- | --- | --- |
| `editorial` | magazine | asymmetric editorial rhythm and dominant imagery |
| `studio` | cinematic | centered cinematic composition and immersive media |
| `local` | local | warm storytelling, contact and reassurance first |
| `bold` | impact | massive type, geometry and direct conversion |
| `luxe` | quiet-luxury | generous space and restrained hierarchy |
| `minimal` | minimal | strict grid and minimal decoration |
| `neon` | neon | controlled nocturnal depth and light |
| `prestige` | showroom | slow showroom rhythm and editorial details |
| `performance-gt` | performance | technical asymmetry and large media |
| `rosso-editorial` | heritage | institutional heritage and magazine mosaic |
| `maison-couture` | collection | full-width collections, commerce grid and services |

Each versioned kit declares supported modes, compatible component identifiers,
section recipes, media rules, density, radii, rhythm and motion. Overrides are
accepted only when listed by that kit. Unknown saved legacy combinations are
normalized to the kit default; unknown writes are rejected.

### Alignment invariant

Section alignment is a composition contract, not only `text-align`. A centered
section centers its constrained container, headings, body copy, actions, forms
and the appropriate grid variant. Image/text, about, catalogue and gallery keep
their content-specific geometry. Templates may change composition without
changing section order, visibility or merchant content.

### Rendering invariants

- Every surface emits `data-design-version`, `data-layout-profile`,
  `data-section-type` and `data-section-recipe` where applicable.
- Preview and publication use the same React components and resolver; preview
  only disables external or paid interactions.
- FLUX selects known kit, component, voice, accent and mode identifiers. It
  cannot emit CSS or independent background, text, dark or card colors.
- Focus remains visible, controls are at least 44px, reduced motion is honored
  and text contrast is at least 4.5:1 (3:1 for large text and graphics).
