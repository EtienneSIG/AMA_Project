# Tutor Voice API Contracts — AI Tutor Write/Explain + Voice Discussion

**Feature**: `016-ai-tutor-voice-mode` | **Date**: 2026-06-26

Authenticated learner session. EU-resident processing. No raw audio persisted; no emotion/biometric inference.

## POST `/api/tutor/turn` (text mode)
```json
{ "sessionId": "…", "mode": "text", "input": "How do I add 1/3 and 1/4?" }
→ { "turnId": "…", "output": "Find a common denominator …", "csVerdict": "clean", "ai": "AI tutor — may be imperfect" }
```

## POST `/api/tutor/voice/turn` (voice mode)
Audio streamed to the EU speech service; returns transcript + TTS audio ref + identical text.
```json
→ { "turnId": "…", "transcriptIn": "how do I add a third and a quarter",
     "output": "Find a common denominator …", "ttsRef": "…(ephemeral)…",
     "csVerdict": "clean", "ai": "AI tutor — may be imperfect" }
```
- Under-16 without active `voice_consent` OR voice disabled by policy → `403 voice_unavailable` (text remains available).
- Poor recognition → `state: needs_repeat` (never acted on as a decision).

## POST `/api/tutor/mode` — switch text↔voice (preserves session context).

## POST `/api/tutor/voice/consent` (parent) — grant/withdraw voice consent (under-16).

## POST `/api/tutor/voice/policy` (teacher) — enable/disable voice per learner/class.

## POST `/api/tutor/escalate` — route a turn to the teacher safeguarding inbox.

## Contract test checklist
- [ ] Text mode works with **0** audio dependency; voice transcript == spoken output (100% parity).
- [ ] 100% STT/TTS in EU region; **0** audio used for training/advertising.
- [ ] Under-16 without voice consent → no voice; text available.
- [ ] **0** emotion/biometric inference (no such fields/calls).
- [ ] Every exchange + escalation logged; teacher escalation reachable.
- [ ] Mic stops immediately on exit/mute (clear on/off indicator).
