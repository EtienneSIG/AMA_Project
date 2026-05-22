---
description: "Task list for spec 008 — Parent Portal (GDPR Art. 8 guardian consent)"
---

# Tasks: Parent Portal — GDPR Art. 8 Guardian Consent

**Input**: Design documents from `/specs/008-parent-portal/`
**Prerequisites**: spec.md ✅, plan.md ✅, checklists/compliance.md ✅
**Branch**: `008-parent-portal`
**Deploy cycle**: `demo/feature/EXECUTION-PLAN.md` (8 steps)

## Format: `[ID] [P?] [Story] Description — @agent`

---

> **Implementation status (2026-05-22)**: the Parent Portal app shell + a
> simple `parental_consents` table + consent-gate middleware are already
> shipped (see `demo/apps/parent-portal/server.js` + `db/schema.sql` line 291).
> The chained-hash `consent_ledger` + capability-flag endpoint + Service Bus
> notification + 5-language localisation called for by US1–US3 below are
> **NEW work** that cannot land in a single PR. This tasks.md is the
> authoritative backlog for that follow-up implementation work.
>
> **Net-new in this commit**: spec/plan/tasks/checklists scaffolding + this
> status note. No production code changed.

## Phase 1: Setup

- [ ] T001 Confirm branch `008-parent-portal` clean; add IN-PROGRESS row to `demo/DEPLOYMENT-REPORT.md`. — **@edtech-program-orchestrator**
- [ ] T002 [P] DPIA delta drafted under §"Parent Portal" in `demo/compliance/dpia-learnEU-v1.md`. — **@gdpr-children-data-specialist**
- [ ] T003 [P] Risk-register row added: `demo/compliance/risk-register.md` → "parent-portal-008". — **@eu-ai-act-compliance-officer**

---

## Phase 2: Foundational — schema + capability flag (BLOCKS all stories)

- [ ] T004 Add `consent_ledger(id, child_id, actor_id, state, scope, created_at, prev_entry_hash)` migration to `demo/scripts/db-sync.ps1`. — **@demo-deployment-agent**
- [ ] T005 Implement chained-hash write contract in `demo/apps/parent-portal/services/consent-ledger.js`; unit-test the chain. — **@gdpr-children-data-specialist**
- [ ] T006 Implement server-side capability flag read by `learner-web` (`GET /parent/consent/effective?child_id=…`) returning `granted` / `withdrawn` / `under13_floor`. — **@privacy-preserving-ml-engineer**
- [ ] T007 Wire `_shared/` auth to accept parent-scoped JWT claims; reject learner credentials at `/parent/*`. — **@edtech-program-orchestrator**
- [ ] T008 [P] Extend `demo/scripts/db-verify.ps1` to assert ledger-chain integrity end-to-end. — **@demo-deployment-agent**

**Checkpoint**: schema + ledger + capability flag green → user stories unblocked.

---

## Phase 3: User Story 1 — Parent sign-in (P1) 🎯 MVP

- [ ] T010 [P] [US1] Implement `routes/auth.js` parent-scoped sign-in via the school IdP invite-token bootstrap. — **@edtech-program-orchestrator**
- [ ] T011 [P] [US1] Build `public/index.html` + `js/dashboard.js` landing on `/parent/dashboard` with linked children listed. — **@edtech-program-orchestrator**
- [ ] T012 [US1] Add `403` denial + Art. 12 log line for any `/learner/*` or `/teacher/*` cross-route attempt by a parent session. — **@eu-ai-act-compliance-officer**
- [ ] T013 [US1] Localise sign-in copy (NL, DE, PL, RO, FR-BE). — **@content-localisation-lead**
- [ ] T014 [US1] Playwright smoke for the three acceptance scenarios. — **@demo-deployment-agent**

**Checkpoint**: parent can sign in to an empty-but-secure dashboard. **STOP and VALIDATE** before US2.

---

## Phase 4: User Story 2 — View child's curriculum unit and consent status (P2)

- [ ] T020 [P] [US2] Implement `routes/children.js` → returns unit title + AI-personalisation status + last 5 ledger entries (metadata only). — **@edtech-program-orchestrator**
- [ ] T021 [P] [US2] Build `js/child-card.js` rendering unit + status badge + ledger micro-timeline. — **@edtech-program-orchestrator**
- [ ] T022 [US2] Confirm FR-007: no learner free-text leaks via the children endpoint (contract test). — **@privacy-preserving-ml-engineer**
- [ ] T023 [US2] Empty-state for "no active unit" with school contact (edge case). — **@edtech-program-orchestrator**
- [ ] T024 [US2] Localise child-card strings (NL, DE, PL, RO, FR-BE). — **@content-localisation-lead**

**Checkpoint**: parent can read child status without any inference path being touched.

---

## Phase 5: User Story 3 — Grant or withdraw consent (P3)

- [ ] T030 [P] [US3] Implement `routes/consent.js` → `POST /parent/consent` with under-13 floor enforcement (FR-012). — **@gdpr-children-data-specialist**
- [ ] T031 [P] [US3] Build `js/consent-toggle.js` + plain-language confirmation modal (CEFR A2). — **@edtech-program-orchestrator**
- [ ] T032 [US3] Append entry to `consent_ledger` via chained-hash writer (T005). — **@gdpr-children-data-specialist**
- [ ] T033 [US3] Emit `parent-consent-change` notification through `services/teacher-notify.js` (Service Bus); retry with back-off; never block the consent change (FR-006). — **@edtech-program-orchestrator**
- [ ] T034 [US3] Ensure `learner-web` reads the capability flag at session-start AND on cache invalidation push, so withdrawal takes effect within the same session (FR-005, SC-003). — **@privacy-preserving-ml-engineer**
- [ ] T035 [US3] Contract test: zero learner PII appears in any AI prompt after a parent toggle (prompt-hash sampling). — **@privacy-preserving-ml-engineer**
- [ ] T036 [US3] Localise consent UX strings (NL, DE, PL, RO, FR-BE). — **@content-localisation-lead**

**Checkpoint**: every consent change is auditable + reflected in the learner runtime + visible to the teacher.

---

## Phase 6: Compliance, polish, deploy

- [ ] T040 [P] Run the compliance checklist (`checklists/compliance.md`); all items green or waived. — **@eu-ai-act-compliance-officer**, **@gdpr-children-data-specialist**
- [ ] T041 [P] Per-cohort impact pass: withdrawal rate by Country/Language surfaced to the fairness dashboard (feature 010 dependency). — **@responsible-ai-evaluator**
- [ ] T042 Run `/speckit.analyze` — must return clean. — **@cross-agent-qa-verifier**
- [ ] T043 Execute the 8-step deploy cycle on the dev slot; capture an authenticated green smoke. — **@demo-deployment-agent**
- [ ] T044 Flip `demo/DEPLOYMENT-REPORT.md` row "008-parent-portal" to PASS and tick the row in `Subject/ama-rubric-remediation-plan.md`. — **@demo-deployment-agent**
- [ ] T045 Final sign-off and merge to main. — **@cross-agent-qa-verifier**

---

## Dependencies & Execution Order

- **Phase 2** blocks all user stories.
- **US1** is the MVP gate; **US2** + **US3** can proceed in parallel after US1.
- Feature **010-per-cohort-fairness-dashboard** consumes the withdrawal-rate
  metric exposed in T041 — coordinate the metric contract before that
  feature lands.

### Parallel opportunities

- T002 ‖ T003 in Phase 1.
- T004…T008 inside Phase 2 (T008 ‖ T004 once schema lands).
- T010 ‖ T011 in US1; T020 ‖ T021 in US2; T030 ‖ T031 in US3.

## Notes

- One agent per task — Principle VII traceability.
- Conventional commits: `feat(parent-portal): …`, `compliance(parent-portal): …`.
- No new third-party SDK, no behavioural-advertising pixel (FR-010).
- Cross-Agent QA Verifier MUST sign off before deploy-row PASS.
