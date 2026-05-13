# Prompt D: Learner Web — Feature Set

The learner-facing app is the primary surface where the K-12 student interacts
with LearnEU. Everything must be EU-resident, age-appropriate, and persisted in
Postgres so the experience survives a tab close.

## Status legend
- DONE — already shipped and verified in production.
- PARTIAL — backend or UI exists but is incomplete.
- TODO — covered by this brief.

## 1. Adaptive item picker — DONE
- Client-side ONNX inference (`/models/learner.onnx`) with a JS fallback.
- Each attempt POSTs to `/api/learner/attempt`; rows land in `item_attempts`.
- 2-column "Solve this question" / "Type your answer" layout.

## 2. Ask the AI tutor — DONE
- `/api/chat` proxies to APIM -> Azure OpenAI in West Europe.
- Age-aware system prompt (`buildSystemPrompt`).
- Markdown rendered with sanitisation; mermaid + inline SVG diagrams supported.
- Every prompt and answer scanned by Content Safety; verdicts in `content_safety_results`.

## 3. Study sheets — DONE
- `Save to Study sheet` button under the Explanation card.
- Backed by the `sheets` table; `GET /api/sheets`, `GET /api/sheets/:id`, `POST /api/sheets`, `DELETE /api/sheets/:id`.
- Sheets modal (top-right) lists, opens and deletes sheets.

## 4. Ask your teacher (async Q&A) — DONE
- Card under Ask/Explanation; backend in `teacher_questions`.
- Routes: `POST /api/teacher-questions`, `GET /api/teacher-questions/mine`.

## 5. My progress — TODO (depends on `skills progression.md`)
- Top 6 skills with progress bars; renders from `GET /api/learner/mastery`.
- Update on each adaptive attempt and on page load.

## 6. Daily streak & badges — TODO
- New table `learner_activity (email, day DATE, attempts INT, correct INT, ...)` populated by a trigger on `item_attempts`.
- Sidebar widget: N-day streak + earned badges (Beginner, Reviewer, Mastered x3, ...).

## 7. Revision quiz from a study sheet — TODO
- "Quiz me" button on each sheet -> builds a 5-question quiz from the sheet's content via `/api/chat` with a fixed system prompt; results recorded in `item_attempts` with synthetic `item_id = 'SHEET:<sheetId>:Q<n>'`.

## 8. Bookmark teacher answers — TODO
- Star icon next to each answered teacher reply; saves a copy as a study sheet with `prompt = subject`, `answer = teacher reply` (uses existing `createSheet`).

## 9. Profile & language — DONE
- Avatar modal: first/last name, age, social handle, language.
- Language drives `${u.language}` injection in the system prompt.

## 10. Sign-out & session telemetry — DONE
- Sign-out button in the profile modal.
- All login / logout / forbidden events go to `connection_logs`.

## Cross-cutting non-functional requirements
- All state that "would be lost on refresh" MUST be persisted to Postgres.
- All user-generated text MUST go through `cs.analyze` before storage or display.
- All API failures MUST degrade gracefully (banner + no UX block).
- The page MUST stay usable on a 12.9" tablet in portrait (already validated by `main.grid2`).
