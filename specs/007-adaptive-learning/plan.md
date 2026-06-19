# Implementation Plan: Adaptive Learning — Next-Best-Activity, Catch-Up & Stretch

**Branch**: `007-adaptive-learning` | **Date**: 2026-06-18 | **Spec**: `/specs/007-adaptive-learning/spec.md`

**Input**: Feature specification from `/specs/007-adaptive-learning/spec.md`

## Summary

Implement a learner-centered adaptive-recommendation system that personalizes activity sequencing based on mastery evidence, catch-up scaffolding, and stretch pathways. The system will analyze learner performance (accuracy, time, misconceptions) and recommend next-best activities aligned to learner mastery level (0–50% = catch-up, 50–80% = peer practice, 80%+ = challenge) while maintaining **mandatory teacher override** and **full transparency** of reasoning. This feature is classified as **HIGH-RISK** under EU AI Act Annex III §3 and requires complete audit logging, real-time teacher visibility, and human-oversight surfaces before any adaptive decision affects learner progression.

The implementation reuses the existing hierarchy scope model from Feature 004, extends the learner analytics backend to compute adaptive thresholds, adds new **AdaptiveDecision** and **CatchUpSequence** entities to the shared schema, and surfaces teacher-overrideable recommendations in both the learner web app (as transparent "why this activity" labels) and the teacher console (as full path diagnostics with override capability).

## Architecture Overview

The adaptive system spans three existing app surfaces and introduces one new backend layer:

1. **Learner Web** (`demo/apps/learner-web/`) — displays transparent "why this activity" labels and supports resume-from-checkpoint across devices.
2. **Teacher Console** (`demo/apps/teacher-console/`) — exposes learner analytics with full adaptive path visibility, override UI, and override history.
3. **Admin Portal** (`demo/apps/admin/`) — includes risk-management dashboard for adaptive anomalies (suspected cheating, inconsistent performance, flagged pathways).
4. **Shared Backend** (`demo/apps/_shared/`) — implements:
   - **Adaptive decision engine**: mastery-based threshold logic, catch-up sequence selection, stretch activity detection.
   - **Audit logging layer**: every recommendation, override, checkpoint transition, and path change is immutable-logged.
   - **Schema extensions**: `MasteryScore`, `AdaptiveDecision`, `CatchUpSequence`, `StretchActivity`, `TeacherOverride`, `AdaptiveAudit` entities.

5. **Database** (EU-hosted PostgreSQL) — stores all decision history, audit trails, and progression state to ensure auditability for compliance reviews and teacher intervention scenarios.

The learner's adaptive path is **state-managed** per device (resume point, current sequence, next-best recommendation) and **persisted** across devices through a session-aware path state table that maintains checkpoint context across platforms.

**Key Design Principle**: Every adaptive decision is a **recommendation**, never an autonomous action. Teachers see the reasoning behind each recommendation and can override it with one click. The system logs the override with timestamp, teacher ID, and optional reasoning, creating an auditable trail for compliance and instructional review.

## Technical Context

**Language/Version**: Node.js 22.x, Express backend, PostgreSQL-backed decision engine, vanilla JavaScript and HTML5 for learner/teacher UI surfaces

**Primary Dependencies**: Existing learner auth/hierarchy/session helpers, shared DB layer in `demo/apps/_shared/db/`, learner and teacher app surfaces, Annex IV risk-management framework

**Storage**: EU-hosted PostgreSQL for mastery scores, adaptive decisions, catch-up sequences, override audit logs, and adaptive decision audit trails. Cross-device session state stored in a dedicated adaptive path state table (encrypted, learner-resident).

**ML/Scoring**: Mastery calculation uses existing performance data (activity scores, time, misconception flags). The adaptive thresholds (0–50%, 50–80%, 80%+) are **deterministic and transparent**, not ML-opaque. Stretch and catch-up sequence **selection logic** is rule-based and auditable; no black-box ML scoring.

**Testing**: Spec-driven test scenarios (low-mastery → catch-up → checkpoint → advancement), teacher-override verification, cross-device resume tests, override audit logging checks, risk-anomaly detection tests, compliance audit confirmation

**Target Platform**: Azure App Service demo apps in West Europe, existing PostgreSQL backend, authenticated learner/teacher sessions

**Project Type**: Multi-app enhancement with shared backend logic and new UI surfaces in learner and teacher apps

**Performance Goals**: 
- Adaptive recommendation generated **within 2 seconds** after activity completion (p95).
- Catch-up sequence UI loads **within 1 second** of selection.
- Override action confirmed **within 500ms** with audit logged immediately.
- Cross-device resume detects prior checkpoint **within 1 second** of learner login.

**Constraints**: 
- EU-only residency and no third-party profiling data transfer (Principle I).
- GDPR Article 8 compliance; no autonomous child-data processing (Principle II).
- HIGH-RISK EU AI Act classification with mandatory Art. 9–15 controls (Principle III).
- Teacher-in-the-loop override required before path affects learner (Principle IV).
- Pedagogical sign-off required for catch-up and stretch sequences (Principle V).
- Every recommendation must be auditable and visible to teachers (Principle IV, VII).
- No fallback to opaque adaptive recommendation; if mastery data unavailable, system defaults to non-adaptive mode.

**Scale/Scope**: Single, time-bounded feature covering mastery-based adaptive selection, catch-up scaffolding, stretch pathway detection, teacher override, and cross-device state persistence for a pilot set of learners and teachers in participating establishments.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Plan Handling |
|---|---|---|
| **I. EU-Resident, Data-Minimised** | **PASS** | Adaptive logic uses only mastery scores, learner progression, and teacher-assigned scope; no behavioral profiling, no cross-learner comparison, no external profiling SDK. All data stays in EU PostgreSQL. |
| **II. GDPR Article 8 First** | **PASS** | Every adaptive recommendation is transparent to parents and teachers via the teacher console and learner "why this" label. Teacher override is logged and visible. No autonomous grading or placement; teacher remains the approval gate. |
| **III. EU AI Act High-Risk** | **PASS (MANDATORY CONTROLS)** | Classified **HIGH-RISK** (Annex III §3, educational recommendation for learner pathway modification). Includes mandatory Art. 9 risk-management entry, Art. 10 data-governance record, Art. 12 immutable logging, Art. 13 transparency copy, Art. 14 teacher-override surface, Art. 15 robustness evidence. |
| **IV. Teacher-in-the-Loop** | **PASS (CONSTITUTIONAL REQUIREMENT)** | **MANDATORY**: Every adaptive decision is visible to teacher; teacher can override any recommendation with one click; override is logged with timestamp, teacher ID, and reasoning. No recommendation affects learner progression without teacher visibility. |
| **V. Pedagogical Sign-Off** | **PASS (PRE-RELEASE)** | ZPD alignment of catch-up scaffolding, mastery thresholds, and stretch pathways reviewed by Learning Sciences specialist before implementation sign-off. Formative-assessment alignment confirmed. |
| **VI. Outcome-Contract Driven** | **PASS** | SC-002 (≥20pp mastery gain in catch-up sequences) directly targets outcome-gap KPI reduction. SC-003 (≥70% stretch engagement) prevents boredom and ceiling effects. SC-004 (teacher override <10%) indicates accurate baseline recommendations. |
| **VII. Reproducible, Spec-Driven** | **PASS** | Feature stays in `specs/007-adaptive-learning/` with all design in data-model.md, contracts/, and quickstart.md before code. Test scenario is reproducible: low-mastery learner → catch-up sequence → checkpoint → mastery check → advancement or re-offer. |

**Post-Design Re-Check Required**: Constitution compliance must be re-verified after Phase 1 data model and Phase 2 API design to ensure override surface is implemented as described and logging is complete.

---

### EU AI Act Articles Touched (HIGH-RISK Feature)

- **Art. 5** (Prohibited Practices): Verify zero violations — no autonomous grading, no learner exclusion without teacher override, no coercion or manipulation.
- **Art. 9** (Risk Management): Document failure modes for adaptive logic (e.g., unreliable mastery data, model drift, learner performance volatility). Mitigations: teacher override, anomaly flags, manual review escalation.
- **Art. 10** (Data Governance): Define mastery-data quality criteria, source-of-truth, retention periods, and governance over adaptive thresholds and sequence templates.
- **Art. 12** (Record Keeping & Logging): Every adaptive decision, override, checkpoint transition, and path change is immutable-logged with timestamp, learner ID, teacher ID (if override), reasoning/threshold applied, and outcome.
- **Art. 13** (Transparency): Learners see "why this activity" labels (e.g., "You got this topic! Try a challenge."). Teachers see full reasoning: "Based on 45% mastery + 3 min completion time, system recommended catch-up."
- **Art. 14** (Human Oversight): Teacher-override surface is mandatory, low-friction, and logged. No adaptive recommendation affects progression without teacher visibility. Risk-management dashboard flags high-intervention learners (≥3 overrides/topic).
- **Art. 15** (Accuracy, Robustness, Cybersecurity): Mastery calculation verified against ground-truth performance data; cross-device resume state validated; audit logs protected against tampering.

---

### DPIA Delta

**Processing Purpose**: Learner adaptive pathway personalization and recommendation based on mastery evidence. Catch-up sequence scaffolding. Stretch pathway identification. Teacher override audit.

**Data Classes Touched**:
- **Existing**: Mastery scores (activity performance, time, accuracy). Learner progression records.
- **New**: `AdaptiveDecision` records (recommended activity, reasoning, threshold applied). `CatchUpSequence` state. `TeacherOverride` events. `AdaptiveAudit` trail.

**New Processing Scope**:
- Adaptive recommendation generation (deterministic threshold logic applied to mastery scores).
- Catch-up sequence selection and state persistence.
- Stretch activity detection (rule-based, 3+ consecutive 85%+ performances).
- Teacher override logging and audit trail.
- Cross-device adaptive path state resumption.

**Risk Assessment**: **Moderate to High** (due to direct impact on learner progression pathway and need for teacher override).
- **Confidentiality**: Mastery scores and adaptive decisions are learner-sensitive; access is role-gated (teacher, parent, learner). Override logs are teacher-sensitive.
- **Integrity**: Audit trail must be immutable; mastery data must be validated before threshold application; override state must be authoritative.
- **Availability**: Adaptive recommendation failure should not block learner activity access; graceful degradation to non-adaptive mode required.

**Safeguards**:
- Mastery data validation rules applied before any threshold calculation.
- All adaptive decisions logged with source data, reasoning, and timestamp.
- Teacher override always logged and visible for compliance review.
- No cross-border transfer of adaptive decision data.
- Learner data-subject access surface includes adaptive decision history and override records.
- Retention: Adaptive audit logs retained for 7 years (compliance requirement). Mastery scores retained per activity-retention policy.
- Learner/parent transparency: Adaptive decision reasoning visible to learner (plain language label) and parent (via parent portal, pending Feature 006).

**DPO Review Required**: Before implementation sign-off, confirm DPIA addendum is signed by the DPO.

---

### Human-Oversight Surface

**Teacher Visibility** (in Teacher Console):
1. **Learner Analytics Dashboard**: Displays current adaptive path (catch-up/peer/challenge), mastery data, algorithm input, and timestamp.
2. **Reasoning Detail**: Teacher can click "Why" to see: "Based on 45% mastery + 3 min completion time + 1 hint used, system recommended catch-up to Core Fractions."
3. **Override Button**: One-click override button; teacher selects alternative activity or manual intervention; system logs override with teacher ID, timestamp, and optional reasoning field.
4. **Override History**: Full list of past overrides for the learner in the topic, with reasons and outcomes.
5. **Anomaly Flags**: System flags for teacher review:
   - Suspected cheating (very fast completion, implausibly high score).
   - Inconsistent performance (90% one day, 40% next; suggests knowledge fragility or external stress).
   - High intervention threshold (≥3 overrides in a topic; suggests learner needs alternative instructional method or parent/teacher conversation).

**Learner Transparency** (in Learner Web):
1. **"Why This Activity" Label**: Brief, plain-language explanation (e.g., "You got this topic! Try a challenge.").
2. **Checkpoint Progress**: Catch-up sequence shows progress (2 of 4 activities completed) with reason for checkpoint.
3. **No Hidden Opacity**: Learner never sees algorithm version, threshold values, or opaque scoring; language is pedagogically grounded.

**Parent Transparency** (Feature 006 dependency):
1. Parent portal will show adaptive path summary and allow visibility of override history.
2. Parent can request teacher consultation if learner is on extended catch-up path or has high override rate.

**Admin Risk-Management Dashboard** (in Admin Portal):
1. Aggregate view of adaptive decisions across cohorts: distribution of pathways (catch-up %, peer %, challenge %), average mastery scores, override rate by school/teacher.
2. Anomaly detection: learners flagged for unreliable data or high intervention rate; escalation path to program coordinator.
3. Model-version audit: log of when adaptive thresholds changed, what change was made, and affected learner counts.

---

## Implementation Phases

### Phase 0 — Adaptive Logic & Data Research

**Goals**: Finalize mastery-score calculation rules, adaptive threshold logic, catch-up/stretch sequence selection criteria, and risk-anomaly flags.

**Research Tasks**:
1. **Mastery Score Definition**: Confirm how mastery is calculated from activity performance (weighted average of accuracy, time, and misconception flags). Define thresholds and edge cases (very fast completion, partial quiz, cheating-suspicious signals).
2. **Adaptive Threshold Logic**: Confirm deterministic rules for 0–50% (catch-up), 50–80% (peer practice), 80%+ (challenge). Verify these align with ZPD pedagogical evidence.
3. **Catch-Up Sequence Templates**: Finalize structure: (intro + worked example + guided problems + reflection + checkpoint). Define how sequences are selected from available activity pool based on topic and learner profile.
4. **Stretch Activity Detection**: Confirm rule for detection (≥3 consecutive 85%+ scores in topic). Define stretch activity properties (multi-step, open-ended, cross-disciplinary). Confirm these align with high-performer engagement goals.
5. **Risk Anomaly Flags**: Define detection rules for cheating suspicion (completion time <10th percentile + score >90th percentile), inconsistent performance (>50pp drop between sessions), and high-intervention threshold (≥3 overrides/topic).
6. **Cross-Device State**: Confirm resume-point data structure and session-aware persistence model.

**Outputs**: 
- `research.md` with finalized mastery-calculation rules, adaptive thresholds, sequence selection logic, and anomaly flags.
- Validation that all adaptive logic is **deterministic and auditable** (no ML black boxes).
- Pedagogical sign-off from Learning Sciences specialist on ZPD alignment and scaffolding evidence.

### Phase 1 — Data Model & Schema

**Goals**: Extend PostgreSQL schema with adaptive-recommendation entities, audit tables, and cross-device state.

**Scope**:

1. **MasteryScore Table**:
   - `learner_id`, `activity_id`, `score` (0–100), `completion_time`, `misconceptions` (JSON), `timestamp`, `is_flagged` (unreliable flag).

2. **AdaptiveDecision Table** (core audit):
   - `learner_id`, `prior_activity_id`, `recommended_activity_id`, `reason` (enum: 'catch_up' | 'peer_practice' | 'challenge'), `mastery_threshold_applied` (0–50, 50–80, 80+), `model_version`, `timestamp`, `teacher_overridden` (bool), `override_timestamp`, `override_teacher_id`, `override_reasoning`.

3. **CatchUpSequence Table**:
   - `learner_id`, `topic_id`, `sequence_id`, `activity_ids` (array of activity IDs in sequence order), `checkpoint_activity_id`, `started_timestamp`, `completed_timestamp`, `final_mastery_score`.

4. **StretchActivity Table**:
   - `learner_id`, `activity_id`, `trigger_timestamp`, `completed_timestamp`, `teacher_assigned` (bool), `qualitative_feedback` (teacher notes).

5. **TeacherOverride Table** (compliance audit):
   - `override_id`, `learner_id`, `recommended_activity_id`, `override_activity_id`, `teacher_id`, `timestamp`, `reasoning` (nullable), `outcome_after_override` (next adaptive decision if applicable).

6. **AdaptiveAudit Table** (immutable log):
   - `audit_id`, `event_type` (enum: 'decision_made' | 'override_applied' | 'checkpoint_passed' | 'checkpoint_failed' | 'path_changed' | 'anomaly_flagged' | 'model_version_updated'), `learner_id`, `data` (JSON: full decision snapshot), `timestamp`, `logged_by_system` (bool).

7. **AdaptivePathState Table** (cross-device resume):
   - `learner_id`, `device_id` (or session-aware identifier), `current_activity_id`, `checkpoint_progress` (e.g., "2 of 4 catch-up activities"), `prior_hints` (JSON), `prior_feedback`, `last_updated_timestamp`.

**Schema Decision**: All adaptive tables are **append-only** (immutable) for audit compliance except `AdaptivePathState` (which is device-session-scoped and ephemeral). Indexes on `(learner_id, timestamp)` for fast path history retrieval; index on `(teacher_id, timestamp)` for teacher audit queries.

**Outputs**: 
- Updated `demo/apps/_shared/db/schema.sql` with all adaptive tables and indexes.
- Migration script for demo deployment.
- Validation that schema supports audit queries and cross-device resume patterns.

### Phase 2 — Adaptive Decision Engine & Audit Layer

**Goals**: Implement deterministic recommendation logic, override handling, and immutable logging.

**Scope**:

1. **Mastery Score Validation & Calculation**:
   - Helper: `calculateMasteryScore(activityScore, completionTime, misconceptionFlags)` → mastery 0–100, with flagged status if data is unreliable.

2. **Adaptive Threshold Logic**:
   - Helper: `getAdaptiveThreshold(masteryScore)` → { threshold: '0–50' | '50–80' | '80+', reason: string }.

3. **Catch-Up Sequence Selection**:
   - Helper: `selectCatchUpSequence(learner, topic, masteryScore)` → { sequence_id, activity_ids, checkpoint_activity_id, explanation }.
   - Uses pedagogical templates (pre-defined catch-up sequences per topic) to select appropriate scaffolding.

4. **Stretch Activity Detection**:
   - Helper: `detectStretchOpportunity(learner, topic)` → { qualifies: bool, activity_id: null | id, reason: string }.
   - Checks if learner has ≥3 consecutive 85%+ scores in topic; returns matching stretch activity from pool.

5. **Adaptive Recommendation Engine**:
   - Function: `generateAdaptiveRecommendation(learner, completedActivity, masteryScore)`:
     - Validates mastery data; flags if unreliable.
     - Applies threshold logic to determine pathway (catch-up/peer/challenge).
     - For catch-up: selects sequence.
     - For challenge: checks for stretch opportunity first; if qualifies, uses stretch; otherwise selects challenge activity.
     - Logs decision to `AdaptiveDecision` table with full reasoning.
     - Returns recommendation object: `{ recommendedActivityId, reason, explanation, pathType, teacherOverrideUrl }`.

6. **Teacher Override Handling**:
   - Endpoint: `POST /api/adaptive/override/{decisionId}`:
     - Teacher provides override activity ID and optional reasoning.
     - Validates teacher authorization and learner scope.
     - Creates `TeacherOverride` record; logs to `AdaptiveAudit` table.
     - Pauses adaptive path; new path begins after overridden activity.
     - Returns confirmation with audit ID.

7. **Risk Anomaly Detection**:
   - Helper: `detectAnomalies(learner, masteryScore, completionTime)` → { flags: Array<{type, severity, reason}> }.
   - Flags: cheating suspicion, inconsistent performance, high-intervention threshold.
   - Logged to `AdaptiveAudit` table with severity level.

**Outputs**: 
- New file: `demo/apps/_shared/adaptive/engine.js` with all helper functions and decision logic.
- New file: `demo/apps/_shared/adaptive/audit.js` with immutable logging functions.
- Unit tests for threshold logic, sequence selection, and override handling.
- Audit log sample queries for compliance verification.

### Phase 3 — API Routes & Teacher Override Surface

**Goals**: Expose adaptive recommendations and override capability via REST API.

**Scope**:

1. **Learner-Facing Routes**:
   - `POST /api/activity/:activityId/complete` (existing endpoint extended):
     - On activity completion, call `generateAdaptiveRecommendation()`.
     - Return response with next-best activity recommendation + "why this" explanation in plain language.
     - Include cross-device resume state if applicable.

   - `GET /api/learner/:learnerId/adaptive/state`:
     - Fetch current adaptive path state, cross-device checkpoint progress, and pending recommendation.

   - `POST /api/learner/:learnerId/adaptive/resume`:
     - Confirm resume from checkpoint; update `AdaptivePathState` for current device; return resumed activity with prior feedback context.

2. **Teacher-Facing Routes**:
   - `GET /api/learner/:learnerId/adaptive/path` (teacher-only, scope-gated):
     - Return full adaptive path history for learner: current path, prior decisions, override history, mastery progression.
     - Include reasoning for each decision.

   - `GET /api/learner/:learnerId/adaptive/decision/:decisionId` (teacher-only):
     - Return detailed reasoning for a specific adaptive decision: mastery data, threshold applied, alternative options considered.

   - `POST /api/adaptive/override` (teacher-only, scope-gated):
     - Teacher-initiated override: select learner, current decision, override activity, optional reasoning.
     - Validate teacher authorization.
     - Log override; update learner's adaptive path.

   - `GET /api/learner/:learnerId/adaptive/anomalies` (teacher-only):
     - Return list of flagged anomalies: cheating suspicion, inconsistent performance, high-intervention threshold.
     - Include evidence and suggested actions.

3. **Admin-Facing Routes** (Admin Portal):
   - `GET /api/adaptive/analytics/cohort` (admin-only):
     - Aggregated adaptive stats: % catch-up, % peer, % challenge, average mastery, override rate by school/teacher.

   - `GET /api/adaptive/audit` (admin-only, compliance-focused):
     - Query audit logs by learner, date range, event type, teacher; export for compliance review.

**All routes**:
- Require authentication and role-based authorization.
- Are scope-gated to teacher/director's assigned schools/learners.
- Log all API calls to `AdaptiveAudit` table.
- Include pagination and time-window filtering for performance.

**Outputs**:
- New file: `demo/apps/teacher-console/server-adaptive.js` with teacher override routes.
- New file: `demo/apps/learner-web/server-adaptive.js` with learner recommendation routes.
- New file: `demo/apps/admin/server-adaptive.js` with admin analytics routes.
- API documentation and OpenAPI spec in `specs/007-adaptive-learning/contracts/adaptive-api.md`.

### Phase 4 — Learner & Teacher UI Surfaces

**Goals**: Surface adaptive recommendations and override capability in learner web and teacher console.

**Scope**:

1. **Learner Web App** (`demo/apps/learner-web/public/`):
   - **Activity Completion Screen**: After learner completes activity, show:
     - "Why this next activity?" label with plain-language explanation (e.g., "You got this topic! Try a challenge.").
     - Button: "Start next activity" or "Choose a different activity" (if teacher allows).
   - **Catch-Up Sequence Progress**: If learner is in catch-up:
     - Show progress bar (e.g., "2 of 4 activities completed").
     - Display checkpoint instructions.
     - Show prior hints/feedback from previous activities in sequence.
   - **Cross-Device Resume**: On login, if learner has in-progress activity:
     - Display: "Continue: Fractions catch-up (2 of 4)" with resume button.
     - Load activity with prior hints and feedback visible.

2. **Teacher Console** (`demo/apps/teacher-console/public/`):
   - **Learner Analytics Dashboard**: Enhanced with adaptive path view:
     - Current adaptive path (catch-up/peer/challenge) with mastery score and timestamp.
     - "Why this?" details button: shows full reasoning, mastery threshold applied, algorithm version.
     - **Override Button** (prominent): teacher clicks to override path; modal appears to select alternative activity and optionally enter reasoning.
     - Override confirmation with audit ID.
     - **Override History Panel**: scrollable list of all overrides for learner, with reasons and outcomes.
   - **Anomaly Alerts**: If learner has flagged anomalies, banner shows (e.g., "High intervention needed" or "Cheating suspicion flag").
   - **Cohort Analytics** (optional Phase 4 enhancement):
     - Class-level adaptive statistics: % in catch-up, % in peer practice, % in challenge.
     - Trend over time: are catch-up sequences improving mastery?

3. **Admin Portal** (`demo/apps/admin/public/`, if exists):
   - **Adaptive Risk Dashboard**:
     - Aggregate stats across schools: total recommendations, override rate, anomaly rate.
     - Heatmap of high-intervention learners or schools.
     - Audit log search interface.

**Outputs**:
- Updated Learner Web UI with adaptive-recommendation display and cross-device resume.
- Updated Teacher Console UI with adaptive path visualization and override surface.
- CSS/styling aligned to existing demo design.
- User research or prototype validation showing override UX is low-friction.

### Phase 5 — Verification, Testing & Compliance

**Goals**: Verify adaptive logic correctness, teacher override functionality, cross-device resume, compliance audit logging, and end-to-end scenarios.

**Scope**:

1. **Unit Tests**:
   - Mastery calculation: verify thresholds 0–50%, 50–80%, 80%+ applied correctly.
   - Catch-up sequence selection: confirm correct sequence templates assigned for given topic/mastery.
   - Stretch detection: verify ≥3 consecutive 85%+ detection logic.
   - Anomaly flags: verify cheating, inconsistency, high-intervention detection.
   - Override logic: verify override logged, path paused, new path started after override.

2. **Integration Tests**:
   - Learner completes activity → mastery calculated → adaptive recommendation generated → logged to audit → teacher sees recommendation.
   - Teacher overrides → override logged → learner's path updated → prior hints restored on resume.
   - Cross-device resume: learner on device A, pauses; switches to device B, resumes at same checkpoint with prior feedback.

3. **Compliance Verification**:
   - **Art. 12 Logging**: Every adaptive decision, override, checkpoint transition, and anomaly flag is in `AdaptiveAudit` table with timestamp, learner ID, teacher ID (if override), and full reasoning snapshot.
   - **Art. 13 Transparency**: Learner sees "why this activity" label (plain language, not opaque). Teacher sees full reasoning in analytics dashboard.
   - **Art. 14 Human Oversight**: Override surface is functional, low-friction, and logged. Verify no recommendation affects learner progression without teacher visibility.
   - **Art. 9 Risk Management**: Anomaly detection working; risk dashboard flags high-intervention learners and suspected cheating.
   - **Art. 5 Prohibited Practices**: Confirm zero autonomous grading, no learner exclusion without teacher override, no coercion or manipulation detected.

4. **End-to-End Scenarios** (Spec-Driven):
   - **Scenario 1 — Low-Mastery Catch-Up**:
     1. Learner completes fractions activity with 45% mastery.
     2. System generates catch-up recommendation with reasoning logged.
     3. Teacher sees recommendation on analytics dashboard.
     4. Teacher can view reason ("Based on 45% mastery, system recommended catch-up").
     5. Teacher does NOT override; learner starts catch-up sequence.
     6. Learner completes 2 of 4 activities on iPad; closes app.
     7. Learner logs in on phone; sees "Continue: Fractions catch-up (2 of 4)"; resumes at activity 3 with prior hints visible.
     8. Learner completes catch-up; checkpoint shows 75% mastery.
     9. System generates peer-practice recommendation; logged to audit; teacher sees it.
     10. Verify full audit trail in `AdaptiveAudit` table.

   - **Scenario 2 — Teacher Override**:
     1. Learner at 60% mastery; system recommends peer practice.
     2. Teacher sees recommendation but knows learner has external stress.
     3. Teacher clicks "Override"; selects manual assignment (different topic).
     4. Override logged with teacher ID, timestamp, reasoning ("learner stressed; needs different topic").
     5. System pauses adaptive path; learner gets override activity.
     6. After override activity, system resumes adaptive recommendations.
     7. Verify override logged in `TeacherOverride` and `AdaptiveAudit` tables.

   - **Scenario 3 — Stretch Detection**:
     1. Learner completes 4 fractions activities, all 80%+ mastery.
     2. System detects 3rd consecutive 80%+ and qualifies for stretch.
     3. System recommends stretch activity ("Challenge: Fractions in Real Life") with reasoning logged.
     4. Teacher sees stretch recommendation; learner sees "Try a challenge!" label.
     5. Learner completes stretch; teacher provides qualitative feedback.
     6. Verify stretch activity logged in `StretchActivity` table.

5. **Performance Testing**:
   - Adaptive recommendation generated within 2 seconds of activity completion (p95).
   - Catch-up sequence UI loads within 1 second.
   - Override action confirmed within 500ms with audit logged.
   - Cross-device resume detects checkpoint within 1 second.

6. **Security & Audit**:
   - Verify `AdaptiveAudit` table is append-only; no deletion or tampering possible.
   - Verify audit logs are queryable by learner, teacher, date range, and event type for compliance review.
   - Verify scope gating: teacher only sees learners in assigned schools.
   - Verify overrides cannot be applied by unauthorized users.

**Outputs**:
- Test suite with unit, integration, and scenario tests.
- Verification report confirming Art. 9–15 compliance.
- Performance report with latency metrics.
- Audit log sample exports for DPO review.

### Phase 6 — Demo Deployment & Go-Live

**Goals**: Deploy adaptive feature to demo environment, run authenticated smoke tests, and confirm production readiness.

**Scope**:

1. **Schema Migration**: Deploy `schema.sql` changes to demo PostgreSQL; run data-migration scripts if needed.
2. **Code Deployment**: Deploy backend adaptive engine, API routes, and UI changes to Azure App Service (learner web, teacher console, admin portal).
3. **Configuration**: Update adaptive-thresholds config, catch-up-sequence templates, and stretch-activity pool for demo cohorts.
4. **Smoke Tests**:
   - Authenticated learner logs in; completes activity; receives adaptive recommendation.
   - Teacher logs in; views learner analytics; sees adaptive path; performs override; override is logged.
   - Learner on tablet switches to phone; resumes from checkpoint.
   - Admin views adaptive analytics dashboard.
5. **Compliance Audit**: Final DPO review of DPIA addendum, audit logs, and transparency surfaces.
6. **Go-Live Checklist**:
   - All unit/integration/scenario tests passing.
   - Audit logs verified complete and immutable.
   - Teacher override surface tested and low-friction.
   - Pedagogical sign-off from Learning Sciences specialist confirmed.
   - Performance targets met (2-second recommendation, etc.).
   - Compliance audit passed.

**Outputs**:
- Deployment report (what was deployed, when, by whom).
- Smoke test report.
- Go-live checklist signed off.
- README update in `demo/DEPLOYMENT-TUTORIAL.md` with adaptive feature verification steps.

---

## Project Structure

### Documentation (this feature)

```
specs/007-adaptive-learning/
├── plan.md                          # this file
├── research.md                      # Phase 0 output: finalized mastery rules, thresholds, sequence logic
├── data-model.md                    # Phase 1 output: entity definitions, schema, audit model
├── quickstart.md                    # end-to-end scenario walkthrough for developers
├── contracts/
│   ├── adaptive-api.md              # Phase 3 output: REST API specification
│   └── audit-logging.md             # Phase 2 output: immutable logging contract
└── tasks.md                         # Phase-by-phase task breakdown and accountable agents
```

### Source Code (repository root)

```
demo/
├── apps/
│   ├── _shared/
│   │   ├── db/
│   │   │   ├── schema.sql                    # extended with adaptive tables
│   │   │   └── index.js                     # existing DB helpers
│   │   └── adaptive/                        # new directory
│   │       ├── engine.js                    # adaptive decision logic, mastery calculation
│   │       ├── audit.js                     # immutable logging functions
│   │       └── helpers.js                   # sequence selection, anomaly detection
│   ├── learner-web/
│   │   ├── server.js                        # extended with adaptive routes
│   │   ├── server-adaptive.js               # new: learner adaptive endpoints
│   │   └── public/
│   │       ├── learner.html                 # extended with adaptive UI
│   │       └── adaptive.js                  # new: learner-side adaptive display logic
│   ├── teacher-console/
│   │   ├── server.js                        # extended with teacher routes
│   │   ├── server-adaptive.js               # new: teacher override routes
│   │   └── public/
│   │       ├── analytics.html               # extended with adaptive path view
│   │       └── adaptive.js                  # new: teacher override UI, anomaly display
│   └── admin/
│       ├── server-adaptive.js               # new: admin analytics routes (optional)
│       └── public/
│           └── adaptive-dashboard.html      # new: risk/analytics dashboard (optional)
├── feature/
│   └── adaptive-learning-demo.md            # feature walkthrough for demo
└── scripts/
    └── verify-adaptive.ps1                  # verification and smoke-test script
```

**Structure Decision**: Adaptive logic is implemented in the shared backend layer (`demo/apps/_shared/adaptive/`) so it can be reused by learner, teacher, and admin apps. Each app surface extends its existing routes and UI to surface adaptive recommendations and overrides. Schema extensions stay in the shared `schema.sql`. This keeps the feature cohesive while reusing existing app infrastructure.

---

## Design & Contracts

### Data Model

**Defined in `specs/007-adaptive-learning/data-model.md`** (to be generated in Phase 1):

Key entities:
- **MasteryScore**: Learner performance on activity (learner_id, activity_id, score 0–100, time, misconceptions, flagged status).
- **AdaptiveDecision**: System recommendation (learner_id, recommended_activity_id, reason enum, threshold applied, override status, timestamp).
- **CatchUpSequence**: Scaffolded path (learner_id, topic_id, activity sequence, checkpoint).
- **StretchActivity**: Challenge opportunity (learner_id, activity_id, trigger timestamp, completion).
- **TeacherOverride**: Teacher intervention (override_id, learner_id, teacher_id, timestamp, reasoning).
- **AdaptiveAudit**: Immutable log (audit_id, event_type enum, learner_id, full data snapshot, timestamp).
- **AdaptivePathState**: Cross-device resume (learner_id, device_id, current checkpoint, prior hints, last_updated).

### Interface Contracts

**Defined in `specs/007-adaptive-learning/contracts/adaptive-api.md`** (to be generated in Phase 3):

Contract coverage:
- Learner recommendation endpoint: request (activityId, masteryScore), response (recommendedActivityId, reason, explanation, transparency label).
- Teacher override endpoint: request (learnerId, decisionId, overrideActivityId, reasoning), response (override_id, confirmation).
- Teacher analytics endpoint: request (learnerId), response (adaptive path history, override history, anomalies).
- Admin analytics endpoint: request (school_id or cohort), response (aggregate stats, heatmaps).

### Quickstart

**Defined in `specs/007-adaptive-learning/quickstart.md`** (to be generated during research/design):

Includes:
1. Setup: Run `setup-adaptive-demo.ps1` to populate sample mastery data.
2. Learner flow: Learner completes activity → receive catch-up recommendation → complete catch-up sequence → checkpoint → mastery check.
3. Teacher flow: Teacher views learner analytics → sees adaptive path and reason → performs override → confirms in audit log.
4. Cross-device flow: Learner on tablet in class → switch to phone at home → resume from checkpoint.
5. Verification: Audit log queries confirming all events logged.

---

## Post-Design Constitution Re-Check

**To be completed after Phase 1 data-model design**:

| Checkpoint | Required Verification |
|---|---|
| EU-only storage and access boundaries | Confirm adaptive tables in EU PostgreSQL; no third-party SDKs or cross-border transfer. |
| GDPR Article 8 risk bounded | Confirm mastery-data is educationally-required; override logging is complete; learner transparency surface includes override history. |
| EU AI Act controls complete | Confirm Art. 9–15 controls are implemented: risk-management entry, logging, transparency, override, robustness. |
| Teacher override is constitutional | Confirm override surface is implemented as designed; override is logged; no recommendation affects progression without teacher visibility. |
| Pedagogical sign-off obtained | Confirm Learning Sciences specialist signed off on ZPD alignment and scaffolding evidence. |
| Auditability maintained | Confirm `AdaptiveAudit` table is append-only; queries support compliance review; no data loss or tampering possible. |

**Gate**: Plan cannot proceed to Phase 1 tasks until all checkpoints pass.

---

## Verification Approach

1. **Adaptive Logic Correctness**: Verify mastery thresholds (0–50%, 50–80%, 80%+) are applied correctly to test mastery scores; verify catch-up sequence selection matches learner topic and mastery level; verify stretch detection triggers on ≥3 consecutive 85%+ scores.

2. **Teacher Override Functionality**: Verify teacher can override any recommendation; override is logged with teacher ID, timestamp, and optional reasoning; learner's adaptive path is paused after override; new path resumes after override activity.

3. **Cross-Device Resume**: Verify learner on device A can pause in the middle of a catch-up sequence; switch to device B; log in; resume at the same checkpoint with prior hints and feedback visible; no data loss.

4. **Compliance Audit Logging**: Verify every adaptive decision is logged to `AdaptiveAudit` table with event type, learner ID, teacher ID (if override), full decision snapshot, and timestamp; logs are append-only; queries support by learner, date range, event type, teacher.

5. **Transparency & Human Oversight**: Verify learners see "why this activity" labels in plain language; teachers see full reasoning in analytics dashboard; override is low-friction and always available; anomalies are flagged for teacher review.

6. **Performance & Scale**: Verify adaptive recommendation generated within 2 seconds (p95); cross-device resume within 1 second; override confirmed within 500ms; system handles expected learner/teacher concurrency without latency degradation.

---

## Complexity Tracking

**Constitution Violations or Exceptions**: None identified. Feature is classified as HIGH-RISK, but all mandatory controls (Art. 9–15) are explicitly included in the design.

**Key Design Decisions**:
- **Deterministic, not ML-opaque**: Adaptive thresholds are rule-based (0–50%, 50–80%, 80%+) and fully auditable, not ML black boxes.
- **Teacher override is constitutional**: No recommendation affects learner progression without teacher visibility and override capability.
- **Full immutable audit trail**: Every decision, override, checkpoint transition, and anomaly flag is logged to `AdaptiveAudit` for compliance.
- **Pedagogical grounding**: Catch-up scaffolding and ZPD alignment reviewed by Learning Sciences specialist before release.

**Outstanding Questions** (to be resolved in Phase 0 research):
- How are catch-up sequence templates created and validated? Who owns pedagogical sign-off?
- How are mastery scores validated for unreliable data (very fast completion, suspected cheating)?
- What is the fallback behavior if mastery data is unavailable?
- How frequently are adaptive thresholds reviewed and updated? What process triggers a threshold change?

**Dependencies** (for integration planning):
- Feature 004 (Learner Hierarchy Portal): Adaptive system reuses hierarchy scope model for teacher/learner authorization.
- Feature 006 (Parent Portal): Parent transparency surface for adaptive decisions is planned in Feature 006; not in scope here.
- Mastery data collection: Assumes mastery scores are already being calculated and stored (not new in this feature).

---

## Summary Table

| Phase | Key Deliverables | Success Criteria | Owner |
|---|---|---|---|
| **0 — Research** | research.md (mastery rules, thresholds, sequence logic, anomaly flags) | All NEEDS CLARIFICATION resolved; pedagogical sign-off from Learning Sciences | Privacy-Preserving ML Engineer + Learning Sciences Expert |
| **1 — Data Model** | data-model.md, schema.sql, migration scripts | Schema supports audit queries; cross-device resume state persisted; indexes optimized | Privacy-Preserving ML Engineer + Database Admin |
| **2 — Engine & Audit** | engine.js, audit.js, unit tests | Deterministic decision logic correct; immutable logging working; anomaly detection functional | Privacy-Preserving ML Engineer |
| **3 — API Routes** | adaptive-api.md, learner/teacher/admin routes, integration tests | All routes functional; scope gating working; audit logging on all endpoints | Backend Developer |
| **4 — UI Surfaces** | Learner web UI, teacher console UI, admin dashboard | Recommendation labels clear; override UX low-friction; transparency surfaces complete | Frontend Developer + UX Designer |
| **5 — Testing & Compliance** | Test suite, verification report, compliance audit | End-to-end scenarios passing; Art. 9–15 controls verified; performance targets met | QA + EU AI Act Compliance Officer |
| **6 — Deployment & Go-Live** | Deployment report, smoke tests, go-live checklist | Demo deployment successful; all smoke tests passing; DPO sign-off obtained | Demo Deployment Agent |

---

**NEXT STEP**: Phase 0 research.md, data-model.md, and tasks.md are already present; proceed with implementation only after reviewing the pedagogical gate, teacher-override controls, and compliance checklist.
