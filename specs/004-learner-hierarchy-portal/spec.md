# Feature Specification: Learner Data Hierarchy and Director Portal

**Feature Branch**: `[004-learner-hierarchy-portal]`

**Created**: 2026-06-04

**Status**: Draft

**Input**: User description: "Create a new Spec Kit feature specification for LearnEU covering two related capabilities: (1) enrich learner data with class, school, and region hierarchy so dashboards can roll up at multiple levels; (2) add a new director portal application for school directors to view embedded Power BI reports sourced from Fabric data. Follow the repository constitution and LearnEU compliance constraints. Use a new feature folder under specs/ with the next available number (004). Keep the spec technology-agnostic where possible, focus on user stories, functional requirements, entities, edge cases, assumptions, and measurable success criteria. Ensure the feature is compatible with EU residency, GDPR Article 8, teacher-in-the-loop, and the outcome contract. Include the director portal as a new role-gated app surface in scope."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Reliable Hierarchy Rollups (Priority: P1)

As a program or analytics user, I need learner records to roll up consistently by class, school, and region so that every dashboard shows the same learner population at each reporting level.

**Why this priority**: The hierarchy is the foundation for both the rollups and the director portal, and incorrect aggregation would undermine every downstream report.

**Independent Test**: A sample set of learner records can be checked at class, school, and region levels to confirm that totals reconcile and that the same learner is counted in the correct reporting scope.

**Acceptance Scenarios**:

1. **Given** learners are assigned to classes, schools, and regions, **When** a dashboard is opened at any of those levels, **Then** the reported totals reconcile to the same underlying learner population for that level.
2. **Given** a learner changes class or school during the reporting period, **When** reports are generated for the current period and the prior period, **Then** the current and historical rollups each reflect the correct assignment for their own period.
3. **Given** a learner record is missing a class, school, or region mapping, **When** the rollup is published, **Then** the record is flagged for correction and does not distort the published totals.

---

### User Story 2 - Director Portal Access to Embedded Reports (Priority: P1)

As a school director, I want a dedicated portal that shows embedded reports for my authorized schools and regions so that I can review performance without requesting custom extracts from other teams.

**Why this priority**: This is the primary user-facing value of the feature and gives directors a direct, governed view of school performance.

**Independent Test**: An authorized school director can sign in, reach the portal, and view only the reports for the schools and regions within their assigned scope.

**Acceptance Scenarios**:

1. **Given** a user has a school director role with an assigned school, **When** the user opens the portal, **Then** the portal shows only the embedded reports and rollups allowed for that assignment.
2. **Given** a user does not have a director role or authorized school assignment, **When** the user tries to open the portal, **Then** access is denied or the user is shown a safe no-access state with next steps.
3. **Given** a director opens an embedded report, **When** the report renders, **Then** it uses approved program data and defaults to aggregated views rather than direct learner identification.

---

### User Story 3 - Auditable and Compliant Use of Hierarchy Data (Priority: P2)

As a compliance or program owner, I need access, hierarchy changes, and report usage to be auditable so that the portal remains consistent with LearnEU governance and can be reviewed when needed.

**Why this priority**: The portal is only acceptable if it remains transparent, auditable, and aligned with GDPR Article 8 and teacher-in-the-loop constraints.

**Independent Test**: Portal access, hierarchy updates, and report views can be verified in audit records without exposing additional personal data classes.

**Acceptance Scenarios**:

1. **Given** a director opens a report, **When** the action is recorded, **Then** an audit event captures the role, time, and authorized scope.
2. **Given** a learner's hierarchy assignment changes, **When** the update is processed, **Then** the change is recorded in a way that supports historical reporting and governance review.
3. **Given** a director reviews reporting insights, **When** the portal presents them, **Then** the portal does not make automated learner-impacting decisions and keeps the teacher review path unchanged.

### Edge Cases

- A learner belongs to a class but the school or region mapping is temporarily missing; the record is surfaced in an exception state rather than silently dropped.
- A learner transfers to another class or school mid-term; the portal preserves prior-period reporting while reflecting the new assignment for current-period views.
- A school director is assigned to more than one school; the portal separates scopes clearly so one school's data is not shown to the wrong context.
- A director loses their role or school assignment; portal access is revoked promptly and subsequent report access is blocked.
- A report has no data yet for a newly onboarded school or region; the portal shows a clear empty state instead of a misleading zero-filled report.
- An aggregated report would otherwise reveal direct learner identity through a small cohort; the portal suppresses or generalizes the view to preserve GDPR-safe aggregation.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST maintain each learner's reporting hierarchy across class, school, and region for dashboard rollups.
- **FR-002**: The system MUST support rollups at class, school, and region levels using the same underlying learner hierarchy.
- **FR-003**: The system MUST preserve historical reporting consistency when a learner's class, school, or region assignment changes over time.
- **FR-004**: The system MUST flag incomplete, conflicting, or unassigned hierarchy records for correction and prevent them from corrupting published totals.
- **FR-005**: The system MUST provide a dedicated director portal as a distinct app surface in scope for this feature.
- **FR-006**: The director portal MUST be role-gated so that only school directors and other explicitly authorized users can access assigned school and region views.
- **FR-007**: The director portal MUST display embedded analytical reports for the user's authorized scope, including school and region rollups.
- **FR-008**: The director portal MUST default to aggregated views and MUST NOT expose direct learner identifiers unless an existing approved role and lawful basis already allow that visibility.
- **FR-009**: The system MUST record audit events for portal access, report usage, and hierarchy changes, including actor role, timestamp, and scope.
- **FR-010**: The feature MUST remain EU-resident and MUST use only the data needed for hierarchy, access control, reporting, and audit.
- **FR-011**: The feature MUST NOT introduce new automated decisions affecting learner placement, access, assessment, or grading; any resulting action remains subject to human review.
- **FR-012**: The portal MUST explain, in plain language, what the report shows and why the user is allowed to see it.

### Key Entities *(include if feature involves data)*

- **Learner Hierarchy Record**: The reporting relationship that places a learner in a class, school, and region for rollup and filtering purposes.
- **Class**: The smallest reporting unit used for learner aggregation in this feature.
- **School**: The primary organizational unit used for director-level reporting and rollup.
- **Region**: The higher-level reporting unit used for cross-school rollups and leadership review.
- **Director Portal Access Scope**: The set of schools and regions a director is authorized to view.
- **Embedded Report**: A governed analytical report shown inside the portal for authorized users.
- **Audit Event**: A compliance record of access, report usage, or hierarchy changes.
- **Exception Record**: A flagged hierarchy issue that requires correction before reporting is considered complete.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: At least 95% of active learner records in pilot schools are correctly mapped to class, school, and region or are flagged for correction within one reporting cycle.
- **SC-002**: At least 90% of authorized director portal sessions reach the first permitted report in under 30 seconds.
- **SC-003**: Monthly rollup totals at class, school, and region level reconcile with source enrollment totals at 99.5% or higher.
- **SC-004**: Manual requests for school or region performance rollups drop by at least 30% in pilot schools within one term, supporting the program target for reduced administrative burden.
- **SC-005**: 100% of portal access, report usage, and hierarchy-change events are auditable with role, time, scope, and outcome, and no new data classes are introduced.

## Assumptions

### Data Classes Touched

- Learner enrollment identifiers and class/school/region membership metadata are required to compute rollups.
- Director identity and authorization metadata are required to gate access to the portal.
- Aggregated performance and outcome metrics are required to render the embedded reports.
- Audit and access metadata are required for compliance review and governance.

- Existing learner enrollment and school directory records already exist and can be reused to build the hierarchy.
- Existing identity and role management already define who counts as a school director or other authorized reviewer.
- The portal displays aggregated reporting by default and does not add new child-data collection.
- Any learner-impacting follow-up remains with teachers or other human reviewers, not with the portal itself.
- The feature is expected to use approved EU-resident program data sources only.

## Constitution Check

| Principle | Compliance summary |
|---|---|
| I. EU-Resident, Data-Minimised by Default | Uses only hierarchy, access, reporting, and audit data needed for the feature; no cross-EU transfer is introduced. |
| II. GDPR Article 8 First | No new child-data collection is added; access is role-gated and report views default to aggregated data. |
| III. EU AI Act High-Risk Discipline | This feature is reporting-oriented, not automated learner decisioning; no prohibited practices are introduced. |
| IV. Teacher-in-the-Loop, No Autonomous Decisions | The portal is advisory only and does not bypass existing human review for learner-impacting action. |
| V. Pedagogical Sign-Off Before Technical Sign-Off | Reporting surfaces are designed to support human review and school oversight rather than replace them. |
| VI. Outcome-Contract Driven | SC-004 supports reduced administrative burden, and SC-003 supports better school-to-region visibility for outcome review. |
| VII. Reproducible, Spec-Driven Delivery | The feature is defined in `specs/004-learner-hierarchy-portal/` before planning or implementation work. |