# Implementation Plan: Localisation NL→DE Pipeline (E2E)

**Branch**: `009-localisation-nl-de-pipeline` | **Date**: 2026-05-22 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/009-localisation-nl-de-pipeline/spec.md`

## Summary

Build an end-to-end NL→DE localisation pipeline for one curriculum unit, with
a Teacher Console review gate and full provenance on publication. The
pipeline is the carrier for rubric category #5 ("Localisation pipeline +
Fabric mirroring + federated round not E2E"). DPIA delta is **none** (no
personal data). The human-oversight surface is the reviewer queue.

## Technical Context

**Language/Version**: PowerShell 7+ for the pipeline orchestration; Node.js 20
inside the Teacher Console for the reviewer queue UI.

**Primary Dependencies**: APIM gateway → Azure OpenAI (EU North); Azure SQL
Database for `localisation_jobs`, `translation_artifacts`, `reviewer_decisions`;
Content Safety API; existing Teacher Console route stack.

**Storage**: Azure SQL Database (EU North). Three new tables (job, artefact,
decision). File artefacts under `demo/pipelines/localisation/runs/<job_id>/`.

**Testing**: Contract test that asserts zero PII in the AOAI payload;
unit test for separation-of-duties; integration test that runs ingest →
translate → review → publish against the demo unit; one full demo run
captured in `demo/pipelines/localisation/runs/RUN-<date>.md`.

**Target Platform**: Pipeline runs on the Demo Deployment Agent's PowerShell
runner; reviewer queue served by the existing Teacher Console (EU North App
Service slot).

**Project Type**: Web application + pipeline.

**Performance Goals**: ≤ 6 minutes pipeline time for the demo unit (SC-001
proxy); reviewer queue page render ≤ 500 ms p95.

**Constraints**: EU-only data path; no learner PII in any prompt (FR-004);
glossary-term pass-through enforced; separation of duties enforced (FR-010).

**Scale/Scope**: 1 demo unit (`demo/data/math_unit_fractions.md`); design must
generalise to 8 EU markets (NL→DE/PL/RO/FR-BE in scope of the programme).

## Constitution Check

| Principle | Gate | How this plan complies |
|-----------|------|------------------------|
| I. EU-resident, data-minimised | PASS | EU North end-to-end; curriculum content only. |
| II. GDPR Art. 8 children | N/A | No personal data processed. |
| III. EU AI Act high-risk | PASS | Reviewer queue gates publication; provenance feeds Annex IV. |
| IV. Teacher-in-the-loop | PASS | Mandatory reviewer accept/reject; separation of duties. |
| V. Pedagogical sign-off | PASS | Glossary curated by Localisation Lead; reviewer is teacher. |
| VI. Outcome-contract driven | PASS | SC-001 (≤ 6 weeks) is the market-readiness gate. |
| VII. Reproducible, spec-driven | PASS | Every run produces a RUN report; spec ships before code. |

**EU AI Act articles touched**:

| Article | Surface affected | Evidence |
|---------|------------------|----------|
| Art. 10 — data governance | Translation corpus = LearnEU glossary + curriculum only; documented in the glossary file header. | `demo/data/glossaries/learnEU-nl-de.json` provenance block. |
| Art. 12 — record-keeping | Every translation call logs prompt hash, model version, safety verdict; every reviewer decision logged with reviewer id. | `RUN.md` + `reviewer_decisions` table. |
| Art. 13 — transparency | Published artefact carries `provenance` block exposing model version + reviewer id. | `de-bildungsstandards-math-y7.json` `provenance` field. |
| Art. 14 — human oversight | Reviewer queue is mandatory; `safety_rejected` jobs never reach it; separation of duties enforced. | Queue route + `reviewer_decisions` constraint. |
| Art. 15 — robustness | Retry on transient APIM failure; permanent failure surfaced; glossary-term linter on publish. | `localise.ps1` retry logic + post-publish linter. |

**DPIA delta**: **None.** No personal data is processed by the pipeline. A
one-line confirmation is added to `demo/compliance/dpia-learnEU-v1.md`.

**Human-oversight surface**: Teacher Console review queue. Decision logged
per reviewer. Separation of duties: requester ≠ reviewer. Reject feedback
flows back to the Localisation Lead via the existing notification mechanism.

## Project Structure

### Documentation (this feature)

```text
specs/009-localisation-nl-de-pipeline/
├── spec.md
├── plan.md                       # THIS FILE
├── checklists/
│   └── compliance.md
└── tasks.md
```

### Source Code (repository root)

```text
demo/
├── pipelines/
│   └── localisation/
│       ├── localise.ps1                       # P1/P2 orchestration entry point
│       ├── steps/
│       │   ├── ingest.ps1
│       │   ├── translate.ps1                  # AOAI via APIM + Content Safety
│       │   └── publish.ps1
│       ├── lib/
│       │   ├── glossary.ps1
│       │   └── provenance.ps1
│       └── runs/
│           └── RUN-<date>.md                  # one per demo run
│
├── data/
│   ├── math_unit_fractions.md                 # source unit (existing)
│   └── glossaries/
│       └── learnEU-nl-de.json                 # NEW glossary artefact
│
├── apps/
│   ├── teacher-console/
│   │   ├── routes/localisation-queue.js       # P3 queue
│   │   ├── public/
│   │   │   ├── localisation-queue.html
│   │   │   └── js/localisation-review.js      # side-by-side diff
│   │   └── services/localisation-decisions.js
│   └── learner-web/
│       └── data/curricula/
│           └── de-bildungsstandards-math-y7.json   # output artefact
│
├── scripts/
│   └── db-sync.ps1                            # 3 new tables
│
├── DEPLOYMENT-REPORT.md                       # row updated PARTIAL → PASS
│
└── tests/
    ├── contract/localisation-no-pii.test.ts
    ├── unit/localisation-separation-of-duties.test.ts
    └── integration/localisation-e2e.spec.ts
```

**Structure Decision**: One pipeline (PowerShell), one reviewer UI inside the
Teacher Console, one new glossary artefact, one output JSON. Three new
tables, zero new outbound calls beyond the existing APIM → AOAI path.

## Complexity Tracking

> No constitutional violations to justify. The reviewer queue reuses the
> existing Teacher Console queue surface to avoid creating a parallel UI;
> a pipeline-only solution without a reviewer was rejected because it
> violates Principle IV (teacher-in-the-loop) and AI Act Art. 14.
