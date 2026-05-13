# Prompt B: Model-oriented Skill Catalogue

## Goal
Decouple **what we teach** (curriculum competencies coming from each ministry) from
**what the AI tutor and the adaptive picker reason about** (atomic, model-friendly
"skills"). One curriculum competency can map to many skills and vice-versa.

## Why
- The adaptive picker needs a stable feature space; renaming a Bildungsstandards outcome must not break the model.
- Teachers want to filter by official competency; the AI needs short, opaque IDs.
- Glossary localisation (de-DE / nl-NL) attaches to skills, not to free-text labels.

## Postgres schema (additions to `apps/_shared/db/schema.sql`)

```sql
CREATE TABLE IF NOT EXISTS skills (
  id            TEXT        PRIMARY KEY,           -- e.g. SK-FRAC-ADD
  domain        TEXT        NOT NULL,              -- numeracy | geometry | algebra | ...
  label         TEXT        NOT NULL,              -- "Add fractions with unlike denominators"
  difficulty    REAL        NOT NULL DEFAULT 0.5,  -- 0..1, used as the prior in the ONNX picker
  bloom         TEXT,                              -- remember | understand | apply | ...
  loaded_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS skill_competency_map (
  skill_id        TEXT NOT NULL REFERENCES skills(id),
  competency_id   TEXT NOT NULL REFERENCES curricula(id),
  weight          REAL NOT NULL DEFAULT 1.0,
  PRIMARY KEY (skill_id, competency_id)
);

CREATE TABLE IF NOT EXISTS item_skills (
  item_id   TEXT NOT NULL,
  skill_id  TEXT NOT NULL REFERENCES skills(id),
  PRIMARY KEY (item_id, skill_id)
);
```

## Seed data
- `demo/data/skills.csv` — `id,domain,label,difficulty,bloom`
- `demo/data/skill_competency_map.csv`
- `demo/data/items_to_skills.csv`

Loaded by `seedReferenceData()` in `apps/_shared/db/index.js` (idempotent upsert).

## API

| Method | Route                                | Caller          | Returns                                   |
|--------|--------------------------------------|-----------------|-------------------------------------------|
| GET    | `/api/data/skills`                   | any role        | full skill catalogue                      |
| GET    | `/api/data/skills/:id`               | any role        | skill + linked competencies + sample items|
| GET    | `/api/data/skills?competency=NL-...` | teacher         | reverse lookup                            |

## Adaptive picker integration
- The ONNX item record is enriched with `skill_id` (used to weight the `topic` feature) and `bloom` (used to gate review items: `review = bloom == 'remember'`).
- The picker still runs client-side; the catalogue is fetched once on page load and cached in `localStorage` under `learneu.skills.v1`.

## UI

### Teacher console — "Skill catalogue" modal
- Opened from the `Class mastery` heat-map header.
- Table: skill ID · domain · label · linked competencies · #items.
- Search by label, filter by domain.

## Acceptance
- Adding a row to `skills.csv` and re-seeding produces a new column in the `Class mastery` heat-map with no code change.
- A request `/api/data/skills?competency=DE-MATH-Y7-FRAC-02` returns >= 1 skill for the existing seed.
