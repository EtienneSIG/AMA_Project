# Contract — Adaptive API (007)

Implemented in [demo/apps/_shared/server-adaptive.js](../../../demo/apps/_shared/server-adaptive.js),
mounted by the synced `server.js`. Routes are role-gated and (for learners)
sit behind the GDPR Art. 8 consent gate. All non-GET calls require the
double-submit CSRF token (auto-injected by `/csrf.js`).

> Implementation note: the spec listed per-app `learner-web/server-adaptive.js`
> and `teacher-console/server-adaptive.js`. Because `server.js` is synced
> identically across apps, a single role-gated `_shared/server-adaptive.js` is
> the correct non-breaking realisation; it is synced into every app.

## Learner surface (role: student/admin, consent required)

### `POST /api/learner/adaptive/next`
Body: `{ itemId, correct, latencyMs, skillId?, device? }`
Returns: `{ ok, store, decisionId, reason, band, recommendedActivityId, label,
dataReliable, catchUp{ id, activityIds[], checkpointActivityId, currentIndex,
status } | null, latencyMs }`

### `GET /api/learner/adaptive/path`
Returns latest decision, recent decisions, and resume state.

### `GET /api/learner/adaptive/state` · `POST /api/learner/adaptive/state`
Cross-device resume point. POST body:
`{ currentActivityId, sequenceId?, checkpointProgress?, priorHints?, priorFeedback?, device? }`.
A device change emits a `resume` audit event.

### `POST /api/learner/adaptive/catchup/:id/advance`
Body: `{ level?, atCheckpoint?, currentIndex? }`. Checkpoint ≥ 0.70 ⇒ pass
(`checkpoint_passed`), else `re_catch_up` (`checkpoint_failed`).

## Teacher surface (role: teacher/admin, scope-checked)

### `GET /api/teacher/adaptive/learner/:email`
Returns `{ decisions[], overrides[], stretch[], anomalies[], highIntervention[],
scope }`. Out-of-scope ⇒ `403 out_of_scope`. Access is itself audited.

### `POST /api/teacher/adaptive/override/:decisionId`
Body: `{ overrideActivityId?, reasoning? }`. Records an immutable override,
marks the decision overridden, pauses active catch-up, emits `override_applied`
and (at 3+ per topic) `high_intervention`.

### `POST /api/teacher/adaptive/stretch/:id/feedback`
Body: `{ feedback, completed? }`. Qualitative feedback only (no grade).

## Error model
`403 forbidden` (role), `403 parental_consent_required` (consent gate),
`403 out_of_scope` (teacher scope), `404 decision_not_found`,
`500 adaptive_failed`. All learner routes degrade gracefully: if the adaptive
module fails to load, `server.js` boots in non-adaptive mode.
