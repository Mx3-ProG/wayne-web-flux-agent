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

## Storefront themes

- `editorial`: bright, spacious and image-led.
- `studio`: dark, high-contrast and cinematic.
- `local`: warm, friendly and practical.
- `bold`: graphic, energetic and conversion-led.

Themes control composition and surface treatment. Merchant colors, photography
and typography remain personal overrides.
