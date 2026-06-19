# Feature Specification: Multi-School & District Hierarchy

**Feature Branch**: `011-multi-school-hierarchy`

**Created**: 2026-06-18

**Status**: Draft

**Input**: Backlog P1 — Multi-school/district hierarchy avancée; director + country managers reporting; benchmarking avancée.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — District View with School-Level Aggregation (Priority: P1)

A district director (country manager for NL/DE) opens the director portal and sees a dashboard showing all schools in the district. For each school: enrollment count, overall completion rate, average mastery, and an alert flag if any school is significantly below district average. The director can drill down into a specific school to see class-level trends.

**Why this priority**: District leaders need visibility into equity across schools to allocate resources and support. Aggregated-only views protect learner privacy while enabling leadership decision-making.

**Independent Test**: District director logs in; sees 10 schools with aggregate metrics (completion, mastery); clicks on one school; sees class-level breakdown; alerts flag 2 low-performing schools.

**Acceptance Scenarios**:

1. **Given** a district director is authenticated and authorized for multiple schools, **When** they access the director portal, **Then** the dashboard shows a list of schools with aggregate metrics: enrollment count, completion rate (%), average mastery (%), and one key alert (if applicable).
2. **Given** school metrics are displayed, **When** the director clicks on a school, **Then** the portal shows that school's class-level breakdown and a link to "School Director View" for single-school drill-down.
3. **Given** a school's metrics are significantly below district average, **When** the dashboard is generated, **Then** the school is highlighted with a red alert and a suggestion ("This school is 15% below district average in mastery; consider supplementary support").

---

### User Story 2 — Multi-Level Approval & Governance (Priority: P1)

A curriculum team at the district level drafts a lesson plan for all schools. The lesson undergoes approval: district pedagogist → district curriculum lead → country manager (compliance gate). Once approved at district level, individual school directors can opt-in or opt-out of assigning it to their schools. The system tracks adoption metrics at both district and school levels.

**Why this priority**: Multi-level governance ensures scale without losing school autonomy. District content must be approved centrally; schools decide on deployment.

**Independent Test**: District team drafts curriculum; three district-level approvals occur; lesson becomes "available to schools"; School A director opts-in; School B director opts-out; adoption metrics reflect both decisions.

**Acceptance Scenarios**:

1. **Given** a lesson is authored at district level, **When** it enters the approval workflow, **Then** the system routes it through district-level approvers (pedagogist, curriculum lead, country manager/compliance) in sequence.
2. **Given** all district-level approvals are granted, **When** the lesson is published at district level, **Then** the lesson transitions to "Available to Schools" status and individual school directors receive a notification of a new available lesson.
3. **Given** a lesson is available to schools, **When** a school director reviews it, **Then** they can select "Adopt", "Adapt" (create a school-specific variant), or "Decline". The adoption decision is logged and contributes to adoption metrics.

---

### User Story 3 — Hierarchical Reporting & Comparison (Priority: P1)

A country manager for Netherlands views a report: "Fractions mastery by school (7 schools) and by week (Jan–June)". The report shows trend lines for each school and a district average line. The manager can identify which schools are accelerating and which are plateauing. They can export the report as PDF for country-level strategic planning.

**Why this priority**: Hierarchical reporting enables data-informed resource allocation and identifies best practices (e.g., a school with strong outcomes is flagged for peer mentoring).

**Independent Test**: Country manager generates report "Mastery by school, 6-month trend"; system shows 7 schools with trend lines + district average; manager exports to PDF.

**Acceptance Scenarios**:

1. **Given** a country manager accesses reporting, **When** they select "Hierarchical Report", **Then** they can choose dimensions (by school, by subject, by cohort) and a time range.
2. **Given** a report is configured, **When** the system generates it, **Then** the report displays: aggregate metrics per school (or dimension), trend lines, district average line, and benchmark comparisons (e.g., "School A is 10% above district average").
3. **Given** a report is generated, **When** the manager clicks "Export", **Then** the system generates a PDF with tables, charts, and a brief narrative summary.

---

### User Story 4 — Role-Based Access Control (RBAC) at Each Level (Priority: P1)

Each user in the hierarchy (learner → teacher → school director → district director → country manager) has role-specific access. A school director sees all school data but cannot see other schools' detailed learner records. A district director sees school-level aggregates and trends but not individual learner data (suppressed <n learners cohort rule). A country manager sees district aggregates and benchmarks.

**Why this priority**: Hierarchical RBAC prevents unauthorized access to learner data and ensures each leader sees data appropriate to their role.

**Independent Test**: School director logs in; sees their school's data only. District director logs in; sees multiple schools' aggregates but no individual learner names. Country manager logs in; sees multi-school comparison.

**Acceptance Scenarios**:

1. **Given** a user logs in with a specific role (school director, district director, country manager), **When** they access the portal, **Then** the system enforces role-based visibility: (a) school director sees school data only; (b) district director sees school-level aggregates (≥10 learner minimum for disclosure); (c) country manager sees district aggregates.
2. **Given** a district director attempts to view individual learner names from a small class (<10 learners), **When** the system generates the report, **Then** the learner-level data is suppressed and replaced with "Suppressed (cohort <10)".
3. **Given** a report contains potentially identifiable cohort data, **When** the report is generated, **Then** the system scans for re-identification risk and flags aggregations that may be de-anonymizable (e.g., "Only 1 boy in 5th grade" + "Girl + 95% mastery" could identify individuals); the report is blocked and escalated for manual review.

---

### User Story 5 — Cross-School Peer Benchmarking & Best Practice Sharing (Priority: P1)

A school director compares their school's completion rate in fractions (72%) to the district average (85%) and to the national average (82%). The system shows "Your school is 10% below district average; 3 schools in the district have >90% completion in fractions. Consider: (1) peer mentoring visit, (2) review of scope/sequence alignment, (3) additional teacher PD." The director can initiate a peer learning group with a high-performing school.

**Why this priority**: Peer benchmarking and best-practice sharing accelerates improvement and builds community. Recommendations are evidence-based and actionable.

**Independent Test**: School director views fractions completion: their school 72%, district avg 85%, one peer school 95%; system suggests peer mentoring; director clicks "Request peer visit" and form is sent to high-performing school director.

**Acceptance Scenarios**:

1. **Given** a school director views a metric (e.g., completion rate in fractions), **When** they select "Compare", **Then** the system displays: school's result, district average, national/regional average (if available), and lists of schools above and below average.
2. **Given** comparison data is displayed, **When** the system identifies a significant gap, **Then** the system offers actionable recommendations: peer mentoring, resource links, or a form to request peer learning collaboration.
3. **Given** a school director selects "Request Peer Collaboration", **When** they submit a request, **Then** the request is sent to identified high-performing school(s); high-performing director receives a notification and can accept or suggest an alternative contact.

### Edge Cases

- A school merges with another school mid-year; historical data must be preserved and combined; reports must clarify the merge date.
- A director is promoted from school to district level; access control must be updated immediately; old school-level dashboards must no longer be accessible.
- A lesson is approved at district level but a school finds it pedagogically misaligned; school opts-out; system records the opt-out and flags the lesson for district review if opt-out rate exceeds threshold (e.g., >30%).
- A report is requested that would require filtering of <10 learners per cell; system blocks generation and explains to user why suppression makes the report non-viable.
- Two districts (e.g., NL and DE) request benchmarking; system compares only within-country data to avoid cross-border data transfer (EU AI Act compliance).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST support hierarchical organization structure (country → district → school → class → learner) with role-specific access controls at each level.
- **FR-002**: District directors MUST see school-level aggregates (enrollment, completion, mastery) without individual learner names or data.
- **FR-003**: Country managers MUST see district-level benchmarking and trend reports; individual learner data MUST NOT be visible.
- **FR-004**: System MUST enforce cohort minimums (≥10 learners per disclosure unit); cohorts <10 MUST be suppressed or combined with adjacent cohorts.
- **FR-005**: System MUST enforce multi-level approval workflow for district-level curriculum content; individual schools can opt-in/opt-out with tracking.
- **FR-006**: System MUST generate hierarchical reports (by school, by subject, by time period) with trend lines and benchmarking comparisons.
- **FR-007**: System MUST support peer benchmarking workflows (request peer collaboration, view high-performing peers, track peer mentoring engagement).
- **FR-008**: All data aggregation MUST preserve EU residency and MUST NOT enable cross-EU comparisons or data transfer.
- **FR-009**: All hierarchical data access, approvals, and peer comparisons MUST be logged in audit trail for GDPR Art. 5 accountability.
- **FR-010**: System MUST support graceful role transitions (e.g., teacher promoted to school director); old role access MUST be immediately revoked; new role access MUST be immediately granted.

### Key Entities

- **Hierarchy**: Organizational structure (country, district, school, class, learner with parent/guardian relationships).
- **RoleAssignment**: User role at each level (user, role, level, effective date, end date).
- **AccessControl**: Role-based permissions (role, accessible resources, data visibility rules, approval authority).
- **DistrictApproval**: Multi-level approval record for district content (content ID, district approvers, school adoption opt-in/opt-out count).
- **HierarchicalReport**: Report record (requested by, report type, dimensions, time range, cohort minimums applied, exported at, export format).
- **PeerBenchmarking**: Peer comparison record (school, metric, school's result, peer schools' results, benchmarking suggestions, collaboration request status).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: District director dashboard loads all school aggregates in **≤5 seconds** (p95) for typical district (**20–50 schools**).
- **SC-002**: **100%** of hierarchical reports apply cohort minimums and flag any de-anonymization risk.
- **SC-003**: Multi-level approval workflows complete within **10 business days** for typical district content (pedagogist → curriculum lead → country manager).
- **SC-004**: School adoption opt-in/opt-out rates for district content average **60–80%** (indicating schools exercising autonomy).
- **SC-005**: Peer benchmarking recommendations lead to **≥20%** of schools initiating peer collaboration within **3 months** of launch.
- **SC-006**: **Zero** instances of learner-level data visible at district/country manager levels.
- **SC-007**: **100%** of hierarchical queries and role transitions are logged; audit trail supports GDPR Art. 5 accountability.

## Assumptions

- Organizational hierarchy is pre-configured and maintained by district/country admins.
- Peer benchmarking is voluntary; participation is encouraged but not mandatory.
- Data aggregation is monthly (cohort definitions, comparisons); real-time drill-down to school level is available but hierarchical comparisons use monthly snapshots.

## Constitution Check

| Principle | How this spec complies |
|---|---|
| I. EU-Resident, Data-Minimised | Hierarchical aggregation preserves EU residency; individual learner data is NOT visible above school level; cross-border comparisons are prohibited. |
| II. GDPR Art. 8 | Learner data is suppressed at district/country levels; parental consent and data-subject rights are enforced at school level only. |
| III. EU AI Act high-risk | No new AI in hierarchy; human oversight is multi-level (school → district → country); all decisions are auditable. |
| IV. Teacher-in-the-loop | School directors decide on district content adoption; teachers at school level retain autonomy; no autonomous decisions affect learner placement. |
| V. Pedagogical sign-off | District-level approvals include pedagogist review; school directors can opt-out if misaligned with local pedagogy. |
| VI. Outcome-contract driven | Benchmarking supports outcome-gap reduction by enabling peer learning and resource reallocation. |
| VII. Reproducible, spec-driven | Includes runbook in quickstart: configure hierarchy → set role-based access → publish district content → schools opt-in → generate benchmark report. |
