# Feature Specification: Admin PostgreSQL Wake-Up Control

**Feature Branch**: `002-admin-postgres-wakeup`

**Created**: 2026-06-03

**Status**: Draft

**Input**: User description: "Create a new feature specification for AMA_Project to add in the admin app the ability to start (wake up) the Azure PostgreSQL Flexible Server when it is auto-stopped. The feature should include admin backend API endpoint(s) to check postgres state and trigger start via Azure ARM (managed identity), admin UI controls to display postgres state and trigger start, update operational scripts/docs needed so operators can use this flow, keep EU residency/compliance principles and no new data classes."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Detect PostgreSQL availability state from admin app (Priority: P1)

An operator opens the admin app and needs immediate visibility into whether the PostgreSQL Flexible Server is ready, stopped, or starting, so they can decide whether intervention is needed before classroom/demo activity begins.

**Why this priority**: This is the prerequisite for any recovery action. Without reliable state visibility, operators lose time diagnosing avoidable outages and risk interrupted learning sessions.

**Independent Test**: From the admin app, request the PostgreSQL status and verify the UI shows one of the defined states with a timestamp of last check, without invoking a start action.

**Acceptance Scenarios**:

1. **Given** the PostgreSQL server is running, **When** an operator opens the admin control, **Then** the UI shows state `Ready` and no mandatory action prompt.
2. **Given** the PostgreSQL server is auto-stopped, **When** an operator opens the admin control, **Then** the UI shows state `Stopped` and presents a wake-up action.
3. **Given** state cannot be retrieved due to transient cloud control-plane failure, **When** the operator refreshes status, **Then** the UI shows a non-destructive error with retry guidance.

---

### User Story 2 - Trigger PostgreSQL wake-up safely from admin app (Priority: P1)

When the server is stopped, an authorized operator triggers a wake-up action from admin UI, and the backend uses Azure ARM with managed identity to request server start, then reports progress until the server is ready.

**Why this priority**: This is the core operational recovery path that replaces manual command-line intervention and reduces service restoration time.

**Independent Test**: With PostgreSQL in `Stopped` state, execute wake-up from admin UI and confirm the server transitions through `Starting` to `Ready`, with visible operator feedback.

**Acceptance Scenarios**:

1. **Given** PostgreSQL is `Stopped` and operator is authorized, **When** operator selects wake-up, **Then** backend sends a start request via Azure ARM using managed identity and returns an operation acknowledgement.
2. **Given** wake-up has been requested, **When** operator views status during startup, **Then** UI shows `Starting` until the server reaches `Ready`.
3. **Given** PostgreSQL is already `Ready`, **When** operator selects wake-up, **Then** system prevents duplicate start operations and returns an idempotent "already running" outcome.

---

### User Story 3 - Use documented operational flow for incidents and demos (Priority: P2)

An operator or on-call engineer follows the repository scripts and runbook-style documentation to verify PostgreSQL state, initiate wake-up (via app or scripted fallback), and confirm recovery in a repeatable way.

**Why this priority**: Clear operational guidance lowers mean time to recovery and supports reproducible demo execution under constitution principle VII.

**Independent Test**: A new operator follows updated scripts/docs from start to finish and restores a stopped PostgreSQL server without extra tribal knowledge.

**Acceptance Scenarios**:

1. **Given** an operator follows updated operational documentation, **When** they execute the prescribed flow, **Then** they can validate state, initiate wake-up, and verify readiness.
2. **Given** admin UI path is temporarily unavailable, **When** operator follows fallback script instructions, **Then** they can still restore database availability using approved operational steps.

### Edge Cases

- Wake-up request is issued while a previous wake-up is still in progress; system returns current operation state instead of starting another operation.
- Managed identity lacks required permission to start the server; system records auditable failure reason and shows actionable remediation guidance.
- PostgreSQL remains in `Starting` beyond expected window; operator is informed of timeout threshold and follow-up escalation path.
- Temporary Azure ARM throttling or network interruption occurs; status checks remain available and wake-up retries are bounded to **3 attempts max** with user-visible errors.
- UI state becomes stale during long-running startup; operators can manually refresh and see most recent backend state, with escalation guidance once startup exceeds **10 minutes**.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Admin backend MUST expose a status endpoint that returns current PostgreSQL Flexible Server lifecycle state for operator use in the admin app.
- **FR-002**: Admin backend MUST expose a wake-up endpoint that triggers PostgreSQL server start through Azure Resource Manager using the application managed identity.
- **FR-003**: Wake-up endpoint MUST enforce authorized admin/operator access and reject unauthorized callers.
- **FR-004**: Wake-up action MUST be idempotent for already-running or already-starting states and MUST return an explicit operator-readable outcome.
- **FR-005**: Admin UI MUST display current PostgreSQL state, last status check time, and clear recovery guidance for each state.
- **FR-006**: Admin UI MUST provide a wake-up control when state indicates the server is stopped, and MUST display in-progress feedback during startup.
- **FR-007**: System MUST record operational audit events for status checks and wake-up attempts, including actor role, timestamp, request outcome, and correlation identifier, without introducing new personal-data classes.
- **FR-008**: Repository operational scripts and documentation MUST be updated to include the admin-led wake-up flow and a scripted fallback flow for incident response.
- **FR-009**: Feature MUST preserve EU residency and existing compliance controls, and MUST NOT introduce new data classes, third-party data egress, or cross-EU data transfer.
- **FR-010**: Feature MUST define operator-facing failure modes and remediation steps for authorization errors, cloud API errors, and prolonged startup.

### Key Entities

- **PostgreSQLServiceState**: Operational state snapshot for the managed PostgreSQL server (state value, checked-at timestamp, freshness indicator).
- **WakeUpRequest**: Operator-initiated command to start a stopped PostgreSQL server (request timestamp, caller role, correlation identifier, requested action).
- **WakeUpOperationResult**: Outcome record for a wake-up attempt (accepted/in-progress/succeeded/failed/already-running, message, completion timestamp).
- **OperationalAuditEvent**: Compliance-aligned log record for state checks and wake-up actions (event type, actor role, outcome, correlation identifier, no new PII fields).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In a controlled incident drill, operators can identify PostgreSQL state from admin UI in **30 seconds or less** from opening the admin control.
- **SC-002**: In at least **95%** of auto-stop incidents, authorized operators can successfully initiate wake-up through the admin app on first attempt.
- **SC-003**: Median operational recovery time from detected `Stopped` state to `Ready` confirmation is reduced by **at least 40%** versus the current manual CLI-only process.
- **SC-004**: **100%** of wake-up attempts generate an auditable outcome record with correlation identifier and no new personal-data fields.
- **SC-005**: Compliance review confirms **zero** new GDPR Art. 8 or EU AI Act non-conformities and **zero** new data classes introduced by this feature.

## Assumptions

- Existing admin authentication and role model can identify authorized operators without introducing a new identity system.
- Existing cloud subscription and resource naming are already configured and remain unchanged for this feature.
- Current managed identity trust boundary is retained; only least-privilege permission adjustments (if needed) are in scope.
- PostgreSQL auto-stop behavior remains enabled and continues to be an expected operational condition.
- This feature adds operational control surfaces only and does not alter learner-facing pedagogical logic.

## Constitution Check

| Principle | How this spec complies |
|---|---|
| I. EU-Resident, Data-Minimised | Uses existing operational metadata only; no new data classes or cross-EU transfer. |
| II. GDPR Art. 8 | No new child-data processing paths; consent and data-subject-rights surfaces unchanged. |
| III. EU AI Act high-risk | No new AI decisioning; operational transparency and logging controls are strengthened. |
| IV. Teacher-in-the-loop | No automated learner-impacting decisions introduced; operational action remains human-initiated. |
| V. Pedagogical sign-off | Feature is operational/admin-only and does not modify pedagogy surfaces. |
| VI. Outcome-contract driven | SC-003 supports reliability and teacher/admin time reduction outcomes. |
| VII. Reproducible, spec-driven | Includes script/doc updates for repeatable recovery workflow before implementation. |
