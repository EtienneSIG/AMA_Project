# Phase 0 Research — AI Tutor Write/Explain + Voice Discussion

**Feature**: `016-ai-tutor-voice-mode` | **Date**: 2026-06-26

## R1 — Two-mode architecture on one tutor model

- **Decision**: One `TutorSession`/`TutorTurn` model serves both text and voice; `mode` per turn. Voice = STT → LLM → TTS with an always-visible live transcript; text = typed in/out. Mode switch preserves session context.
- **Rationale**: Avoids two tutor pipelines; shared with Feature 015 (D2). Text is the accessible baseline.

## R2 — EU-resident speech processing, minimal retention

- **Decision**: STT + TTS via an **EU-region** speech service; persist **transcripts** (minimal policy), **not raw audio** beyond session need; never use audio for training/advertising.
- **Rationale**: Principle I + Art. 10; minimises children's-data footprint.

## R3 — No Art. 5 inference

- **Decision**: **No** emotion recognition, speaker biometric identification, or behavioural inference from audio. Speech is transcribed to text only.
- **Rationale**: Constitution III / EU AI Act Art. 5 prohibited practices.

## R4 — Under-16 voice consent

- **Decision**: A **voice-specific parental consent** (distinct from general Art. 8 consent) gates voice mode for under-16; text mode always available without it.
- **Rationale**: Voice is a new (biometric-adjacent) data class — needs its own informed consent.

## R5 — Safety, transparency, escalation

- **Decision**: Spoken == displayed transcript; both content-safety scanned. Transparency copy ("AI tutor, may be imperfect") in both modes. Distress/safeguarding content routes to a teacher escalation inbox (links to Feature 017 routing).
- **Rationale**: Art. 13/14 + child safeguarding.

## R6 — Robustness / fail-safe

- **Decision**: On poor recognition, ask to repeat or offer text; unsupported language → text fallback with notice; mic permission denied/revoked → voice gracefully unavailable; immediate mic stop + clear on/off indicator.
- **Rationale**: Art. 15 robustness; never act on a misrecognition as a decision.

### Open follow-ups (for /speckit.tasks)

- Select the specific EU speech service (STT/TTS) + confirm region + retention config.
- Confirm the minimal transcript-retention period with the DPO; record DPIA sign-off.
- Confirm the teacher safeguarding-escalation surface (shared with Feature 017).
