# Implementation Plan: Parent Portal — Communications, Consent & Digest

**Branch**: `006-parent-portal` | **Date**: 2026-06-18 | **Spec**: `/specs/006-parent-portal/spec.md`

**Input**: Feature specification from `/specs/006-parent-portal/spec.md`

## Summary

Deliver a parent-first portal application supporting multi-child progress dashboards, secure parent-teacher bidirectional messaging with content-safety moderation, GDPR Article 8 parental-consent collection for learners under 16, automated weekly digest emails with "How to help" guidance, and multi-language support across five EU markets. The implementation extends the existing Node.js Express demo app pattern by adding a new `demo/apps/parent-portal/` surface, integrating Azure Content Safety for message moderation, leveraging existing email infrastructure (SendGrid/similar), and maintaining EU-resident data minimization with no new AI decisioning. All parent-teacher communication is bidirectional, moderated before delivery, and auditable; parental consent is explicit, timestamped, and enforces access gating for learners under 16.

## Technical Context

**Language/Version**: Node.js 22.x (parent portal runtime), HTML/CSS/vanilla JavaScript for parent-facing surfaces, SQL-backed schema for consent, messaging, digest preferences, and audit records

**Primary Dependencies**: `express`, `cookie-parser`, `bcryptjs`, `pg`, `@azure/identity` (existing app baseline), `@azure/ai-content-safety` (new Content Safety client library), email library for digest dispatch (SendGrid SDK or nodemailer with SMTP relay)

**Storage**: Azure Database for PostgreSQL Flexible Server (existing `db/schema.sql` + new parent-portal schema tables), no new external storage introduced; all personal data EU-resident

**Testing**: Existing PowerShell acceptance flow in `demo/scripts/acceptance_tests.ps1` extended with parent portal scenarios, plus role-based manual walkthrough in `specs/006-parent-portal/quickstart.md` covering consent flow, multi-child dashboard, messaging thread, digest verification, and language switching

**Target Platform**: Azure App Service Linux app for `demo/apps/parent-portal/`; existing demo networking, PostgreSQL connectivity, and managed identity auth; email dispatch via configured SMTP relay or SendGrid

**Project Type**: Web application (server routes + static frontend) with multi-language support and email dispatch subsystem

**Performance Goals**:
- Parent portal dashboard (multi-child selector + weekly summary) loads in <= 3 seconds p95 on 4G (SC-001)
- Parental consent request email delivery within <= 30 minutes of learner creation (supporting SC-002 completion target)
- Weekly digest email generation completes for all opted-in parents within a 2-hour window on Sunday evening (supporting SC-003 engagement target)
- Parent-teacher message delivery and read-receipt updates <= 5 seconds p95 server time (supporting SC-004)
- Content Safety scan and message moderation decision <= 2 seconds per message (supporting SC-005)

**Constraints**:
- EU data residency only (West Europe/North Europe Azure regions); no cross-EU transfer
- GDPR Article 8 gating strictly enforced for learners under 16; parental consent mandatory before adaptive/AI feature access
- No new autonomous learner-impacting AI decisions; all recommendations remain advisory
- Parent-teacher messaging is bidirectional but moderated; no unreviewed content delivery
- Email infrastructure must support opt-in/opt-out preferences and unsubscribe links
- Multi-language UI support mandatory for NL, DE, FR, ES, PL, RO; 90%+ UI text coverage per language
- Translation scope limited to UI surfaces and emails; content resources must be fully translated, not machine-translated mid-page

**Scale/Scope**:
- Initial scope: one parent portal surface serving multi-child households, teachers as message senders, admin/support staff for consent remediation
- Feature surfaces: parent dashboard, messaging thread, consent workflow, digest preferences, Family Resources center, language selector
- Data domain: parental consent records, parent-teacher message threads (with content safety verdicts), digest preferences, parent audit events
- Reporting period: weekly digest scheduling, parental consent lifecycle (7-day request window + reminder cycle)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Pre-Phase 0 Gate

| Principle | Status | Plan handling |
|---|---|---|
| I. EU-Resident, Data-Minimised | PASS | Parent portal stores only encrypted pedagogical messaging, parental consent records (email, timestamp, audit trail), progress summaries (aggregated per-child weekly data), and digest preferences; no profiling, no cross-EU transfer, no third-party SDK data exfiltration. |
| II. GDPR Art. 8 | PASS | **Core feature**: implements mandatory parental consent collection for learners under 16, plain-language disclosure forms, explicit checkbox acceptance, timestamp recording with audit trail, and strict access gating. Learners cannot access adaptive/AI features until consent is obtained. |
| III. EU AI Act high-risk discipline | PASS | No new AI decisioning in parent surfaces; content safety scanning is applied to parent-teacher messages and digest content before delivery (non-autonomous human moderation path). Feature preserves Art. 12 logging, Art. 13 transparency, and Art. 14 human oversight via teacher-in-the-loop messaging. |
| IV. Teacher-in-the-loop | PASS | Parent-teacher messaging is bidirectional and moderated; teachers retain full visibility and response capability. No autonomous recommendations to parents without teacher or Learning Sciences review (weekly "How to help" activities require pedagogical sign-off). |
| V. Pedagogical sign-off | PASS | Weekly digest and "How to help" activities are reviewed by Learning Sciences team for Zone of Proximal Development (ZPD) alignment and age-appropriateness before any digest is sent. Celebration and support notes are pedagogically grounded. |
| VI. Outcome-contract driven | PASS | SC-002 (≥90% parental consent completion within 7 days) and SC-003 (≥75% digest open rate within 3 days) directly support parent engagement → teacher admin time reduction → outcome-gap closure KPI. SC-004 (≤24h message response) supports teacher-parent collaboration efficiency. |
| VII. Reproducible, spec-driven | PASS | All artifacts created under `specs/006-parent-portal/` with concrete implementation paths, data contracts, test scenarios, and multi-language/consent runbook. Feature is deployable end-to-end from clean tenant following `demo/DEPLOYMENT-TUTORIAL.md`. |

**EU AI Act articles touched**:
- **Art. 9 (Risk Management)**: Parental consent flow includes risk mitigations for consent non-completion, age misclassification, and consent revocation edge cases.
- **Art. 10 (Data Governance)**: Parental consent records, message audit trail, and digest preference metadata are documented as approved data classes; no new categories introduced.
- **Art. 12 (Logging/Traceability)**: All consent requests, consent submissions, revocations, message sends/reads, and digest dispatches are logged with timestamp, parent email, learner ID (encrypted), and outcome.
- **Art. 13 (Transparency)**: Parental consent form includes plain-language disclosure of data use, AI/adaptive features, and parental rights (access, erasure, opt-out); digest emails include explanation of metric sources and opt-out link.
- **Art. 14 (Human Oversight)**: Parent-teacher messaging is moderated by Content Safety + teacher review queue; digest content generation follows pedagogical review and Learning Sciences signoff; no automated learner decisions flow from parent communication.
- **Art. 15 (Robustness/Cybersecurity)**: Parent portal enforces role-based access, HTTPS-only transport, parental consent link time-limiting (7 days), and secure password reset paths.

**DPIA delta**: Moderate processing purpose extension for parental/guardian communication and consent governance. New data classes are limited to: (1) parental/guardian email and contact metadata, (2) explicit parental consent records with versioned disclosure text and timestamp, (3) parent-teacher message threads (encrypted at rest), (4) digest preference state, and (5) operational audit events. No new biometric, behavioral profiling, or sensitive-category data introduced. Data retention: parental consent records retained for learner lifetime + 6 years (audit trail); message threads retained per school policy or learner graduation; digest preferences retained while account active. No cross-EU transfer. Access limited to program staff, parents (their own consent records), and teachers (messages to their classes). DPIA update must document: (a) lawful basis for each processing purpose (performance of educational services + parental authority for under-16 learners), (b) retention periods per class, (c) parent data-subject rights access and rectification paths, (d) Content Safety verdict logging without storing flagged content permanently, and (e) emergency revocation path if learner reaches 16 or parent withdraws.

**Human oversight surface**: 
- **Parental Consent**: Admin/support staff can view consent status, resend consent requests, and escalate non-responses; learner access is gated until consent received.
- **Parent-Teacher Messaging**: Messages flagged by Content Safety go to teacher moderation queue before delivery; teachers can approve, reject with explanation, or request rewording before learner/parent sees the message.
- **Weekly Digest**: Learning Sciences team reviews "How to help" activity recommendations quarterly; digest content is pre-approved before template is deployed; parents can opt-out anytime via unsubscribe link.

## Project Structure

### Documentation (this feature)

```text
specs/006-parent-portal/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── parent-portal.openapi.yaml
└── tasks.md
```

### Source Code (repository root)

```text
demo/
├── apps/
│   ├── parent-portal/                 # new app surface for parent users
│   │   ├── server.js                  # parent auth, dashboard, messaging, digest preference routes
│   │   ├── auth.js                    # role-gated parent session middleware (reuse pattern from other apps)
│   │   ├── db/
│   │   │   ├── index.js               # parent-portal DB helpers: consent, messaging, digest queries
│   │   │   └── schema.sql             # parent consent, message thread, digest preference, audit tables
│   │   ├── services/
│   │   │   ├── content-safety.js      # Content Safety client wrapper for message scanning
│   │   │   └── email-dispatcher.js    # Digest email generation and SendGrid/SMTP dispatch
│   │   └── public/
│   │       ├── index.html             # multi-child dashboard + messaging UI
│   │       ├── consent.html           # parental consent form (plain-language disclosure)
│   │       ├── resources.html         # Family Resources center (translated articles)
│   │       ├── preferences.html       # digest opt-in/frequency, language selector
│   │       └── styles/                # CSS shared with LearnEU design system
│   ├── _shared/
│   │   ├── auth.js                    # existing role gate middleware (extend for parent role)
│   │   └── db/
│   │       └── index.js               # shared parent/learner relationship helper (reuse)
│   └── teacher-console/
│       ├── moderation.js              # message moderation queue UI integration (extend)
│       └── public/
│           └── moderation.html        # Content Safety verdict review + teacher approval UI
├── scripts/
│   ├── acceptance_tests.ps1           # extend with parent consent flow, messaging, digest verification
│   └── send_digests.ps1               # scheduled weekly digest dispatcher (Sunday 18:00 UTC)
├── config/
│   └── localization/
│       └── parent-portal-translations.json  # NL, DE, FR, ES, PL, RO translation strings
└── data/
    └── family-resources/               # pre-approved translated resource articles
        ├── learning-strategies-*.md
        ├── tech-safety-*.md
        └── age-guidance-*.md
```

**Structure Decision**: Extend the existing multi-app Express architecture by introducing a new `demo/apps/parent-portal/` surface. Reuse existing auth/session patterns from `demo/apps/_shared/auth.js`, share parent-learner relationship helpers, and integrate Content Safety and email services as new dependencies without introducing a separate microservice layer. This keeps deployment topology unchanged, reduces compliance scope, and ensures parent-teacher message moderation workflows remain operable in the teacher-console app where they will be actioned.

## Phase 0: Research

Research outcomes are captured in `specs/006-parent-portal/research.md` and resolve all technical clarifications:

- Azure Content Safety API configuration, classification thresholds, and integration pattern for message scanning
- Email service integration (SendGrid vs. SMTP relay compliance with EU regulations)
- Parental consent form accessibility, compliance with GDPR Art. 8 plain-language requirements, and link expiration security
- Multi-language localization scope: UI translation coverage (NL, DE, FR, ES, PL, RO), resource article translation quality, and locale detection logic
- Parent session timeout and token refresh for long-lived browser sessions
- Weekly digest scheduling across time zones and opt-in/opt-out preference management
- Parent-teacher message thread encryption, audit trail schema, and edge cases (parent email change, teacher reassignment)
- Existing learner-parent relationship data source and hierarchy reconciliation

## Phase 1: Design & Contracts

### Data Model

Defined in `specs/006-parent-portal/data-model.md`:

- **ParentAccount**: Parent/guardian identity, email, preferred language, account status
- **ParentConsent**: GDPR Art. 8 consent record (learner_id, parent_email, consent_text_version, accepted_timestamp, audit_trail)
- **ParentLearnerRelationship**: Parent-child enrollment link with relationship type (guardian/parent/contact)
- **ParentMessage**: Two-way parent-teacher communication record (sender_role, recipient, content, content_safety_verdict, delivery_timestamp, read_receipt)
- **MessageModerationQueue**: Content Safety flagged message with moderation status and teacher action
- **ParentDigestPreference**: Opt-in flag, frequency (weekly/off), language, email address
- **WeeklyDigestRecord**: Generated digest snapshot (learner_id, parent_email, progress_summary, how_to_help_activity, celebration_note, dispatch_timestamp)
- **ParentAuditEvent**: Consent requests, consent submissions, message sends/reads, digest opens, language changes, email changes
- **FamilyResource**: Curated article metadata (topic, age_range, language, translated_content_url, last_updated)

### Interface Contracts

Defined in:

- `specs/006-parent-portal/contracts/parent-portal.openapi.yaml`

Contract includes:
- Parent authentication and session routes
- Multi-child dashboard endpoint (weekly progress summary per child)
- Message thread endpoints (list threads, send message, mark read, archive)
- Parental consent request/completion endpoints (send request email, accept/reject form submission, check status)
- Digest preference endpoints (get/set opt-in, language, frequency)
- Family Resources discovery endpoint (list articles by language/topic)
- Internal moderation endpoints (Content Safety verdict review, teacher approval action, audit logging)

### Quickstart

Defined in:

- `specs/006-parent-portal/quickstart.md`

Includes:
- Parent registration and first-time login
- Multi-child household dashboard navigation and refresh timing
- Parental consent request email flow, link expiration, and reminder cycle
- Parent-teacher message send, delivery, read receipt, and moderation queue handling
- Weekly digest subscription, language/frequency preferences, opt-out flow
- Content Safety scan results and human moderation path
- Family Resources search and translation verification
- Negative access tests (no-consent learner blocking, role-based access denial, message tampering attempts)
- Audit log verification for all consent, message, and digest events

## Phase 1 Post-Design Constitution Re-Check

| Checkpoint | Result |
|---|---|
| Parental consent gating is enforced for learners under 16 before adaptive feature access | PASS |
| Parent-teacher messaging remains bidirectional and moderated; no unreviewed content delivery | PASS |
| No new autonomous learner-impacting decisions introduced | PASS |
| All personal data (consent records, messages, preferences) stored in EU-resident PostgreSQL only | PASS |
| "How to help" activities and weekly digest content are pedagogically reviewed before deployment | PASS |
| Message moderation queue with Content Safety verdict + teacher override exists and is auditable | PASS |
| Parental consent records include timestamp, email, version, and audit trail for compliance review | PASS |
| Language support covers five EU markets with 90%+ UI text coverage and fully translated resources (no mid-page machine translation) | PASS |
| All audit events (consent requests, message sends/reads, digest dispatches, preference changes) are logged with timestamp and outcome | PASS |

No constitution violations require waiver.

## Implementation Phases

### Phase 0 - Research and Technical Dependencies

Validate Azure Content Safety API availability and classification schema; confirm email service infrastructure (SendGrid account provisioning, SMTP relay configuration, bounce handling, compliance with GDPR email requirements). Resolve parent-teacher relationship data source from existing learner-teacher mappings. Confirm multi-language locale detection and translation asset ownership per region. Produce a research note resolving all implementation unknowns.

### Phase 1 - Parent Portal Core & Auth

Establish the new `demo/apps/parent-portal/` Express app with role-gated session middleware reusing `demo/apps/_shared/auth.js`. Wire up basic parent authentication (parent email + password or OAuth via Azure AD B2C), session token management, and MFA if required by compliance. Add a simple "You are logged in" home page and a parent profile preferences surface.

### Phase 2 - Parental Consent Workflow

Implement the GDPR Art. 8 parental consent request and acceptance flow: (1) trigger consent request email when a learner under 16 is activated, (2) send signed consent link with 7-day expiration, (3) deliver plain-language consent form with checkbox acceptance, (4) record consent with timestamp and audit trail, (5) gate learner access to adaptive/AI features until consent received, (6) send reminder email at 6-day mark if not yet consented, (7) support admin/support staff remediation (resend, manual override for edge cases).

### Phase 3 - Multi-Child Dashboard & Progress Summary

Build parent-facing dashboard showing child selector (multi-child households) and weekly progress summary per child: items completed this week, mastery by subject (progress bars), attendance status, and one alert/celebration note. Ensure dashboard loads within 3 seconds p95 on 4G. Include "no activity this week" state and links to last completed activity or assignment check CTA.

### Phase 4 - Parent-Teacher Messaging with Content Safety

Implement bidirectional parent-teacher messaging: (1) teachers post announcements to parent groups via class roster, (2) parents receive in-app notification + optional email with message and reply button, (3) parent replies are scanned by Azure Content Safety for policy violations, (4) flagged messages enter teacher moderation queue with Content Safety verdict visible, (5) teacher can approve/reject/request rewording, (6) approved messages are marked with read receipt timestamp when opened, (7) all sends/reads/moderation actions are audited with timestamp and actor role.

### Phase 5 - Weekly Digest & "How to Help" Automation

Implement weekly digest email generation and dispatch on Sunday evening (18:00 UTC): (1) collect this week's progress data per learner per opted-in parent, (2) generate per-child summary (top 3 subjects with progress bars, items completed count), (3) select one age-appropriate "How to help" activity from approved Learning Sciences library aligned to learner's ZPD, (4) add celebration or support note based on progress trend, (5) include opt-out link and portal login link, (6) send via configured SMTP relay or SendGrid, (7) log dispatch timestamp and open rate tracking (if opted in for email analytics). Ensure generation completes within 2-hour Sunday evening window.

### Phase 6 - Language Support & Family Resources

Add UI language selector (NL, DE, FR, ES, PL, RO) to parent portal and preference persistence. Translate all parent-facing UI strings, email templates, and in-app notifications to five languages. Create Family Resources center with curated, fully-translated articles on: "Supporting Your Child's Learning", "Digital Wellness & Tech Safety", "Age-Specific Parenting Guidance", and "How to Help at Home". Organize by language and age range; ensure translations are professional, not machine-generated mid-page.

### Phase 7 - Moderation Queue & Teacher Oversight

Extend `demo/apps/teacher-console/` with a parent-message moderation dashboard: (1) show queue of messages flagged by Content Safety with classification (profanity, harassment, unsafe, etc.), (2) allow teacher to read full message and Content Safety metadata, (3) provide UI buttons for "Approve & Send", "Reject", and "Request Rewording", (4) record teacher action with timestamp and rationale, (5) escalate rejected/rewording-requested messages back to admin for follow-up with parent. Ensure moderation can happen within 1-hour SLA to avoid message delays.

### Phase 8 - Verification, Audit & Demo Readiness

Complete end-to-end acceptance tests covering: (1) parent consent request/completion flow with email delivery, (2) multi-child dashboard navigation and performance, (3) parent-teacher message send with Content Safety scan and moderation path, (4) weekly digest generation and email delivery, (5) language switching and translation verification, (6) Family Resources discovery, (7) negative access tests (no-consent learner blocking, unauthorized parent isolation), (8) audit log verification for all events. Package the feature for demo deployment and run authenticated smoke test with sample parent, teacher, and learner accounts.

## Design & Contracts

### Data Model

Defined in `specs/006-parent-portal/data-model.md`:

Entity descriptions and relationships (foreign keys, indexes, state transitions).

### Interface Contracts

API and UI contracts defined in:

- `specs/006-parent-portal/contracts/parent-portal.openapi.yaml`

Covers all REST endpoints for parent dashboard, messaging, consent, digest preferences, Family Resources, and internal moderation routes.

### Quickstart

Defined in:

- `specs/006-parent-portal/quickstart.md`

Operator and tester flow for consent workflows, messaging threads, digest verification, language switching, and audit confirmations.

## Post-Design Constitution Re-Check

| Checkpoint | Result |
|---|---|
| Parental consent for under-16 learners is mandatory before adaptive/AI feature access (GDPR Art. 8 enforcement) | PASS |
| All parent personal data (email, consent records, message history) stored in EU-resident PostgreSQL only | PASS |
| Parent-teacher messaging is bidirectional and every message is scanned by Content Safety before delivery to ensure no policy violations escape moderation | PASS |
| Teacher moderation queue with Content Safety verdict + override capability is implemented and auditable | PASS |
| Weekly digest content is pedagogically reviewed and Learning Sciences approved before any template deployment | PASS |
| "How to help" activities are grounded in ZPD research and age-appropriate; no autonomous child recommendations flow from parent communication | PASS |
| Language support covers five EU markets with ≥90% UI text coverage and fully translated resources (no mid-page machine translation) | PASS |
| All audit events (consent, messaging, digest, preference changes) are logged with timestamp, parent email, learner ID (encrypted), and outcome | PASS |
| Parent portal integrates cleanly with existing learner-teacher-admin-director app pattern without introducing new compliance scope or deployment complexity | PASS |
| Multi-child household support is tested with performance assertions (dashboard load ≤3s, message delivery ≤5s, Content Safety scan ≤2s) | PASS |

No constitution violations require waiver.

## Verification Approach

1. **Parental Consent Gate**: Create a learner account under 16 and verify that access to adaptive features is blocked until parental consent is received. Verify consent request email is sent within 5 minutes. Verify 7-day expiration is enforced and reminder email is sent at 6-day mark.

2. **Multi-Child Dashboard**: Log in as a parent with two learners in different classes. Verify dashboard loads within 3 seconds. Verify child selector shows both children. Verify switching between children updates dashboard within 2 seconds. Verify weekly progress summary is accurate (items completed, subject mastery, attendance) and matches backend data.

3. **Parent-Teacher Messaging**: As a teacher, post an announcement to a parent group. Verify parent receives in-app notification + optional email with message text and reply button. Verify parent can reply and message is scanned by Content Safety. Verify flagged message enters teacher moderation queue with Content Safety verdict visible. Verify teacher can approve (message delivered with read receipt) or reject (parent notified of rejection). Verify all sends/reads/approvals are logged in audit trail.

4. **Weekly Digest**: Configure a digest schedule, set opt-in preference. On Sunday 18:00 UTC, verify digest email is sent to opted-in parents with child name, top 3 subjects (progress bars), items completed, one age-appropriate "How to help" activity, celebration or support note, and opt-out link. Verify digest open is tracked (if analytics enabled). Verify opt-out link removes parent from future digests.

5. **Language Support**: Switch parent portal language to Spanish. Verify all UI text, emails, and resource links are in Spanish. Navigate to Family Resources and verify translated articles are in Spanish (not machine-translated). Verify language preference persists across sessions.

6. **Content Safety & Moderation**: Test message with flagged keywords (crafted carefully to avoid real harmful content). Verify message is captured by Content Safety, flagged in moderation queue with classification. Verify teacher can review and approve/reject. Verify audit log records moderation action with timestamp.

7. **Consent Revocation Edge Case**: Create a learner under 16 with parental consent. When learner reaches 16 (or simulate birthday), verify that parental consent requirement is lifted. Verify audit log records the transition. Verify learner can access adaptive features without fresh consent prompt.

8. **Multi-Language Audit**: Verify translations for all five languages (NL, DE, FR, ES, PL, RO) have ≥90% UI text coverage. Verify resource articles are professionally translated (full page translation, not machine-generated mid-page snippets). Verify language-specific email templates are used per parent preference.

9. **Role-Based Access Control**: Verify an unauthorized parent cannot view another parent's consent records or message threads. Verify a parent cannot send messages on behalf of a teacher. Verify an admin can resend consent links but cannot modify final consent timestamp.

10. **Audit Trail Completeness**: Verify all critical events are logged: consent requests (timestamp, parent email, learner_id encrypted), consent acceptances (timestamp, acceptance text version), message sends (sender role, recipient, content_safety_verdict), message reads (timestamp), moderation approvals (teacher, timestamp, rationale), digest dispatches (timestamp, recipient email, digest_id), language changes (parent_id, new language, timestamp), and preference updates (opted in/out, frequency change, timestamp).

## Complexity Tracking

No constitution violations identified.

**Implementation constraints identified**:
- Azure Content Safety API rate limiting must be handled gracefully; implement queuing and retry logic for high-message-volume teachers posting announcements to large parent groups.
- Email delivery SLA: ensure digest batch sending completes within 2-hour Sunday window; monitor bounce rates and implement auto-retry for transient SMTP failures.
- Parental consent link security: use short-lived tokens (7 days) and log all activation attempts; implement brute-force protection on link redemption.
- Multi-language resource translation: establish translation workflow (QA, in-country review) before go-live; maintain separate resource branches per language to avoid mid-page machine translation.
- Parent session timeout: balance security (shorter timeout for sensitive data access) with usability (long-lived session for weekly digest email clicks); recommend 60-minute inactivity timeout with option to "remember me" for up to 30 days.

**Dependencies to confirm**:
- Azure Content Safety API availability in West Europe/North Europe regions; confirm API cost model and rate limits.
- Email service infrastructure (SendGrid or SMTP relay) with GDPR-compliant bounce handling and unsubscribe automation.
- Existing learner-teacher relationship data is authoritative and accessible from parent-portal app context.
- Learning Sciences team commitment to quarterly review of "How to help" activity library and monthly digest content review before send.
