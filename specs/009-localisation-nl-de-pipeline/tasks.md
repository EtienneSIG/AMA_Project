---
description: "Task list for spec 009 — Localisation NL→DE pipeline (E2E)"
---

# Tasks: Localisation NL→DE Pipeline (E2E)

**Input**: Design documents from `/specs/009-localisation-nl-de-pipeline/`
**Prerequisites**: spec.md ✅, plan.md ✅, checklists/compliance.md ✅
**Branch**: `009-localisation-nl-de-pipeline`
**Deploy cycle**: `demo/feature/EXECUTION-PLAN.md` (8 steps)

## Format: `[ID] [P?] [Story] Description — @agent`

---

> **Implementation status (2026-05-22)**: a minimal proof-of-concept Python
> script lives at `demo/pipelines/localisation/localise.py` (single-file
> NL→DE call via AOAI + DefaultAzureCredential). The full PowerShell
> orchestration with `localisation_jobs` / `translation_artifacts` /
> `reviewer_decisions` DB tables, reviewer console, and per-segment glossary
> linting called for by US1–US3 below is **NEW work** that has not yet
> shipped. DEPLOYMENT-REPORT criterion #3 is PARTIAL today for this reason.
>
> **Net-new in this commit**: spec/plan/tasks/checklists scaffolding + this
> status note. No production code changed.

## Phase 1: Setup

- [ ] T001 Confirm branch `009-localisation-nl-de-pipeline` clean; add IN-PROGRESS row in `demo/DEPLOYMENT-REPORT.md` localisation section. — **@edtech-program-orchestrator**
- [ ] T002 [P] Append one-line "no PII processed" confirmation to `demo/compliance/dpia-learnEU-v1.md`. — **@gdpr-children-data-specialist**
- [ ] T003 [P] Create / curate the glossary artefact `demo/data/glossaries/learnEU-nl-de.json` with provenance header (Art. 10). — **@content-localisation-lead**

---

## Phase 2: Foundational — schema + pipeline skeleton (BLOCKS user stories)

- [ ] T004 Add migrations for `localisation_jobs`, `translation_artifacts`, `reviewer_decisions` in `demo/scripts/db-sync.ps1`. — **@demo-deployment-agent**
- [ ] T005 Scaffold `demo/pipelines/localisation/localise.ps1` orchestration entry point with `ingest`, `translate`, `publish` step dispatch. — **@demo-deployment-agent**
- [ ] T006 [P] Implement `lib/provenance.ps1` writer + reader (used by `publish.ps1` and post-publish linter). — **@demo-deployment-agent**
- [ ] T007 [P] Implement `lib/glossary.ps1` loader and term-fidelity linter. — **@content-localisation-lead**

**Checkpoint**: schema + skeleton + glossary in place → user stories unblocked.

---

## Phase 3: User Story 1 — Ingest a NL source unit (P1) 🎯 MVP

- [ ] T010 [P] [US1] Implement `steps/ingest.ps1`: compute source hash, copy file into `runs/<job_id>/source.md`, insert job row. — **@demo-deployment-agent**
- [ ] T011 [US1] Glossary-protected term detection in source (flag for strict pass-through). — **@content-localisation-lead**
- [ ] T012 [US1] Integration test seed: `demo/data/math_unit_fractions.md` produces a `queued` job. — **@demo-deployment-agent**

**Checkpoint**: ingest works end-to-end; job visible in DB and on disk.

---

## Phase 4: User Story 2 — AOAI translation with the LearnEU glossary (P2)

- [ ] T020 [P] [US2] Implement `steps/translate.ps1`: APIM → AOAI EU-North call with glossary as system prompt, store response, log prompt hash and model version. — **@privacy-preserving-ml-engineer**
- [ ] T021 [US2] Wire Content Safety scan on the response; on `reject` → status `safety_rejected`, no reviewer routing. — **@privacy-preserving-ml-engineer**
- [ ] T022 [US2] Contract test `tests/contract/localisation-no-pii.test.ts`: zero PII in the AOAI payload. — **@privacy-preserving-ml-engineer**
- [ ] T023 [US2] Translation-quality benchmark: ≥ 95 % glossary-term fidelity on the held-out 50-segment sample. — **@responsible-ai-evaluator**
- [ ] T024 [US2] Retry on transient APIM failure; permanent failure → status `failed` + Localisation Lead notification. — **@demo-deployment-agent**

**Checkpoint**: translated artefact + safety verdict + quality benchmark green.

---

## Phase 5: User Story 3 — Reviewer queue and accept / reject (P3)

- [ ] T030 [P] [US3] Implement `demo/apps/teacher-console/routes/localisation-queue.js`: list `translated` jobs, fetch side-by-side content. — **@edtech-program-orchestrator**
- [ ] T031 [P] [US3] Build `public/localisation-queue.html` + `js/localisation-review.js`: side-by-side diff with glossary-term highlight. — **@edtech-program-orchestrator**
- [ ] T032 [US3] Implement `services/localisation-decisions.js`: append `reviewer_decisions` row, enforce separation of duties (requester ≠ reviewer, FR-010). — **@gdpr-children-data-specialist**
- [ ] T033 [US3] On accept → `steps/publish.ps1` writes `demo/apps/learner-web/data/curricula/de-bildungsstandards-math-y7.json` with full `provenance` block (FR-008). — **@demo-deployment-agent**
- [ ] T034 [US3] Idempotent accept (a second accept on the same job is a no-op, FR-011). — **@demo-deployment-agent**
- [ ] T035 [US3] Post-publish glossary-term linter; fail loud on violation (Art. 15). — **@responsible-ai-evaluator**

**Checkpoint**: full E2E run produces a published DE JSON + RUN report.

---

## Phase 6: Compliance, polish, deploy

- [ ] T040 [P] Capture one demo run in `demo/pipelines/localisation/runs/RUN-<date>.md` (FR-009). — **@demo-deployment-agent**
- [ ] T041 [P] Update `restitution/slides/slide-14-market-localisation.md` to reference the RUN report. — **@demo-deployment-agent**
- [ ] T042 Run compliance checklist (`checklists/compliance.md`); all items green. — **@eu-ai-act-compliance-officer**, **@content-localisation-lead**
- [ ] T043 Run `/speckit.analyze` — must return clean. — **@cross-agent-qa-verifier**
- [ ] T044 Flip `demo/DEPLOYMENT-REPORT.md` localisation row PARTIAL → PASS; tick row in `Subject/ama-rubric-remediation-plan.md`. — **@demo-deployment-agent**
- [ ] T045 Final sign-off and merge to main. — **@cross-agent-qa-verifier**

---

## Dependencies & Execution Order

- Phase 2 blocks all user stories.
- US1 → US2 → US3 are sequential by data (you can't translate without
  ingest, you can't review without translation). Inside each, [P] tasks
  parallelise.
- Phase 6 depends on US3 having published one demo run.

### Parallel opportunities

- T002 ‖ T003 in Phase 1.
- T006 ‖ T007 in Phase 2.
- T010 alone in US1.
- T020 ‖ (T030 + T031 of US3 scaffolding) once translate.ps1 stub exists.

## Notes

- One agent per task — Principle VII traceability.
- Conventional commits: `feat(localisation): …`, `compliance(localisation): …`.
- The reviewer UI is the human-oversight gate. No autonomous publish.
- The contract test `localisation-no-pii.test.ts` is the GDPR firewall.
