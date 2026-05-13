# Prompt E: Teacher Console — Feature Set

The teacher console is the human-oversight surface (EU AI Act Art. 14).
Every recommendation produced by AI must be visible to, and overridable by,
a teacher. State must persist in Postgres so the audit trail survives.

## Status legend
- DONE — already shipped and verified in production.
- PARTIAL — exists but needs extension.
- TODO — covered by this brief.

## 1. Ask the AI assistant — DONE
- Same `/api/chat` plumbing as the learner app, with a teacher-flavoured system prompt that emphasises curriculum-aligned activities and Article 14 checkpoints.

## 2. Study sheets — DONE
- Shared `sheets` table; teacher-saved sheets get `role = 'teacher'`.

## 3. Learner questions inbox — DONE
- `GET /api/teacher-questions/inbox?status=pending|answered|<all>`.
- `POST /api/teacher-questions/:id/answer` records `teacher_email`, `teacher_name`, `answered_at`.
- Filter dropdown (Pending / All / Answered) + Refresh button.

## 4. Class mastery dashboard — TODO (depends on `skills progression.md`)
- Heat-map of pseudonymous learner x skill.
- Click a cell -> modal with the underlying `item_attempts` rows.
- "Recommend a remediation" button -> calls `/api/chat` with the context pre-filled and saves the resulting plan to `sheets` for sharing.

## 5. Override / audit trail — TODO
- New table `teacher_overrides` capturing manual changes a teacher makes to AI-suggested mastery levels:

```sql
CREATE TABLE IF NOT EXISTS teacher_overrides (
  id              BIGSERIAL    PRIMARY KEY,
  teacher_email   TEXT         NOT NULL,
  learner_email   TEXT         NOT NULL,
  skill_id        TEXT         NOT NULL,
  ai_level        REAL,
  human_level     REAL         NOT NULL,
  rationale       TEXT,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);
```
- API: `POST /api/teacher/overrides`, `GET /api/teacher/overrides?learner=...`.
- UI: pencil icon on every cell of the heat-map; modal asks for new level (Beginner / Practising / Proficient / Mastered) + free-text rationale.

## 6. Curriculum browser — TODO
- Right-hand drawer listing competencies from `curricula` (filterable by country + grade + subject), each item draggable into the prompt textarea.
- Re-uses the existing `/api/data/curricula` endpoint.

## 7. Lesson planner with curriculum citations — PARTIAL (works today via Ask)
- Add a "Cite a competency" pill above the Ask textarea that injects the selected competency ID into the prompt; the model is instructed (via system prompt) to cite the ID in its answer for traceability.

## 8. Class roster (read-only synthetic) — TODO
- New tab "Class": a table of synthetic learners (`learners` view with pseudonyms only, no PII). Teachers see counts and progress, never names.

## 9. Quality KPIs preview — TODO (mirror of admin Quality tab, restricted to own class)
- Median teacher response time, % of pending > 24 h, blocked-by-CS rate.

## Cross-cutting non-functional requirements
- Every teacher action that mutates state MUST be persisted to Postgres with `teacher_email` + `created_at` (audit-grade).
- The UI MUST never show real PII for minors; pseudonyms only.
- Role-gating: every teacher-only route MUST check `req.user.role` server-side in addition to App Service role inference.
