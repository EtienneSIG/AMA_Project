# Implementation Plan: AI Tutor — Write/Explain and Voice Discussion Modes

**Branch**: `016-ai-tutor-voice-mode` | **Date**: 2026-06-26 | **Spec**: `/specs/016-ai-tutor-voice-mode/spec.md`

**Input**: Feature specification from `/specs/016-ai-tutor-voice-mode/spec.md`

> **Shared-tutor coordination**: Features **015** (video links) and **016** (voice mode) extend the same AI tutor. They MUST share one tutor data model (`TutorSession`/`TutorTurn`). This plan **owns** the tutor session/turn model; 015 attaches video suggestions to it. Plan/implement together.

## Summary

Give the AI tutor two modes: a default **write/explain** (text) mode and a **voice-to-voice discussion** mode (speech-to-text in, text-to-speech out, with an always-visible live transcript). Learners switch modes without losing context. **All speech processing is EU-resident**, audio is **not used for training/advertising** and follows a **minimal-retention** policy; **no emotion recognition or speaker biometric identification** (Art. 5 prohibited) is performed. Voice for under-16 learners requires **explicit parental consent**; teachers can enable/disable voice per learner/class; every exchange is **content-safety scanned**, **logged for AI Act traceability**, and exposes a **teacher escalation** path. Both modes show transparency copy ("AI tutor — may be imperfect"). Extends `demo/apps/learner-web` (tutor) + `_shared/db`; reuses `contentSafety.js`.

## Technical Context

**Language/Version**: Node.js 22.x; learner-web front-end (Web Speech capture or streamed audio to an EU speech service); `_shared/db` (PostgreSQL).

**Primary Dependencies**: an **EU-resident speech service** (STT + TTS) and an **EU-resident tutor LLM endpoint**; `express`, `pg`, `@azure/identity`; reuse `contentSafety.js` + `logContentSafety()`.

**Storage**: PostgreSQL (`_shared/db`): `tutor_session`, `tutor_turn` (shared with 015), `voice_consent`, `voice_mode_policy`, `tutor_audit_log`. **Transcripts** retained per minimal policy; **raw audio not persisted beyond session need**. EU-resident.

**Testing**: Extend `demo/scripts/` verification (transcript parity, EU-region processing, under-16 voice gating, no emotion/biometric inference, logging + escalation, mic on/off); quickstart.

**Target Platform**: Azure App Service Linux (learner-web) + EU speech/LLM endpoints.

**Project Type**: Web application — tutor enhancement (text + voice).

**Performance Goals**: Voice round-trip ≤ **2 s** speak-to-response start (p50); transcript parity 100% with spoken output.

**Constraints**:
- STT/TTS **in EU regions only**; audio **not** used for training/advertising; minimal retention.
- **No** emotion recognition / speaker biometric ID / any Art. 5 practice on audio.
- Under-16 voice gated on **explicit parental voice consent**; text mode always available.
- Mic capture stops immediately on exit/mute with a clear indicator; both modes show AI transparency copy.
- All exchanges content-safety scanned + logged with a teacher escalation path.

**Scale/Scope**: One tutor surface, two modes, per-learner/class voice policy, voice-specific consent.

## Constitution Check

| Principle | Status | Plan handling |
|---|---|---|
| I. EU-Resident, Data-Minimised | PASS | All STT/TTS in EU regions; minimal transcript retention; raw audio not persisted beyond need; no training/advertising use. |
| II. GDPR Art. 8 | PASS | Voice gated on explicit parental consent for under-16; text always available; data-subject rights preserved. |
| III. EU AI Act high-risk | PASS (with controls) | Both modes ship logging (Art. 12), transparency copy (Art. 13), teacher override/escalation (Art. 14), accuracy/robustness (Art. 15); **no Art. 5 emotion/biometric inference**. Annex IV fragment + DPIA delta produced. |
| IV. Teacher-in-the-loop | PASS | Teachers enable/disable voice per learner/class; escalation path to teacher; no autonomous grade/level decisions. |
| V. Pedagogical sign-off | PASS | Tutor explanation + voice interaction reviewed by Learning Sciences (ZPD, Universal Design for Learning). |
| VI. Outcome-contract driven | PASS | SC-006 maps voice accessibility to the −26% outcome-gap KPI. |
| VII. Reproducible, spec-driven | PASS | Two independently testable modes with measurable criteria; quickstart included. |

**EU AI Act articles touched**: Art. 9 (risk: voice/biometric-adjacent data for minors → consent + EU residency + minimal retention + safeguarding routing), Art. 10 (data governance: transcripts only, no audio retention), Art. 12 (exchange logging), Art. 13 (AI transparency copy + live transcript), Art. 14 (teacher enable/disable + escalation), Art. 15 (EU processing, fail-safe on poor recognition, **no Art. 5 inference**).

**DPIA delta**: **Moderate (new biometric-adjacent data class for children).** New: voice capture/transcription. Mitigations: EU-resident processing, explicit parental consent, minimal transcript retention, **no raw-audio persistence**, no training/advertising, no emotion/biometric inference, teacher disable + safeguarding escalation. DPO sign-off required before release.

**Human oversight surface**: per-learner/class voice enable/disable; teacher escalation for safeguarding content; transparency + live transcript; immediate mic stop.

## Project Structure

### Documentation (this feature)
```text
specs/016-ai-tutor-voice-mode/
├── plan.md · research.md · data-model.md · quickstart.md · tasks.md
└── contracts/tutor-voice-api.md
```

### Source Code
```text
demo/apps/learner-web/
├── server.js     # EXTEND: text + voice tutor routes; STT->LLM->TTS orchestration; content-safety; logging; escalation
└── public/       # EXTEND: mode toggle, mic control + clear on/off indicator, always-visible live transcript, AI transparency copy
demo/apps/_shared/db/
├── schema.sql    # NEW: tutor_session, tutor_turn (shared w/015), voice_consent, voice_mode_policy, tutor_audit_log
└── index.js      # NEW helpers: session/turn, consent checks, policy, audit + escalation
demo/apps/teacher-console/
└── server.js     # EXTEND: enable/disable voice per learner/class; safeguarding escalation inbox
```

**Structure Decision**: Extend learner-web with a tutor that shares one `TutorSession`/`TutorTurn` model (with 015). Voice mode streams audio to an **EU speech service** for STT, runs the EU LLM, returns TTS + an identical live transcript; spoken == displayed and both are content-safety scanned. Consent/policy/audit live in `_shared/db`. Teacher-console gains voice enable/disable + a safeguarding escalation inbox. **No** emotion/biometric processing anywhere.

## Complexity Tracking

> No constitution violations. Net-new: EU speech (STT/TTS) integration + voice consent/policy/audit. Tutor base shared with 015 (one model). DPIA moderate due to children's voice data — mitigated as above; DPO sign-off gates release.
