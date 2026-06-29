# Tasks: Learner Mood Check-In & Well-Being Routing

**Input**: Design documents from `/specs/017-learner-mood-checkin/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/mood-api.md, quickstart.md

**Organization**: Grouped by user story: foundation + safeguarding gate, self-report check-in (MVP), sad-reason routing, parent alert, teacher recommendations + safeguarding.

**Tests**: PowerShell verification + quickstart; no TDD suite requested.

> **Compliance core**: Mood is **self-report only** — implement **no** facial/voice/behavioural inference. Reuse Feature 006 consent (parent surfacing) + Feature 007/008 scaffolding (recommendations). Strict access control on safeguarding data. Mood data MUST NOT be used for grading/profiling/advertising.

> **GATE**: DPO + safeguarding-lead sign-off on the DPIA delta + thresholds MUST be recorded before parent/teacher surfacing (Phase 5+).

---

## Phase 1: Setup & Compliance Gate
- [x] T000 GDPR Children's Data Specialist + DPO + Learning Sciences Expert: approve the DPIA delta, consent-gating default, and escalation thresholds; record in specs/017-learner-mood-checkin/checklists/gdpr-ai-act-compliance.md (Accountable: agents/gdpr-children-data-specialist.chatmode.md, agents/learning-sciences-expert.chatmode.md)
- [x] T001 [P] EU AI Act Compliance Officer: author the Annex IV fragment (self-report only, no Art. 5, logging, human-only action) in specs/017-learner-mood-checkin/contracts/annex-iv-fragment.md (Accountable: agents/eu-ai-act-compliance-officer.chatmode.md)
- [X] T002 [P] Learning Sciences Expert: draft supportive copy (acknowledgements, "talk to a trusted adult", parent "how to help") for review in demo/apps/learner-web/public/ (Accountable: agents/learning-sciences-expert.chatmode.md)

## Phase 2: Foundational
- [X] T003 GDPR Children's Data Specialist: add `mood_entry`, `wellbeing_alert`, `teacher_recommendation`, `safeguarding_flag` to demo/apps/_shared/db/schema.sql — strict access; **no biometric/behavioural fields** (Accountable: agents/gdpr-children-data-specialist.chatmode.md)
- [X] T004 [P] Privacy-Preserving ML Engineer: record/edit/erase mood, threshold-based alert derivation, recommendation, and safeguarding-routing helpers in demo/apps/_shared/db/index.js (Accountable: agents/privacy-preserving-ml-engineer.chatmode.md)

**Checkpoint**: schema + helpers ready (gate T000 recorded before Phase 5).

---

## Phase 3: User Story 1 — Daily Self-Reported Mood Check-In (Priority: P1) 🎯 MVP
**Goal**: Optional, skippable home-page mood prompt (happy/medium/sad); recorded per day; editable/erasable.
**Independent Test**: open home → optional prompt; select a mood → acknowledgement + stored; skip → no nagging.
- [X] T005 [US1] Demo Deployment Agent: optional, skippable mood check-in on the learner home page (age-appropriate theme/language) in demo/apps/learner-web/public/index.html (Accountable: agents/demo-deployment-agent.chatmode.md)
- [X] T006 [US1] Privacy-Preserving ML Engineer: POST /api/mood/checkin + DELETE /api/mood/checkin/:day (record/edit/erase; one entry/day) in demo/apps/learner-web/server.js (Accountable: agents/privacy-preserving-ml-engineer.chatmode.md)
- [X] T007 [P] [US1] Cross-Agent QA Verifier: verify optional/skippable, self-report-only, edit/erase in demo/scripts/ (Accountable: agents/cross-agent-qa-verifier.chatmode.md)

**Checkpoint**: self-report check-in live.

---

## Phase 4: User Story 2 — "Sad" Reason Follow-Up (Priority: P1)
**Goal**: On "sad", three supportive reason options (personal / course difficulty / classmate) + skip; reason stored; classmate routed sensitively.
**Independent Test**: select sad → 3 options; choosing one stores the category; classmate → safeguarding routing.
- [X] T008 [US2] Demo Deployment Agent: sad-reason follow-up UI (3 supportive options + skip + supportive message) in demo/apps/learner-web/public/ (Accountable: agents/demo-deployment-agent.chatmode.md)
- [X] T009 [US2] GDPR Children's Data Specialist: store reason + route "classmate" to `safeguarding_flag` (authorised staff only, never peer-visible) in demo/apps/_shared/db/index.js (Accountable: agents/gdpr-children-data-specialist.chatmode.md)

**Checkpoint**: reason capture + safeguarding routing.

---

## Phase 5: User Story 3 — Parent Alert on Low Mood (Priority: P1)
**Goal**: Consent-gated, supportive well-being notice to parents for sustained low mood.
**Independent Test**: sustained low mood + consent → parent sees supportive notice; no consent → none.
- [X] T010 [US3] EdTech Program Orchestrator: GET /api/mood/parent consent-gated supportive notice + "how to help" in demo/apps/parent-portal (server.js + public) (depends on T000) (Accountable: agents/edtech-program-orchestrator.chatmode.md)
- [X] T011 [P] [US3] Cross-Agent QA Verifier: verify consent-gating + supportive (non-diagnostic) framing + thresholds in demo/scripts/ (Accountable: agents/cross-agent-qa-verifier.chatmode.md)

**Checkpoint**: parent alert complete.

---

## Phase 6: User Story 4 — Teacher Recommendations & Safeguarding View (Priority: P1)
**Goal**: Teacher well-being view + pedagogically-reviewed recommendations (accept/adjust/dismiss) + safeguarding inbox.
**Independent Test**: teacher sees mood + reasons; course-difficulty cluster → recommendation; classmate → safeguarding inbox only.
- [X] T012 [US4] EdTech Program Orchestrator: teacher well-being view (per-learner + aggregate, access-controlled) + recommendations (reuse 007/008) with accept/adjust/dismiss (logged) in demo/apps/teacher-console (Accountable: agents/edtech-program-orchestrator.chatmode.md)
- [X] T013 [US4] GDPR Children's Data Specialist: safeguarding inbox (authorised pastoral roles only; never peer-visible) + escalation in demo/apps/teacher-console (Accountable: agents/gdpr-children-data-specialist.chatmode.md)
- [X] T014 [US4] EU AI Act Compliance Officer: log recommendations + teacher decisions (Art. 12); ensure no autonomous action affects the learner in demo/apps/_shared/db + teacher-console (Accountable: agents/eu-ai-act-compliance-officer.chatmode.md)

**Checkpoint**: teacher recommendations + safeguarding complete.

---

## Phase 7: Polish & Cross-Cutting
- [x] T015 [P] Responsible AI Evaluator: verify no-inference, no secondary-use, and human-only action against contracts/mood-api.md (Accountable: agents/responsible-ai-evaluator.chatmode.md)
- [x] T016 [P] Cross-Agent QA Verifier: run full specs/017-learner-mood-checkin/quickstart.md validation (Accountable: agents/cross-agent-qa-verifier.chatmode.md)
- [X] T017 EdTech Program Orchestrator: update specs/INDEX.md (017 → planned+tasked) (Accountable: agents/edtech-program-orchestrator.chatmode.md)

---

## Dependencies & Execution Order
- Phase 1 (gate T000) → 2 → 3 (US1 MVP) → 4 (US2) → 5 (US3, blocked by T000) → 6 (US4) → 7.
- Parent/teacher surfacing (US3/US4) blocked until T000 (DPO + safeguarding) recorded.

## Parallel Execution Examples
- T001/T002 in setup; T007 (US1) ∥ later; T015 ∥ T016 in polish.

## Implementation Strategy
- **MVP = User Story 1** (self-report check-in). Then reason routing (US2), parent alert (US3), teacher/safeguarding (US4).

## Summary
- **Total tasks**: 18 (T000–T017). **Per story**: US1 = 3 · US2 = 2 · US3 = 2 · US4 = 3. Setup/Gate + Foundational = 5, Polish = 3.
- **Parallel**: ~8 `[P]`. **MVP**: User Story 1.
- **Independent test criteria**: US1 — optional self-report + edit/erase; US2 — reason + safeguarding routing; US3 — consent-gated parent notice; US4 — teacher recommendations + safeguarding inbox.
