# Tasks: Learner Sheet & Item Sharing

**Input**: Design documents from `/specs/013-learner-sheet-sharing/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/sharing-api.md, quickstart.md

**Organization**: Grouped by user story: share/snapshot foundation, item sharing (MVP), sheet sharing, teacher visibility/control.

**Tests**: PowerShell verification + quickstart; no TDD suite requested.

> **Reuse (no duplication)**: `contentSafety.js` + `logContentSafety()` + `content_safety_results`; Feature 006 consent state; the existing `sheets` table + class roster / learner-teacher mapping. Recipients resolved **server-side** from the class roster — never client-supplied.

---

## Phase 1: Setup
- [X] T001 EdTech Program Orchestrator: append the sharing increment scope + touched files to demo/apps/learner-web/README.md + teacher-console/README.md (Accountable: agents/edtech-program-orchestrator.chatmode.md) — **EXISTING: append.**
- [ ] T002 [P] Learning Sciences Expert: confirm ZPD-appropriate in-class peer sharing design (not social media) + recipient/decline UX in specs/013-learner-sheet-sharing/research.md (Accountable: agents/learning-sciences-expert.chatmode.md)

## Phase 2: Foundational
- [X] T003 GDPR Children's Data Specialist: add `share`, `shared_artifact_snapshot`, `sharing_policy`, `recipient_block` to demo/apps/_shared/db/schema.sql (reuse `content_safety_results` for moderation) (Accountable: agents/gdpr-children-data-specialist.chatmode.md)
- [X] T004 [P] Privacy-Preserving ML Engineer: create/revoke share, snapshot, **server-side roster recipient resolution**, under-16 consent gate, and audit helpers in demo/apps/_shared/db/index.js (Accountable: agents/privacy-preserving-ml-engineer.chatmode.md)

**Checkpoint**: schema + helpers + roster/consent gating ready.

---

## Phase 3: User Story 1 — Share a Worked Item with a Classmate (Priority: P1) 🎯 MVP
**Goal**: Share an item to same-class peers as a read-only copy; optional note Content-Safety scanned; recipient notified; sender can revoke.
**Independent Test**: A shares an item to classmate B → B notified ≤5 s, opens read-only "Shared by A"; A can unshare.
- [X] T005 [US1] Privacy-Preserving ML Engineer: POST /api/share (item) — roster check, snapshot, note Content-Safety scan, notify; POST /api/share/:id/revoke in demo/apps/learner-web/server.js (Accountable: agents/privacy-preserving-ml-engineer.chatmode.md)
- [X] T006 [P] [US1] Demo Deployment Agent: share action (recipient picker from roster) + read-only received view ("Shared by …") + revoke in demo/apps/learner-web/public/ (Accountable: agents/demo-deployment-agent.chatmode.md)
- [X] T007 [P] [US1] Cross-Agent QA Verifier: verify same-class-only, read-only, note moderation, revoke, consent gating in demo/scripts/ (Accountable: agents/cross-agent-qa-verifier.chatmode.md)

**Checkpoint**: item sharing live.

---

## Phase 4: User Story 2 — Share a Practice Sheet (Priority: P2)
**Goal**: Share a sheet to same-class peers as independent read-only practice copies; recipient attempts isolated.
**Independent Test**: A shares a sheet to B and C → each gets an independent copy; their attempts record to their own accounts; A's progress unchanged.
- [X] T008 [US2] Privacy-Preserving ML Engineer: extend POST /api/share for `sheet` (multi-recipient, independent snapshots) + GET /api/share/received in demo/apps/learner-web/server.js (Accountable: agents/privacy-preserving-ml-engineer.chatmode.md)
- [X] T009 [P] [US2] Cross-Agent QA Verifier: verify progress isolation (recipient attempts never affect sender) in demo/scripts/ (Accountable: agents/cross-agent-qa-verifier.chatmode.md)

**Checkpoint**: sheet sharing live.

---

## Phase 5: User Story 3 — Teacher Visibility & Control (Priority: P1)
**Goal**: Teacher per-class sharing log + disable per learner/class + flagged-note moderation; recipient block.
**Independent Test**: teacher sees shares, disables one learner (can't initiate), approves/rejects a flagged note.
- [X] T010 [US3] EdTech Program Orchestrator: per-class sharing log + disable per learner/class + note moderation queue in demo/apps/teacher-console (server.js + public) (Accountable: agents/edtech-program-orchestrator.chatmode.md)
- [X] T011 [P] [US3] Demo Deployment Agent: recipient decline/block UI in demo/apps/learner-web/public/ (Accountable: agents/demo-deployment-agent.chatmode.md)
- [X] T012 [P] [US3] Cross-Agent QA Verifier: verify teacher log/disable/moderation + block in demo/scripts/ (Accountable: agents/cross-agent-qa-verifier.chatmode.md)

**Checkpoint**: teacher control + learner agency complete.

---

## Phase 6: Polish & Cross-Cutting
- [ ] T013 [P] Responsible AI Evaluator: verify content-safety + audit + consent guarantees against contracts/sharing-api.md (Accountable: agents/responsible-ai-evaluator.chatmode.md)
- [X] T014 [P] Cross-Agent QA Verifier: run full specs/013-learner-sheet-sharing/quickstart.md validation (Accountable: agents/cross-agent-qa-verifier.chatmode.md)
- [X] T015 EdTech Program Orchestrator: update specs/INDEX.md (013 → planned+tasked) (Accountable: agents/edtech-program-orchestrator.chatmode.md)

---

## Dependencies & Execution Order
- Phase 1 → 2 → 3 (US1 MVP) → 4 (US2) → 5 (US3) → 6.
- T005 depends on T003/T004; T008 extends T005; T010 depends on T003/T004.

## Parallel Execution Examples
- T006 ∥ T007 (US1); T011 ∥ T012 (US3); T013 ∥ T014 (polish).

## Implementation Strategy
- **MVP = User Story 1** (item sharing). Then sheets (US2) and teacher control (US3, P1 — implement alongside US1 for safety).

## Summary
- **Total tasks**: 15 (T001–T015). **Per story**: US1 = 3 · US2 = 2 · US3 = 3. Setup/Foundational = 4, Polish = 3.
- **Parallel**: ~8 `[P]`. **MVP**: User Story 1.
- **Independent test criteria**: US1 — same-class read-only share + moderation + revoke; US2 — progress-isolated sheet copies; US3 — teacher log/disable/moderation.
