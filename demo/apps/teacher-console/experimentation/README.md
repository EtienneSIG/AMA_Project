# Experimentation service (Feature 012 — A/B Testing Framework)

Governed A/B experimentation for LearnEU. Pure statistical/fairness/lifecycle
logic is separated from the EU-resident DB layer so it is unit-testable and
deterministic.

## Modules

| File | Responsibility |
|------|----------------|
| `../config/experimentation.js` | Thresholds (alpha, fairness deltas, freshness SLA, effect bands). |
| `randomization-service.js` | Deterministic stratified hash assignment (reproducible, no PII). |
| `fairness-service.js` | Assignment parity + segment differential-impact flags. |
| `significance-service.js` | Welch t-test, Cohen's d, 95% CI (no external deps). |
| `significance-policy.js` | Practical-significance + advisory recommendation (non-binding). |
| `lifecycle-service.js` | Legal state transitions + pre-start validation. |
| `governance-service.js` | adopt_variant gate: requires teacher + pedagogy sign-off. |
| `alert-engine.js` | Underperformance / sample-drift / fairness alerts. |
| `monitoring-aggregator.js` | Event rollups + freshness lag. |
| `segment-analysis-service.js` | Per-dimension effects + opposite-effect detection. |
| `dsr-exclusion-service.js` | DSR / consent-revocation exclusion markers. |
| `archive-service.js` | Archive packet assembly + search. |
| `audit-log.js` | Immutable, hash-stamped audit writer (Art. 12). |
| `index.js` | `makeExperimentService(db)` orchestrator used by the router. |

## Constitutional guarantees

- **No autonomous rollout**: `adopt_variant` is blocked without teacher +
  pedagogy sign-off; statistical output is advisory only (Art. 14, Const. IV/V).
- **Anti-bias**: high-risk assignment skew blocks experiment start; high-risk
  segment differential impact raises a critical fairness alert (Art. 5/10).
- **Traceability**: every state change, assignment batch, alert, decision,
  sign-off, significance run, and archive write is appended to an immutable
  audit table (Art. 12).
- **GDPR**: learner references are pseudonymous; DSR/consent revocation excludes
  the learner from analysis and recomputes the effective sample.
- **EU residency**: persistence uses the existing West Europe Postgres only.

Verified live by `demo/scripts/verify-experiments.ps1`.
