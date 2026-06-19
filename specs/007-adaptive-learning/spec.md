# Feature Specification: Adaptive Learning — Next-Best-Activity, Catch-Up & Stretch

**Feature Branch**: `007-adaptive-learning`

**Created**: 2026-06-18

**Status**: Draft

**Input**: Backlog P1 — Adaptive learning complete; next-best-activity robuste; catch-up/stretch systematiques; learner pathway personalization aligned to mastery and ZPD.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Adaptive Activity Selection Based on Learner Mastery (Priority: P1)

A learner completes an activity on fractions. The system analyzes the learner's performance (time, accuracy, misconceptions detected) and recommends the next activity: if mastery ≥80%, a challenge activity in the same topic; if mastery 50–80%, a peer practice activity; if mastery <50%, a catch-up lesson with scaffolded support.

**Why this priority**: Adaptive sequencing is the core outcome-gap KPI lever. Personalization based on learner data (not algorithm opacity) is mandatory under EU AI Act and must be transparent to teachers.

**Independent Test**: Learner completes a quiz (score 70%); system displays "Next: Practice with a friend" activity; learner completes that (score 85%); system displays a challenge activity. Teacher sees the adaptive path and can override.

**Acceptance Scenarios**:

1. **Given** a learner completes an activity with mastery score and reaction time data, **When** system calculates next-best match, **Then** backend applies mastery thresholds (0–50% = catch-up, 50–80% = peer practice, 80%+ = challenge) and returns the next activity ID with reasoning visible to teacher.
2. **Given** next-best activity is selected, **When** learner loads the activity, **Then** the UI shows a brief "why this" label (e.g., "You got this topic! Try a challenge.") in plain language.
3. **Given** a learner is on a recommended path for 3+ consecutive activities, **When** teacher views learner analytics, **Then** the teacher sees the adaptive sequence and can click to override and redirect to a different activity if needed.

---

### User Story 2 — Catch-Up Pathways with Scaffolded Support (Priority: P1)

When a learner shows <50% mastery on a core competency, the system activates a catch-up path. The next 2–3 activities include step-by-step scaffolding (hints, worked examples, shorter problems) and a reflection prompt. After the catch-up sequence, a checkpoint quiz determines if the learner can advance or if additional support is needed.

**Why this priority**: Catch-up is the primary mechanism to close the outcome gap. Scaffolding must be evidence-based (ZPD-aligned) and auditable.

**Independent Test**: Learner scores 45% on fractions quiz; system offers a catch-up sequence (video hint → worked example → short problem → reflection). Learner completes sequence; checkpoint shows 75% mastery; system offers next-level activity.

**Acceptance Scenarios**:

1. **Given** a learner's mastery drops below 50% threshold, **When** next activity is selected, **Then** system returns a catch-up sequence: (a) one scaffolded introduction, (b) worked example with narration, (c) two guided problems with hints, (d) one open reflection prompt.
2. **Given** a learner works through a catch-up sequence, **When** they complete the checkpoint, **Then** the system records mastery score, time, and any hints used in the learner's progression record.
3. **Given** a learner completes catch-up and checkpoint shows ≥70% mastery, **When** next activity is selected, **Then** system advances to peer practice or challenge. If checkpoint <70%, **Then** a second catch-up iteration is recommended or teacher override is prompted.

---

### User Story 3 — Stretch Activities for High-Performing Learners (Priority: P1)

A learner consistently shows 85%+ mastery across fractions. The system recognizes this pattern and offers stretch activities: multi-step problems, open-ended reasoning tasks, or cross-disciplinary challenges (fractions + real-world measurement).

**Why this priority**: Preventing boredom and ceiling effects is essential for inclusive outcomes. High-performing cohorts must have visible pathways to deeper learning.

**Independent Test**: Learner completes 4 fractions activities at 80%+ mastery; system offers a "Challenge: Fractions in Real Life" project; teacher sees the learner is in a stretch pathway.

**Acceptance Scenarios**:

1. **Given** a learner achieves ≥85% mastery on 3+ consecutive activities in a topic, **When** next activity is selected, **Then** system detects high performance and returns a stretch activity: multi-step problem, open-ended design task, or cross-subject application.
2. **Given** a stretch activity is offered, **When** learner opens it, **Then** the UI shows "Try a challenge!" and the activity includes a "show me a hint" button (not auto-shown) and a reflection prompt asking learner to explain their approach.
3. **Given** a learner completes a stretch activity, **When** teacher reviews it, **Then** the teacher sees the learner's response, reasoning, and performance; teacher can provide qualitative feedback and optionally assign a related project.

---

### User Story 4 — Teacher Visibility & Override of Adaptive Paths (Priority: P1)

A teacher views the learner analytics dashboard and sees that a learner is on an adaptive catch-up path. The teacher can see the algorithm's reasoning ("Based on 45% mastery + 3 min completion time, system recommended catch-up"). The teacher can override the path and manually assign a different activity if they believe the learner needs a different intervention.

**Why this priority**: EU AI Act Art. 14 requires human override; transparency and auditability are non-negotiable. Teachers must be able to intervene.

**Independent Test**: Teacher opens analytics for learner; sees "Adaptive path: Catch-up (reason: low mastery)"; clicks "Override" and assigns a custom activity; system logs the override with teacher reasoning.

**Acceptance Scenarios**:

1. **Given** a learner is on an adaptive path, **When** a teacher views learner analytics, **Then** the system displays: (a) current path (catch-up/peer/challenge), (b) mastery data and algorithm input, (c) an "Override" button, and (d) a history of past overrides.
2. **Given** a teacher clicks "Override", **When** they select a different activity, **Then** the override is logged with timestamp, teacher identifier, and (optionally) teacher reasoning. The learner's adaptive path is paused; new path begins after the overridden activity.
3. **Given** a learner has **≥3 teacher overrides** in a topic, **When** teacher views that topic, **Then** system flags "High intervention needed" and suggests a parent/teacher conversation or alternative instructional method.

---

### User Story 5 — Cross-Device Continuation of Adaptive Path (Priority: P1)

A learner works on fractions on a tablet during a school lesson. They are midway through a catch-up sequence. That evening, they continue at home on their smartphone. The adaptive path, progress, and scaffolding context resume seamlessly; they don't restart.

**Why this priority**: Cross-device continuation is essential for learner engagement and reflects real-world usage. Losing context is friction.

**Independent Test**: Learner on iPad completes 2 of 4 catch-up activities; closes app. Later on phone, logs in; sees "Continue: Fractions catch-up (2 of 4)" and resumes at activity 3 with prior hints/feedback visible.

**Acceptance Scenarios**:

1. **Given** a learner starts an activity on one device, **When** they switch to another device and log in, **Then** the system detects the in-progress activity and offers "Continue" with a resume point clearly marked.
2. **Given** a learner resumes, **When** the activity loads, **Then** prior hints, attempts, and feedback are visible; no re-entry friction is introduced.

### Edge Cases

- Learner performance data is unreliable (very fast completion, suspected cheating); system flags for teacher review instead of making adaptive recommendation.
- Learner completes activity partially (quiz 3 of 5 questions); system holds adaptive decision until full activity completion or teacher intervention.
- Adaptive path recommendation changes between two app sessions due to new data or model version; system notifies learner of path change and logs it.
- Learner shows inconsistent performance (90% one day, 40% next day); system suggests to teacher that data may indicate stress, technical issues, or knowledge fragility and recommends manual review before escalating to stretch.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Backend MUST implement mastery-based adaptive selection logic: **0–50%** = catch-up, **50–80%** = peer practice, **80%+** = challenge.
- **FR-002**: Catch-up sequence MUST include scaffolded activities (intro + worked example + guided problems + reflection) before a checkpoint; checkpoint pass ≥70% enables advancement.
- **FR-003**: Stretch activities MUST be offered after **≥3 consecutive 85%+ performances**; stretch activities MUST include open-ended reasoning or cross-disciplinary application.
- **FR-004**: System MUST record and display adaptive reasoning to teachers (mastery data, algorithm version, threshold applied, timestamp).
- **FR-005**: Teacher MUST be able to override adaptive recommendation with one click; override MUST be logged with teacher ID, timestamp, and optional reasoning.
- **FR-006**: System MUST preserve adaptive path state across devices; learner can resume from same checkpoint on any device.
- **FR-007**: System MUST generate AI-transparent summary for learners: "We picked this activity because you showed strong understanding here and need practice there" (plain language, not opaque).
- **FR-008**: Feature MUST include human-oversight logging: every adaptive decision, override, and checkpoint transition is auditable by teachers and compliance.
- **FR-009**: Feature MUST preserve EU residency and GDPR Art. 8; no new third-party profiling data transfer.
- **FR-010**: Feature MUST support fallback to non-adaptive mode if mastery data is unavailable (graceful degradation).

### Key Entities

- **MasteryScore**: Learner performance metric on an activity (learner, activity, score 0–100, time, misconceptions, timestamp).
- **AdaptiveDecision**: System recommendation for next activity (learner, prior activity, recommended activity, reasoning/threshold applied, teacher override flag, timestamp).
- **CatchUpSequence**: Scaffolded sequence of activities (sequence ID, 2–3 activities, checkpoint activity, completion status).
- **StretchActivity**: Challenge activity offered to high performers (linked to core topic, reasoning "stretch threshold met", completion status).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: System recommends next activity within **2 seconds** after activity completion (p95).
- **SC-002**: Learners in catch-up sequences improve mastery by **≥20 percentage points** by checkpoint (median).
- **SC-003**: **≥70%** of learners who receive stretch activities engage with at least one per month.
- **SC-004**: Teacher overrides MUST be **<10%** of total adaptive recommendations in a month (indicating good baseline accuracy).
- **SC-005**: Cross-device resume success rate is **≥99%** (learner data loss is <1% of resume events).
- **SC-006**: **100%** of adaptive decisions are logged with reasoning visible to teachers; zero decisions are opaque.
- **SC-007**: Compliance review confirms **zero** EU AI Act Art. 5 prohibited practice violations (no automated grading, no learner exclusion without teacher override).

## Assumptions

- Mastery data collection (scores, time, misconceptions) is robust and validated.
- Teacher override UX is low-friction; teachers will use it if system recommendations are not perfect.
- Learner performance is assumed to be due to mastery, not external factors (illness, lack of sleep) unless teacher flags.

## Constitution Check

| Principle | How this spec complies |
|---|---|
| I. EU-Resident, Data-Minimised | Adaptive logic uses only mastery scores and learner progression (no behavioral profiling, no cross-learner comparison without consent). |
| II. GDPR Art. 8 | Adaptive recommendations are transparent to parents and teachers; teacher override is logged; no autonomous grading. |
| III. EU AI Act high-risk | Classified high-risk (Annex III §3). Includes Art. 12 logging, Art. 14 human override, Art. 13 transparency ("why this activity"), Art. 9 risk management. |
| IV. Teacher-in-the-loop | Every adaptive decision is visible to teacher; teacher can override any recommendation; no autonomous placement/grading. |
| V. Pedagogical sign-off | ZPD alignment and catch-up/stretch sequences reviewed by Learning Sciences specialist before release. |
| VI. Outcome-contract driven | SC-002 directly targets outcome-gap reduction KPI by enabling systematic catch-up. |
| VII. Reproducible, spec-driven | Includes test scenario in quickstart: low-mastery → catch-up sequence → checkpoint → advancement. |
