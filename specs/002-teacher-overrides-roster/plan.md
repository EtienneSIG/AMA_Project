# Implementation Plan: Teacher Overrides Audit Trail & Pseudonymous Class Roster

**Branch**: `002-teacher-overrides-roster` | **Date**: 2026-05-18 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/002-teacher-overrides-roster/spec.md`

## Summary

Ship Article 14 (human oversight) and Article 12 (logging) for the AI-driven
mastery layer: a teacher can override any AI-suggested mastery level on the
class heat-map, with a mandatory rationale; every write is persisted append-only
in `teacher_overrides`, every read goes through a role-gated, audit-logged API.
A new "Class" tab provides a strictly pseudonymous roster so the override
surface scales to a real class without leaking minor PII.

## Technical Context

**Language/Version**: Node.js 20 LTS (Azure App Service B-tier, existing
`demo/apps/_shared/server.js`).

**Primary Dependencies**: Express 4, `pg` (PostgreSQL driver), existing
shared modules `auth.js`, `db/index.js`, `db/schema.sql`. No new package added.

**Storage**: Azure Database for PostgreSQL Flexible Server (West Europe),
already provisioned by `demo/infra/main.bicep`. New table `teacher_overrides`
(append-only) and updated read-views to honour the latest override.

**Testing**: Existing `demo/scripts/acceptance_tests.ps1` extended with three
new authenticated probes (override write, audit read, roster read). Contract
test on roster response shape executed on every deploy.

**Target Platform**: Web (Chromium-based browsers on school Chromebooks +
Edge on teacher laptops). Backend on Azure App Service; static UI served
from the same App Service.

**Project Type**: Web service + multi-tenant SPA (existing layout in
`demo/apps/`).

**Performance Goals**: p95 ≤ 250 ms on `POST /api/teacher/overrides` and
`GET /api/teacher/class/roster` from EU-West edge; cell→modal interaction
≤ 200 ms client-side.

**Constraints**: All data flows stay inside West Europe; no new third-party
SDK; every AI-adjacent log line omits raw learner PII. Bundle delta on the
teacher console ≤ 15 KB gzipped.

**Scale/Scope**: 4.1 M learners programme-wide, but per teacher console
session ≤ 35 learners × ≤ 200 skills = 7 000 heat-map cells. Override write
volume estimated ≤ 3 / teacher / day.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Initial Check | Re-check after Phase 1 |
|---|---|---|
| I. EU-Resident, Data-Minimised | ✅ Same EU Postgres; roster strictly pseudonymous. | TBC |
| II. GDPR Art. 8 | ✅ No new collection from minors; pseudonymous reads only; DPIA delta below. | TBC |
| III. EU AI Act high-risk | ✅ Implements Art. 12 logging + Art. 14 oversight + Annex IV fragment below. | TBC |
| IV. Teacher-in-the-Loop | ✅ This *is* the oversight surface. | TBC |
| V. Pedagogical sign-off | ⚠️ Pending — Learning Sciences must sign off the four-level vocabulary. | TBC |
| VI. Outcome-contract driven | ✅ SC-005 → −45% admin time; SC-006 → 100% GDPR. | TBC |
| VII. Reproducible, spec-driven | ✅ Spec/plan/tasks committed before code; deploy via the 8-step cycle. | TBC |

No violations to track in the Complexity Tracking table.

### EU AI Act articles touched

- **Art. 9 (risk management)** — add an entry to the risk register
  `plan/06-risks-register.md` for "AI mastery rating miscalibrated";
  mitigation = this feature's override surface.
- **Art. 10 (data governance)** — append-only audit table; no new learner
  data class collected.
- **Art. 12 (logging)** — structured log line per write and per read,
  PII-free, retained 12 months in Log Analytics (EU region).
- **Art. 13 (transparency)** — UI copy in the override modal explains
  "Your override will be used instead of the AI suggestion and recorded
  for inspection by your school's principal and the platform's DPO".
- **Art. 14 (human oversight)** — primary deliverable: every AI-suggested
  level overridable in ≤ 20 s; admin impersonation is read-only.
- **Art. 15 (accuracy / robustness / cybersecurity)** — server-side role
  gate + idempotency key; contract test on roster shape prevents
  regression.

Annex IV fragment to be appended to
`plan/04-compliance-eu-ai-act-gdpr.md` upon merge.

### DPIA delta

No new personal-data class collected. Existing `teacher_email` and
`learner_email` (already in scope) are reused; `learner_email` is the
pseudonymous identifier the demo uses end-to-end. New artefact = the
`teacher_overrides` audit table (purpose: legal obligation Art. 12 + 14;
retention: 12 months rolling; access: teacher to own class, DPO/admin
unrestricted, learner via DSAR through the existing access endpoint).

### Human-oversight surface

- **Where**: pencil icon on every heat-map cell + override modal.
- **Who**: teacher with role `teacher` (server-checked) on her own class;
  admin in read-only impersonation cannot write.
- **What is captured**: `ai_level`, `human_level`, free-text `rationale`.
- **How it propagates**: existing mastery read endpoints return
  `human_level` whenever a matching override exists.
- **How it is audited**: append-only table + structured log; retrievable
  by DPO/admin via `GET /api/teacher/overrides?teacher=...&from=...&to=...`.

## Project Structure

### Documentation (this feature)

```text
specs/002-teacher-overrides-roster/
├── spec.md              # Phase -1 (/speckit.specify)
├── plan.md              # This file (/speckit.plan)
├── tasks.md             # Phase 2 (/speckit.tasks)
└── checklists/
    └── compliance.md    # /speckit.checklist output
```

### Source Code (repository root)

```text
demo/
└── apps/
    ├── _shared/
    │   ├── db/
    │   │   ├── schema.sql        # + teacher_overrides table + view update
    │   │   └── index.js          # + recordOverride / listOverrides / listRoster
    │   ├── server.js             # + 3 routes (POST/GET overrides, GET roster)
    │   └── sync.ps1              # propagates shared files into each app
    ├── teacher-console/
    │   └── public/index.html     # + pencil icon, override modal, Class tab
    └── build-zip.ps1
demo/
└── scripts/
    └── acceptance_tests.ps1      # + 3 authenticated probes
specs/
└── 002-teacher-overrides-roster/  # this folder
plan/
├── 04-compliance-eu-ai-act-gdpr.md  # + Annex IV fragment for this feature
└── 06-risks-register.md            # + risk entry "AI mastery miscalibrated"
```

**Structure Decision**: Web app (Option 2 from the template). Backend is the
shared Express server under `demo/apps/_shared/`; the only "frontend" change
lives in the teacher console SPA. The eight-step delivery cycle of
[demo/feature/EXECUTION-PLAN.md](../../demo/feature/EXECUTION-PLAN.md) is the
authoritative deploy contract.

## Complexity Tracking

> No Constitution Check violations to justify for this feature.
