# Quickstart — Adaptive Learning (007) independent checkpoints

End-to-end verification is automated by
[demo/scripts/verify-adaptive.ps1](../../demo/scripts/verify-adaptive.ps1).
Live run against Azure passed (Postgres-backed). Demo logins:
`student@learneu.demo` / `teacher@learneu.demo` / `parent@learneu.demo`,
password `DemoPass2026!`.

## US1 — Adaptive activity selection
1. Parent grants GDPR Art. 8 consent for the under-16 learner (parent portal).
2. Learner answers practice items; after each attempt the learner page calls
   `POST /api/learner/adaptive/next`.
3. **Expected:** a transparent "Why this next" banner appears with a
   plain-language label; band/reason follow the mastery table in
   [research.md](research.md). At 50–80% → peer practice; at 80%+ → challenge.

## US2 — Catch-up pathway
1. Drive mastery < 50%.
2. **Expected:** `reason=catch_up`, a scaffolded sequence
   (intro → worked-example → guided-practice → reflection → checkpoint) starts;
   `catch_up_started` is logged. Checkpoint ≥ 0.70 passes
   (`checkpoint_passed`); below 0.70 → `re_catch_up` (`checkpoint_failed`).

## US3 — Stretch
1. Submit 3+ consecutive 85%+ performances.
2. **Expected:** `reason=stretch`, learner sees a stretch label, a
   `stretch_triggered` event is logged, teacher can add qualitative feedback.

## US4 — Teacher override
1. Teacher opens **Adaptive paths** tab, loads the learner.
2. **Expected:** full `explanation_teacher` reasoning is shown; one-click
   override records an immutable `adaptive_teacher_override` row + `override_applied`
   audit event; the decision is marked overridden and any active catch-up is
   paused. 3+ overrides on one topic raises a high-intervention badge.

## US5 — Cross-device resume
1. Make progress on one device; reopen on another.
2. **Expected:** `GET /api/learner/adaptive/state` returns the saved
   `current_activity_id`; the learner page shows "Welcome back — resuming your
   path"; a device change logs a `resume` event.

## Verification evidence
`pwsh demo/scripts/verify-adaptive.ps1` → all five steps green:
consent granted, attempt seeded, transparent label returned (`store=postgres`),
resume state persisted, teacher view + override audited.
