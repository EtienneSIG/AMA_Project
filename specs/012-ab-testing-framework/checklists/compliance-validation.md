# Checklist: Compliance Validation — A/B Testing Framework (Feature 012)

Status: **PASS** — verified live by `demo/scripts/verify-experiments.ps1` (20/20).

Cross-cutting GDPR + AI Act validation for the experimentation feature.

## AI Act Art. 12 — Record-keeping (immutable logging)
- [X] Append-only `experiment_audit_event` table; `prevent_experiment_audit_mutation` trigger blocks UPDATE and DELETE.
- [X] Every action emits an audit event: state_change, assignment_generated, alert_emitted,
      significance_computed, segment_analyzed, decision_recorded, signoff_recorded, archive_written, data_accessed.
- [X] Each audit row carries a stable payload hash (`event_payload_hash`) for tamper-evidence.
- [X] Live verifier asserts all nine event types are present after a full run.

## AI Act Art. 13 — Transparency
- [X] Recommendations are advisory and labelled as such, with a human-readable rationale.
- [X] Fairness outcomes (monitor / high_risk) are surfaced explicitly, never as silent nulls.
- [X] Monitoring exposes freshness lag vs the SLA so stale results are obvious.

## AI Act Art. 14 — Human oversight
- [X] adopt_variant sign-off gate (teacher + pedagogy) — see governance-signoff.md.
- [X] Rationale mandatory on every decision; admins are the only decision actors.

## GDPR Art. 8 / minimisation
- [X] Only pseudonymous learner references are stored; no raw identity in any experiment table.
- [X] DSR / consent revocation excludes a learner and recomputes the effective sample.
- [X] `exclusion_reason` constrained to dsr_request / consent_revoked / data_quality / other.

## Residency & robustness
- [X] EU-only persistence (West Europe Postgres); no cross-region transfer.
- [X] Service fails closed (`{ enabled:false }`) when the database is unavailable.
- [X] Routes role-gate by `req.user.role`; aggregate oversight is read-only for directors.

## Routing & integration safety
- [X] Router mounted via guarded require in the shared server and both bespoke servers (app still boots if absent).
- [X] No existing feature behaviour changed; all additions are new tables, modules, routes, and one admin tab.
- [X] `node --check` passes for all new modules, the router, and the three wired servers.
