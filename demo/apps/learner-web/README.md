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

## Learner sheet & item sharing (spec 013)

In-class, teacher-supervised peer sharing. A learner can share an exercise item or a
practice sheet with same-class classmates as a **read-only** snapshot. Recipients are
always resolved **server-side** from the class roster (`learner_hierarchy_assignment`) —
the client never supplies a raw recipient. Optional notes are scanned by Azure Content
Safety; flagged notes are **held for teacher moderation**. Under-16 sharing is gated on
active parental consent (both sender and recipient). Senders can revoke; recipients can
block a sender.

- UI: `public/sharing.html` (send + received + block).
- API (in `_shared/server.js`): `/api/share/recipients`, `/api/share`,
  `/api/share/:id/revoke`, `/api/share/received`, `/api/share/block`.
- Schema: `share`, `shared_artifact_snapshot`, `sharing_policy`, `recipient_block`.
- Verify: `pwsh demo/scripts/verify-sharing.ps1`.

## AI tutor illustrative video links (spec 015)

Tutor answers may include up to 3 **teacher-curated, allow-listed** explainer videos.
The model never supplies a URL — only catalogued, active entries are shown, as
privacy-enhanced (`youtube-nocookie.com`) embeds that send no learner data. Under-16
learners only see suggestions with active parental consent, and teachers can disable
suggestions per learner/class.

- UI: suggestions render under the explanation (`public/index.html`,
  `renderVideoSuggestions`); each click opens externally + is logged.
- API (in `_shared/server.js`): `/api/chat` attaches `videos[]` + `tutorTurnId`;
  `/api/tutor/video/:id/click`, `/api/tutor/video/:id/report`.
- Schema: `video_catalogue`, `video_suggestion_log`, `video_report`, `video_policy`.
- Verify: `pwsh demo/scripts/verify-tutor-videos.ps1`.
