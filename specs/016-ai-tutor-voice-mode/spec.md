# Feature Specification: AI Tutor — Write/Explain and Voice Discussion Modes

**Feature Branch**: `016-ai-tutor-voice-mode`

**Created**: 2026-06-26

**Status**: Draft

**Input**: User description: "For the AI tutor, there must be 2 modes: a write-and-explanation mode and a discussion mode (voice-to-voice)."

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Write & Explain Mode (Text) (Priority: P1)

A learner interacts with the AI tutor by typing a question and receives a written, structured explanation (definition, worked example, check-for-understanding). This is the default, fully accessible text mode.

**Why this priority**: Text mode is the baseline tutor experience, the most accessible, and the foundation the voice mode builds on; it is the smallest independently valuable slice.

**Independent Test**: A learner types a question; the tutor returns a written explanation with a transparency label ("AI tutor — may be imperfect") and a follow-up prompt. No audio is required.

**Acceptance Scenarios**:

1. **Given** a learner is in write/explain mode, **When** they submit a typed question, **Then** the tutor returns a written explanation that is content-safety scanned, age-appropriate, and labelled as AI-generated.
2. **Given** the tutor responds, **When** the answer is shown, **Then** the learner can ask a follow-up, and the conversation context is maintained within the session.
3. **Given** a learner requests it, **When** they toggle, **Then** they can switch between write/explain and discussion mode without losing conversation context.

---

### User Story 2 — Voice Discussion Mode (Voice-to-Voice) (Priority: P1)

A learner switches to discussion mode and speaks to the tutor. Their speech is transcribed (speech-to-text), the tutor reasons over the transcript, and the answer is spoken back (text-to-speech) in an age-appropriate voice, enabling a natural back-and-forth conversation. A live transcript is always shown for accessibility and transparency.

**Why this priority**: Voice-to-voice is the explicitly requested second mode and a major accessibility/engagement enhancer, but it depends on the text-tutor core.

**Independent Test**: A learner taps "talk", speaks a question, sees a live transcript, and hears a spoken answer with the matching transcript displayed; the exchange can continue conversationally.

**Acceptance Scenarios**:

1. **Given** a learner enters discussion mode, **When** they speak, **Then** their speech is transcribed in an EU-resident speech service and a live transcript is displayed.
2. **Given** the transcript is produced, **When** the tutor answers, **Then** the answer is both spoken (TTS) and shown as text, and the spoken/written content is identical and content-safety scanned.
3. **Given** a conversation is ongoing, **When** the learner replies by voice, **Then** the tutor maintains context and continues the discussion turn-by-turn.
4. **Given** the learner stops or mutes, **When** they exit voice mode, **Then** microphone capture stops immediately and a clear indicator shows the mic is off.

---

### User Story 3 — Consent, Privacy & Teacher Controls for Voice (Priority: P1)

Voice capture for minors requires explicit, informed consent (parental for under-16). Audio is processed in EU regions, not used to train models, retained minimally, and teachers can enable/disable voice mode per learner/class. A transparency notice explains the tutor is AI and may be imperfect.

**Why this priority**: Voice introduces a new (biometric-adjacent) data class for children; constitution principles I, II, III, IV require strict consent, residency, minimisation, and oversight before voice can ship.

**Independent Test**: For an under-16 learner without voice consent, voice mode is unavailable; after parental consent, voice mode activates; a teacher can disable it again; audio is shown to be processed in-EU and not retained beyond the session policy.

**Acceptance Scenarios**:

1. **Given** an under-16 learner without parental voice consent, **When** they try discussion mode, **Then** it is disabled with a clear explanation, while write/explain mode remains available.
2. **Given** parental voice consent is granted, **When** the learner uses voice mode, **Then** audio is processed in an EU region, transcripts are retained only per the documented minimal policy, and audio is never used for model training or advertising.
3. **Given** a teacher disables voice mode for a learner/class, **When** that learner opens the tutor, **Then** only write/explain mode is offered.
4. **Given** any voice or text exchange, **When** it occurs, **Then** it is logged for AI Act traceability with a human-oversight/escalation path to a teacher.

### Edge Cases

- Speech recognition fails or is noisy: the tutor asks the learner to repeat or offers to switch to text; no guess is acted on as a graded decision.
- Learner speaks a different language/dialect: transcription/answer respect the learner's configured language; unsupported languages fall back to text mode with a notice.
- Microphone permission denied or revoked: voice mode is gracefully unavailable; text mode continues.
- Distressing or safeguarding content is spoken: content-safety + safeguarding routing flags it for teacher/appropriate escalation (links to mood/well-being handling).
- No emotion or speaker-identity inference is performed from the audio (Art. 5 prohibited practices excluded).
- Background voices captured: processing targets the active learner only; audio is not stored beyond minimal session need.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The AI tutor MUST provide a write/explain (text) mode that returns structured, age-appropriate, content-safety-scanned, AI-labelled explanations.
- **FR-002**: The AI tutor MUST provide a discussion (voice-to-voice) mode using speech-to-text input and text-to-speech output with an always-visible live transcript.
- **FR-003**: Learners MUST be able to switch between modes without losing conversation context.
- **FR-004**: Spoken answers MUST be identical in content to their displayed transcript and MUST be content-safety scanned before delivery.
- **FR-005**: Voice mode for under-16 learners MUST require explicit parental consent and MUST be unavailable without it, while text mode remains available.
- **FR-006**: All speech processing (STT/TTS) MUST occur in EU regions; audio MUST NOT be used for model training or advertising and MUST follow a documented minimal-retention policy.
- **FR-007**: System MUST NOT perform emotion recognition, speaker biometric identification, or any Art. 5 prohibited practice on captured audio.
- **FR-008**: Teachers MUST be able to enable/disable voice mode per learner and per class.
- **FR-009**: Microphone capture MUST stop immediately on exit/mute with a clear on/off indicator.
- **FR-010**: All tutor exchanges (text and voice) MUST be logged for AI Act traceability and MUST expose a human-oversight/teacher-escalation path.
- **FR-011**: The tutor MUST display transparency copy stating it is an AI tutor that may be imperfect, in both modes.

### Key Entities

- **TutorSession**: A conversation between a learner and the tutor, with mode (text/voice), turns, language, and content-safety verdicts.
- **TutorTurn**: A single exchange (learner input + tutor output), storing transcript text (not raw audio beyond policy), mode, timestamps, and safety verdict.
- **VoiceConsent**: Parental/guardian consent record specific to microphone/voice processing for under-16 learners.
- **VoiceModePolicy**: Per-learner/per-class enablement of voice mode set by teachers.
- **TutorAuditLog**: AI Act traceability log of tutor interactions and escalations.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Both modes are available to eligible learners; write/explain mode works with **0** audio dependencies and **100%** transcript parity in voice mode.
- **SC-002**: **100%** of voice processing occurs in EU regions; **0** audio is used for training/advertising (verified by configuration + audit).
- **SC-003**: **0** under-16 learners can access voice mode without active parental voice consent.
- **SC-004**: **0** instances of emotion/biometric inference on audio (verified by design review and audit).
- **SC-005**: **100%** of tutor exchanges (text + voice) are logged with an available teacher-escalation path.
- **SC-006**: Voice discussion improves engagement/accessibility for learners who struggle with text, supporting the −26% outcome-gap KPI (measured via reach/usage among target learners).
- **SC-007**: Median round-trip latency in voice mode is low enough to sustain natural conversation (target ≤ **2 seconds** speak-to-response start, p50).

## Assumptions

- An EU-resident speech service (STT + TTS) and an EU-resident tutor LLM endpoint are available.
- The existing GDPR Art. 8 consent framework (Spec 006) is extended with a voice-specific consent type.
- Content Safety (`contentSafety.js`, `logContentSafety()`, `content_safety_results`) is reused for both text and voice outputs.
- The vetted video-link layer (Spec 015) and mood/safeguarding routing (Spec 017) integrate with this tutor where relevant.

## Constitution Check

| Principle | How this spec complies |
|---|---|
| I. EU-Resident, Data-Minimised | All STT/TTS in EU regions; minimal transcript retention; raw audio not persisted beyond policy; no training/advertising use. |
| II. GDPR Art. 8 | Voice mode gated on explicit parental consent for under-16; text mode always available; data-subject rights preserved. |
| III. EU AI Act high-risk | Both modes ship with logging (Art. 12), transparency copy (Art. 13), teacher override/escalation (Art. 14); no Art. 5 emotion/biometric inference. |
| IV. Teacher-in-the-loop | Teachers enable/disable voice per learner/class; escalation path to teacher for safeguarding; no autonomous decisions affecting grades. |
| V. Pedagogical sign-off | Tutor explanation design and voice interaction reviewed by Learning Sciences for ZPD and Universal Design for Learning. |
| VI. Outcome-contract driven | SC-006 maps voice accessibility to the −26% outcome-gap KPI. |
| VII. Reproducible, spec-driven | Two independently testable modes with measurable, technology-agnostic success criteria. |
