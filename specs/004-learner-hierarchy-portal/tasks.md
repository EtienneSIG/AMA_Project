# Tasks: Learner Data Hierarchy and Director Portal

**Input**: Design documents from `/specs/004-learner-hierarchy-portal/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/director-portal.md

**Organization**: Tasks are ordered to land hierarchy schema and data contracts before director portal UI and Fabric embedding work.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Add the new app surface to the demo deployment shape and create the portal scaffold.

- [X] T001 [P] EdTech Program Orchestrator: add the director portal service to demo/azure.yaml and the provisioning map in demo/infra/main.bicep so the new app deploys beside learner-web, parent-portal, teacher-console, and admin.
- [X] T002 [P] Demo Deployment Agent: create the director portal app scaffold under demo/apps/director-portal/ with package.json, server.js, public/index.html, public/login.html, public/no-access.html, and db/ so it follows the existing App Service pattern.
- [X] T003 [P] Demo Deployment Agent: extend demo/apps/_shared/sync.ps1 so shared auth, db, public, and contentSafety assets are copied into demo/apps/director-portal/ during sync.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Land the hierarchy, scope, report metadata, and access-control foundations before any UI or embed work.

**Checkpoint**: No user-story work starts until the hierarchy tables, helpers, seed data, report contract, and director gating are in place.

- [X] T004 GDPR Children's Data Specialist: extend demo/apps/_shared/db/schema.sql with LearnerHierarchyAssignment, ReportingScope, HierarchyException, DirectorPortalSession, EmbeddedReportReference, and AuditEvent tables plus the indexes needed for historical rollups and audit queries.
- [X] T005 Learning Sciences Expert: seed sample class, school, and region hierarchy records plus director scope and exception cases in demo/apps/_shared/db/index.js so the quickstart can demonstrate both complete and broken paths.
- [X] T006 Privacy-Preserving ML Engineer: implement hierarchy normalization, effective-dated assignment helpers, and exception writers in demo/apps/_shared/db/index.js so learner class/school/region membership can be resolved consistently.
- [X] T007 [P] EU AI Act Compliance Officer: add the approved report metadata contract loader in demo/apps/director-portal/reporting/report-config.js and demo/apps/director-portal/config/reporting.json so the portal fails closed when Fabric report metadata is missing.
- [X] T008 EdTech Program Orchestrator: update demo/apps/_shared/auth.js and demo/apps/_shared/server.js to recognize the director role, enforce role and scope gating, expose a safe no-access state, and include director authorization in /api/auth/me.

---

## Phase 3: User Story 1 - Reliable Hierarchy Rollups (Priority: P1) 🎯 MVP

**Goal**: Ensure learner records roll up consistently by class, school, and region with historical consistency and explicit exception handling.

**Independent Test**: A sample set of learner records can be checked at class, school, and region levels to confirm totals reconcile and missing links are flagged instead of silently counted.

- [X] T009 Privacy-Preserving ML Engineer: implement historical hierarchy rollups for class, school, and region in demo/apps/_shared/db/index.js and demo/apps/_shared/server.js so the same learner population reconciles across levels.
- [X] T010 Privacy-Preserving ML Engineer: surface reconciliation exceptions for missing or conflicting links in demo/apps/_shared/db/index.js and demo/apps/_shared/server.js so incomplete records are flagged instead of silently dropped.
- [X] T011 [P] Cross-Agent QA Verifier: add a hierarchy verification script in demo/scripts/verify-hierarchy.ps1 and document the expected reconciliation sample in specs/004-learner-hierarchy-portal/quickstart.md.

**Checkpoint**: Hierarchy data can be validated independently before any director UI is exposed.

---

## Phase 4: User Story 2 - Director Portal Access to Embedded Reports (Priority: P1)

**Goal**: Deliver a role-gated director portal that shows only the aggregated reports allowed for the director's authorized schools and regions.

**Independent Test**: An authorized director can reach the portal and see only aggregated content for the assigned scope, while an unauthorized user sees a safe no-access state.

- [X] T012 [P] Demo Deployment Agent: implement the director portal server entry point in demo/apps/director-portal/server.js with shared auth bootstrap, health endpoint, and role-gated routing.
- [X] T013 [P] EdTech Program Orchestrator: build the authorized landing page, no-access page, and scope-aware portal shell in demo/apps/director-portal/public/index.html and demo/apps/director-portal/public/no-access.html.
- [X] T014 [P] Content Localisation Lead: write the plain-language portal copy and state labels in demo/apps/director-portal/public/index.html and demo/apps/director-portal/public/login.html so directors see an aggregated-only explanation of the reports.
- [X] T015 Responsible AI Evaluator: wire the Fabric / Power BI embed configuration into demo/apps/director-portal/server.js and demo/apps/director-portal/public/index.html using demo/apps/director-portal/config/reporting.json, with fail-closed behavior when scope or report metadata is missing.
- [X] T016 [P] Cross-Agent QA Verifier: add unauthorized-access and authorized-portal smoke checks to demo/apps/director-portal/README.md or demo/scripts/verify-director-portal.ps1 for the no-access and first-report-open paths.

**Checkpoint**: The portal is usable only after the hierarchy foundation is complete and the embed path is scoped to approved reports.

---

## Phase 5: User Story 3 - Auditable and Compliant Use of Hierarchy Data (Priority: P2)

**Goal**: Make portal access, hierarchy changes, and report usage auditable without adding autonomous learner-impacting behavior.

**Independent Test**: Portal access, report views, and hierarchy updates can be verified in audit records with role, scope, timestamp, and outcome, and follow-up actions still require human review.

- [X] T017 GDPR Children's Data Specialist: add immutable portal-access, report-usage, and hierarchy-change audit helpers in demo/apps/_shared/db/index.js and demo/apps/_shared/db/schema.sql.
- [X] T018 EU AI Act Compliance Officer: emit audit events from demo/apps/director-portal/server.js for portal open, report render, scope failure, and hierarchy-related configuration changes.
- [X] T019 [P] Cross-Agent QA Verifier: capture audit expectations and the human-oversight and no-autonomy boundary in specs/004-learner-hierarchy-portal/quickstart.md and demo/apps/director-portal/README.md.
- [X] T020 [P] Demo Deployment Agent: run the authenticated smoke path for the director portal and verify the audit trail, then record any follow-up fixes in demo/apps/director-portal/README.md.

**Checkpoint**: Audit and governance evidence is present for access, reporting, and hierarchy changes.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Finish documentation, deployment notes, and end-to-end verification across both streams.

- [X] T021 [P] EdTech Program Orchestrator: update demo/README.md and demo/apps/README.md with director portal deployment, scope, and support notes.
- [X] T022 [P] Demo Deployment Agent: validate that the existing zip/publish flow in demo/apps/build-zip.ps1 and demo/azure.yaml packages and deploys the new director portal cleanly.
- [X] T023 [P] Cross-Agent QA Verifier: re-run specs/004-learner-hierarchy-portal/quickstart.md and close any final gaps in specs/004-learner-hierarchy-portal/quickstart.md or demo/apps/director-portal/README.md.

---

## Dependencies & Execution Order

### Phase Dependencies

- Setup (Phase 1) can start immediately.
- Foundational (Phase 2) depends on Setup and blocks all user stories.
- User Story 1 (Phase 3) depends on the Foundational phase.
- User Story 2 (Phase 4) depends on User Story 1 because the portal render path consumes the hierarchy and scope foundations.
- User Story 3 (Phase 5) depends on User Story 2 because audit coverage is tied to the portal access and report flow.
- Polish (Phase 6) depends on the completion of the desired user stories.

### User Story Dependencies

- User Story 1 is the MVP and can be validated on its own after the foundational work.
- User Story 2 builds the director portal shell and embedded reporting path after the hierarchy foundation is stable.
- User Story 3 adds auditability and governance evidence after the portal flow exists.

### Within Each User Story

- Data and contract foundations before UI or embed work.
- Rollup and exception handling before portal scope rendering.
- Portal shell before Fabric / Power BI embedding.
- Audit instrumentation before final smoke verification.

### Parallel Opportunities

- Setup tasks marked [P] can run in parallel.
- Foundational tasks that touch different files can run in parallel after the schema shape is agreed.
- User Story 1 verification can run alongside portal shell work once the shared foundation is in place.
- Portal UI copy and server wiring can proceed in parallel for User Story 2.
- Audit documentation and smoke validation can proceed in parallel for User Story 3.

---

## Parallel Example: User Story 1

```bash
# Launch the hierarchy verification work together:
Task: "Implement historical hierarchy rollups for class, school, and region in demo/apps/_shared/db/index.js and demo/apps/_shared/server.js"
Task: "Surface reconciliation exceptions for missing or conflicting links in demo/apps/_shared/db/index.js and demo/apps/_shared/server.js"
Task: "Add a hierarchy verification script in demo/scripts/verify-hierarchy.ps1 and document the expected reconciliation sample in specs/004-learner-hierarchy-portal/quickstart.md"
```

## Parallel Example: User Story 2

```bash
# Build the portal surface in parallel once the foundation is complete:
Task: "Implement the director portal server entry point in demo/apps/director-portal/server.js with shared auth bootstrap, health endpoint, and role-gated routing"
Task: "Build the authorized landing page, no-access page, and scope-aware portal shell in demo/apps/director-portal/public/index.html and demo/apps/director-portal/public/no-access.html"
Task: "Write the plain-language portal copy and state labels in demo/apps/director-portal/public/index.html and demo/apps/director-portal/public/login.html"
```

## Implementation Strategy

### MVP First

1. Complete Phase 1 and Phase 2.
2. Complete User Story 1 and validate that class, school, and region rollups reconcile.
3. Stop and verify the hierarchy before exposing the portal UI.

### Incremental Delivery

1. Land the hierarchy foundation.
2. Add the director portal shell and scope-gated reporting.
3. Add audit logging and governance checks.
4. Finish with smoke validation and documentation cleanup.

### Parallel Team Strategy

1. One contributor owns the hierarchy data path.
2. One contributor owns the director portal shell and embed path.
3. One contributor owns audit, compliance, and smoke validation.
