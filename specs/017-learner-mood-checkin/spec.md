# Feature Specification: Learner Mood Check-In & Well-Being Routing

**Feature Branch**: `017-learner-mood-checkin`

**Created**: 2026-06-26

**Status**: Draft

**Input**: User description: "On the learner home page, ask the learner's mood (happy / medium / sad). When sad, show 3 buttons: not in a good mood for personal reasons, because of course difficulty, or because of a classmate. These statistics go to the parent app to alert the parent and to the teacher app to provide recommendations to better help the learner."

> **Safeguarding note**: This feature is based on **voluntary self-reported** mood selected by the learner via simple buttons. It explicitly **does NOT** use facial recognition, emotion recognition, voice-emotion inference, or any biometric/behavioural analysis (EU AI Act Art. 5 prohibited practices). It supports human (parent/teacher) care; it makes **no autonomous decisions** about the learner.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Daily Self-Reported Mood Check-In (Priority: P1)

On the learner home page, the learner is gently invited (never forced) to indicate how they feel today via three friendly, age-appropriate options: happy (smiley), medium (neutral), or sad. The choice is recorded for that day.

**Why this priority**: The voluntary self-report is the core capability and the smallest valuable slice; it enables every downstream care action while remaining fully under the learner's control.

**Independent Test**: A learner opens the home page, sees an optional mood prompt with three clearly-labelled options, selects one, and sees a warm acknowledgement; the selection is stored for that day.

**Acceptance Scenarios**:

1. **Given** a learner opens the home page, **When** the page loads, **Then** an optional, skippable mood prompt with happy/medium/sad options is shown in the learner's age-appropriate theme and language.
2. **Given** a learner selects a mood, **When** the choice is submitted, **Then** it is recorded against the learner and day with a timestamp and a supportive acknowledgement is shown.
3. **Given** a learner does not want to answer, **When** they skip, **Then** no mood is recorded and they are not nagged repeatedly that day.

---

### User Story 2 — "Sad" Reason Follow-Up (Priority: P1)

When the learner selects "sad", three supportive follow-up options appear so they can (optionally) say why: a personal reason, the difficulty of the course, or something involving a classmate. The learner may pick one or skip.

**Why this priority**: The reason routes the right kind of support (well-being vs pedagogy vs peer/safeguarding) and is explicitly requested; it depends on the base check-in.

**Independent Test**: A learner selects "sad"; three reason buttons appear (personal / course difficulty / classmate); selecting one records the reason category; skipping records "sad, no reason given".

**Acceptance Scenarios**:

1. **Given** a learner selects "sad", **When** the follow-up appears, **Then** they see exactly three supportive, plainly-worded options (personal reasons, course difficulty, a classmate) plus a skip option.
2. **Given** a learner selects a reason, **When** they submit, **Then** the reason category is stored with the mood entry and a warm, age-appropriate supportive message and a "talk to a trusted adult" pathway are shown.
3. **Given** the reason indicates a classmate (possible safeguarding), **When** it is recorded, **Then** it is routed with appropriate sensitivity to the teacher's safeguarding view (not exposed to peers).

---

### User Story 3 — Parent Alert on Low Mood (Priority: P1)

When a learner reports sad mood (especially repeatedly or with a personal/classmate reason), the parent portal surfaces a gentle, privacy-respecting well-being alert so the parent is aware and can support their child at home.

**Why this priority**: Constitution IV — the family is part of the support loop; alerting parents enables human care, which is the purpose of the feature.

**Independent Test**: A learner records "sad / personal reasons"; the linked parent (with active consent) sees a well-being notice in the parent portal with supportive guidance, not raw diagnostics.

**Acceptance Scenarios**:

1. **Given** a learner reports a sad mood, **When** the parent (with active consent) next views the portal, **Then** a gentle well-being notice appears with supportive "how to help" guidance, respecting the child's dignity.
2. **Given** repeated low mood over a defined window, **When** the threshold is reached, **Then** the parent alert is escalated in prominence and suggests contacting the teacher/school.
3. **Given** mood data is shown to a parent, **When** it is presented, **Then** it is framed as self-reported well-being (not a diagnosis or score) with clear transparency about its source and purpose.

---

### User Story 4 — Teacher Recommendations & Safeguarding View (Priority: P1)

The teacher console surfaces aggregated, sensitive mood signals for their learners and offers actionable recommendations (e.g., adjust difficulty if "course difficulty" is common; pastoral/safeguarding follow-up if "classmate" is reported), with a teacher-in-the-loop override and clear escalation routes.

**Why this priority**: Teachers are the accountable humans who act on signals; constitution IV and V require teacher review and pedagogically-sound recommendations rather than automated action.

**Independent Test**: A teacher opens the well-being view, sees which learners reported low mood and the reason categories, and receives a recommendation card (e.g., "3 learners cited course difficulty in Fractions — consider a catch-up activity").

**Acceptance Scenarios**:

1. **Given** mood data exists for a class, **When** the teacher opens the well-being view, **Then** they see per-learner and aggregate self-reported mood with reason categories, presented sensitively and access-controlled.
2. **Given** several learners cite "course difficulty" for a topic, **When** the teacher views recommendations, **Then** a pedagogically-reviewed suggestion (e.g., catch-up/scaffolding) is offered, which the teacher may accept, adjust, or dismiss (logged).
3. **Given** a learner cites "a classmate", **When** the teacher views it, **Then** it is routed to a safeguarding/pastoral pathway with escalation guidance, never exposed to other learners.
4. **Given** any recommendation, **When** acted on, **Then** the teacher remains the decision-maker and the action is logged for audit; the system takes no autonomous action affecting the learner.

### Edge Cases

- Learner reports sad repeatedly: thresholds escalate parent/teacher prominence without over-alerting (anti-alarm-fatigue), and a clear crisis/safeguarding pathway is available.
- Under-16 learner without active parental consent: mood check-in for support may be offered, but parent surfacing/alerts follow the consent framework; configuration documented.
- Learner withdraws/changes their answer: they can update or delete today's entry; data-subject erasure is honoured.
- "Classmate" reason implies possible bullying: handled as sensitive safeguarding data, restricted to authorised staff, never shown to peers or used for ranking.
- No mood reported: absence is not treated as a signal and not inferred.
- Mood data MUST NOT be used for grading, profiling, advertising, or any automated decision affecting the learner.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The learner home page MUST present an optional, skippable, age-appropriate self-reported mood check-in with three options (happy / medium / sad).
- **FR-002**: When "sad" is selected, the system MUST offer exactly three supportive reason options (personal reasons / course difficulty / a classmate) plus a skip option.
- **FR-003**: The system MUST record mood and optional reason per learner per day with a timestamp, allowing the learner to update or delete their entry.
- **FR-004**: The system MUST NEVER infer mood/emotion from face, voice, camera, typing, or behaviour; mood is exclusively self-reported via explicit learner selection.
- **FR-005**: Low-mood signals MUST surface a gentle, supportive well-being notice (with "how to help" guidance) in the parent portal for parents with active consent, framed as self-reported well-being, not a diagnosis.
- **FR-006**: The teacher console MUST surface per-learner and aggregate self-reported mood and reason categories to authorised staff only, with sensitive (safeguarding) handling for the "classmate" reason.
- **FR-007**: The system MUST provide teacher-facing, pedagogically-reviewed recommendations that the teacher can accept, adjust, or dismiss; it MUST take no autonomous action affecting the learner.
- **FR-008**: "Classmate" / possible-bullying reports MUST be routed to a safeguarding/pastoral pathway, restricted to authorised staff, and never exposed to peers.
- **FR-009**: Mood data MUST NOT be used for grading, profiling, advertising, or any automated decision; it is well-being support data only.
- **FR-010**: All mood entries, alerts, and teacher actions MUST be logged for audit and data-subject-rights handling, with EU residency and strict access control.
- **FR-011**: Escalation thresholds (e.g., repeated sad days) MUST be documented and tuned to avoid both under-care and alarm fatigue.

### Key Entities

- **MoodEntry**: A learner's self-reported mood for a day (value: happy/medium/sad, optional reason category, timestamp, editable/erasable).
- **MoodReasonCategory**: One of {personal, course-difficulty, classmate} (or none), attached to a sad entry.
- **WellBeingAlert**: A parent-facing supportive notice derived from mood entries, with severity/threshold and consent gating.
- **TeacherRecommendation**: A pedagogically-reviewed suggestion for a teacher, with accept/adjust/dismiss decision and audit log.
- **SafeguardingFlag**: A sensitive, access-controlled record for "classmate"/bullying-type reasons routed to pastoral staff.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: **0** instances of facial/voice/behavioural emotion inference; **100%** of mood data is explicit learner self-report (verified by design review and audit).
- **SC-002**: **100%** of "classmate"/safeguarding reports are routed only to authorised staff and **never** exposed to peers.
- **SC-003**: Parents with active consent receive a supportive well-being notice for sustained low mood within the defined window in **100%** of qualifying cases.
- **SC-004**: Teachers receive at least one actionable, pedagogically-reviewed recommendation when reason patterns (e.g., course difficulty) emerge, and **100%** of teacher actions are logged with the teacher as decision-maker.
- **SC-005**: **0** uses of mood data for grading, profiling, advertising, or automated decisions affecting learners (verified by audit).
- **SC-006**: Early well-being and difficulty signals enable timely human support that contributes to the −26% outcome-gap KPI and to learner retention/engagement.
- **SC-007**: Learners can edit or erase their mood entry, and erasure requests are honoured **100%** of the time.

## Assumptions

- The parent portal (Spec 006) and teacher console exist and can surface consent-gated, access-controlled notices.
- The GDPR Art. 8 consent framework governs whether/how parent surfacing occurs for under-16 learners.
- Safeguarding/pastoral roles and escalation procedures exist at the school and can receive routed flags.
- "Recommendations" reuse adaptive/teacher-assessment scaffolding (Specs 007/008) for course-difficulty cases and are Learning-Sciences reviewed.

## Constitution Check

| Principle | How this spec complies |
|---|---|
| I. EU-Resident, Data-Minimised | Stores only a small self-reported mood value + optional reason in EU regions; no biometric/behavioural data; strict access control. |
| II. GDPR Art. 8 | Parent surfacing is consent-gated; learners can edit/erase entries; sensitive reasons handled with extra protection. |
| III. EU AI Act high-risk | Explicitly excludes Art. 5 emotion/biometric inference; any recommendation is logged (Art. 12), transparent (Art. 13), and human-overridden (Art. 14). |
| IV. Teacher-in-the-loop | Teachers and parents are the actors; the system only surfaces signals and suggestions and takes no autonomous action affecting the learner. |
| V. Pedagogical sign-off | Supportive copy, thresholds, and recommendations are reviewed by Learning Sciences and safeguarding leads for child well-being appropriateness. |
| VI. Outcome-contract driven | SC-006 ties timely well-being/difficulty support to the −26% outcome-gap KPI and retention. |
| VII. Reproducible, spec-driven | Independently testable stories (check-in, reason, parent alert, teacher view) with measurable, technology-agnostic criteria. |
