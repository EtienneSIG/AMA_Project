# Implementation Plan: Learner Data Hierarchy and Director Portal

**Branch**: `004-learner-hierarchy-portal` | **Date**: 2026-06-04 | **Spec**: `/specs/004-learner-hierarchy-portal/spec.md`

**Input**: Feature specification from `/specs/004-learner-hierarchy-portal/spec.md`

## Summary

Deliver two tightly coupled outcomes on top of the existing LearnEU demo architecture: first, conformed learner hierarchy data that consistently rolls up by class, school, and region; second, a new role-gated director portal application that embeds Fabric-sourced Power BI reports for the director's authorized schools and regions. The implementation keeps all personal data EU-resident, reuses the existing shared auth and app pattern in `demo/apps`, and keeps reporting limited to aggregated views with auditability and human review paths intact.

## Architecture Overview

The feature extends the current four-app demo footprint rather than replacing it. Existing learner, parent, teacher, and admin surfaces remain in place, while a new `demo/apps/director-portal/` app surface is added for school directors. The shared Express/auth/db pattern in `demo/apps/_shared/` remains the foundation for role gating, session handling, and common hierarchy helpers.

Hierarchy data stays on the EU-hosted operational side of the demo and is shaped into stable reporting views that can be consumed by learner dashboards and the director portal. Fabric remains the analytics dependency for the reporting side: the portal should embed approved Power BI reports from a Fabric workspace and only receive the minimum metadata needed to render those reports and enforce scope.

This means the implementation is split cleanly into two domains:

1. Operational hierarchy and scope data in the existing app/data layer.
2. Aggregated reporting consumption in the new director portal, with Fabric/Power BI as the reporting backend.

## Technical Context

**Language/Version**: Node.js 22.x, HTML/CSS/vanilla JS in static app pages, SQL-backed schema initialization

**Primary Dependencies**: Express, existing LearnEU auth/session helpers, existing shared DB helpers, Fabric workspace/Power BI embedded reporting configuration, current Azure App Service deployment pattern

**Storage**: EU-hosted PostgreSQL for learner hierarchy, director scope, and audit records; Fabric OneLake / Power BI semantic model for aggregated reporting consumption

**Testing**: Spec-driven verification walkthrough, authenticated smoke checks, hierarchy reconciliation checks, access-control negative tests, embedded-report rendering checks, audit-log verification

**Target Platform**: Azure App Service demo apps in West Europe, plus Fabric / Power BI embedded reporting in the same EU governance boundary

**Project Type**: Multi-app web application with shared code sync

**Performance Goals**: First permitted director report visible in under 30 seconds for at least 90% of authorized sessions; hierarchy rollups reconcile to source enrollment totals at 99.5% or higher

**Constraints**: EU-only residency, GDPR Article 8 defaults, no cross-EU transfer, no autonomous learner-impacting decisions, aggregated reporting by default, teacher review remains the path for learner-impacting actions

**Scale/Scope**: One new app surface, shared hierarchy helpers, and reporting integration for pilot schools and regions; no new AI model or learner decision system

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Plan handling |
|---|---|---|
| I. EU-Resident, Data-Minimised by Default | PASS | Keep hierarchy, scope, and audit data in EU-hosted storage only; the portal consumes aggregated reporting metadata rather than raw learner extracts. |
| II. GDPR Article 8 First (Children's Data) | PASS | No new child-data collection; hierarchy updates stay limited to operational enrollment metadata; the director portal is role-gated and report views default to aggregated data. |
| III. EU AI Act High-Risk Discipline | PASS | This feature is reporting and governance oriented, not a new automated decision system; logging, transparency, and human oversight are retained. |
| IV. Teacher-in-the-Loop, No Autonomous Decisions | PASS | No learner placement, access, assessment, or grading decisions are automated by the portal; any follow-up remains with human reviewers. |
| V. Pedagogical Sign-Off Before Technical Sign-Off | PASS | The portal is framed as a school oversight and reporting surface, not a learner-facing intervention tool. |
| VI. Outcome-Contract Driven | PASS | SC-001, SC-002, SC-003, SC-004, and SC-005 all map to measurable administrative-burden and reporting-quality outcomes. |
| VII. Reproducible, Spec-Driven Delivery | PASS | The feature stays confined to `specs/004-learner-hierarchy-portal/` before implementation planning and code work. |

**EU AI Act articles touched**: Art. 12 (logging and traceability for portal access, report usage, and hierarchy changes), Art. 13 (plain-language transparency copy about report scope and access), Art. 14 (human oversight over hierarchy corrections and any report-driven follow-up), Art. 15 (robustness and access-control evidence for the embedded reporting surface).

**DPIA delta**: Moderate, bounded extension of operational processing. New or refreshed processing purposes are limited to learner hierarchy normalization, director scope enforcement, report access auditing, and aggregated reporting. Data classes touched are enrollment metadata, role/scope metadata, report-usage telemetry, and audit events. No new special-category data, no new child data collection, and no cross-border transfer are introduced. The DPIA update should explicitly note retention, access review, and rectification paths for hierarchy records.

**Human-oversight surface**: Hierarchy corrections and director scope assignments remain human-reviewed administrative actions. The director portal itself is read-only for reporting, with no learner-impacting automation. Any correction to class, school, or region membership is reviewed by the program/admin role that owns the operational record; any report insight that triggers action flows back to teachers or other named reviewers.

## Implementation Phases

### Phase 0 - Data and Reporting Research

Establish the source-of-truth boundaries for learner hierarchy, director scope, and report consumption. Confirm the Fabric workspace and Power BI embed dependency, define the minimum report metadata the portal needs, and determine which existing app owns each operational touchpoint. The output of this phase is a short research note that resolves architecture choices, scope assumptions, and reporting dependencies.

### Phase 1 - Hierarchy Foundation

Add or extend the EU-hosted operational data model so each learner can be resolved to class, school, and region with effective dating for historical reporting. Introduce exception handling for missing or conflicting hierarchy links, and expose read-only rollup helpers that can be reused by the learner, teacher, admin, and director surfaces.

### Phase 2 - Director Portal Shell

Create the new director portal app surface under `demo/apps/director-portal/` using the same shared auth/session model as the existing apps. Add role gating for the director role, a safe no-access state, and a portal shell that can request report metadata only after authorization succeeds.

### Phase 3 - Embedded Reporting Integration

Connect the portal shell to Fabric-sourced Power BI reports. The portal should support embedded report rendering, scope-aware filtering, and clear aggregated-only defaults. Any report configuration or workspace identifiers should stay in the reporting configuration layer, not in the end-user visible content.

### Phase 4 - Governance, Audit, and Verification

Wire audit events for hierarchy changes, portal access, and report usage. Add verification steps for role gating, scope enforcement, hierarchy reconciliation, and the report-open path. Finish with an authenticated smoke test that proves an authorized director can reach the first permitted report and that unauthorized users are blocked cleanly.

## Project Structure

### Documentation (this feature)

```text
specs/004-learner-hierarchy-portal/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── director-portal.md
└── tasks.md
```

### Source Code (repository root)

```text
demo/
├── apps/
│   ├── _shared/
│   │   ├── auth.js
│   │   ├── db/
│   │   └── server.js
│   ├── learner-web/
│   ├── parent-portal/
│   ├── teacher-console/
│   ├── admin/
│   └── director-portal/          # new app surface for school directors
├── feature/
└── scripts/
```

**Structure Decision**: Extend the existing multi-app demo rather than introducing a separate service tier. The new portal is added beside the current App Service surfaces, while shared auth and hierarchy helpers remain in `demo/apps/_shared/` so the role model and reporting scope logic stay consistent across the demo.

## Design & Contracts

### Data Model

Defined in `specs/004-learner-hierarchy-portal/data-model.md`:

- LearnerHierarchyAssignment
- ReportingScope
- HierarchyException
- DirectorPortalSession
- EmbeddedReportReference
- AuditEvent

### Interface Contracts

Defined in `specs/004-learner-hierarchy-portal/contracts/director-portal.md`.

Contract coverage:

- Director role claims and scope claims required for access
- Portal shell states: authorized, no-access, and report-ready
- Embedded report metadata requirements for Fabric / Power BI embedding
- Audit event fields for portal access, report usage, and hierarchy updates

### Quickstart

Defined in `specs/004-learner-hierarchy-portal/quickstart.md`.

Includes hierarchy data verification, director role login, embedded report access, negative access checks, and audit confirmation.

## Post-Design Constitution Re-Check

| Checkpoint | Result |
|---|---|
| EU-only storage and access boundaries remain intact | PASS |
| GDPR Article 8 risk stays bounded to operational hierarchy metadata | PASS |
| No autonomous learner-impacting behavior added | PASS |
| Director portal remains read-only and role-gated | PASS |
| Auditability and transparency remain explicit | PASS |
| Fabric / Power BI dependency is documented as an external reporting prerequisite | PASS |

No constitution violations require waiver.

## Verification Approach

1. Validate the learner hierarchy data against a sample set of class, school, and region assignments and confirm that rollups reconcile at each level.
2. Confirm that incomplete or conflicting hierarchy rows are surfaced as exceptions rather than being counted silently.
3. Verify that a director can open the portal only when the director role and scope claims are present.
4. Verify that an unauthorized user reaches a safe no-access state and never receives embedded report content.
5. Confirm the embedded report opens only with aggregated views and the expected Fabric / Power BI configuration.
6. Check that audit events are emitted for hierarchy updates, portal access, and report usage.
7. Run an authenticated smoke test against the director portal and confirm the first permitted report loads within the target latency window.

## Complexity Tracking

No constitution violations or complexity exceptions identified.
