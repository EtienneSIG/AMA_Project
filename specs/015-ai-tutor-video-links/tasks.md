# Tasks: AI Tutor — Illustrative External Video Links

**Input**: Design documents from `/specs/015-ai-tutor-video-links/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/tutor-video-api.md, quickstart.md

**Organization**: Grouped by user story: shared catalogue/log foundation, then vetted suggestions (MVP), privacy-preserving embed, and teacher curation/override.

**Tests**: PowerShell verification + quickstart; no TDD suite requested.

> **Coordination**: Shares the AI-tutor surface with **Feature 016** — use ONE `TutorTurn` model. **Reuse** `_shared/contentSafety.js` + `logContentSafety()`; do NOT duplicate. EXTEND `learner-web`/`teacher-console` server.js + public/* additively.

---

## Phase 1: Setup
- [X] T001 EdTech Program Orchestrator: append the tutor-video increment scope + touched files to demo/apps/learner-web/README.md + teacher-console/README.md (Accountable: agents/edtech-program-orchestrator.chatmode.md) — **EXISTING: append.**
- [x] T002 [P] EU AI Act Compliance Officer: author the Annex IV fragment (allow-list bounding, logging, transparency, teacher override, link-health) in specs/015-ai-tutor-video-links/contracts/annex-iv-fragment.md (Accountable: agents/eu-ai-act-compliance-officer.chatmode.md)
- [x] T003 [P] Content Localisation Lead + Learning Sciences Expert: define initial curriculum-aligned, age-appropriate catalogue seed per market in demo/data/ (Accountable: agents/content-localisation-lead.chatmode.md, agents/learning-sciences-expert.chatmode.md)

## Phase 2: Foundational
- [X] T004 GDPR Children's Data Specialist: add `video_catalogue`, `video_suggestion_log`, `video_report` tables to demo/apps/_shared/db/schema.sql (Accountable: agents/gdpr-children-data-specialist.chatmode.md)
- [X] T005 [P] Privacy-Preserving ML Engineer: implement allow-list lookup, suggestion/click logging, and report helpers in demo/apps/_shared/db/index.js (Accountable: agents/privacy-preserving-ml-engineer.chatmode.md)
- [x] T006 Privacy-Preserving ML Engineer: define/confirm the shared `TutorTurn` model (coordinated with Feature 016) in demo/apps/_shared/db (Accountable: agents/privacy-preserving-ml-engineer.chatmode.md)

**Checkpoint**: catalogue/log schema + helpers + shared tutor turn ready.

---

## Phase 3: User Story 1 — Tutor Suggests a Vetted Explainer Video (Priority: P1) 🎯 MVP
**Goal**: Tutor answers include up to 3 allow-listed, labelled video suggestions; no match → text-only.
**Independent Test**: ask about a catalogued concept → 1–3 labelled suggestions from the allow-list; uncatalogued concept → text only.
- [X] T007 [US1] Privacy-Preserving ML Engineer: extend the tutor answer path to attach ≤3 **allow-list-validated** video suggestions (strip any model-emitted URL) + log `suggested` in demo/apps/learner-web/server.js (Accountable: agents/privacy-preserving-ml-engineer.chatmode.md)
- [X] T008 [P] [US1] Demo Deployment Agent: render suggestions (title/source/duration + "external site" badge) in demo/apps/learner-web/public/ (Accountable: agents/demo-deployment-agent.chatmode.md)
- [X] T009 [P] [US1] Cross-Agent QA Verifier: verify allow-list-only + text-only fallback in demo/scripts/ (Accountable: agents/cross-agent-qa-verifier.chatmode.md)

**Checkpoint**: vetted suggestions live.

---

## Phase 4: User Story 2 — Privacy-Preserving Embedding & No Tracking (Priority: P1)
**Goal**: Embeds send no learner PII; no autoplay; tracking blocked; under-16 restricted mode.
**Independent Test**: open a video → no identifiers/cookies to third party; under-16 without consent → no video.
- [X] T010 [US2] Privacy-Preserving ML Engineer: implement privacy-enhanced sandboxed embed (no-cookie host, no autoplay, CSP) + click logging endpoint in demo/apps/learner-web (server.js + public) (Accountable: agents/privacy-preserving-ml-engineer.chatmode.md)
- [X] T011 [US2] GDPR Children's Data Specialist: gate under-16 presentation on parental consent + restricted mode (reuse Feature 006 consent state) in demo/apps/learner-web/server.js (Accountable: agents/gdpr-children-data-specialist.chatmode.md)
- [x] T012 [P] [US2] Responsible AI Evaluator: verify no-PII/no-tracking + under-16 gating against contracts/tutor-video-api.md (Accountable: agents/responsible-ai-evaluator.chatmode.md)

**Checkpoint**: privacy-preserving presentation verified.

---

## Phase 5: User Story 3 — Teacher Curation & Override (Priority: P1)
**Goal**: Teachers curate the catalogue, disable suggestions per learner/class, and review reports.
**Independent Test**: add/remove a video → only catalogued videos suggested; disable for a class → none shown.
- [X] T013 [US3] EdTech Program Orchestrator: catalogue CRUD + per-learner/class disable routes + curation UI in demo/apps/teacher-console (server.js + public) (Accountable: agents/edtech-program-orchestrator.chatmode.md)
- [X] T014 [P] [US3] Privacy-Preserving ML Engineer: report→suppress workflow + periodic link-health check (hide dead/changed links) in demo/apps/_shared/db/index.js + teacher-console (Accountable: agents/privacy-preserving-ml-engineer.chatmode.md)
- [X] T015 [P] [US3] Cross-Agent QA Verifier: verify curation, disable, report-suppress, link-health in demo/scripts/ (Accountable: agents/cross-agent-qa-verifier.chatmode.md)

**Checkpoint**: teacher control complete.

---

## Phase 6: Polish & Cross-Cutting
- [x] T016 [P] EU AI Act Compliance Officer: finalize Annex IV with as-built evidence (Art. 9/10/12/13/14/15) (Accountable: agents/eu-ai-act-compliance-officer.chatmode.md)
- [x] T017 [P] Cross-Agent QA Verifier: run full specs/015-ai-tutor-video-links/quickstart.md validation (Accountable: agents/cross-agent-qa-verifier.chatmode.md)
- [X] T018 EdTech Program Orchestrator: update specs/INDEX.md (015 → planned+tasked) (Accountable: agents/edtech-program-orchestrator.chatmode.md)

---

## Dependencies & Execution Order
- Phase 1 → 2 → 3 (US1 MVP) → 4 (US2) → 5 (US3) → 6.
- T006 (shared TutorTurn) coordinates with Feature 016; T007 depends on T004/T005/T006.
- **Pair with 016** (shared tutor model).

## Parallel Execution Examples
- T002/T003 in setup; T008 ∥ T009 in US1; T014 ∥ T015 in US3.

## Implementation Strategy
- **MVP = User Story 1** (Phases 1–3): vetted video suggestions with text-only fallback.
- Then US2 (privacy embed) and US3 (curation).

## Summary
- **Total tasks**: 18 (T001–T018). **Per story**: US1 = 3 · US2 = 3 · US3 = 3. Setup/Foundational = 6, Polish = 3.
- **Parallel**: ~9 `[P]`. **MVP**: User Story 1.
- **Independent test criteria**: US1 — allow-list-only suggestions + text fallback; US2 — no PII/tracking + under-16 gating; US3 — teacher curation/disable/report.
