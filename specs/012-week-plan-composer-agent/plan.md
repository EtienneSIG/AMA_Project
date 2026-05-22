# Implementation Plan: Week-Plan Composer Agent

**Branch**: `012-week-plan-composer-agent` | **Date**: 2026-05-22 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/012-week-plan-composer-agent/spec.md`

## Summary

Ship the first runtime agentic surface in the deployed apps: a Week-Plan
Composer that chains AI Search → Azure OpenAI → Content Safety to draft a
5-day study plan for a learner. The plan is *never* auto-published; it is
queued for teacher review with a diff against the previous plan. Acceptance
publishes the plan to the learner's "My progress" tab (spec 001). The agent
hard-pauses on three release gates (override > 10 %, safety > 0.1 %, cohort
disparity > 5 pp) and on consent withdrawal (spec 008). This is the most
sensitive feature in the backlog: it is a new high-risk runtime surface under
the EU AI Act and depends on every prior wave being merged.

## Technical Context

**Language/Version**: Node.js 20 (Express) for the agent loop and the new
endpoint; Teacher Console reviewer UI in the existing teacher app.

**Primary Dependencies**: Azure AI Search (curriculum index); Azure OpenAI
via APIM (EU North); Azure AI Content Safety; spec 008 capability flag;
spec 010 cohort metrics; existing `_shared/` middleware.

**Storage**: Azure SQL Database (EU North). New tables `week_plans`,
`week_plan_days`, `week_plan_decisions`, `week_plan_pauses` (the last one
records auto-pause events for audit).

**Testing**: Contract test on the `POST /api/week-plan/propose` gate
(refuses to persist without `teacher_approved=true`); unit test on the
release-gate auto-pause logic; integration test of the full chain on
seed data; replay test that the same seed reproduces the same candidate
items.

**Target Platform**: Cron runner in EU North App Service (existing slot);
Teacher Console UI; learner-web tab card.

**Project Type**: Web application + agent loop.

**Performance Goals**: Agent run ≤ 30 s per learner; teacher diff page
render ≤ 700 ms p95; plan card render in learner web app ≤ 5 s of accept
(SC-006).

**Constraints**: No raw learner PII in any AOAI prompt (FR-003); teacher
gate is server-side enforced (FR-005); release-gate auto-pause is
non-overridable in code (the only resume path is a Responsible AI Evaluator
action recorded in `week_plan_pauses`).

**Scale/Scope**: Nightly across ~3 000 opted-in learners; surge capacity
during teacher review hours.

## Constitution Check

| Principle | Gate | How this plan complies |
|-----------|------|------------------------|
| I. EU-resident, data-minimised | PASS | EU North; pseudonymous-only payloads to AOAI. |
| II. GDPR Art. 8 children | PASS | Consent withdrawal hard-gates the agent (FR-010). |
| III. EU AI Act high-risk | **PASS — new high-risk surface** | Annex IV fragment added; Art. 9/12/14 instrumented; release gates baked in. |
| IV. Teacher-in-the-loop | PASS | Server-side teacher-approved gate; no auto-publish. |
| V. Pedagogical sign-off | PASS | ZPD targeting at P=0.7 designed by Learning Sciences. |
| VI. Outcome-contract driven | PASS | Release gates protect the outcome-gap KPI; override and disparity captured. |
| VII. Reproducible, spec-driven | PASS | Tool trace logged; seeded AI Search retrieval. |

**EU AI Act articles touched**:

| Article | Surface affected | Evidence |
|---------|------------------|----------|
| Art. 9 — risk management | New runtime high-risk surface; risk register entry "week-plan-composer-012" with auto-pause as mitigation. | `demo/compliance/risk-register.md`. |
| Art. 10 — data governance | AI Search corpus = curriculum only; documented in the index header. | Curriculum index manifest. |
| Art. 12 — record-keeping | Per-run: tool sequence, model version, prompt hash, safety verdict, cohort keys (FR-011). Per-decision: actor, timestamp, edits, comment (FR-006). | `week_plans` + `week_plan_decisions`. |
| Art. 13 — transparency | Learner card shows teacher attribution + accepted timestamp (FR-008). | Plan card in "My progress" tab. |
| Art. 14 — human oversight | Mandatory teacher review with diff; server-side gate (FR-005); auto-pause on release-gate breaches (FR-009). | Reviewer UI + gate middleware + pause table. |
| Art. 15 — robustness | Auto-pause cuts off the agent on metric drift; seeded retrieval ensures determinism. | `week_plan_pauses` + replay test. |

**DPIA delta**: ✅ requires an update to `demo/compliance/dpia-learnEU-v1.md`:

- New processing purpose: *automated study-plan drafting*.
- New data category: pseudonymous *mastery vector* (already collected; new
  recipient = the agent).
- New recipient: AI Search index + AOAI deployment (both EU North, both
  inside the existing tenant).
- New retention: tool-trace metadata retained for 7 years (Art. 12).

**Human-oversight surface**: Teacher Console "Week-Plan Reviews" queue is
the gate. Auto-pause on metric drift is a defensive layer: the **only**
resume path is a manual Responsible AI Evaluator action recorded in
`week_plan_pauses` (auditable).

## Project Structure

### Documentation (this feature)

```text
specs/012-week-plan-composer-agent/
├── spec.md
├── plan.md                       # THIS FILE
├── checklists/
│   └── compliance.md
└── tasks.md
```

### Source Code (repository root)

```text
demo/
├── apps/
│   ├── learner-web/
│   │   ├── routes/week-plan.js                 # GET /api/week-plan/me
│   │   └── public/
│   │       └── js/tab-progress.js              # add "Week plan" card (spec 001 host)
│   ├── teacher-console/
│   │   ├── routes/week-plan-reviews.js         # P2 queue + diff
│   │   ├── public/
│   │   │   ├── week-plan-reviews.html
│   │   │   └── js/week-plan-diff.js
│   │   └── services/week-plan-decisions.js
│   └── agent-week-plan/                        # NEW agent app
│       ├── index.js                            # cron + on-demand entry
│       ├── chain/
│       │   ├── retrieve.js                     # AI Search step
│       │   ├── compose.js                      # AOAI step (pseudonymous payload)
│       │   └── safeguard.js                    # Content Safety step
│       ├── routes/propose.js                   # POST /api/week-plan/propose (gate)
│       ├── services/release-gate.js            # auto-pause logic
│       └── services/tool-trace.js              # Art. 12 logger
│
├── scripts/
│   ├── db-sync.ps1                             # 4 new tables
│   └── db-verify.ps1                           # week_plan_pauses chain check
│
├── compliance/
│   ├── dpia-learnEU-v1.md                      # §"Week-Plan Composer" delta
│   ├── risk-register.md                        # row "week-plan-composer-012"
│   └── annex-iv/
│       └── week-plan-composer.md               # new Annex IV fragment
│
├── observability/
│   └── week-plan-gates.kql                     # release-gate dashboard query
│
└── tests/
    ├── contract/week-plan-teacher-gate.test.ts # FR-005 enforcement
    ├── unit/week-plan-release-gate.test.ts     # FR-009 auto-pause
    ├── unit/week-plan-no-pii.test.ts           # FR-003 prompt scrub
    └── integration/week-plan-e2e.spec.ts
```

**Structure Decision**: Standalone `agent-week-plan` app under `demo/apps/`
to keep the agent loop isolated from synchronous learner traffic and to
make the cron schedule explicit. Re-uses `_shared/` middleware and the
existing AOAI/APIM/Content Safety integrations. Four new tables; one new
Annex IV fragment; three new test files.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Standalone `agent-week-plan` app vs co-locating in `learner-web` | Separates cron + agentic workloads from synchronous learner traffic; makes scheduling and rate-limits explicit; gives the auto-pause logic a clear ownership boundary. | Co-locating in `learner-web` was rejected because it would mix the auto-pause kill-switch with critical learner request handlers and complicate the release-gate audit. |
| Auto-pause table `week_plan_pauses` separate from `week_plans` | Audit clarity: pauses are about the agent surface, not about individual plans; manual resumes are recorded against the pause, not the plan. | A pause flag on `week_plans` was rejected because pauses are cohort-level and there would be no clear actor-and-timestamp record of the resume. |
