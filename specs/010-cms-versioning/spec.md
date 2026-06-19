# Feature Specification: CMS Versioning & Content Approval Workflow

**Feature Branch**: `010-cms-versioning`

**Created**: 2026-06-18

**Status**: Draft

**Input**: Backlog P1 — CMS versioning + workflow approbation complet; gouvernance contenu; versioning, workflow, localisation/traduction.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Content Versioning & Rollback (Priority: P1)

A curriculum team publishes a lesson (v1.0) on fractions to 500 learners. A day later, they discover a pedagogical error in example 3. They create v1.1 with the correction and publish it. Learners see the new version automatically. If v1.1 introduces a new problem, admins can quickly rollback to v1.0 using a one-click "Revert" action.

**Why this priority**: Versioning enables safe iteration and rapid error correction without manual re-assignment or data loss. Rollback is essential for operational risk management.

**Independent Test**: Publish lesson v1.0; verify learners see it; publish v1.1; verify learners see v1.1; rollback to v1.0; verify rollback completes and learners see v1.0 again.

**Acceptance Scenarios**:

1. **Given** a lesson is published, **When** the system records it, **Then** the lesson is tagged with a semantic version (v1.0) and includes metadata: creator, publication date, assignment count, learner progress on this version.
2. **Given** a curriculum team edits a published lesson, **When** they save and publish, **Then** a new version (v1.1) is created; the prior version (v1.0) is retained in history and marked as "superseded".
3. **Given** a new version is published, **When** learners access the lesson, **Then** they are directed to the latest version; however, their prior responses/scores on v1.0 are preserved and linked.
4. **Given** a rollback is initiated, **When** an admin selects "Revert to v1.0", **Then** all active learners are reset to v1.0 within **5 minutes**; learners are notified of the change, and their v1.1 responses are archived.

---

### User Story 2 — Multi-Step Approval Workflow (Priority: P1)

A content creator drafts a lesson. They submit it for review. A pedagogical reviewer evaluates it for pedagogical soundness. A curriculum lead reviews it for alignment to standards. A compliance reviewer checks for GDPR/AI Act conformity. Only after all three approve does the lesson enter "Published" status. The workflow is tracked in an audit log.

**Why this priority**: Multi-stage approval ensures pedagogical quality, standard alignment, and compliance before learners see content. Audit trail is mandatory for governance.

**Independent Test**: Creator drafts lesson → submits for approval → three reviewers approve in sequence → lesson is published with audit trail showing all sign-offs.

**Acceptance Scenarios**:

1. **Given** a content creator completes a lesson draft, **When** they select "Submit for Review", **Then** the lesson transitions to "Under Review" status and notifications are sent to configured reviewers (pedagogist, curriculum lead, compliance lead).
2. **Given** a reviewer opens a lesson in review, **When** they evaluate it, **Then** they can select "Approve", "Request Changes" (with comment), or "Reject" (with reason). Changes are tracked.
3. **Given** all required reviewers approve, **When** the final approval is submitted, **Then** the lesson transitions to "Published" and is available for assignment to learners. Audit log records all approvals with timestamps and comments.
4. **Given** a reviewer requests changes, **When** the creator resubmits, **Then** the lesson re-enters review workflow; prior approvals are maintained if no material changes were made (configurable).

---

### User Story 3 — Branching & Localization Workflows (Priority: P1)

A lesson is published in Dutch (v1.0). The Spanish localization team branches from v1.0 and creates a Spanish version (es-ES/v1.0). They adapt examples to Spanish cultural context and submit for approval. The Spanish version is published in parallel to the Dutch version. When Dutch v1.1 is published, the localization team is notified and can decide whether to merge the update into the Spanish branch.

**Why this priority**: Localization branching enables multi-market content scaling without blocking any market. This directly supports the "12 months → 6 weeks" localization KPI.

**Independent Test**: Publish Dutch lesson v1.0; branch to Spanish (es-ES); translate and publish Spanish v1.0; update Dutch to v1.1; system notifies Spanish team of update; Spanish team merges updates into Spanish branch.

**Acceptance Scenarios**:

1. **Given** a published lesson exists (e.g., Dutch/v1.0), **When** a localizer clicks "Create Localization Branch", **Then** the system creates a new branch tagged with the target language (e.g., es-ES) and copies the content for adaptation.
2. **Given** a localization branch is created, **When** the localizer edits content (text, examples, assessments), **Then** the edits apply only to that branch; the original language is unchanged.
3. **Given** a localization branch is complete and approved, **When** it is published, **Then** the system registers it as "Spanish/v1.0" and makes it available in Spanish-configured regions/classes.
4. **Given** the original language (Dutch) is updated to v1.1, **When** the update is published, **Then** the Spanish team receives a notification "Update available in source language: <summary of changes>". They can choose to merge, adapt, or defer.
5. **Given** Spanish team opts to merge updates, **When** the merge is executed, **Then** non-translated content (code, diagrams) is auto-updated; translated content is preserved and the team is prompted to review for consistency.

---

### User Story 4 — Content Governance & Metadata Tagging (Priority: P1)

Every published lesson is tagged with metadata: curriculum standard (e.g., Common Core Math 4.NF.A), subject, grade, difficulty, learning objective, and prerequisites. A curriculum lead can run queries like "Show all grade 4 fractions lessons aligned to CC.4.NF.A" to audit coverage. The system automatically suggests prerequisites for new lessons based on curriculum mapping.

**Why this priority**: Metadata enables curriculum transparency and prevents gaps/duplication. Prerequisite suggestions accelerate authoring and reduce pedagogical errors.

**Independent Test**: Create a lesson tagged [Grade 4, Fractions, CC.4.NF.A]; query returns the lesson; create a new lesson with [Grade 4, Decimal Basics]; system suggests fractions lesson as prerequisite.

**Acceptance Scenarios**:

1. **Given** a lesson is in draft or under review, **When** the creator or reviewer assigns metadata (curriculum standard, subject, grade, difficulty, objective, prerequisites), **Then** the metadata is stored and indexed for search.
2. **Given** a curriculum lead runs a query (e.g., "Grade 4 + Fractions + CC.4.NF.A"), **When** the system searches, **Then** all lessons matching the criteria are returned with version history and assignment count.
3. **Given** a new lesson is being authored with an objective, **When** the system analyzes the objective and checks curriculum mapping, **Then** the system suggests related lessons that may serve as prerequisites or enrichment.

---

### User Story 5 — Deprecation & Archive Management (Priority: P1)

A lesson becomes outdated (curriculum updated, better replacement exists). An admin marks the lesson as "Deprecated" with an end-of-life date and a link to the replacement lesson. Active assignments referencing the deprecated lesson are flagged for teacher review. After end-of-life date, the lesson is moved to archive; learners cannot be newly assigned it, but existing learner data is retained for audit.

**Why this priority**: Deprecation allows content to age gracefully without data loss. Audit trail protects learner records and compliance.

**Independent Test**: Mark lesson as deprecated with link to replacement; teachers are notified; after EOL date, lesson moves to archive; learner data is preserved but new assignments blocked.

**Acceptance Scenarios**:

1. **Given** a lesson is no longer recommended, **When** an admin selects "Deprecate", **Then** the system sets a deprecation notice, an optional link to a replacement lesson, and an end-of-life date (default 90 days).
2. **Given** a lesson is deprecated, **When** teachers view it, **Then** the UI shows "Deprecated" label and suggests the replacement lesson. Teachers are notified that the lesson will be removed from new assignments after the EOL date.
3. **Given** the EOL date arrives, **When** the automated process runs, **Then** the lesson is moved to "Archive" status; new assignments are blocked, but existing learner responses and scores remain accessible for audit.

### Edge Cases

- Two teams attempt to approve a lesson simultaneously; system locks after first approval and notifies second reviewer.
- Lesson v1.0 is assigned to 1000 learners; v1.1 is published; system must update active assignments without losing learner progress (handled by UI refresh, not data migration).
- Localization branch for Spanish is approved, but main lesson is later marked deprecated; system archives both versions and preserves all data.
- Rollback occurs while learners are actively working on the lesson; learners see a "Content updated" message and must refresh to see the rolled-back version.
- Approval workflow approval threshold is updated mid-stream (e.g., DPO role is added); in-flight lessons re-enter approval queue for new role.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST version all published content with semantic versioning (v1.0, v1.1, v2.0); version history MUST include creator, date, and change summary.
- **FR-002**: System MUST allow rollback to any prior version within **24 hours** of publication; rollback MUST re-assign active learners and preserve prior scores.
- **FR-003**: System MUST enforce a configurable multi-step approval workflow (e.g., creator → pedagogist → curriculum lead → compliance); all approvals MUST be logged with timestamp and comments.
- **FR-004**: System MUST support content branching for localization; branches MUST be independent; source updates MUST trigger merge notifications to localization teams.
- **FR-005**: System MUST support metadata tagging (curriculum standard, subject, grade, difficulty, learning objective, prerequisites); search MUST filter by metadata.
- **FR-006**: System MUST suggest prerequisites for new lessons based on curriculum mapping; suggestions MUST be auditable.
- **FR-007**: System MUST allow deprecation of content with optional replacement link; deprecated content MUST be archived after end-of-life date; learner data MUST be retained for audit.
- **FR-008**: All content changes (creation, edit, approval, publication, rollback, deprecation) MUST be recorded in an audit log with user, timestamp, and action.
- **FR-009**: System MUST preserve EU residency; all content and versioning MUST be stored in EU-region databases only.
- **FR-010**: System MUST support content export in open formats (SCORM, ePub, PDF) to support interoperability.

### Key Entities

- **ContentVersion**: Version record (lesson ID, version number, content blob, creator, created-at, change summary).
- **ApprovalWorkflow**: Approval configuration (required roles, sequence, deadline, auto-escalation settings).
- **ApprovalRecord**: Individual approval (lesson version, approver, role, status [approved/changes-requested/rejected], comments, timestamp).
- **LocalizationBranch**: Language-specific branch (source lesson, target language, brancher, created-at, merge-pending flag).
- **ContentMetadata**: Tagging and search index (lesson, curriculum standard, subject, grade, difficulty, objective, prerequisites, indexed-at).
- **AuditLog**: Complete record of content lifecycle (lesson, action, user, timestamp, details).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Lesson publication time (draft to published) is ≤ **5 business days** (including all approval steps).
- **SC-002**: **100%** of published lessons include complete metadata and are searchable by curriculum standard.
- **SC-003**: Localization branching reduces translation cycle from **12 months to ≤6 weeks** for typical lesson (per outcome-contract KPI).
- **SC-004**: Rollback operations complete in **<5 minutes** and all affected learners are notified.
- **SC-005**: **100%** of content changes are logged in audit trail; zero instances of untracked modifications.
- **SC-006**: Approval workflow enforcement is **100%** (no content bypasses required approvals).
- **SC-007**: Compliance review confirms **zero** non-conformities in versioning, approval, or data retention related to GDPR Art. 17 (erasure).

## Assumptions

- Curriculum standards are pre-configured in system (e.g., Common Core, national standards for each market).
- Approval roles and responsibilities are defined by school leadership.
- Content branching is used primarily for localization; other use cases are not in scope.

## Constitution Check

| Principle | How this spec complies |
|---|---|
| I. EU-Resident, Data-Minimised | All versioning and approval workflows are EU-resident only; no cross-border transfer of content or metadata. |
| II. GDPR Art. 8 | Approval workflows ensure pedagogical review before learner exposure; learner content data is archived per Art. 5 retention rules. |
| III. EU AI Act high-risk | AI-generated content undergoes compliance review as part of approval workflow; audit trail ensures traceability. |
| IV. Teacher-in-the-loop | Teachers approve curriculum standards alignment; teachers review and decide to use/reject lesson versions. |
| V. Pedagogical sign-off | Pedagogist approval is mandatory stage in workflow; ZPD alignment is gate before publication. |
| VI. Outcome-contract driven | SC-003 directly supports localization cycle KPI (12 → 6 weeks). |
| VII. Reproducible, spec-driven | Includes runbook in quickstart: draft → submit for approval → multi-stage review → publish → version for localization. |
