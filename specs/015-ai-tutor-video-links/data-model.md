# Data Model — AI Tutor Illustrative Video Links

**Feature**: `015-ai-tutor-video-links` | **Date**: 2026-06-26

EU-resident PostgreSQL (`_shared/db`). No learner PII sent to the video platform.

## video_catalogue (teacher-curated allow-list)

| Field | Type | Notes |
|---|---|---|
| `id` | uuid pk | |
| `concept_id` | text | Concept/skill the video illustrates. |
| `url` | text | Approved video URL (privacy-enhanced form). |
| `source` | text | Channel/provider. |
| `title` | text | |
| `duration_s` | int | |
| `age_band` | text | Age suitability. |
| `market` / `language` | text | Locale targeting. |
| `curated_by` | text | Teacher/content lead. |
| `status` | enum `active` \| `disabled` \| `suppressed` | Suppressed = pending review. |
| `created_at` / `updated_at` | timestamptz | |

## video_suggestion_log (Art. 12 traceability)

| Field | Type | Notes |
|---|---|---|
| `id` | bigserial pk | |
| `learner_ref` | text | Pseudonymous learner id. |
| `tutor_turn_id` | uuid | FK to the shared `TutorTurn` (015/016). |
| `concept_id` | text | |
| `video_ids` | uuid[] | Catalogue entries shown. |
| `event` | enum `suggested` \| `clicked` | |
| `clicked_video_id` | uuid | Null unless event=clicked. |
| `created_at` | timestamptz | EU-resident; no third-party tracking data. |

## video_report

| Field | Type | Notes |
|---|---|---|
| `id` | bigserial pk | |
| `video_id` | uuid | Reported catalogue entry. |
| `reported_by` | text | Learner/teacher. |
| `reason` | text | |
| `status` | enum `open` \| `resolved` | Suppresses the video while open. |
| `created_at` | timestamptz | |

## Shared entity (defined with Feature 016)

- **TutorTurn**: one tutor exchange (learner input + tutor output); `VideoSuggestion` rows attach to it. Owned jointly by 015/016 — single model.

**Invariants**: only `active`, non-`suppressed` catalogue rows are ever shown; suggestion/click logs carry no third-party tracking data; under-16 presentation gated on consent + restricted mode.
