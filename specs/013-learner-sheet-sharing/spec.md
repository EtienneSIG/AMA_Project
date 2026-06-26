# Feature Specification: Learner Sheet & Item Sharing

**Feature Branch**: `013-learner-sheet-sharing`

**Created**: 2026-06-26

**Status**: Draft

**Input**: User description: "The capability to share an item or a sheet between learners."

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Share a Worked Item with a Classmate (Priority: P1)

A learner who has completed an exercise item wants to share it with a classmate in the same class so the classmate can see the question and (optionally) the learner's worked solution and discuss it. The learner picks a recipient from an approved class roster, adds an optional short note, and sends the share. The recipient receives an in-app notification and opens a read-only copy of the shared item.

**Why this priority**: Peer-to-peer sharing within a class is the core capability requested and the smallest slice that delivers value (collaborative learning, ZPD peer support) while staying inside the moderated, EU-resident, teacher-supervised boundary.

**Independent Test**: Learner A opens a completed item, selects classmate B from the class roster, sends the share; Learner B receives a notification and opens a read-only view of the shared item plus the optional note.

**Acceptance Scenarios**:

1. **Given** Learner A has an item open and a class roster of eligible recipients, **When** they choose "Share" and select Learner B in the same class, **Then** a share record is created and Learner B receives an in-app notification within **5 seconds**.
2. **Given** a share contains a free-text note, **When** it is submitted, **Then** the note is scanned by Azure Content Safety and only delivered if it passes; otherwise it is held for teacher moderation and the sender is notified.
3. **Given** Learner B opens a shared item, **When** the read-only view loads, **Then** they see the original item, the sender's optional note, and a clear "Shared by [first name]" attribution, with no ability to edit the original.
4. **Given** Learner A wants to revoke a share, **When** they select "Unshare", **Then** the recipient immediately loses access and the share record is marked revoked with a timestamp.

---

### User Story 2 — Share a Practice Sheet (Set of Items) (Priority: P2)

A learner assembles or completes a sheet (a named collection of items such as a worksheet or revision set) and shares the whole sheet with one or more classmates so they can practice the same set.

**Why this priority**: Sheet-level sharing extends the item-sharing primitive to collections; valuable but depends on the item-sharing slice existing first.

**Independent Test**: Learner A selects a sheet, shares it with two classmates; both receive read-only copies they can work through independently without altering Learner A's sheet.

**Acceptance Scenarios**:

1. **Given** Learner A has a sheet of items, **When** they share it with classmates B and C, **Then** B and C each receive a notification and an independent practice copy that does not affect A's progress data.
2. **Given** a recipient works through a shared sheet, **When** they answer items, **Then** their attempts are recorded against their own account only, never against the sender's.

---

### User Story 3 — Teacher Visibility & Control over Sharing (Priority: P1)

A teacher can view what has been shared within their class, can disable sharing for a learner or the whole class, and can review any content flagged by moderation.

**Why this priority**: Constitution principle IV (teacher-in-the-loop) and II (children's data) require teacher oversight of any learner-to-learner exchange involving minors.

**Independent Test**: Teacher opens the class sharing log, sees shares between learners, toggles "disable sharing" for one learner, and confirms that learner can no longer initiate shares.

**Acceptance Scenarios**:

1. **Given** sharing activity exists in a class, **When** the teacher opens the sharing log, **Then** they see sender, recipient, item/sheet, timestamp, and moderation status for each share.
2. **Given** a teacher disables sharing for a learner, **When** that learner attempts to share, **Then** the share action is blocked with a clear message.
3. **Given** a share note was flagged by Content Safety, **When** the teacher reviews it, **Then** they can approve or reject delivery and the decision is persisted for audit.

### Edge Cases

- Recipient is not in the sender's class (or class changes after sharing): share is blocked or auto-revoked; sharing is restricted to same-class peers by default.
- Recipient has parental consent pending/revoked (under-16 gating): recipient cannot receive shares until consent is active.
- Sender deletes the original item: the recipient's read-only copy is preserved as an immutable snapshot, or shown as "no longer available" per teacher policy.
- A learner attempts to share with an entire grade or external email: blocked; sharing scope is limited to the approved in-class roster, no external recipients.
- Recipient blocks/declines further shares from a sender: future shares from that sender are suppressed.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Learners MUST be able to share an individual item with one or more recipients drawn only from their own class roster.
- **FR-002**: Learners MUST be able to share a sheet (named collection of items) with one or more same-class recipients.
- **FR-003**: All shares MUST be read-only for the recipient; recipients MUST NOT be able to modify the sender's original item or sheet, and recipient attempts MUST be recorded only against the recipient's own account.
- **FR-004**: Any free-text note attached to a share MUST be scanned by Azure Content Safety before delivery; flagged content MUST be held for teacher moderation.
- **FR-005**: Senders MUST be able to revoke (unshare) at any time, immediately removing recipient access and persisting a revocation record.
- **FR-006**: Teachers MUST be able to view a per-class sharing log and disable sharing for an individual learner or the whole class.
- **FR-007**: System MUST gate sharing for under-16 learners on active parental consent for both sender and recipient.
- **FR-008**: Sharing MUST be restricted to recipients inside the EU-resident roster; no external recipients, no cross-EU transfer, no email of learner content outside the platform.
- **FR-009**: System MUST persist a full audit trail of shares (sender, recipient, artifact, timestamp, moderation verdict, revocation) for data-subject-rights and AI Act logging needs.
- **FR-010**: Recipients MUST be able to decline or block future shares from a specific sender.

### Key Entities

- **Share**: A record linking a sender, a recipient, and a shared artifact (item or sheet), with scope, optional note, content-safety verdict, status (active/revoked/flagged), and timestamps.
- **SharedArtifactSnapshot**: An immutable read-only copy (or reference) of the item/sheet at share time, ensuring recipient view stability and sender progress isolation.
- **SharingPolicy**: Per-learner / per-class settings controlling whether sharing is enabled, set by teachers.
- **ModerationVerdict**: Content Safety result and any teacher override decision attached to a share note.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A learner can complete a share to a classmate in **≤3 interactions** and the recipient is notified within **5 seconds** (p95).
- **SC-002**: **100%** of share notes are scanned by Content Safety; **zero** policy-violating notes are delivered unreviewed.
- **SC-003**: **Zero** shares are delivered to recipients outside the sender's class or to under-16 learners without active parental consent (verified by audit).
- **SC-004**: Teachers can locate and act on any share in their class sharing log in **≤30 seconds**.
- **SC-005**: Peer-supported practice (measured via shared-sheet completion) contributes to closing the outcome gap between high- and low-performing learners (supports the −26% outcome-gap KPI).
- **SC-006**: **100%** of share/unshare actions produce a persisted audit record retrievable for data-subject requests.

## Assumptions

- The existing class roster and learner-teacher mapping are authoritative for determining eligible recipients.
- The existing GDPR Art. 8 parental-consent state (from Spec 006) is queryable to gate sharing.
- Azure Content Safety and the `logContentSafety()` helper / `content_safety_results` table already exist and are reused, not duplicated.
- Sharing is in-class peer support, not a public social feed; no profiles, followers, or discoverability features are introduced.

## Constitution Check

| Principle | How this spec complies |
|---|---|
| I. EU-Resident, Data-Minimised | Shares stay inside the EU-resident roster; no external recipients, no new PII classes, only existing pedagogical content plus an optional moderated note. |
| II. GDPR Art. 8 | Sharing for under-16 learners is gated on active parental consent for both parties; full audit trail supports data-subject rights. |
| III. EU AI Act high-risk | No new AI decisioning; the only AI is the existing Content Safety moderation, which ships with logging and human (teacher) override. |
| IV. Teacher-in-the-loop | Teachers can view, moderate, and disable all sharing; flagged notes require teacher approval. |
| V. Pedagogical sign-off | Peer sharing is reviewed by Learning Sciences for ZPD-appropriate collaboration; framed as in-class practice, not social media. |
| VI. Outcome-contract driven | SC-005 ties peer-supported practice to the −26% outcome-gap KPI. |
| VII. Reproducible, spec-driven | Independently testable user stories and measurable success criteria enable spec-driven implementation. |
