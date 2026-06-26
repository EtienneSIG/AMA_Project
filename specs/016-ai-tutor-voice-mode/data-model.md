# Data Model — AI Tutor Write/Explain + Voice Discussion

**Feature**: `016-ai-tutor-voice-mode` | **Date**: 2026-06-26

EU-resident PostgreSQL (`_shared/db`). **Transcripts only; no raw-audio persistence; no biometric/emotion data.**

## tutor_session (shared with Feature 015)

| Field | Type | Notes |
|---|---|---|
| `id` | uuid pk | |
| `learner_ref` | text | Pseudonymous. |
| `mode` | enum `text` \| `voice` | Current mode (switchable). |
| `language` | text | |
| `created_at` | timestamptz | |

## tutor_turn (shared with Feature 015)

| Field | Type | Notes |
|---|---|---|
| `id` | uuid pk | |
| `session_id` | uuid fk | |
| `mode` | enum `text` \| `voice` | |
| `input_text` | text | Typed text **or** STT transcript (no raw audio). |
| `output_text` | text | Tutor answer (== spoken transcript in voice mode). |
| `cs_verdict` | text | Content Safety result. |
| `created_at` | timestamptz | |

## voice_consent (under-16, voice-specific)

| Field | Type | Notes |
|---|---|---|
| `id` | bigserial pk | |
| `parent_email` / `child_ref` | text | |
| `granted` | bool | |
| `granted_at` / `withdrawn_at` | timestamptz | |
| `disclosure_version` | text | Plain-language voice disclosure. |

## voice_mode_policy (teacher-set)

| Field | Type | Notes |
|---|---|---|
| `scope` | enum `learner` \| `class` | |
| `scope_id` | text | |
| `voice_enabled` | bool | |
| `set_by` / `set_at` | text/timestamptz | |

## tutor_audit_log (Art. 12)

| Field | Type | Notes |
|---|---|---|
| `id` | bigserial pk | |
| `session_id` / `turn_id` | uuid | |
| `mode` | enum | |
| `event` | enum `exchange` \| `escalation` \| `mode_switch` | |
| `escalated_to` | text | Teacher (if safeguarding). |
| `created_at` | timestamptz | |

**Invariants**: no raw audio stored; no emotion/biometric fields exist; voice turns require active `voice_consent` for under-16; spoken output == `output_text`; every turn + escalation logged.
