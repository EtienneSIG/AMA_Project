# Learner Web

The learner surface now ships as two experiences:

- the existing desktop web app in `public/index.html`
- the mobile-first PWA shell in `public/mobile.html`

Both surfaces share the same learner APIs, consent gating, and auth/session flow. The mobile entrypoint registers `public/sw.js`, consumes `public/manifest.webmanifest`, and keeps the web app available through the header and login screen.

## Age-adaptive theming (spec 014)

The learner app applies a **presentation-only** theme matched to the learner's age band, on top of the
existing whole-app 8-variable palette (so no per-screen markup changes are needed):

| Age band | Body class | Look |
|---|---|---|
| under 8 | `theme-age-kids` | hand-drawn / crayon |
| 8–13 (inclusive) | `theme-age-brick` | construction-brick (inspired-by; no trademarks) |
| 14+ | `theme-age-game` | game-HUD |
| unknown | _(none)_ | neutral default |

- **Files**: `public/themes/age-themes.css` (themes + `theme-reduced-motion`/`theme-contrast-high` variants) and
  `public/age-theme.js` (resolver). Included via `<script src="/age-theme.js" defer>` in `index.html`/`mobile.html`;
  both are served pre-auth (see `auth.js` PUBLIC paths).
- **Age source** (deterministic, never inferred): `GET /api/auth/me` → `user.age`. Override precedence:
  device override (`localStorage`) → `?ageband=`/`?age=` URL affordance → server `themeOverride` → age.
- **Override (teacher/parent/learner)**: persisted via `PATCH /api/auth/me` `{ themeOverride: 'kids'|'brick'|'game'|'auto' }`;
  client hooks `window.LearnEUAgeTheme.setOverride(band)` (device) and `.saveOverride(band)` (server, CSRF-protected).
- **Accessibility**: honours `prefers-reduced-motion` / `prefers-contrast` and explicit prefs.
- **Add a theme**: add a `body.theme-age-<name>` block in `age-themes.css` remapping the 8 variables, and map it in
  `BAND_TO_CLASS` / `ageToBand` in `age-theme.js` — no screen edits.
- **Verify**: `demo/scripts/verify-age-theming.ps1` (resolver logic; add `-BaseUrl <url>` to check the statics are served).
