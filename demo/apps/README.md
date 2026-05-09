# Apps

Four App Service web apps make up the demo UX:

| App | Role gate | Purpose |
|---|---|---|
| `learner-web/` | `student` (+ `admin`) | Adaptive lesson UI, mermaid + inline-SVG diagrams, study sheets |
| `parent-portal/` | `parent` (+ `admin`) | Parental consent + rights flows, child progress |
| `teacher-console/` | `teacher` (+ `admin`) | Class planning, formative-assessment ideas, lesson sheets |
| `admin/` | `admin` only | Ops console: live status of the 3 portals, restart, **Users** / **Items** / **Deployments** panels via managed identity (Website Contributor on each sibling site) |

All four share `_shared/` (auth lib + canonical Express server). Run `pwsh apps/_shared/sync.ps1` after editing shared files; the script copies `auth.js` to all four apps and `server.js` to the three user-facing apps only (admin is bespoke).

Front-end notes:
- Mermaid is rendered via `mermaid.render()` per code block with a try/catch fallback that shows the raw source if the model emits invalid syntax (no more "Syntax error in text" bomb).
- Geometric shapes (triangles, angles, circles…) are emitted as inline `<svg>` and constrained by CSS to a 360 px box.
- The system prompt enforces ASCII-only double-quoted mermaid labels (no umlauts / smart-quotes / parentheses) to stay parseable across DE/NL/FR content.

Auth model: HMAC-signed cookie `learneu_session`, 8 h TTL, bcrypt seed users in `_shared/auth.js` (admin / teacher / parent / student @learneu.demo, password `DemoPass2026!`). `auth.getStats()` exposes the in-memory user catalog + sheet counts to the admin console via `/api/health.stats`.
