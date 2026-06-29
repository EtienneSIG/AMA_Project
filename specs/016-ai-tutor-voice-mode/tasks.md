# Tasks: AI Tutor — Write/Explain and Voice Discussion Modes

**Input**: Design documents from `/specs/016-ai-tutor-voice-mode/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/tutor-voice-api.md, quickstart.md

**Organization**: Grouped by user story: shared tutor + consent/policy foundation, text mode (MVP-baseline), voice mode, then consent/privacy/teacher controls.

**Tests**: PowerShell verification + quickstart; no TDD suite requested.

> **Coordination**: Owns the shared `TutorSession`/`TutorTurn` model (with **Feature 015**). **Reuse** `contentSafety.js` + `logContentSafety()`; extend Feature 006 consent for a **voice-specific** consent. Safeguarding escalation shares Feature 017's routing. **No** emotion/biometric processing anywhere.

> **GATE**: DPO sign-off on the DPIA delta (children's voice data) MUST be recorded before voice (Phase 4+) implementation.

---

## Phase 1: Setup & Compliance Gate
- [x] T000 GDPR Children's Data Specialist + DPO: approve the voice DPIA delta (EU residency, minimal transcript retention, no raw-audio persistence, no Art. 5 inference) and record sign-off in specs/016-ai-tutor-voice-mode/checklists/gdpr-ai-act-compliance.md (Accountable: agents/gdpr-children-data-specialist.chatmode.md)
- [x] T001 [P] EU AI Act Compliance Officer: author the Annex IV fragment (two modes, logging, transparency, teacher override, no Art. 5) in specs/016-ai-tutor-voice-mode/contracts/annex-iv-fragment.md (Accountable: agents/eu-ai-act-compliance-officer.chatmode.md)
- [x] T002 [P] Privacy-Preserving ML Engineer: select the EU speech service (STT/TTS) + confirm region/retention in specs/016-ai-tutor-voice-mode/research.md (Accountable: agents/privacy-preserving-ml-engineer.chatmode.md)

## Phase 2: Foundational
- [x] T003 GDPR Children's Data Specialist: add `tutor_session`, `tutor_turn` (shared w/015), `voice_consent`, `voice_mode_policy`, `tutor_audit_log` to demo/apps/_shared/db/schema.sql — **no raw-audio/biometric fields** (Accountable: agents/gdpr-children-data-specialist.chatmode.md)
- [x] T004 [P] Privacy-Preserving ML Engineer: session/turn, voice-consent check, voice policy, audit + escalation helpers in demo/apps/_shared/db/index.js (Accountable: agents/privacy-preserving-ml-engineer.chatmode.md)

**Checkpoint**: shared tutor model + consent/policy/audit ready (gate T000 recorded).

---

## Phase 3: User Story 1 — Write & Explain Mode (Priority: P1) 🎯 MVP
**Goal**: Text tutor returns structured, AI-labelled, content-safety-scanned answers; mode toggle preserves context.
**Independent Test**: type a question → labelled written answer; follow-up keeps context; toggle to/from voice keeps context.
- [x] T005 [US1] Privacy-Preserving ML Engineer: implement POST /api/tutor/turn (text) with content-safety scan, AI transparency copy, and session context in demo/apps/learner-web/server.js (Accountable: agents/privacy-preserving-ml-engineer.chatmode.md)
- [x] T006 [P] [US1] Demo Deployment Agent: text tutor UI + mode toggle + transparency copy in demo/apps/learner-web/public/ (Accountable: agents/demo-deployment-agent.chatmode.md)
- [x] T007 [P] [US1] Cross-Agent QA Verifier: verify text answers, labelling, context, and content-safety in demo/scripts/ (Accountable: agents/cross-agent-qa-verifier.chatmode.md)

**Checkpoint**: text mode functional (works with 0 audio dependency).

---

## Phase 4: User Story 2 — Voice Discussion Mode (Priority: P1)
**Goal**: Voice-to-voice with live transcript; EU STT/TTS; transcript == spoken; context maintained.
**Independent Test**: speak → live transcript → spoken answer with identical text; continue by voice.
- [x] T008 [US2] Privacy-Preserving ML Engineer: implement POST /api/tutor/voice/turn (EU STT → LLM → TTS), enforce transcript==output, content-safety scan, minimal retention, **no audio persistence** in demo/apps/learner-web/server.js (depends on T002, T003, T004) (Accountable: agents/privacy-preserving-ml-engineer.chatmode.md)
- [x] T009 [P] [US2] Demo Deployment Agent: mic control + clear on/off indicator + always-visible live transcript + mode switch (context preserved) in demo/apps/learner-web/public/ (Accountable: agents/demo-deployment-agent.chatmode.md)
- [x] T010 [US2] Privacy-Preserving ML Engineer: robustness — poor-recognition repeat, unsupported-language text fallback, immediate mic stop in demo/apps/learner-web (Accountable: agents/privacy-preserving-ml-engineer.chatmode.md)
- [x] T011 [P] [US2] Responsible AI Evaluator: verify EU residency, transcript parity, and **0 emotion/biometric inference** against contracts/tutor-voice-api.md (Accountable: agents/responsible-ai-evaluator.chatmode.md)

**Checkpoint**: voice mode functional + compliant.

---

## Phase 5: User Story 3 — Consent, Privacy & Teacher Controls (Priority: P1)
**Goal**: Under-16 voice gated on parental consent; teacher enable/disable per learner/class; logging + escalation.
**Independent Test**: under-16 w/o consent → no voice; after consent → voice; teacher disables → text only.
- [x] T012 [US3] GDPR Children's Data Specialist: voice-specific parental consent flow + gating in demo/apps/learner-web + parent-portal (Accountable: agents/gdpr-children-data-specialist.chatmode.md)
- [x] T013 [US3] EdTech Program Orchestrator: teacher enable/disable voice per learner/class + safeguarding escalation inbox in demo/apps/teacher-console (Accountable: agents/edtech-program-orchestrator.chatmode.md)
- [x] T014 [US3] EU AI Act Compliance Officer: log all exchanges + escalations (Art. 12) and expose the teacher escalation path in demo/apps/learner-web/server.js + _shared/db (Accountable: agents/eu-ai-act-compliance-officer.chatmode.md)

**Checkpoint**: consent + teacher controls + audit complete.

---

## Phase 6: Polish & Cross-Cutting
- [x] T015 [P] EU AI Act Compliance Officer: finalize Annex IV with as-built evidence (Accountable: agents/eu-ai-act-compliance-officer.chatmode.md)
- [x] T016 [P] Cross-Agent QA Verifier: run full specs/016-ai-tutor-voice-mode/quickstart.md validation (Accountable: agents/cross-agent-qa-verifier.chatmode.md)
- [x] T017 EdTech Program Orchestrator: update specs/INDEX.md (016 → planned+tasked) (Accountable: agents/edtech-program-orchestrator.chatmode.md)

---

## Dependencies & Execution Order
- Phase 1 (gate T000) → 2 → 3 (US1 text) → 4 (US2 voice, blocked by DPO gate) → 5 (US3) → 6.
- T008 depends on T002/T003/T004; voice (Phase 4+) blocked until T000 (DPO) recorded.
- **Pair with 015** (shared tutor model).

## Parallel Execution Examples
- T001/T002 in setup; T006 ∥ T007 (US1); T009 ∥ T011 (US2).

## Implementation Strategy
- **MVP-baseline = User Story 1** (text). Voice (US2) + controls (US3) follow, gated on DPO sign-off.

## Summary
- **Total tasks**: 18 (T000–T017). **Per story**: US1 = 3 · US2 = 4 · US3 = 3. Setup/Gate + Foundational = 5, Polish = 3.
- **Parallel**: ~9 `[P]`. **MVP**: User Story 1 (text).
- **Independent test criteria**: US1 — labelled text answers + context; US2 — EU voice, transcript parity, no Art. 5 inference; US3 — under-16 consent gating + teacher control + audit.
