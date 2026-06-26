# LearnEU — "Editorial GIC" Alternative Theme

> Alternative visual identity for the LearnEU sign-in surface, derived from the
> **General Intelligence Company** editorial style
> (https://styles.refero.design/style/34baa524-5d5b-4165-bbab-d01f05e6d6b9).
>
> It is **opt-in**: toggled at runtime via the dongle (switch) in the top-right
> corner. The default LearnEU theme remains untouched. When the dongle is on,
> `document.body` gets the class `theme-gic` and every alternative rule is
> scoped under it.

## 1. Design intent

An editorial publication about applied AI. A warm off-white canvas holds
near-black serif headlines and compact sans body text, with a **single** vivid
blue used sparingly as accent. Components feel paper-like and light: hairline
borders, soft ring shadows, generous corner radii on cards, and pill-shaped
floating controls rather than heavy filled panels.

- **Register:** literary, almost academic — measured, quiet, reading-first.
- **One chromatic color only:** Hudson Blue `#0081c0` for inline links.
- **Surfaces:** Cream canvas, Paper cards, hairline Sage borders, soft ring shadows.

## 2. Color palette

### Brand
| Token | Hex | Usage |
|-------|-----|-------|
| Hudson Blue | `#0081c0` | The single chromatic accent — inline links only. Never a CTA fill. |
| Slate Cyan  | `#41a1cf` | Outlined action borders, lightweight interactive emphasis. |

### Neutrals
| Token | Hex | Usage |
|-------|-----|-------|
| Ink           | `#171717` | Primary text and dominant border color. |
| Obsidian      | `#1f1f29` | High-contrast neutral fill for primary buttons on light surfaces. |
| Graphite Night | `#282834` | Floating nav island fill and icon strokes. |
| Carbon        | `#2c2c2c` | Secondary heading text and dark UI elements. |
| Iron          | `#444141` | Button borders, icon strokes, mid-dark surface edges. |
| Steel         | `#646464` | Muted helper text and link borders, body captions, metadata. |
| Ash           | `#a5afaf` | Subtle background fills and muted borders on inactive elements. |
| Fog           | `#b4b8b4` | Light hairlines and faint surface fills. |
| Mist          | `#cfd3cf` | Soft fill for inactive or decorative surface layers. |
| Sage          | `#dee2de` | Card and button border ring — the barely-there outline. |
| Linen         | `#f9faf7` | Secondary surface and nav fill — floating panels, alternating bands. |
| Cream         | `#fefffc` | Page canvas — warm off-white. The dominant background. |
| Paper         | `#ffffff` | Card surfaces and elevated panels — the topmost layer. |

## 3. Typography

- **Type scale:** Major Second (1.125) from a 16px base.
- **Display (serif):** `ppmondwest` → fallback `Source Serif 4, Lora, PT Serif`.
  Weights 400/500. Sizes 40/48/54px. Line-height 1.10. Letter-spacing `-0.02em`.
  Ligatures disabled (`font-feature-settings: 'liga' 0`).
- **Body (sans):** `af` → fallback `Inter, Söhne, Geist Sans`.
  Weights 400/500/600/700. Sizes 13/15/16/18px. Line-height 1.20–1.50.
  Letter-spacing `-0.012em` to `-0.010em`.

| Role | Size | Weight | Line height |
|------|------|--------|-------------|
| display     | 54px | 400 | 1.1 |
| heading-lg  | 48px | 500 | 1.1 |
| heading     | 40px | 500 | 1.1 |
| subheading  | 18px | 500 | 1.3 |
| body        | 16px | 400 | 1.5 |
| body-sm     | 15px | 500 | 1.0 |
| caption     | 13px | 500 | 1.4 |

## 4. Spacing & shape

| Property | Value |
|----------|-------|
| Density       | comfortable |
| Base unit     | 4px |
| Max width     | 1200px |
| Section gap   | 48px |
| Card padding  | 16px |
| Element gap   | 8px |

**Border radius**

| Surface | Radius |
|---------|--------|
| Buttons       | 4px |
| Cards         | 12px |
| Elevated cards | 16px |
| Hero cards    | 24px |
| Nav / pills   | 50px |

**Elevation:** soft layered ring shadows rather than heavy drop shadows.
Floating nav uses `rgba(0,0,0,0.15) 0 2px 6px`.

## 5. Do / Don't

**Do**
- Use the display serif at 40–54px with `-0.02em` tracking and 1.10 line-height.
- Use the frosted card pattern (radius 16–24px, hairline border, soft ring shadow).
- Keep pills (≈50px radius) for floating controls like the theme dongle.
- Use Hudson Blue (`#0081c0`) **exclusively** for inline links.
- Use Cream (`#fefffc`) canvas and Paper (`#ffffff`) elevated surfaces.
- Default to hairline Sage (`#dee2de`) borders and soft layered shadows.

**Don't**
- Don't introduce additional chromatic colors — one blue accent only.
- Don't use filled solid-color CTA buttons on the content canvas in brand colors;
  primary actions are dark (Obsidian) or outlined (Slate Cyan).
- Don't use abstract gradient backgrounds, stock photos, or product screenshots.
- Don't apply large radius to content buttons — 4px is intentional.

## 6. Files in this folder

| File | Purpose |
|------|---------|
| `design.md`     | This document — the design language. |
| `tokens.css`    | Raw design tokens as CSS custom properties (`:root`). |
| `tailwind.css`  | Tailwind v4 `@theme` mapping of the same tokens. |

The runtime override used by the sign-in page is inlined in
`../login.html` inside a `<style>` block scoped to `body.theme-gic`, so it
ships with zero extra network requests and leaves the default theme untouched.
