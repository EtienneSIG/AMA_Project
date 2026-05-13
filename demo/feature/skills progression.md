# Prompt A: Skills-progression Data Model

## Goal
Persist a true mastery profile per learner so the adaptive picker, the teacher dashboard
and the parent view all read from the same source of truth — Postgres in West Europe.

## Domain entities

| Entity                    | Postgres table              | Status                          |
|---------------------------|-----------------------------|---------------------------------|
| Curriculum competency     | `curricula`                 | Done                            |
| Adaptive item attempt     | `item_attempts`             | Done                            |
| Skill / competency mastery| `skill_mastery` (NEW)       | Required by this feature        |
| Item to skill mapping     | `item_skills`   (NEW)       | Required by this feature        |
| Daily activity rollup     | `learner_activity` (NEW)    | Required for streaks / parents  |

## API surface (additions, gated to `student` + `admin` self / `teacher` cross-class)
- `GET  /api/learner/mastery` — returns `{ skillId, label, level, attempts, correct, lastSeen }[]` for the signed-in student.
- `POST /api/learner/mastery/recompute` — admin-only; rebuilds the table from `item_attempts` (idempotent).
- `GET  /api/teacher/class/mastery?cohort=DE-Y7` — teacher view, aggregated by competency.

## Mastery formula (demo-grade, deterministic so no ML drift)
For each `(email, skill_id)`:
```
attempts  = count(item_attempts where item.skill_id = X)
correct   = count(... and correct = true)
recent    = same but within last 30 days
level     = clip(0.4 * (correct/attempts) + 0.6 * (recent_correct/recent_attempts), 0, 1)
```
Rendered as one of `Beginner | Practising | Proficient | Mastered`
at thresholds `0.4 / 0.65 / 0.85`.

## UI

### Learner web — new card "My progress"
- Position: under the Adaptive item picker, above Ask/Explanation.
- Shows the top 6 skills with a progress bar (level), counter `correct/attempts`, and a small `Last seen` timestamp.
- Refreshed after every adaptive attempt and on page load.

### Teacher console — new section "Class mastery"
- Position: under Learner questions inbox.
- Heat-map: rows = pseudonymous learner, columns = skill, cell colour = level bucket.
- Click a cell -> opens a modal with the underlying `item_attempts` rows for that pair (read-only — for human oversight, EU AI Act Art. 14).

## Persistence rules
- `skill_mastery` is rebuilt on demand (cron-free demo); on each `/api/learner/attempt` insert, the affected `(email, skill_id)` row is upserted with the new counters.
- `item_skills` is seeded from a static map in `demo/data/items_to_skills.csv` shipped with the apps and re-loaded on `db.init()`.

## Acceptance
- A new attempt POSTed to `/api/learner/attempt` is reflected within <= 2 s in the learner's `My progress` card AND in the teacher's `Class mastery` heat-map.
- Disabling Postgres (`PG_HOST=`) makes the feature degrade gracefully (UI shows "Database not configured", no 500).
