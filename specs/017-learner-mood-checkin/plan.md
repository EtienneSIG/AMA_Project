# Implementation Plan: Learner Mood Check-In & Well-Being Routing

**Branch**: `017-learner-mood-checkin` | **Date**: 2026-06-26 | **Spec**: `/specs/017-learner-mood-checkin/spec.md`

**Input**: Feature specification from `/specs/017-learner-mood-checkin/spec.md`

> **Safeguarding/compliance core**: Mood is **voluntary self-report** via buttons. **No** facial/emotion/voice/behavioural inference (EU AI Act Art. 5). The system **surfaces** signals to humans (parent/teacher) and **makes no autonomous decisions** about the learner. Mood data is **never** used for grading/profiling/advertising.

## Summary

On the learner home page, optionally and skippably ask the learner's mood (happy / medium / sad). When "sad", offer exactly three supportive reason options (personal / course difficulty / a classmate) or skip. Record mood + optional reason per learner per day (editable/erasable). Surface a gentle, consent-gated **well-being notice** to parents (Feature 006) and **per-learner/aggregate** signals + **pedagogically-reviewed recommendations** to teachers (Feature 008); the "classmate" reason routes to a **safeguarding/pastoral** pathway restricted to authorised staff and never exposed to peers. Extends `demo/apps/learner-web` (home check-in) + `parent-portal` (alert) + `teacher-console` (well-being view + recommendations + safeguarding inbox) + `_shared/db`. Reuses adaptive/teacher-assessment scaffolding (007/008) for course-difficulty recommendations.

## Technical Context

**Language/Version**: Node.js 22.x; learner-web/parent-portal/teacher-console front-ends; `_shared/db` (PostgreSQL).

**Primary Dependencies**: `express`, `pg`, `@azure/identity`; reuse Feature 006 consent state + Feature 007/008 recommendation scaffolding. **No** ML inference on mood.

**Storage**: PostgreSQL (`_shared/db`): `mood_entry`, `wellbeing_alert`, `teacher_recommendation`, `safeguarding_flag`. EU-resident, strict access control. Small self-reported value + optional reason only — **no biometric/behavioural data**.

**Testing**: Extend `demo/scripts/` verification (self-report only, safeguarding routing, consent-gated parent alert, teacher recommendation, no grading/profiling use, edit/erase); quickstart.

**Target Platform**: Azure App Service Linux (3 apps); EU-resident.

**Project Type**: Web application — cross-role well-being feature.

**Performance Goals**: Check-in is one optional interaction; parent/teacher surfacing within the defined window; no nagging if skipped.

**Constraints**:
- **Self-report only**; never infer mood from face/voice/typing/behaviour (Art. 5).
- Parent surfacing **consent-gated**; learners can edit/erase entries (data-subject rights).
- "Classmate"/bullying → sensitive **safeguarding** handling, authorised staff only, never peer-visible.
- Mood data **never** used for grading/profiling/advertising/automated decisions.
- Escalation thresholds documented + tuned (avoid under-care and alarm fatigue).

**Scale/Scope**: One learner check-in + parent alert surface + teacher well-being/safeguarding surface.

## Constitution Check

| Principle | Status | Plan handling |
|---|---|---|
| I. EU-Resident, Data-Minimised | PASS | Stores only a small self-reported value + optional reason, EU-resident, strict access; no biometric/behavioural data. |
| II. GDPR Art. 8 | PASS | Parent surfacing consent-gated; learners can edit/erase; sensitive reasons extra-protected. |
| III. EU AI Act high-risk | PASS | **Excludes Art. 5** emotion/biometric inference; any recommendation is logged (Art. 12), transparent (Art. 13), human-overridden (Art. 14). Annex IV fragment for the recommendation surface. |
| IV. Teacher-in-the-loop | PASS | Parents/teachers act; the system only surfaces signals + suggestions; **no autonomous action** on the learner. |
| V. Pedagogical sign-off | PASS | Copy, thresholds, and recommendations reviewed by Learning Sciences + safeguarding leads. |
| VI. Outcome-contract driven | PASS | SC-006 ties timely well-being/difficulty support to the −26% outcome-gap KPI + retention. |
| VII. Reproducible, spec-driven | PASS | Independently testable stories + measurable criteria; quickstart included. |

**EU AI Act articles touched**: Art. 5 (explicitly excluded — no emotion/biometric inference), Art. 10 (data governance: self-report only, sensitive-reason protection), Art. 12 (recommendation + action logging), Art. 13 (transparency: framed as self-reported well-being, not a diagnosis), Art. 14 (human-only action; teacher accept/adjust/dismiss).

**DPIA delta**: **Moderate (well-being + possible safeguarding data for minors).** New: self-reported mood + reason; well-being alerts; safeguarding flags. Mitigations: self-report only (no inference), consent-gated surfacing, strict access control (safeguarding = authorised staff), edit/erase honoured, no secondary use. DPO sign-off required.

**Human oversight surface**: parent well-being notice (consent-gated, supportive framing); teacher accept/adjust/dismiss recommendations (logged); safeguarding/pastoral escalation for "classmate" reports.

## Project Structure

### Documentation (this feature)
```text
specs/017-learner-mood-checkin/
├── plan.md · research.md · data-model.md · quickstart.md · tasks.md
└── contracts/mood-api.md
```

### Source Code
```text
demo/apps/
├── learner-web/        # EXTEND: optional home-page mood check-in + sad-reason follow-up + edit/erase
├── parent-portal/      # EXTEND: consent-gated supportive well-being notice + "how to help"
├── teacher-console/    # EXTEND: per-learner/aggregate well-being view + recommendations + safeguarding inbox
└── _shared/db/
    ├── schema.sql      # NEW: mood_entry, wellbeing_alert, teacher_recommendation, safeguarding_flag
    └── index.js        # NEW helpers: record/edit/erase mood, derive alert (thresholds), recommend, route safeguarding
```

**Structure Decision**: Extend the three role apps. The learner records a self-reported mood (+ optional reason) on the home page; server-side helpers (in `_shared/db`) derive a consent-gated well-being alert (thresholds) for the parent and a pedagogically-reviewed recommendation for the teacher, and route "classmate"/bullying reports to a safeguarding flag visible only to authorised staff. No ML/inference; recommendations reuse Feature 007/008 scaffolding and are teacher-overridable.

## Complexity Tracking

> No constitution violations. Net-new: self-reported mood capture + threshold-based alerting + safeguarding routing. The sensitivity (children's well-being/safeguarding) drives a moderate DPIA — mitigated by self-report-only, consent-gating, strict access, and edit/erase. DPO sign-off gates release.
