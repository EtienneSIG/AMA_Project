# Apps

Five App Service web apps make up the demo UX:

| App | Role gate | Purpose |
|---|---|---|
| `learner-web/` | `student` (+ `admin`) | Adaptive lesson UI, mermaid + inline-SVG diagrams, study sheets, plus a mobile-first PWA shell in `public/mobile.html` |
| `parent-portal/` | `parent` (+ `admin`) | Parental consent (GDPR Art. 8) + rights flows, child progress |
| `teacher-console/` | `teacher` (+ `admin`) | Class planning, formative-assessment ideas, lesson sheets |
| `admin/` | `admin` only | Ops console: live status of the 3 portals, restart, **Users** / **Items** / **Deployments** panels via managed identity (Website Contributor on each sibling site) |
| `director-portal/` | `director` | Aggregated school/region reporting surface with fail-closed report metadata contract |

All five apps share `_shared/` (auth lib + canonical Express server). Run `pwsh apps/_shared/sync.ps1` after editing shared files; the script copies `auth.js` to all apps, `server.js` to the user-facing shared-server apps, `db/` and `public/consent-pending.html` to all app folders.

## Documentation coherence

This file is the cross-app index. Per-app READMEs are the source of truth for role behavior and endpoint details:

- `learner-web/README.md` (desktop + mobile PWA surface)
- `parent-portal/README.md` (parent visibility + consent workflows)
- `teacher-console/README.md` (class insights + oversight workflows)
- `director-portal/README.md` (director reporting and fail-closed metadata contract)

Architecture note: learner mobile is intentionally deployed as a PWA surface inside `learner-web` (same Azure Web App), not as a separate Azure resource.

## Learner Mobile PWA

The learner app keeps the existing web experience and adds an installable mobile shell:

- `public/mobile.html` provides the thumb-friendly student UI.
- `public/manifest.webmanifest` exposes the install metadata.
- `public/sw.js` caches the shell so the app can reopen quickly.
- `public/mobile-icon.svg` is the shared app icon for the PWA assets.

Login preserves the `returnTo` path so students can sign in from the mobile entrypoint and land back on it after authentication.

## GDPR Art. 8 — Parental Consent for Under-16 Learners

Learners under 16 require parental consent before accessing the platform. This is enforced at two levels:

1. **Server-side gate** (`server.js`): When `APP_ROLE === 'student'`, a middleware checks authenticated learners' age from `SEED_USERS`. If under 16 and no active consent exists in the `parental_consents` DB table, the learner is redirected to `/consent-pending.html` (or gets a 403 JSON for API calls).

2. **Parent Portal UI** (`parent-portal/public/index.html`): Parents see a consent banner when any linked child lacks consent. A modal presents GDPR Art. 8 disclosures (data processed, purpose, AI involvement, EU hosting, right to withdraw). Consent can be granted or withdrawn at any time.

### Consent data model
- Table: `parental_consents` (parent_email, child_email, consent_type, granted, granted_at, withdrawn_at, ip, user_agent)
- Active consent: `granted = true AND withdrawn_at IS NULL`
- Consent type: `gdpr_art8` (extensible to `data_processing`, `ai_interaction`)
- Demo seed: most parent-child pairs get auto-granted consent; 2 pairs are left pending to demo the banner

### API endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/parent/consents` | parent/admin | List all consents for logged-in parent |
| POST | `/api/parent/consents` | parent/admin | Grant or withdraw consent (body: `{childEmail, consentType, granted}`) |
| GET | `/api/parent/children` | parent/admin | Now includes `age`, `requiresConsent`, `consent` status per child |

Front-end notes:
- Mermaid is rendered via `mermaid.render()` per code block with a try/catch fallback that shows the raw source if the model emits invalid syntax (no more "Syntax error in text" bomb).
- Geometric shapes (triangles, angles, circles…) are emitted as inline `<svg>` and constrained by CSS to a 360 px box.
- The system prompt enforces ASCII-only double-quoted mermaid labels (no umlauts / smart-quotes / parentheses) to stay parseable across DE/NL/FR content.

Auth model: HMAC-signed cookie `learneu_session`, 8 h TTL, bcrypt seed users in `_shared/auth.js` (admin / teacher / parent / student @learneu.demo, password `DemoPass2026!`). `auth.getStats()` exposes the in-memory user catalog + sheet counts to the admin console via `/api/health.stats`.
