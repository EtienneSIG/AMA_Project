# Checklist: Fairness & Anti-Bias Gates — A/B Testing Framework (Feature 012)

Status: **PASS** — verified live by `demo/scripts/verify-experiments.ps1` (steps 4, 5, 16).

Anti-discrimination controls (AI Act Art. 5 / Art. 10) implemented in
`demo/apps/_shared/experimentation/fairness-service.js`,
`segment-analysis-service.js`, `alert-engine.js`, and orchestrated in
`demo/apps/_shared/experimentation/index.js`. Thresholds live in
`demo/apps/_shared/config/experimentation.js`.

## Assignment parity
- [X] Per-stratum assignment shares compared to target ratio; skew banded none / monitor / high_risk.
- [X] `monitor` band (> 10% relative skew) raises a warning fairness alert at start.
- [X] `high_risk` band (> 20% relative skew) **blocks** experiment start (HTTP 409 `fairness_block`).
- [X] Deterministic stratified hashing keeps assignment reproducible and auditable (no PII in the hash).

## Differential impact (segments)
- [X] Per-dimension control vs treatment effects computed with the same Welch test.
- [X] Opposite-effect detection: a segment moving against the overall direction is flagged.
- [X] Significant opposite effect (p ≤ 0.05) -> `high_risk` fairness flag on the segment.
- [X] Any high-risk segment raises a **critical** `fairness_skew` alert and reports `highRisk:true`
      (rollout blocked pending Responsible AI + Learning Sciences review).

## Runtime safety alerts
- [X] Underperformance alert when a treatment falls materially below control on the success metric.
- [X] Sample-drift alert when a variant's sample deviates far from its expected share.
- [X] Alerts are persisted, surfaced in monitoring, and acknowledgeable with audit capture.

## Fail-safe posture
- [X] Fairness gates are evaluated before any "running" transition is committed.
- [X] Statistical "win" never overrides a fairness block; adoption still needs human sign-off.
- [X] Service fails closed (`{ enabled:false }`) when the EU database is offline.
