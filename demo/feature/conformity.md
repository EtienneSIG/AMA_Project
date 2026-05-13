# Prompt F: Extensibility & K-12 Conformity

## Goal
Ensure the LearnEU model is extensible, modular, and K-12-compliant — so adding a new grade, subject or country is configuration, not code.

## Requirements (aligned with the current Postgres-backed implementation)

### 1. Modular schema, no hard-coded grades or subjects
- Curriculum competencies live in the `curricula` table (`id`, `country`, `framework`, `grade`, `subject`, `version`, `title`, `description`).
- New grade or subject = drop a JSON file in `demo/data/curricula/` and call `POST /api/data/reseed` (admin) — no schema migration required.
- Adaptive items reuse the same `item_attempts` table; `item_id` is opaque, so a new topic only requires new IDs (e.g. `GEOM-01`).

### 2. Localisation of competencies via external configuration
- Country-specific frameworks (Bildungsstandards DE, Kerndoelen NL, …) are loaded from `demo/data/curricula/<country>-*.json` and selectable via `GET /api/data/curricula?country=DE&subject=MATH`.
- Glossary terms are stored per language in `glossary_terms` (`source`, `target`, `context`, `language`) and refreshed from CSV under `demo/data/glossaries/`.
- Adding a new locale = new JSON + new CSV; no app redeploy is required other than re-seeding.

### 3. K-12 child-safety guarantees in the design
- Role inference (`ROLE_INFER` in `apps/_shared/server.js`) gates every request to the matching App Service; students can never reach teacher routes (HTTP 403).
- Age-aware system prompt: `buildSystemPrompt(u)` injects `, age ` for the `student` role and reminds the model to adapt vocabulary and never request personal information.
- Every prompt and every model answer is scanned by Azure AI Content Safety; verdicts are persisted in `content_safety_results` with the four severity dimensions (Hate, SelfHarm, Sexual, Violence) for auditability.
- Pseudonymous learner personas live in `learners`; no real PII for minors is stored.
- All connection events (login/logout/forbidden) are written to `connection_logs` (GDPR Art. 30 record of processing).
- Teacher Q&A (`teacher_questions`) keeps a permanent, human-readable trail of who replied to which learner — supports EU AI Act Art. 14 human-oversight obligations.

### 4. Extensibility checklist (must hold for any new feature)
- [ ] New persistent entity → new `CREATE TABLE IF NOT EXISTS` block in `apps/_shared/db/schema.sql`; the table is auto-created on next app start.
- [ ] New API route → declared in `apps/_shared/server.js` only, then propagated to all role apps with `apps/_shared/sync.ps1`.
- [ ] New UI section → added per-app in `apps/<role>/public/index.html`; respects the navy/teal/orange palette and `--line` borders.
- [ ] Any user-generated text → routed through `contentSafety.js` (`cs.analyze`) before being stored or returned.
- [ ] Any role-restricted operation → guarded by an explicit `if (!['teacher','admin'].includes(u.role))` check, in addition to the role-based App Service gating.
