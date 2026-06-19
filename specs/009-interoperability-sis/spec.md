# Feature Specification: Interoperability — SCORM, xAPI, SIS Integration

**Feature Branch**: `009-interoperability-sis`

**Created**: 2026-06-18

**Status**: Draft

**Input**: Backlog P1 — Interoperability SCORM/xAPI/SIS; import/export LMS; integrations identity/calendar/storage.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — SCORM 1.2 & 2004 Playback & Completion Tracking (Priority: P1)

A school has purchased three SCORM packages (chemistry simulations). An admin uploads them to LearnEU. Teachers can now assign SCORM content to learners. When a learner completes a SCORM activity, the platform records completion, score, and time spent, and updates the learner's mastery record in LearnEU.

**Why this priority**: SCORM is ubiquitous in K-12 markets (especially Europe); schools need to integrate existing digital content libraries without recreation. Completion tracking ensures SCORM outcomes are visible to teachers.

**Independent Test**: Upload a SCORM 1.2 package; assign to learner; learner launches and completes (SCORM interaction); LearnEU receives cmi.core.score and cmi.core.lesson_status via SCORM API and records in learner progress.

**Acceptance Scenarios**:

1. **Given** a SCORM package (1.2 or 2004) is uploaded via admin, **When** the admin selects "Parse & enable", **Then** LearnEU introspects the package, registers the entrypoint, and assigns the package a learning objective tag (auto-populated or teacher-entered).
2. **Given** a teacher assigns a SCORM activity, **When** a learner clicks "Launch", **Then** the learner is presented with the SCORM player interface (Launch button, score display if available, return-to-course link).
3. **Given** a learner completes a SCORM activity and submits, **When** the SCORM player sends completion data (cmi.core.score, cmi.core.lesson_status=completed), **Then** LearnEU receives and records the score, completion timestamp, and time spent in the learner record.

---

### User Story 2 — xAPI (Tin Can) Event Logging & Learning Record Store Integration (Priority: P1)

LearnEU sends xAPI statements for every significant learner action (started activity, answered question, completed assignment, received feedback) to a Learning Record Store (LRS). A third-party analytics tool subscribes to the LRS and generates custom reports. Teachers can view aggregate insights ("How many learners completed this activity in the last week?") without leaving LearnEU.

**Why this priority**: xAPI is the modern interoperability standard and enables data portability and third-party analytics. Required by some districts for data governance.

**Independent Test**: Learner completes a quiz; system generates xAPI statement (actor=learner, verb=completed, object=quiz, result=score); statement is logged to configured LRS endpoint; third-party dashboard receives the statement.

**Acceptance Scenarios**:

1. **Given** LearnEU is configured with an LRS endpoint (URL, authentication), **When** a learner interacts with the platform (activity start, completion, grade received), **Then** LearnEU generates an xAPI statement (actor, verb, object, result, context) and POSTs it to the LRS asynchronously.
2. **Given** xAPI statements are flowing to an LRS, **When** a third-party analytics tool queries the LRS, **Then** the tool receives standardized learner activity data and can generate reports.
3. **Given** a teacher views the LearnEU dashboard, **When** they click "Analytics", **Then** LearnEU queries the LRS for aggregate metrics (e.g., "15 learners completed Quiz A this week") and displays them without manual export.

---

### User Story 3 — SIS Integration: Roster Sync & Identity Provisioning (Priority: P1)

A school's Student Information System (e.g., Powerschool, Infinite Campus) maintains the authoritative roster: learners, teachers, classes, enrollments. LearnEU connects via a secure API (OAuth2 or API key) and syncs the roster daily. New learners auto-appear in LearnEU; teacher-class assignments auto-update. Learner accounts are pre-provisioned with SSO (Azure AD B2C) so learners log in with school credentials.

**Why this priority**: Roster sync eliminates manual data entry, reduces errors, and ensures LearnEU data matches ground truth. SSO reduces password friction and ensures GDPR Art. 8 consent is collected at account creation.

**Independent Test**: Add a learner to Powerschool; within 24 hours, learner appears in LearnEU with correct name, grade, class assignment; learner logs in via school Azure AD B2C and accesses assignments.

**Acceptance Scenarios**:

1. **Given** LearnEU is connected to an SIS (Powerschool, Infinite Campus, or generic SIS API), **When** the daily sync runs, **Then** LearnEU imports learner records (name, ID, grade, class), teacher records (name, class assignment), and class records (name, subject, teacher).
2. **Given** a new learner appears in the SIS, **When** the sync completes, **Then** LearnEU creates a learner account with GDPR Art. 8 parental consent workflow triggered immediately; learner cannot access content until consent is collected.
3. **Given** a learner is enrolled in a class in the SIS, **When** the sync updates the enrollment, **Then** LearnEU adds the learner to the class in LearnEU and notifies the teacher of the new enrollment.
4. **Given** LearnEU is configured for SSO (Azure AD B2C), **When** a learner logs in using school credentials, **Then** the learner is authenticated via the SIS IdP and their identity is linked to their LearnEU account.

---

### User Story 4 — Calendar & Scheduling Integration (Priority: P1)

A teacher uses the school calendar (synced from Google Workspace, Microsoft 365, or Outlook) to schedule assignment due dates. When a learner views the LearnEU app, they see their assignment deadlines aligned with the school calendar. If a school is closed (holiday, PD day), assignments are auto-adjusted to the next school day.

**Why this priority**: Calendar sync eliminates conflicting deadlines and respects school schedules. Assignment timing directly impacts completion and engagement KPIs.

**Independent Test**: Teacher creates assignment with due date Tuesday Jan 15; school calendar is closed (PD day); system auto-adjusts due date to Wednesday Jan 16; learner sees "Due: Wed Jan 16" in app.

**Acceptance Scenarios**:

1. **Given** LearnEU is connected to the school calendar, **When** a teacher sets an assignment due date, **Then** the system checks if that date is a school day; if not, the due date is auto-adjusted to the next available school day and the teacher is notified.
2. **Given** a learner views their assignment list, **When** they look at due dates, **Then** the system displays due dates relative to the school calendar (e.g., "Due Friday" instead of "Due Jan 17" if today is Wed Jan 15).

---

### User Story 5 — Data Export & Portability (Priority: P1)

A parent requests all data about their child under GDPR Article 15 (data-subject access right). An admin triggers a data export. The system generates a ZIP file containing: learner's assignments, scores, feedback received, teacher comments, and parental consent records, in open formats (CSV, PDF). The file is encrypted and sent to the parent's email within 30 days per GDPR.

**Why this priority**: GDPR Art. 15 portability is mandatory. Data must be in open, portable formats to support learner transitions between schools/systems.

**Independent Test**: Parent submits data-subject access request; admin triggers export; system generates a ZIP with learner assignments, scores, and feedback in CSV; file is encrypted and emailed to parent.

**Acceptance Scenarios**:

1. **Given** a parent or learner requests data export (via GDPR data-subject access request), **When** an admin triggers the export, **Then** the system collects: learner profile, assignments, scores, teacher feedback, parental consent records, and any AI-generated recommendations with reasoning.
2. **Given** data is collected, **When** the export is packaged, **Then** the system creates: (a) CSV files for structured data (assignments, scores), (b) PDF files for narrative feedback, and (c) a README explaining file contents and limitations.
3. **Given** a data package is ready, **When** it is delivered, **Then** the system encrypts the ZIP, generates a secure download link (valid 7 days), and emails the link to the requesting parent/learner with retrieval instructions.

### Edge Cases

- SCORM package references external resources (CDN); if CDN is unavailable, system shows fallback message and logs the error for admin.
- xAPI statement contains PII (learner name in context); system anonymizes statement before sending to LRS if LRS does not have data processing agreement.
- SIS sync identifies a learner ID conflict (same ID appears in two classes); system flags for manual admin review.
- Calendar sync identifies a holiday but teacher has manually set an assignment due date on that day; system asks teacher to confirm or auto-adjust.
- Data export is large (>500 MB learner history); system generates export asynchronously and emails a download link instead of immediate download.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST support SCORM 1.2 and SCORM 2004 package upload, parsing, and playback; SCORM completion/score data MUST be recorded in learner progress.
- **FR-002**: System MUST generate xAPI statements for key learner actions (started, completed, scored) and POST to a configured LRS endpoint with proper authentication.
- **FR-003**: System MUST provide admin configuration UI for SIS endpoint (URL, credentials/OAuth); roster sync MUST run daily and update learner, teacher, and class records.
- **FR-004**: System MUST support SSO integration with Azure AD B2C or school-provided IdP; learner login MUST link to SIS credentials.
- **FR-005**: System MUST sync school calendar (Google Workspace, Microsoft 365, Outlook) and auto-adjust assignment due dates to avoid school holidays/closures.
- **FR-006**: System MUST support GDPR data-subject access export in open formats (CSV, PDF); export MUST include full learner record and be delivered within 30 days.
- **FR-007**: All integrations MUST use OAuth2 or API key authentication; credentials MUST NOT be stored in plain text.
- **FR-008**: All interoperability MUST preserve EU residency; third-party integrations MUST sign Data Processing Agreements.
- **FR-009**: System MUST provide fallback modes if third-party integrations are temporarily unavailable; learner access to core features MUST not be blocked.
- **FR-010**: System MUST log all integration events (sync success/failure, score received, export generated) for audit and troubleshooting.

### Key Entities

- **IntegrationConfig**: Configuration for SIS, LRS, calendar, SSO (endpoint, credentials, sync frequency, enabled flag).
- **RosterSync**: Record of daily SIS sync (timestamp, learner records synced, teacher records synced, errors, audit log).
- **xAPIStatement**: xAPI event record (actor, verb, object, result, context, timestamp, sent-to-LRS flag).
- **DataExportRequest**: GDPR data-subject access request (learner, requester, request date, export status, delivery method).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: SCORM completion data is recorded within **5 seconds** of learner submission (p95).
- **SC-002**: Daily SIS roster sync completes within **30 minutes** for typical school roster (**<2000 learners**).
- **SC-003**: **≥95%** of xAPI statements are successfully delivered to LRS (retry logic + audit trail for failures).
- **SC-004**: **100%** of GDPR data-subject access requests are fulfilled within **30 days** with complete data export.
- **SC-005**: SSO login success rate is **≥99%** (auth failures are <1%).
- **SC-006**: Calendar sync prevents **100%** of assignments being due on school-closed days (auto-adjustment accuracy).
- **SC-007**: **Zero** instances of credential leakage or unencrypted storage of integration secrets in logs.

## Assumptions

- SIS, LRS, and calendar providers support OAuth2 or secure API authentication.
- School maintains Data Processing Agreements with third-party providers.
- Learner roster changes infrequently (daily sync is sufficient).

## Constitution Check

| Principle | How this spec complies |
|---|---|
| I. EU-Resident, Data-Minimised | All integrations sync to EU-resident systems only; third-party providers sign DPAs; no profiling or cross-EU transfer. |
| II. GDPR Art. 8 | SIS/SSO integration ensures consent is collected at account creation; data-subject access export supports Art. 15 portability. |
| III. EU AI Act high-risk | No new AI in integration layer; integrations preserve learner data governance and transparency. |
| IV. Teacher-in-the-loop | Teachers configure calendar and assignment timing; no autonomous scheduling changes. |
| V. Pedagogical sign-off | Calendar sync and assignment timing reviewed by Learning Sciences for alignment with pedagogical rhythm. |
| VI. Outcome-contract driven | SIS sync and calendar alignment support teacher admin time reduction (outcome KPI). |
| VII. Reproducible, spec-driven | Includes runbook in quickstart: configure SIS → test roster sync → enable SSO → verify calendar sync. |
