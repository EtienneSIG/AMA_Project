# Data Model — Adaptive Learning (007)

**Accountable:** Privacy-Preserving ML Engineer
**Source of truth:** [demo/apps/_shared/db/schema.sql](../../demo/apps/_shared/db/schema.sql)
(Feature 007 block) — applied idempotently on `db.init()` at server boot.

Personal data is limited to the demo learner email (pseudonymous account
identifier). All tables are EU-hosted (West Europe Postgres). No special-category
data, no biometric/emotion data.

## Entities

### `adaptive_decision` (append-only recommendation log)
| Column | Type | Notes |
|--------|------|-------|
| id | BIGSERIAL PK | |
| learner_email | TEXT | pseudonymous id |
| skill_id | TEXT | |
| prior_item_id | TEXT | item that triggered the decision |
| recommended_activity_id | TEXT | null in non-adaptive mode |
| reason | TEXT CHECK | catch_up / peer_practice / challenge / stretch / non_adaptive |
| mastery_level | REAL | 0–1 |
| threshold_band | TEXT CHECK | 0-50 / 50-80 / 80-plus / unknown |
| model_version | TEXT | `adaptive-v1` |
| explanation_learner | TEXT | Art. 13 label |
| explanation_teacher | TEXT | Art. 14 reasoning |
| data_reliable | BOOL | false ⇒ non-adaptive |
| teacher_overridden | BOOL | set true on override |
| created_at | TIMESTAMPTZ | |

### `adaptive_catch_up_sequence`
Scaffolded sequence: `activity_ids TEXT[]` (intro → worked-example →
guided-practice → reflection), `checkpoint_activity_id`, `current_index`,
`status` (active / completed / re_catch_up / overridden), `final_mastery`.

### `adaptive_stretch_activity`
`activity_id`, `qualitative_feedback`, `feedback_teacher_email`, `completed_at`.
No grade is stored — qualitative feedback only.

### `adaptive_teacher_override` (APPEND-ONLY — Art. 14 evidence)
`decision_id`, `teacher_email`, `override_activity_id`, `reasoning`, `created_at`.
Protected by `prevent_adaptive_override_mutation` trigger (no UPDATE/DELETE).

### `adaptive_audit` (APPEND-ONLY — Art. 12 immutable logging)
`event_type` CHECK (12 values: decision_made, override_applied,
checkpoint_passed, checkpoint_failed, path_changed, anomaly_flagged,
stretch_triggered, stretch_completed, catch_up_started, high_intervention,
resume, non_adaptive_fallback), `data JSONB`, `latency_ms`.
Protected by `prevent_adaptive_audit_mutation` trigger.

### `adaptive_path_state` (MUTABLE — cross-device resume)
`learner_email PK`, `current_activity_id`, `sequence_id`, `checkpoint_progress`,
`prior_hints JSONB`, `prior_feedback`, `last_device`, `updated_at`.

## Immutability guarantee
Both append-only tables raise an exception on UPDATE/DELETE via BEFORE triggers,
mirroring the existing `teacher_approvals` pattern. This is the technical control
behind the Art. 12 logging claim.

## Retention
Audit/override evidence is retained for accountability (demo scope). Production
DPIA defines the retention window and erasure procedure (see
[checklists/gdpr-art8-children-data.md](checklists/gdpr-art8-children-data.md)).
