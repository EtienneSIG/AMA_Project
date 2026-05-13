# LearnEU — Feature Execution Plan

This plan turns the briefs in `demo/feature/` into a sequenced, deploy-per-feature
delivery roadmap. Every feature follows the same eight-step cycle (the
"Extensibility checklist" of `feature/conformity.md`):

1. **Schema** — add tables / views to `demo/apps/_shared/db/schema.sql`.
2. **Helpers** — add CRUD helpers to `demo/apps/_shared/db/index.js`.
3. **Routes** — add Express routes (with role gating + Content Safety) to `demo/apps/_shared/server.js`.
4. **UI** — edit each app's `public/index.html` (learner-web / teacher-console / admin / parent-portal).
5. **Sync** — run `demo/apps/_shared/sync.ps1` to mirror shared files into every app folder.
6. **Build** — `powershell -NoProfile -ExecutionPolicy Bypass -File demo/apps/build-zip.ps1 <app>`.
7. **Deploy** — `az webapp deploy ... --type zip --async true` then poll Kudu `/api/deployments/{id}` until `status==4`.
8. **Verify + commit** — authenticated smoke test (`/api/health`, login, `/index.html` regex), then `git commit -m "feat(<area>): ..."` + `git push origin main`.

A failure at any step blocks the next; we never start a new feature with a
red build.

---

## Inventory snapshot (what's already in production)

| Capability                     | Status     | Backed by                                                        |
|--------------------------------|------------|------------------------------------------------------------------|
| Auth (cookie-session, RBAC)    | DONE       | `apps/_shared/auth.js`, `connection_logs`                        |
| Adaptive picker (ONNX + JS)    | DONE       | `learner-web/public/index.html`, `item_attempts`                 |
| AI tutor (Chat -> APIM -> AOAI)| DONE       | `/api/chat`, `ask_history`, Content Safety                       |
| Study sheets                   | DONE       | `sheets`, sheets modal in every app                              |
| Curricula + glossary           | DONE       | `curricula`, `glossary_terms`                                    |
| Teacher Q&A async              | DONE       | `teacher_questions`, learner card + teacher inbox                |
| Skills progression             | DONE       | brief: `feature/skills progression.md` (commit c258f09)          |
| Model-oriented skills catalogue| DONE       | brief: `feature/model oriented skills.md` (commit cd8e5ea)       |
| Quality telemetry (feedback)   | DONE       | brief: `feature/evaluate.md` (commit 3775a12)                    |
| Streaks / badges / Quiz-me     | DONE       | brief: `feature/learner feature.md` §6-8 (commit 409b654)        |
| Learner-web tabbed redesign    | TODO       | brief: `feature/learner feature.md` §"UI redesign"               |
| Teacher overrides + roster     | TODO       | brief: `feature/teacher feature.md` (sections 4-9)               |

---

## Sequencing

The order is chosen so that each feature unlocks the next without rework.

### Feature 1 — Skills progression  (brief: `skills progression.md`)
Foundation for every dashboard, badge and override that follows.
- Schema: `skill_mastery`, `learner_activity`, plus a static seed of `item_skills` (until Feature 2 ships).
- Helpers: `upsertMastery`, `listMasteryForLearner`, `listClassMastery`, `bumpDailyActivity`.
- Routes: `GET /api/learner/mastery`, `GET /api/teacher/class/mastery`, `POST /api/learner/mastery/recompute` (admin).
- UI:
  - learner-web: "My progress" card (top-6 progress bars).
  - teacher-console: "Class mastery" mini heat-map (text grid for the demo).
- Commit: `feat(progression): persist learner mastery and expose dashboards`.

### Feature 2 — Model-oriented skill catalogue  (brief: `model oriented skills.md`)
Replaces the static CSV map with a true `skills` + `skill_competency_map` table set.
- Schema: `skills`, `skill_competency_map`, normalised `item_skills`.
- Seed CSVs under `demo/data/`.
- Routes: `GET /api/data/skills`, `/api/data/skills/:id`, `?competency=...`.
- UI: "Skill catalogue" modal in teacher-console.
- Commit: `feat(skills): introduce model-oriented skill catalogue`.

### Feature 3 — Evaluation & quality telemetry  (brief: `evaluate.md`)
Closes the loop on AI quality with a feedback widget + admin KPIs.
- Schema: `ask_feedback` + 2 SQL views (`v_quality_kpis_24h`, `v_quality_feedback`).
- Helpers: `recordFeedback`, `qualityKpis24h`, `latestFeedback`.
- Routes: `POST /api/chat/feedback`, `GET /api/admin/quality/kpis`, `/feedback`.
- UI:
  - learner-web + teacher-console: 3-button feedback row under Explanation.
  - admin: new "Quality" tab with KPI tiles + table.
- Commit: `feat(quality): add answer feedback widget and admin KPIs`.

### Feature 4 — Learner engagement: streaks, badges, Quiz-me, bookmark answers  (brief: `learner feature.md` sections 6-8) — DONE (commit 409b654)
- Schema: trigger / function on `item_attempts` -> `learner_activity` (or post-insert helper for the demo).
- Routes: `GET /api/learner/activity`, `GET /api/learner/streak`, `POST /api/sheets/:id/quiz`.
- UI in learner-web: streak widget, badges row, "Quiz me" on each sheet, star to bookmark teacher answers as sheets.
- Commit: `feat(engagement): learner streak + badges + revision quiz + teacher-answer bookmark`.

### Feature 4b — Learner web tabbed redesign  (brief: `learner feature.md` §"UI redesign")
Splits the single-page learner experience into 3 dedicated tabs to reduce scroll fatigue and reflect the K-12 task framing.
- Top navigation in the hero: `Test your knowledge` | `Ask your teacher` | `My progress`.
- Tab 1 (default): adaptive item picker (left column) + AI tutor (centre) + a **retractable Explanation drawer** on the right, collapsible with one click. Sheets modal still reachable from the topbar.
- Tab 2: dedicated Q&A page — composer on top, threaded list of past questions/answers below, with the bookmark action inline.
- Tab 3: progress dashboard — streak/badges row, then per-skill mastery **grouped by chapter** (a `chapter` field on the skills catalogue, e.g. "Fractions · basics", "Fractions · operations"), each chapter rendered as a collapsible card with chapter-level progress bar.
- Schema: add `chapter TEXT` to `skills` (nullable, default `'General'`), back-fill via the `skills.csv` seed.
- Helpers: `listMasteryForLearner` returns `chapter`; client groups by chapter.
- No new routes — purely a re-arrangement of existing JS + a small schema additive.
- Commit: `feat(ui): tabbed learner workspace + per-chapter progress`.

### Feature 5 — Teacher oversight: overrides + curriculum browser + class roster  (brief: `teacher feature.md` sections 4-9)
- Schema: `teacher_overrides`.
- Helpers: `recordOverride`, `listOverrides`.
- Routes: `POST /api/teacher/overrides`, `GET /api/teacher/overrides`, `GET /api/teacher/class/roster`.
- UI in teacher-console: pencil icon on heat-map cells, curriculum drawer (drag-to-prompt), "Class" tab with pseudonymous roster.
- Commit: `feat(teacher): overrides curriculum-browser class-roster`.

---

## Standing operational notes

- **Deploy**: always `--async true`; poll Kudu `/api/deployments/{id}` with the bearer from `az account get-access-token --resource https://management.azure.com`. A failed poll is **not** a failed deploy — confirm with `/api/health`.
- **Smoke test**: `WebRequestSession` -> `POST /api/auth/login` (`DemoPass2026!`) -> `GET /index.html?nc=<rand>` -> regex match on the new card title.
- **Postgres password**: KV ref to `kv-learneu-demo-sjoo5sdv` secret `pg-admin-password`; nothing to change per feature.
- **Schema migrations**: every new table goes inside a `CREATE TABLE IF NOT EXISTS` so re-deploy is idempotent. No `DROP`. No `ALTER` without a guard.
- **Content Safety**: every user-supplied text field added by a feature MUST go through `cs.analyze(...)` before storage; a `blocked: true` returns 451 with `{ error, categories }`.
- **Role gating**: every new route MUST first check `req.user.role` against an allow-list and log forbidden hits to `connection_logs`.
- **Privacy**: minors' data stays pseudonymous; no learner real name leaves the database for a teacher view.
