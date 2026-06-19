# Contract — Immutable Audit Logging (007)

**Accountable:** EU AI Act Compliance Officer · **Basis:** AI Act Art. 12.

## Guarantee
Every adaptive decision, override, checkpoint transition, anomaly, stretch event,
high-intervention signal, non-adaptive fallback and cross-device resume is written
to the append-only `adaptive_audit` table. Overrides additionally land in the
append-only `adaptive_teacher_override` table.

Both tables are protected by `BEFORE UPDATE OR DELETE` triggers
(`prevent_adaptive_audit_mutation`, `prevent_adaptive_override_mutation`) that
raise an exception — records cannot be altered or removed after write.

## Event taxonomy (`adaptive_audit.event_type`)
`decision_made`, `override_applied`, `checkpoint_passed`, `checkpoint_failed`,
`path_changed`, `anomaly_flagged`, `stretch_triggered`, `stretch_completed`,
`catch_up_started`, `high_intervention`, `resume`, `non_adaptive_fallback`.

## Record shape
`{ event_type, learner_email, teacher_email?, data JSONB, latency_ms, created_at }`.
`data` carries the decision id, reason, band, mastery level, recommended activity,
anomaly details, and scope — enough to reconstruct the reasoning without re-running
the engine.

## Writer
[demo/apps/_shared/adaptive/audit.js](../../../demo/apps/_shared/adaptive/audit.js):
`startTimer()` captures decision latency; `writeAudit()` is best-effort and never
blocks the learner flow, but the write path is exercised on every decision and
verified by the live verifier.

## Latency capture (SC-001/SC-005)
`latency_ms` is recorded on `adaptive_decision` and on the `decision_made` /
`override_applied` audit events for performance evidence.
