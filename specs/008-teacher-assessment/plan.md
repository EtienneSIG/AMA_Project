# Implementation Plan: Teacher Assessment, AI Rubric Assist, and At-Risk Dashboards

**Branch**: `008-teacher-assessment` | **Date**: 2026-06-18 | **Spec**: `/specs/008-teacher-assessment/spec.md`

**Input**: Feature specification from `/specs/008-teacher-assessment/spec.md`

## Summary

Deliver a teacher-centered assessment workflow that combines rubric authoring, shared-library reuse, remediation grouping, AI-assisted item/rubric drafting, and at-risk analytics, while enforcing high-risk AI controls. The implementation extends the existing multi-app Node.js architecture (`teacher-console`, `learner-web`, shared helpers), adds Azure OpenAI generation with Azure Content Safety review gates, persists generated artifacts and approvals in EU-hosted PostgreSQL, uses template caching for predictable generation quality, and records full audit trails. No AI-generated artifact can be assigned to learners until explicit teacher review and approval is captured.

## Architecture Overview

This feature adds a governed teacher-assessment pipeline across four bounded layers:

1. Authoring and assessment operations in `demo/apps/teacher-console`.
2. Reuse/governance through shared assessment library metadata and copy workflows.
3. AI drafting service boundary (Azure OpenAI + Content Safety) behind teacher approval controls.
4. Analytics and remediation orchestration that surfaces at-risk learners but keeps interventions teacher-initiated.

All generated content and oversight events are handled as first-class artifacts with immutable audit references. Learner-facing surfaces consume only approved assessment content.

## Technical Context

**Language/Version**: Node.js 22.x, SQL for PostgreSQL schema/helpers, HTML/CSS/vanilla JS for teacher/learner UI

**Primary Dependencies**: `express`, `pg`, shared auth/db modules in `demo/apps/_shared`, Azure OpenAI REST/SDK client, Azure AI Content Safety client, existing role/CSRF middleware patterns

**Storage**: Azure Database for PostgreSQL Flexible Server (EU) for rubrics, rubric scores, shared library metadata, remediation groups, generated-content artifacts, approvals, and audit logs; in-memory + table-backed template cache for rubric/question prompt templates

**Testing**: Feature acceptance coverage in `demo/scripts/acceptance_tests.ps1`, API contract checks, manual teacher workflow verification in `quickstart.md`, compliance checklist verification for AI logging/transparency/oversight

**Target Platform**: Azure App Service (Linux) for demo apps, Azure OpenAI + Azure AI Content Safety in EU regions, PostgreSQL Flexible Server in EU regions

**Project Type**: Multi-app web application (teacher-facing authoring/assessment + learner assignment consumption + shared backend helpers)

**Performance Goals**:
- Draft generation response (AI + safety verdict) <= 8 seconds p95
- Teacher assessment dashboard load <= 2 seconds p95 per class
- At-risk list refresh <= 3 seconds p95 for a standard class cohort
- Template cache hit rate >= 70% for repeated rubric-generation intents

**Constraints**:
- EU-only data processing and storage; no cross-EU transfer
- Teacher approval required before generated artifacts can become assignable
- Content Safety scan required for generated rubrics/questions and teacher qualitative comments before release
- No autonomous grading, placement, or content-access decisions
- Shared-library updates must preserve copy isolation and governance visibility

**Scale/Scope**:
- Pilot scope: teacher-console + learner-web + shared library in one tenant/school hierarchy
- Supports rubric criteria/levels as specified (3-5 levels, 2-5 criteria)
- Supports multiple remediation groups per class and dashboard summaries for at-risk learners
- Covers generated artifact lifecycle: draft -> safety reviewed -> teacher edited -> teacher approved -> assigned

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Pre-Phase 0 Gate

| Principle | Status | Plan handling |
|---|---|---|
| I. EU-Resident, Data-Minimised | PASS | Persist only required assessment, remediation, and generated-artifact metadata in EU-hosted services; logs store prompt-hash and references, not raw unnecessary PII. |
| II. GDPR Art. 8 | PASS | No learner-facing bypass of consent/guardian policy; assessment processing remains under existing child-data controls and DSR surfaces. |
| III. EU AI Act high-risk discipline | PASS | Treat AI rubric/question generation as a high-risk assistive capability across the full obligation set: Art. 5 prohibited-practice checks, Art. 9 risk management, Art. 10 data governance, Art. 12 logging, Art. 13 transparency copy, Art. 14 teacher oversight gates, and Art. 15 robustness/cybersecurity. An Annex IV technical-file fragment is produced for the generation capability. |
| IV. Teacher-in-the-loop | PASS | Every generated output requires explicit teacher review/approval before classroom usage; teacher override path and rejection reasons are logged. |
| V. Pedagogical sign-off | PASS | Shared library governance and generated template sets require Learning Sciences and curriculum-owner review before publish-to-library defaults. |
| VI. Outcome-contract driven | PASS | Supports teacher admin-time reduction and improved intervention targeting through rubric reuse + remediation grouping + at-risk analytics. |
| VII. Reproducible, spec-driven | PASS | Artifacts produced in `specs/008-teacher-assessment/` with explicit verification and compliance checkpoints before implementation. |

**EU AI Act articles touched**:
- **Art. 5**: Prohibited-practice check explicitly enforced (no manipulative profiling, no emotion/facial inference, no autonomous adverse decisions).
- **Art. 9 (Risk Management)**: Documented risk assessment for AI-assisted assessment generation covering hallucinated or biased rubric/question content, age-inappropriate output, over-reliance/automation bias by teachers, and prompt-injection through learner-supplied context; each risk maps to a mitigation (Content Safety gate, mandatory teacher approval, bounded prompts, transparency labelling) and a residual-risk acceptance recorded before publish.
- **Art. 10 (Data Governance)**: Generated-artifact data classes (prompt hash + bounded context, generated text, safety verdict, teacher edits, approval/rejection rationale, lineage metadata) are documented as approved categories with quality, relevance, and bias-monitoring expectations; no new learner-level categories beyond existing child-data controls are introduced.
- **Art. 12**: Structured logging for generation requests, safety outcomes, approvals, overrides, and assignment publication.
- **Art. 13**: Transparency labels on AI-assisted drafts and plain-language explanations for teachers.
- **Art. 14**: Human oversight via teacher review/approve/reject workflow and override controls.
- **Art. 15 (Robustness, Accuracy & Cybersecurity)**: Generation endpoints enforce input validation and prompt-injection hardening on learner-supplied context, fail-closed behavior when Content Safety is unavailable, deterministic refusal on flagged output, role-based access, and EU-only processing for all generation and storage paths.

**Annex IV technical-file fragment**: This feature contributes an Annex IV fragment documenting (a) the intended purpose and assistive (non-autonomous) nature of the assessment-generation capability, (b) the generation pipeline and Content Safety gating design, (c) the data classes and governance from Art. 10, (d) the risk-management outcomes from Art. 9, (e) the human-oversight workflow from Art. 14, and (f) the logging and robustness controls from Art. 12 and Art. 15, to be merged into the program-level high-risk technical file.

**DPIA delta**: Moderate-high update for generated-content artifacts. New processing elements include prompt-derived generated rubric/question text, safety verdicts, teacher edits, approval/rejection rationale, and artifact lineage metadata. Data minimisation requirement: store prompt hash + bounded prompt context where feasible, apply retention controls for generated drafts, and ensure generated artifacts remain within EU-bound storage and access policies.

**Human oversight surface**:
- Teacher reviews each AI draft (rubric/question/remediation suggestion) before publish.
- Teacher can edit or reject any generated artifact.
- Teacher approval event is mandatory for learner assignment linkage.
- Dashboard recommendations remain advisory; teacher decides whether to create remediation groups.

## Implementation Phases

### Phase 0 - Research and Risk Framing

Produce `research.md` to close all implementation unknowns and compliance choices:
- Azure OpenAI prompt pattern for rubric/question generation with age-appropriate constraints.
- Content Safety policy design and failure-handling behavior for flagged outputs.
- Template cache strategy (cache keys, invalidation, and governance of shared templates).
- Audit-event schema aligned with Art. 12 and existing logging conventions.
- Shared library governance process (publish, versioning, deprecation, ownership).

### Phase 1 - Domain and Contract Design

Produce `data-model.md`, `contracts/teacher-assessment.md`, and `quickstart.md`:
- Formal entity/state definitions for rubric lifecycle, generated artifacts, safety verdicts, and remediation groups.
- API/UI contract boundaries for teacher review, approval, and at-risk actions.
- End-to-end validation path from authoring through assignment and analytics.

### Phase 2 - Foundation Implementation

- Extend shared DB schema/helpers for rubric, generated artifact, approval, remediation, and dashboard snapshots.
- Build template cache plumbing and prompt-template governance hooks.
- Add auditable event writer for generation/safety/approval/library actions.

### Phase 3 - Teacher Workflow Surfaces

- Implement teacher-console routes/UI for rubric authoring, AI generation drafts, safety results, edit/review/approve controls, shared-library publish/copy, and remediation group creation.
- Ensure no learner-visible publication path exists without approval status.

### Phase 4 - Analytics and Intervention Guidance

- Implement at-risk dashboard summaries (mastery, completion, reason flags, intervention prompts).
- Add remediation sequencing and progress tracking surfaces.
- Keep recommendations advisory-only with explicit teacher action requirements.

### Phase 5 - Compliance Verification and Readiness

- Run acceptance and compliance checks: teacher-approval gate enforcement, content safety coverage, audit completeness, transparency text, and prohibited-practice checks.
- Produce evidence artifacts for checklist and later tasks/implementation gates.

## Project Structure

### Documentation (this feature)

```text
specs/008-teacher-assessment/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── teacher-assessment.md
└── tasks.md
```

### Source Code (repository root)

```text
demo/
├── apps/
│   ├── teacher-console/
│   │   ├── server.js                 # Assessment authoring, AI draft, review/approval, remediation routes
│   │   ├── db/
│   │   │   ├── schema.sql            # Rubric, generated artifact, approvals, remediation tables
│   │   │   └── index.js              # Query/command helpers for assessment flows
│   │   └── public/
│   │       └── index.html            # Teacher review/approval and dashboard surfaces
│   ├── learner-web/
│   │   ├── server.js                 # Consume approved assignments and remediation path markers
│   │   └── db/
│   │       └── index.js              # Learner assignment read models (approved-only)
│   └── _shared/
│       ├── db/
│       │   ├── schema.sql            # Shared canonical schema updates before sync
│       │   └── index.js              # Shared helper extensions + audit primitives
│       ├── server.js                 # Shared route/middleware patterns
│       └── sync.ps1                  # App sync command
└── scripts/
    └── acceptance_tests.ps1          # End-to-end teacher approval, safety, remediation, and dashboard checks
```

**Structure Decision**: Extend existing multi-app surfaces and shared helper modules instead of adding a new service. This keeps compliance controls local to existing audited boundaries and minimizes deployment risk while preserving teacher-console ownership of human oversight.

## Phase 1 Post-Design Constitution Re-Check

| Checkpoint | Result |
|---|---|
| AI-generated artifacts cannot be assigned without teacher approval | PASS |
| Content Safety scan enforced for generated drafts and qualitative feedback | PASS |
| Audit trail includes prompt-hash/model/safety/approval/assignment linkage | PASS |
| Shared-library copy isolation and governance metadata explicitly modeled | PASS |
| At-risk recommendations are advisory; teacher action required for interventions | PASS |
| Prohibited-practice guardrails (Art. 5) remain explicit and testable | PASS |

No constitution violations require waiver.

## Complexity Tracking

No constitution violations or structural complexity exceptions identified.
