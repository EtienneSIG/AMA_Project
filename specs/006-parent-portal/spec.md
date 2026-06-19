# Feature Specification: Parent Portal — Communications, Consent & Digest

**Feature Branch**: `006-parent-portal`

**Created**: 2026-06-18

**Status**: Draft

**Input**: Backlog items (P0-P1) — Parent portal lightweight and actionable; digest hebdo + "How to help this week"; multi-children, parental consent GDPR Art. 8, secure parent-teacher communication.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Multi-Child Dashboard with Weekly Progress Summary (Priority: P0)

A parent of two learners in different classes opens the parent portal and needs a unified view showing each child's weekly progress (completion, mastery per subject, attendance) so they can understand at a glance where each child stands without inspecting individual items.

**Why this priority**: Parents need one-screen insight into both children's learning without overwhelming detail. This is the primary value from the parent portal and must load quickly on mobile.

**Independent Test**: A parent with two children logs in, sees a child-selector or card layout, views each child's weekly summary (progress bar, completed/total items, key subjects), and switches between children.

**Acceptance Scenarios**:

1. **Given** a parent is authenticated with parental consent for two children, **When** they access the dashboard, **Then** they see a list of their children with quick-select buttons and a summary card for the current child showing progress, completed items, and attendance for the current week.
2. **Given** a parent switches to a different child, **When** they tap the child selector, **Then** the dashboard re-renders within **2 seconds** showing that child's unique progress and alerts without a full page reload.
3. **Given** a child has no activity in the current week, **When** the parent views the summary, **Then** the portal shows "No activity this week" with a link to last completed activity or a "Check assignment" CTA.

---

### User Story 2 — Secure Parent-Teacher Communication & Announcements (Priority: P0)

A teacher sends a message about an upcoming project to parents of one class. A parent receives the announcement, reads it, and can optionally reply with a question. The parent sees a timestamp and knows the teacher has read their reply.

**Why this priority**: Two-way communication with moderation protects both parent and teacher and is essential for learner support and community trust.

**Independent Test**: A teacher posts a message to parents; a parent receives it (in-app notification + optional email), reads it, replies, teacher sees the reply marked as unread, and both see read receipts.

**Acceptance Scenarios**:

1. **Given** a teacher posts an announcement tagged for a specific class, **When** parents of that class are listed, **Then** each parent receives an in-app notification and (if opted in) an email summary with the announcement text and a link to reply in-app.
2. **Given** a parent reads an announcement, **When** they tap "Read", **Then** the announcement is marked as read on the teacher's side with a timestamp.
3. **Given** a parent or teacher replies in a thread, **When** content is submitted, **Then** the system scans it using Azure Content Safety, flags any non-compliant content for moderation, and delivers compliant messages to the recipient with a timestamp.

---

### User Story 3 — Parental Consent Workflow for Under-16 Learners (Priority: P0)

When a learner under 16 is activated in the system, a parental/guardian consent prompt is sent to the listed guardian contact. The parent reviews the consent terms, provides informed consent, and sees a confirmation. The learner can only access content after consent is collected.

**Why this priority**: This implements GDPR Article 8 core requirement and gates learner access to pedagogical features until parent has explicitly agreed.

**Independent Test**: Add a learner aged 14; system sends a parental consent request; parent opens link, reviews terms, accepts, and learner account transitions to active status.

**Acceptance Scenarios**:

1. **Given** a learner under 16 is created in the system, **When** the system identifies the under-16 status, **Then** a parental consent request is queued and an email is sent to the listed guardian with a unique, time-limited consent link (7 days).
2. **Given** a parent opens the consent link, **When** they review the plain-language consent form, **Then** they see terms describing data use, AI/adaptive features, and rights (access, erasure); they must explicitly check "I agree" to proceed.
3. **Given** a parent provides consent, **When** they submit the form, **Then** the consent is recorded with timestamp, parent email, and signed audit trail; the learner is flagged as "parental consent obtained" and gains access to adaptive/AI features.
4. **Given** 7 days pass without consent, **When** the deadline expires, **Then** the system sends a reminder email and holds the learner account in "pending consent" state, preventing new assignments or adaptive activity.

---

### User Story 4 — Automated Weekly Digest & "How to Help This Week" (Priority: P1)

Every Sunday evening, a parent receives an email digest summarizing their child's week (items completed, progress in top 3 subjects, one peer comparison, suggested family activity aligned to the learner's zone of proximal development).

**Why this priority**: This reduces friction for parents who don't log in frequently and gives them actionable guidance on how to support learning at home, directly supporting the outcome-gap reduction KPI.

**Independent Test**: Configure a digest schedule; verify an email is sent at 18:00 Sunday with child's name, weekly summary, one "How to help" activity suggestion, and a link to see more detail.

**Acceptance Scenarios**:

1. **Given** a parent has opted in to weekly digest (default on), **When** Sunday 18:00 UTC arrives, **Then** an email is sent with: child's name, top 3 subjects (progress bars), items completed count, one age-appropriate "How to help" suggestion (e.g., "Practice fractions with coins at home"), and a link to the portal.
2. **Given** a learner has made significant progress in a subject, **When** the digest is generated, **Then** a celebration note is included ("Great week in English! 3 assignments completed.").
3. **Given** a learner is struggling in one subject, **When** the digest is generated, **Then** a supportive note and resource link are included (e.g., "Math needs attention. Try these parent-friendly practice tips: <link>").
4. **Given** a parent has opted out of digest emails, **When** Sunday arrives, **Then** no email is sent; the summary is still available in the portal dashboard when they log in.

---

### User Story 5 — Parent Translation Mode & Family Resources Center (Priority: P1)

A parent who speaks Spanish accesses the portal in Spanish mode. All parent-facing text is translated. The portal includes a "Family Resources" section with translated articles about learning strategies, technology safety, and age-appropriate guidance.

**Why this priority**: This supports multi-language markets (NL, BE, DE, PL, RO) and ensures parents can support children in their home language.

**Independent Test**: Change portal language to Spanish; verify all UI text, emails, and resource links are in Spanish; verify Family Resources Center is populated with Spanish resources.

**Acceptance Scenarios**:

1. **Given** a parent accesses the portal, **When** they select language from a language picker, **Then** all portal text, emails, and push notifications switch to the selected language for that parent only.
2. **Given** a parent is in translation mode, **When** they navigate to "Family Resources", **Then** they see a curated list of articles in their language covering topics like "Supporting Your Child's Learning", "Digital Wellness", and age-specific guidance.
3. **Given** a resource is translated, **When** a parent opens it, **Then** the content is full-translated (not machine-translated mid-page) and includes culture-relevant examples for the parent's region.

### Edge Cases

- Parent has been granted access to a child but consent is revoked; learner access is immediately gated and parent is notified.
- Parent receives a message while offline; message is queued and delivered when they reconnect.
- Message contains flagged content per Azure Content Safety policy; message is held in moderation queue and parent/teacher receive a notification that review is pending.
- Parent email address is updated; consent link sent to old address remains valid for 7 days; a new link is sent to the new address.
- Digest email is sent but parent has multiple children; each child gets a separate digest.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Parent portal MUST display a multi-child selector and show per-child progress dashboard with weekly summary (items completed, mastery by subject, attendance).
- **FR-002**: Parent portal MUST display all announcements from teachers assigned to the parent's children, with in-app notification and optional email.
- **FR-003**: Parent MUST be able to reply to announcements; replies MUST be scanned by Azure Content Safety before delivery to teacher.
- **FR-004**: System MUST enforce GDPR Art. 8 parental consent for learners under 16 before pedagog features are accessible.
- **FR-005**: Parental consent flow MUST include plain-language disclosure, explicit checkbox acceptance, timestamp recording, and audit trail.
- **FR-006**: System MUST send automated weekly digest email to parents (default on) with child's progress, one "How to help" activity, and a celebration or support note.
- **FR-007**: Parent portal MUST support UI language selection (NL, DE, FR, ES, PL, RO) for all parent-facing surfaces and emails.
- **FR-008**: System MUST provide a Family Resources center with translated articles aligned to learner age and family support needs.
- **FR-009**: All parent-teacher communication MUST preserve EU residency and MUST NOT introduce new data classes beyond pedagogical messaging.
- **FR-010**: Parent portal MUST be mobile-responsive and load primary dashboard in <= **3 seconds** on 4G.

### Key Entities

- **ParentConsent**: Opt-in record for learner under 16 (parent email, consent timestamp, version, audit trail).
- **ParentMessage**: Two-way parent-teacher communication record (sender role, recipient, content, content-safety verdict, delivery timestamp, read receipt).
- **ParentDigest**: Weekly summary record for email dispatch (learner, parent email, progress summary, "How to help" activity, content-safety cleared).
- **ParentPreferences**: Parent settings (language, digest opt-in, email frequency, notification channels).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Parent portal dashboard loads for multi-child household in <= **3 seconds** p95 on 4G.
- **SC-002**: **≥90%** of parental consent requests for under-16 learners are completed within **7 days** of initial request.
- **SC-003**: **≥75%** of parents who receive a weekly digest open it or visit the portal within **3 days** of email send.
- **SC-004**: Parent-teacher message thread response time is **≤24 hours** median (tracked teacher-to-parent reply latency).
- **SC-005**: **100%** of parent communication content is scanned by Content Safety; **zero** policy-violating messages are delivered unreviewed.
- **SC-006**: Parent portal supports **≥5 languages** with **≥90%** UI text coverage per language.
- **SC-007**: Compliance review confirms **zero** new GDPR Art. 8 non-conformities and **zero** data classes beyond encrypted pedagogical messaging.

## Assumptions

- Existing learner-teacher mapping and class roster are authoritative for parent assignment.
- Parental consent for under-16 leverages existing GDPR Art. 8 flow from constitution.
- Email infrastructure (SendGrid/similar) is available and compliant.
- Azure Content Safety API is available and configured per Data API builder contract.

## Constitution Check

| Principle | How this spec complies |
|---|---|
| I. EU-Resident, Data-Minimised | Parent portal uses only encrypted pedagogical messaging and parental consent records; no profiling, no cross-EU transfer. |
| II. GDPR Art. 8 | Core feature: implements parental consent collection, data-subject rights surface, and strict under-16 gating. |
| III. EU AI Act high-risk | No new AI decisioning in parent surfaces; human oversight is built into teacher-moderated messaging and consent. |
| IV. Teacher-in-the-loop | Parent-teacher messaging is bidirectional and moderated; no autonomous recommendations to parents. |
| V. Pedagogical sign-off | Weekly digest and "How to help" activities are reviewed by Learning Sciences team for ZPD alignment. |
| VI. Outcome-contract driven | SC-003, SC-004 support teacher admin time and parent engagement, moving the outcome-gap KPI. |
| VII. Reproducible, spec-driven | Includes runbook and test scenario in quickstart for multi-language, multi-child, and consent workflows. |
