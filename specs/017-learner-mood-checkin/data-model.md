# Data Model — Learner Mood Check-In & Well-Being Routing

**Feature**: `017-learner-mood-checkin` | **Date**: 2026-06-26

EU-resident PostgreSQL (`_shared/db`). Self-reported only — **no biometric/behavioural fields**. Strict access control.

## mood_entry

| Field | Type | Notes |
|---|---|---|
| `id` | bigserial pk | |
| `learner_ref` | text | Pseudonymous. |
| `day` | date | One editable entry per learner per day. |
| `mood` | enum `happy` \| `medium` \| `sad` | **Self-reported** only. |
| `reason` | enum `personal` \| `course_difficulty` \| `classmate` \| null | Only when sad; optional. |
| `created_at` / `updated_at` | timestamptz | Editable; erasable (data-subject rights). |

## wellbeing_alert (parent-facing, consent-gated)

| Field | Type | Notes |
|---|---|---|
| `id` | bigserial pk | |
| `learner_ref` / `parent_ref` | text | |
| `severity` | enum `info` \| `elevated` | Threshold-derived. |
| `window` | text | Period the alert covers. |
| `consent_ok` | bool | Surfaced only if true. |
| `created_at` | timestamptz | Supportive framing; not a diagnosis. |

## teacher_recommendation

| Field | Type | Notes |
|---|---|---|
| `id` | bigserial pk | |
| `scope` | enum `learner` \| `class` | |
| `scope_id` | text | |
| `trigger` | enum `course_difficulty` \| `low_mood_pattern` | |
| `suggestion` | text | Pedagogically reviewed (reuse 007/008). |
| `decision` | enum `accepted` \| `adjusted` \| `dismissed` \| `pending` | Teacher is decision-maker (logged). |
| `decided_by` / `decided_at` | text/timestamptz | |

## safeguarding_flag (sensitive — authorised staff only)

| Field | Type | Notes |
|---|---|---|
| `id` | bigserial pk | |
| `learner_ref` | text | |
| `reason` | enum `classmate` | Possible bullying. |
| `status` | enum `open` \| `in_review` \| `resolved` | |
| `restricted_to` | text | Authorised pastoral roles; **never** peer-visible. |
| `created_at` | timestamptz | |

**Invariants**: mood is self-reported (no inference); "classmate" never exposed to peers/used for ranking; mood data never used for grading/profiling/advertising; entries editable/erasable; parent surfacing requires `consent_ok`.
