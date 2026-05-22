# Feature Specification: Parent Portal — GDPR Art. 8 Guardian Consent

**Feature Branch**: `008-parent-portal`

**Created**: 2026-05-22

**Status**: Draft (back-port from `demo/apps/parent-portal/` shipped without a spec — Wave 1 of `Subject/ama-rubric-remediation-plan.md`)

**Input**: User description: "Provide a dedicated Parent Portal so a guardian
(Sophie, NL) can sign in, view their child's curriculum unit and consent status,
and grant or withdraw consent for AI-assisted personalisation under GDPR Art. 8
and the LearnEU age-16 default."

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Parent sign-in (Priority: P1)

Sophie, the parent of an under-16 learner in the Netherlands, receives a
school-issued invite link. She wants to sign in to a dedicated parent
surface that is clearly distinct from the learner web app and from the
teacher console.

**Why this priority**: Without a parent-scoped authenticated surface, no
other parent action is possible. This is the gating MVP.

**Independent Test**: Open the invite link, complete sign-in via the
school identity provider, land on a parent-only dashboard. No learner
session is started; no teacher route is reachable.

**Acceptance Scenarios**:

1. **Given** a valid invite token, **When** Sophie completes sign-in,
   **Then** she lands on `/parent/dashboard` with her identity displayed
   and her child(ren) listed.
2. **Given** an expired or revoked invite, **When** Sophie attempts sign-in,
   **Then** the portal refuses access and surfaces the school-support contact.
3. **Given** a signed-in parent, **When** she attempts to call any
   `/learner/*` or `/teacher/*` route, **Then** the request is rejected
   with `403` and logged for Art. 12 evidence.

---

### User Story 2 — View child's curriculum unit and consent status (Priority: P2)

Sophie wants to see, for her child, the current curriculum unit being
practised, the active AI-personalisation status, and the timestamp of the
last consent change.

**Why this priority**: Required by GDPR Art. 13 (transparency to data
subjects and guardians) and by the programme transparency commitment in
`plan/04-compliance-eu-ai-act-gdpr.md`.

**Independent Test**: From the dashboard, open a child card and verify
that the unit title, AI-personalisation toggle and consent ledger entries
are rendered without any free-text learner activity.

**Acceptance Scenarios**:

1. **Given** Sophie's child is enrolled in unit *"Fractions · operations"*,
   **When** she opens the child card, **Then** she sees the unit title,
   the AI-personalisation status (`granted` / `withdrawn` / `pending`),
   and the last 5 consent ledger entries with timestamps.
2. **Given** a child with no active unit, **When** Sophie opens the card,
   **Then** an empty-state message and a link to the school contact are
   displayed (no learner activity is leaked).

---

### User Story 3 — Grant or withdraw AI-personalisation consent (Priority: P3)

Sophie wants to grant or withdraw consent for AI-assisted personalisation
on a per-child basis. Withdrawal must take effect within the same session
and must notify the teacher so they can adjust their session plan.

**Why this priority**: This is the GDPR Art. 8 guardian-consent contract.
Without it, the LearnEU age-16 default cannot be lawfully relaxed.

**Independent Test**: From the child card, toggle consent to `withdrawn`;
within the same session, refresh the learner preview (via teacher
impersonation in a separate session) and verify the AI-personalisation
features are gated to the non-AI baseline.

**Acceptance Scenarios**:

1. **Given** consent is `granted`, **When** Sophie toggles it to
   `withdrawn`, **Then** a confirmation modal explains the impact in
   plain Dutch, the toggle persists, an entry is appended to the consent
   ledger, and a notification is queued for the teacher console.
2. **Given** consent has just been `withdrawn`, **When** the child opens
   the learner web app, **Then** AI-tutor, AI-personalised picker and any
   inference path are gated; the non-AI baseline (curriculum-fixed item
   order, static explanations) is served instead.
3. **Given** consent is `withdrawn`, **When** Sophie re-grants it,
   **Then** the consent ledger appends a `granted` entry and the
   AI-personalised features become available on the child's next session
   start.

### Edge Cases

- Multiple guardians on one child: only guardians with verified
  parental responsibility may toggle consent; the consent ledger records
  the acting guardian's identifier.
- Concurrent teacher override (e.g. teacher pauses AI for the class)
  takes precedence over the parent grant for the duration of the override.
- An under-13 learner is treated as default-deny irrespective of
  consent toggle (school-policy gate enforced by the teacher console).
- Notification delivery failure to the teacher console MUST NOT block
  the consent change; the change is recorded and retried.
- Accessibility: every consent action is reachable by keyboard, announced
  by screen readers, and described in plain language at CEFR A2.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The portal MUST be a dedicated web app under
  `demo/apps/parent-portal/`, served from a parent-scoped route prefix
  (`/parent/*`) and gated by the existing `_shared/` auth, CSRF and
  rate-limit middleware.
- **FR-002**: The portal MUST authenticate parents via the school
  identity provider with an invite-token bootstrap; it MUST NOT accept
  learner credentials.
- **FR-003**: Parents MUST be able to view, for each linked child: the
  current curriculum unit, the current AI-personalisation status, and
  the last 5 consent-ledger entries.
- **FR-004**: Parents MUST be able to grant or withdraw AI-personalisation
  consent per child. Each state change MUST be persisted to a tamper-
  evident consent ledger.
- **FR-005**: Withdrawal MUST take effect within the same session for the
  child's learner web app; the non-AI baseline MUST be served until consent
  is re-granted.
- **FR-006**: A consent change MUST emit a notification to the teacher
  console review queue; delivery failure MUST be retried but MUST NOT
  block the consent change.
- **FR-007**: The portal MUST never display learner free-text activity,
  learner messages or learner inference outputs. It exposes status and
  metadata only.
- **FR-008**: Every consent state change MUST be logged with prompt-hash
  N/A, actor identity, timestamp, child identifier (pseudonymous), and
  affected unit identifier, in line with AI Act Art. 12 evidence.
- **FR-009**: All parent-visible copy MUST be available in NL, DE, PL,
  RO and FR-BE through the existing localisation pipeline before release
  in each market.
- **FR-010**: The portal MUST NOT introduce any new third-party SDK, any
  new outbound call that sends learner PII outside APIM, or any
  behavioural-advertising / profiling pixel.
- **FR-011**: All personal data MUST remain in EU regions (Principle I);
  no cross-EU transfer is permitted.
- **FR-012**: The under-13 floor MUST be enforced server-side regardless
  of the toggle state — the consent grant is ineffective for under-13
  learners until the school-policy gate is satisfied.

### Key Entities

- **Guardian**: parent or legal guardian (`id`, `email`, `verified_at`,
  `preferred_locale`, list of `child_ids`).
- **Child**: existing learner record, referenced pseudonymously here
  (`child_id`, `display_initials`, `current_unit_id`, `age_band`).
- **ConsentLedgerEntry**: append-only (`id`, `child_id`, `actor_id`,
  `state` ∈ {`granted`,`withdrawn`}, `scope` = `ai-personalisation`,
  `created_at`, `prev_entry_hash`).
- **TeacherNotification**: existing entity, new origin
  `parent-consent-change`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100 % of consent state changes are recorded in the
  tamper-evident ledger and queryable for AI Act Art. 12 evidence.
- **SC-002**: 0 learner PII fields appear in any AI prompt originating
  from a parent action (audited via prompt-hash sampling).
- **SC-003**: After a `withdrawn` toggle, the learner web app serves
  the non-AI baseline within the **same session** in ≥ 99 % of trials
  (smoke run on dev slot).
- **SC-004**: ≥ 95 % of parents in the usability cohort complete the
  grant or withdraw action within 60 seconds from the child card.
- **SC-005**: Zero new GDPR or AI Act findings raised by the
  Cross-Agent QA Verifier on the release review.
- **SC-006**: First-month measurement: 0 cross-EU data transfers and 0
  outbound calls flagged by the egress monitor for this portal.

## Assumptions

- The school identity provider supports invite-token bootstrap with
  parental-responsibility claims.
- The learner web app already exposes a server-side capability flag for
  the non-AI baseline (used by teacher overrides today — Feature 002 on
  main).
- The teacher console already exposes a notification queue (Feature 002
  on main); only the `parent-consent-change` origin is new.
- The `_shared/` middleware already supports parent-scoped JWT claims.
- Pedagogical sign-off is not required (no learner-facing copy); RAI
  sign-off is required for the consent UX strings.

## Constitution Check

| Principle | How this spec complies |
|---|---|
| I. EU-Resident, Data-Minimised | All storage in EU North; metadata-only surface. |
| II. GDPR Art. 8 | This **is** the guardian-consent surface; default age-16, under-13 floor. |
| III. EU AI Act high-risk | No new inference path; strengthens Art. 13 transparency and Art. 14 oversight via teacher notifications. |
| IV. Teacher-in-the-loop | Every consent change emits a teacher notification. |
| V. Pedagogical sign-off | N/A — RAI sign-off on consent UX strings instead. |
| VI. Outcome-contract driven | Supports the −26 % outcome-gap KPI by maintaining lawful AI-personalisation; SC-001 is the auditability gate. |
| VII. Reproducible, spec-driven | Spec ships before any further code change to `demo/apps/parent-portal/`. |
