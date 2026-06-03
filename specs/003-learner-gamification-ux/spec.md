# Feature Specification: Learner Gamification UX

**Feature Branch**: `[003-learner-gamification-ux]`

**Created**: 2026-06-03

**Status**: Draft

**Input**: User description: "Add learner gamification UX features in the learner app: challenge du jour, guild/class objective, collaborative quests, motivation channel, season progression tiers, daily chests with badge rewards, boss battle with 10 consecutive correct answers, badge gallery, and a quest dashboard as main learner overview. Keep existing LearnEU color system and compliance constraints (EU residency, no harmful ranking bias, teacher-in-the-loop where relevant)."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Complete Daily Quest Flow From Dashboard (Priority: P1)

As a learner, I open the learner app and immediately see the Quest Dashboard as my main overview, including my challenge du jour, daily chest status, current season tier progress, and active boss battle progress so I can start meaningful work without searching through multiple screens.

**Why this priority**: This is the primary entry point that delivers immediate learner value and ties together the core engagement loop.

**Independent Test**: Can be fully tested by logging in as a learner, viewing the dashboard as the default main overview, starting the daily challenge, answering activities, opening the daily chest when eligible, and seeing progress updates.

**Acceptance Scenarios**:

1. **Given** a learner opens the app, **When** the learner reaches the main overview, **Then** the Quest Dashboard is shown first and includes challenge du jour, season progress, badge summary, and active quest cards.
2. **Given** a learner completes the challenge du jour criteria, **When** completion is recorded, **Then** the learner sees immediate completion feedback and updated progress indicators.
3. **Given** a learner answers learning items, **When** the learner reaches 10 consecutive correct answers in an eligible boss battle, **Then** the boss is marked defeated and a reward notification is shown.

---

### User Story 2 - Participate in Collaborative Motivation Features (Priority: P1)

As a learner in a class or guild, I can contribute to a shared class objective, join collaborative quests, and post in a motivation channel so that progress feels social and collective rather than isolated.

**Why this priority**: Collaborative engagement directly supports sustained participation and aligns with school-centered learning behavior.

**Independent Test**: Can be fully tested by enrolling multiple learners in one class/guild, assigning a collaborative quest and class objective, posting in the motivation channel, and verifying visible shared progress updates for all eligible participants.

**Acceptance Scenarios**:

1. **Given** learners belong to the same class or guild, **When** one learner completes qualifying activities, **Then** the shared objective progress updates for the group.
2. **Given** a collaborative quest is active, **When** multiple learners complete their parts, **Then** quest status reflects collective contribution and completion.
3. **Given** a learner uses the motivation channel, **When** the post is submitted, **Then** it is visible to the intended class/guild audience with appropriate moderation controls.

---

### User Story 3 - Earn and Review Recognitions Fairly (Priority: P2)

As a learner, I want to collect badges from daily chests and quests, then review them in a badge gallery so I can track achievements over time without being compared in harmful ways to classmates.

**Why this priority**: Recognition and reflection improve motivation while preserving fairness and inclusion.

**Independent Test**: Can be fully tested by triggering badge-eligible events, receiving rewards, opening the badge gallery, and confirming visibility of personal progress without public rank ordering by individual learner.

**Acceptance Scenarios**:

1. **Given** a learner opens an earned daily chest, **When** a reward is granted, **Then** the learner receives at least one configured badge reward and sees it reflected in the badge gallery.
2. **Given** the learner opens the badge gallery, **When** badges are displayed, **Then** badges include earned state and criteria summary for learner understanding.
3. **Given** the learner views collaborative progress surfaces, **When** progress is presented, **Then** no individual harmful rank ordering is shown.

---

### User Story 4 - Teacher Oversight for Motivational Safety (Priority: P2)

As a teacher, I need visibility and control over class-level gamification settings and collaborative spaces so that engagement mechanics remain pedagogically appropriate and can be adjusted when needed.

**Why this priority**: Teacher-in-the-loop oversight is a constitutional and compliance requirement for learner-affecting features.

**Independent Test**: Can be fully tested by enabling/disabling selected gamification activities for a class, reviewing motivation channel activity, and applying teacher override actions with resulting learner-facing changes and audit visibility.

**Acceptance Scenarios**:

1. **Given** a teacher manages a class configuration, **When** the teacher pauses or adjusts a collaborative quest or objective, **Then** learner-facing status updates within the expected update window.
2. **Given** a teacher reviews motivational interactions, **When** a message or mechanic is deemed inappropriate, **Then** the teacher can intervene using an override/moderation control.

### Edge Cases

- A learner misses one answer during boss battle progression after a long streak; the streak resets correctly and the learner receives clear guidance on how to restart.
- A learner has already claimed the daily chest; repeated claim attempts in the same day are blocked with an explanatory message.
- A learner is in a class with low participation; collaborative quest progress remains visible without exposing or shaming specific low-contributing individuals.
- A class objective completes near the end of a season tier boundary; both class objective completion and season tier advancement are correctly credited.
- A learner has limited connectivity; dashboard state recovers safely without duplicate rewards when the learner reconnects.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The learner app MUST present the Quest Dashboard as the main learner overview entry point after sign-in.
- **FR-002**: The Quest Dashboard MUST show, at minimum, challenge du jour status, current season tier progress, active quests, current boss battle streak progress, and recent badge/reward highlights.
- **FR-003**: The system MUST provide a challenge du jour (mission du jour) that can be started, tracked, and completed once per learner per configured day window.
- **FR-004**: The system MUST provide class/guild objectives where learner contributions aggregate into shared progress for eligible class/guild members.
- **FR-005**: The system MUST support collaborative quests with shared completion conditions and visible collective progress.
- **FR-006**: The system MUST provide a motivation channel scoped to the learner's class/guild with moderation and teacher oversight controls.
- **FR-007**: The system MUST implement season progression tiers (paliers) with clearly visible learner advancement status and earned tier milestones.
- **FR-008**: The system MUST provide a daily chest mechanic that grants configured badge rewards only when eligibility criteria are met.
- **FR-009**: The system MUST implement boss battle progression where 10 consecutive correct answers defeat the boss and grant configured completion rewards.
- **FR-010**: The system MUST provide a badge gallery where learners can review earned badges, locked badges, and criteria summaries.
- **FR-011**: The system MUST prevent harmful ranking bias by avoiding public individual leaderboards or rank displays that can stigmatize lower-performing learners.
- **FR-012**: The system MUST preserve existing LearnEU visual identity, including current color system and accessibility contrast requirements.
- **FR-013**: Teacher-in-the-loop controls MUST allow teachers to pause, adjust, or moderate class-level gamification experiences where learner well-being or pedagogical appropriateness is at risk.
- **FR-014**: Personal data used by this feature MUST be processed and stored in EU regions only, consistent with LearnEU residency constraints.
- **FR-015**: The system MUST maintain auditable records of teacher oversight actions related to gamification moderation and overrides.

### Key Entities *(include if feature involves data)*

- **Quest Dashboard View**: Aggregated learner-facing overview containing daily challenge, collaborative quest status, season tier progress, boss battle state, and reward highlights.
- **Daily Challenge**: Time-bounded learner mission with completion status and reward mapping.
- **Class/Guild Objective**: Shared class-level target that aggregates eligible learner contributions.
- **Collaborative Quest**: Multi-learner quest with collective progress and completion conditions.
- **Motivation Channel Message**: Learner or teacher motivational post bound to a class/guild audience and moderation status.
- **Season Tier**: Progression stage with thresholds, milestones, and learner advancement state.
- **Daily Chest**: Once-per-day reward container with eligibility rules and claim status.
- **Boss Battle Attempt**: Learner challenge state tracking consecutive correct answers toward a 10-answer completion threshold.
- **Badge**: Achievement artifact with criteria, earned status, and display metadata.
- **Teacher Oversight Action**: Teacher moderation, pause, adjustment, or override action with timestamp and rationale.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: At least 90% of active learners can identify and start the challenge du jour from the main overview within 30 seconds of entering the learner app.
- **SC-002**: At least 80% of active learners complete at least one gamified activity (daily challenge, collaborative quest contribution, boss battle, or daily chest interaction) on days they access the learner app.
- **SC-003**: At least 70% of active classes with collaborative quests enabled show contributions from two or more learners within 7 days of quest publication.
- **SC-004**: 100% of boss battle completions occur only after exactly 10 consecutive correct learner answers in the same tracked attempt.
- **SC-005**: 100% of teacher moderation or override actions on motivation/collaborative surfaces are visible in audit review within 5 minutes of action.
- **SC-006**: 0 instances of public individual learner rank ordering are present on learner-visible gamification screens in release acceptance checks.
- **SC-007**: At least 85% of surveyed learners report that progress and rewards feel motivating without feeling unfairly compared to peers.

## Assumptions

- Existing learner authentication and class/guild membership context are already available to support personalized dashboard and collaboration scopes.
- Existing LearnEU color tokens and accessibility standards remain the authoritative design system for all new UI surfaces.
- Teacher roles and permissions already exist and can be extended to apply moderation/override controls for gamification experiences.
- Reward rules for badges and daily chests will be configured by product/pedagogy stakeholders without changing the core learner-facing experience model.
- This feature does not introduce autonomous grading, learner placement, or content-access decisions; it focuses on engagement and formative motivation surfaces.
