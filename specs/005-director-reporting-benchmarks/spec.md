# Feature Specification: Director Reporting Benchmarks

**Feature Branch**: `[005-director-reporting-benchmarks]`

**Created**: 2026-06-05

**Status**: Draft

**Input**: User description: "Create or update a Spec Kit feature spec for improving the LearnEU director reporting experience. Use the repository constitution and existing feature 004 as context, but create a new feature under specs/ with the next available number if this is a materially new scope. The feature goal: enrich the director reporting experience so a school director can (1) track evolution by class inside the establishment, and (2) compare their establishment against the national average. Keep the spec user-facing and technology-agnostic where possible. Include P1/P2 stories, functional requirements, key entities, edge cases, assumptions, success criteria, and explicit compliance mapping to EU residency, GDPR Article 8, AI Act high-risk discipline, human oversight, and outcome contract. Emphasize aggregated-only views, suppression of small cohorts, auditability, and no learner-level exposure by default. Return a concise report stating: chosen feature number/folder, whether you created or updated files, and the main stories/requirements added."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Follow Class Evolution Within the Establishment (Priority: P1)

As a school director, I want to see how each class inside my establishment changes over time so that I can identify where support, staffing attention, or pedagogical review may be needed without inspecting individual learners.

**Why this priority**: Directors need an establishment-level view of change over time before any comparison outside the school is meaningful. This story delivers the primary day-to-day reporting value while preserving aggregation.

**Independent Test**: A director with access to one establishment can open the reporting experience, select a reporting period, and review time-based class trends for the establishment without seeing learner-level details.

**Acceptance Scenarios**:

1. **Given** a director is authorized for an establishment with multiple classes, **When** the director opens the reporting experience for a selected period, **Then** the experience shows class-level trend views for that establishment only.
2. **Given** class performance or participation changes between reporting periods, **When** the director compares those periods, **Then** the experience shows the direction and scale of change for each visible class using aggregated measures.
3. **Given** a class falls below the minimum cohort size for safe reporting, **When** the trend view is generated, **Then** that class is suppressed or generalized so individual learners cannot be inferred.

---

### User Story 2 - Benchmark the Establishment Against the National Average (Priority: P1)

As a school director, I want to compare my establishment against the national average so that I can understand whether local outcomes and engagement trends differ materially from the broader network.

**Why this priority**: National benchmarking gives directors context for local performance and helps reduce ad hoc requests for external reporting support.

**Independent Test**: A director can open a comparison view for an authorized establishment and see establishment-level metrics alongside the national average for the same metric definitions and reporting period.

**Acceptance Scenarios**:

1. **Given** a director is authorized for one establishment, **When** the director opens the comparison view, **Then** the experience shows the establishment's aggregated values next to the corresponding national average for the same time period.
2. **Given** a national benchmark is unavailable or incomplete for the selected period, **When** the comparison view is opened, **Then** the experience explains that the benchmark is unavailable and does not present a misleading comparison.
3. **Given** the establishment has too few learners or classes for safe benchmarking, **When** the comparison is requested, **Then** the experience suppresses, delays, or generalizes the result instead of exposing a small cohort.

---

### User Story 3 - Review Reporting With Governance and Human Oversight Intact (Priority: P2)

As a program owner, compliance reviewer, or director, I want reporting access and benchmark generation to be auditable and clearly bounded so that reporting remains compliant, reviewable, and advisory rather than decision-automating.

**Why this priority**: The reporting experience is acceptable only if it preserves EU-resident processing, child-data minimization, auditability, and human-led follow-up.

**Independent Test**: Access, benchmark views, suppressed outputs, and reporting-period selections can be reviewed through audit records and governance checks without exposing additional child data.

**Acceptance Scenarios**:

1. **Given** a director opens a class-evolution or national-benchmark view, **When** the action completes, **Then** an audit record captures the user role, establishment scope, reporting period, and whether any suppression was applied.
2. **Given** a report highlights a decline or outlier, **When** the director reviews it, **Then** the experience presents it as decision support and does not trigger automated learner-level interventions.
3. **Given** a user's reporting scope changes or is revoked, **When** the user next attempts to access the reporting experience, **Then** access is limited to the new scope or denied entirely.

### Edge Cases

- A director oversees an establishment with only one class or very small classes; suppressed views still provide a safe explanation instead of revealing identifiable performance.
- A newly opened establishment has insufficient history for trend analysis; the experience shows a not-enough-history state rather than implying flat performance.
- An establishment changes class structure during the academic year; the reporting experience preserves period-accurate class trends and labels structural changes clearly.
- National benchmark data is delayed for the current period; the experience identifies the latest complete comparison period rather than mixing incomplete and complete periods.
- A director manages multiple establishments; the experience keeps each establishment's reporting scope distinct and prevents cross-establishment leakage by default.
- A reporting filter would reduce the visible population below the suppression threshold; the experience removes or generalizes the affected breakdown instead of showing exact values.
- Underlying aggregated counts are corrected after a prior publication; the experience shows the latest approved values and preserves an auditable record of the correction.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide an aggregated reporting view that lets an authorized director review change over time for classes within the director's establishment.
- **FR-002**: The system MUST let the director choose among approved reporting periods and use consistent metric definitions across the selected periods.
- **FR-003**: The system MUST show class-level evolution only for classes inside the director's authorized establishment scope.
- **FR-004**: The system MUST provide an establishment-level comparison against the national average for the same metric, cohort definition, and reporting period.
- **FR-005**: The system MUST explain when a national comparison is unavailable, delayed, or not comparable for the selected period.
- **FR-006**: The system MUST default all director reporting views to aggregated-only outputs and MUST NOT expose learner-level data, learner identities, or learner drill-through by default.
- **FR-007**: The system MUST suppress, generalize, or withhold any class, establishment, or comparison view that would expose a small cohort or make individual learners reasonably inferable.
- **FR-008**: The system MUST apply the same suppression safeguards to trend views, comparison views, exports, and any saved or shared reporting state within this feature's scope.
- **FR-009**: The system MUST present clear plain-language context for each view, including what is being compared, what reporting period is covered, and whether suppression or unavailable-data rules affected the result.
- **FR-010**: The system MUST restrict access to establishment reporting and benchmarking based on the user's authorized role and scope.
- **FR-011**: The system MUST record auditable events for access attempts, reporting-period selections, benchmark views, suppression events, and scope changes.
- **FR-012**: The system MUST preserve EU-only processing and storage boundaries for all data classes used by this reporting feature.
- **FR-013**: The system MUST minimize child-data exposure by using only the data needed to compute authorized aggregated reporting, access control, and audit trails.
- **FR-014**: The system MUST not create automated decisions about learner placement, grading, support assignment, or content access from the reported trends or benchmarks.
- **FR-015**: The system MUST preserve a human oversight path so that any action taken from the reporting insights remains reviewable and attributable to a named human decision-maker.
- **FR-016**: The system MUST make it possible for authorized reviewers to determine which reporting inputs, scope rules, and suppression rules produced a displayed result.

### Key Entities *(include if feature involves data)*

- **Establishment Reporting View**: The aggregated reporting surface for a single school or establishment that a director is authorized to review.
- **Class Trend Snapshot**: The aggregated measure of a class for a specific reporting period, used to show evolution over time.
- **National Benchmark Snapshot**: The aggregated national reference value for a metric and period used for establishment comparison.
- **Authorized Reporting Scope**: The establishments, reporting levels, and permitted comparison views assigned to a specific user role.
- **Suppression Rule**: The policy that determines when a cohort is too small or too revealing to display directly.
- **Audit Record**: The reviewable record of access, reporting selections, displayed comparisons, suppression outcomes, and scope changes.
- **Reporting Period**: The approved time window used to calculate and label a trend or benchmark comparison.
- **Metric Definition**: The business definition for a reported measure so establishment and national views stay comparable.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: At least 90% of authorized directors in pilot establishments can reach a class-evolution view for their establishment within 2 minutes of starting the reporting task.
- **SC-002**: At least 90% of authorized directors can identify whether their establishment is above, near, or below the national average for a selected metric on the first attempt without external analyst support.
- **SC-003**: 100% of displayed director reporting views remain aggregated-only, with no learner-level exposure by default during acceptance testing and compliance review.
- **SC-004**: 100% of views that fall below the approved minimum cohort threshold are suppressed, generalized, or withheld consistently across on-screen reporting and any in-scope export or share action.
- **SC-005**: Manual requests for director-specific establishment trend and national comparison reports decrease by at least 30% across pilot establishments within one academic term.
- **SC-006**: 100% of access attempts, displayed benchmark views, and suppression outcomes for this feature are traceable in audit review with role, scope, period, and outcome recorded.

## Assumptions

- Feature 004 remains the foundation for hierarchy-aware, role-scoped director reporting, and this feature extends the reporting experience rather than replacing its scope model.
- Directors are treated as authorized adult users, while the learners represented in the aggregated data remain minors by default for compliance purposes.
- Existing approved metric definitions for establishment reporting can be reused for class trends and national comparisons without introducing learner-level indicators.
- National averages are produced from the same approved reporting definitions and only from data that remains inside EU residency boundaries.
- This feature covers on-screen reporting and any directly related reporting state inside the director experience; broader downstream publication workflows are out of scope unless separately specified.
- Follow-up actions triggered by the reported insights continue through existing human-led school and teaching processes.

## Compliance Mapping

### Data Classes Touched

- Aggregated class, establishment, and national reporting measures.
- Role and scope metadata required to determine whether a director may open a view.
- Audit metadata describing access attempts, view selections, suppression outcomes, and scope changes.

### Constitution and Regulatory Mapping

| Obligation | Feature response |
|---|---|
| EU residency | All reporting inputs, scope controls, and audit records for this feature remain within EU-only processing and storage boundaries. |
| GDPR Article 8 | The feature treats represented learners as minors by default, exposes only aggregated views, suppresses small cohorts, and avoids new learner-level disclosure paths. |
| AI Act high-risk discipline | Even though this feature is reporting-oriented, it follows the program's high-risk discipline through traceability, documented scope rules, transparent view labeling, and reviewable controls. |
| Human oversight | Reporting outputs are decision support only; any intervention based on the insight remains a named human action outside the reporting view. |
| Outcome contract | SC-005 supports reduced administrative burden, SC-003 and SC-004 protect Article 8 compliance, and SC-006 supports auditable control expectations tied to the program's conformity posture. |

### Human Oversight Boundary

- The feature informs directors about establishment- and class-level trends but does not recommend or apply learner-level actions automatically.
- Any operational response to a reported decline, anomaly, or benchmark gap remains subject to teacher, school, or program review.
- Audit records must support review of who accessed the insight, what was shown, and whether suppression affected interpretation.

## Outcome Contract Alignment

| Success Criterion | Program KPI alignment |
|---|---|
| SC-001 | Supports leadership use of outcome signals that contribute to reducing the outcome gap between higher- and lower-performing schools. |
| SC-005 | Directly supports the target to reduce administrative time spent on manual reporting and comparison requests. |
| SC-006 | Directly supports 100% maintained GDPR Article 8 compliance and EU AI Act conformity discipline. |
