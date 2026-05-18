# Feature Specification: Model-Oriented Skill Catalogue

**Feature Branch**: `004-model-oriented-skill-catalogue`

**Created**: 2026-05-18

**Status**: Draft (back-ported from `demo/feature/model oriented skills.md`)

**Input**: User description: "Decouple what we teach (curriculum competencies
coming from each ministry) from what the AI tutor and the adaptive picker
reason about (atomic, model-friendly skills). One competency can map to many
skills and vice-versa."

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Stable feature space for the AI (Priority: P1)

A learning engineer renames a Bildungsstandards outcome in DE. The
adaptive picker's input feature space MUST NOT change; the AI continues to
reason about the same atomic skills and only the human-facing label
moves.

**Why this priority**: Without decoupling, every ministry edit forces an
ONNX retraining, breaking SC-005 of feature 003 and the localisation
6-week KPI.

**Independent Test**: Update one row in the curriculum source JSON,
re-seed, confirm the `skill_id` referenced by the picker is unchanged.

**Acceptance Scenarios**:

1. **Given** a competency `DE-MATH-Y7-FRAC-02` mapped to `SK-FRAC-ADD`,
   **When** the competency label is changed in the source JSON, **Then**
   `GET /api/data/skills/SK-FRAC-ADD` still returns the same `id`,
   `domain`, `difficulty` and `bloom`.
2. **Given** a new ministry outcome, **When** added to the source JSON
   and `skill_competency_map.csv`, **Then** the existing skill picks up
   the new competency reference without code change.

### User Story 2 — Teacher filters by official competency (Priority: P2)

A teacher wants to find all atomic skills the AI can drill against a
specific ministry competency, to plan a remediation session.

**Independent Test**: `GET /api/data/skills?competency=DE-MATH-Y7-FRAC-02`
returns ≥ 1 skill from the seed.

**Acceptance Scenarios**:

1. **Given** the teacher catalogue modal, **When** she filters by domain
   `numeracy`, **Then** only matching skills are rendered.
2. **Given** the same modal, **When** she searches by free text,
   **Then** matching labels are highlighted.

### User Story 3 — Glossary localisation attaches to skills (Priority: P2)

A localisation lead attaches a NL glossary entry to skill `SK-FRAC-ADD`
without touching the free-text competency labels coming from the ministry.

**Independent Test**: Add a glossary row, request the skill in `nl-NL`,
confirm the localised gloss appears in the tutor's vocabulary hints.

**Acceptance Scenarios**:

1. **Given** a glossary row `(SK-FRAC-ADD, "breuk", "nl-NL")`, **When**
   the tutor renders a vocabulary hint for an NL learner, **Then** the
   localised term is used.

### Edge Cases

- A skill referenced by `item_skills` but missing from `skills` MUST be
  surfaced as a seed error (not silently dropped).
- `skill_competency_map.weight` MUST default to `1.0` and must be a real
  number between 0 and 1.
- An item mapped to no skill MUST be flagged as `unmapped` in the
  catalogue modal (not crash the heat-map).
- Re-seeding MUST be idempotent: same CSV → same row count, same
  `loaded_at` only updates when content changes.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: New table `skills (id, domain, label, difficulty, bloom,
  loaded_at)` MUST be created on `db.init()`.
- **FR-002**: New table `skill_competency_map (skill_id, competency_id,
  weight)` MUST be created with primary key
  `(skill_id, competency_id)`.
- **FR-003**: New table `item_skills (item_id, skill_id)` MUST be
  created with primary key `(item_id, skill_id)`.
- **FR-004**: `seedReferenceData()` MUST idempotently upsert from
  `demo/data/skills.csv`, `skill_competency_map.csv`,
  `items_to_skills.csv`.
- **FR-005**: `GET /api/data/skills` MUST return the full catalogue;
  any role.
- **FR-006**: `GET /api/data/skills/:id` MUST return the skill plus its
  linked competencies and a sample of items; any role.
- **FR-007**: `GET /api/data/skills?competency=<id>` MUST return reverse
  lookups for the teacher console.
- **FR-008**: The adaptive picker MUST enrich its item record with
  `skill_id` (weights the `topic` feature) and `bloom` (gates review
  items: `review = bloom == 'remember'`).
- **FR-009**: The teacher console MUST expose a "Skill catalogue" modal
  reachable from the Class mastery heat-map header, with search by
  label and filter by domain.
- **FR-010**: All routes MUST be read-only for non-admin roles; admins
  may trigger a re-seed via the existing `POST /api/data/reseed` route.
- **FR-011**: No new outbound network call; no new third-party SDK; all
  storage stays in West Europe.

### Key Entities

- **Skill**: `(id, domain, label, difficulty, bloom, loaded_at)`.
- **SkillCompetencyLink**: `(skill_id, competency_id, weight)`.
- **ItemSkill**: `(item_id, skill_id)` — see also feature 003.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Adding a row to `skills.csv` and re-seeding produces a new
  column in the Class mastery heat-map (feature 003) with **zero** code
  change.
- **SC-002**: `GET /api/data/skills?competency=DE-MATH-Y7-FRAC-02`
  returns ≥ 1 skill in the seed.
- **SC-003**: Renaming a competency in the source JSON does **not**
  change any `skill_id`; the adaptive picker's feature space is stable.
- **SC-004**: Contributes to the **12 mo → 6 w localisation cycle** KPI
  by isolating glossary localisation to the `skills` layer.
- **SC-005**: Catalogue modal renders 500 skills in ≤ 200 ms on a
  school-grade Chromebook.

## Assumptions

- `curricula` table already exists; competency IDs in
  `skill_competency_map.csv` reference it.
- Feature 003 (`skill_mastery`) is deployed; this feature only adds the
  catalogue layer below it.
- Re-seed endpoint `POST /api/data/reseed` exists and is admin-gated.

## Constitution Check

| Principle | How this spec complies |
|---|---|
| I. EU-Resident, Data-Minimised | No personal data added; reference data only. |
| II. GDPR Art. 8 | No new collection from minors. |
| III. EU AI Act high-risk | Improves AI traceability (Art. 11 technical file). |
| IV. Teacher-in-the-Loop | Catalogue modal gives teachers visibility on what the AI reasons about. |
| V. Pedagogical sign-off | Skill labels and Bloom levels signed off by Learning Sciences. |
| VI. Outcome-contract driven | SC-004 → 6-week localisation cycle. |
| VII. Reproducible, spec-driven | Idempotent seed; spec ships before code. |
