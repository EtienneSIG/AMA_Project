# Prompt C: Evaluation & Quality Telemetry

## Goal
Make every AI interaction measurable. The platform must emit signals that
operators, teachers and auditors can rely on — latency, content-safety verdict,
groundedness, learner outcome — and persist them in Postgres for offline review.

## Existing signals (already persisted)

| Source         | Table                       | Columns of interest                          |
|----------------|-----------------------------|----------------------------------------------|
| `/api/chat`    | `ask_history`               | `prompt_tokens`, `completion_tokens`, `latency_ms`, `status` |
| Content Safety | `content_safety_results`    | `direction`, `blocked`, `hate`/`self_harm`/`sexual`/`violence` |
| Adaptive picker| `item_attempts`             | `predicted`, `correct`, `latency_ms`         |
| Auth           | `connection_logs`           | `event` (login / logout / forbidden)         |
| Teacher Q&A    | `teacher_questions`         | `created_at` -> `answered_at` round-trip     |

## Additions

### 1. Lightweight feedback widget on every assistant answer
- Three buttons rendered under the Explanation card: "Helpful" / "Confusing" / "Wrong".
- Optional textarea (max 500 chars) for a free-form note.
- Persisted to a new table:

```sql
CREATE TABLE IF NOT EXISTS ask_feedback (
  id          BIGSERIAL    PRIMARY KEY,
  ask_id      BIGINT       REFERENCES ask_history(id) ON DELETE CASCADE,
  email       TEXT         NOT NULL,
  rating      TEXT         NOT NULL CHECK (rating IN ('helpful','confusing','wrong')),
  note        TEXT,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ask_feedback_ask ON ask_feedback (ask_id);
```

### 2. Aggregate dashboard (admin app, read-only)
- New tab in `app-admin-learneu-demo`: `Quality`.
- KPIs:
  - `p50` / `p95` `latency_ms` over the last 24 h (from `ask_history`).
  - % of answers blocked by Content Safety.
  - Helpful/Confusing/Wrong ratio per role.
  - Teacher Q&A median response time.
- Backed by SQL views (`v_quality_kpis_24h`, `v_quality_feedback`) created alongside the schema; the view definitions live in `schema.sql`.

### 3. Optional groundedness probe
- For prompts containing `Bildungsstandards` or `Kerndoelen`, run a regex check on the answer to confirm at least one curriculum ID (`[A-Z]{2}-[A-Z]+-Y\d+-[A-Z]+-\d+`) is cited; flag as `low_groundedness` in `ask_feedback.note` automatically when missing.

## API
- `POST /api/chat/feedback`         — `{ askId, rating, note? }` -> 201
- `GET  /api/admin/quality/kpis`    — admin only, returns the four headline KPIs
- `GET  /api/admin/quality/feedback?limit=50` — admin only, latest free-form notes

## Acceptance
- Clicking `Helpful` after an answer inserts a row in `ask_feedback` with matching `ask_id` (verifiable in `psql`).
- The admin Quality tab displays non-zero values once at least 5 prompts have been issued in the demo session.
