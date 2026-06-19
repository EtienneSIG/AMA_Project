# Checklist — EU AI Act controls (Adaptive Learning, 007)

**Classification:** HIGH-RISK (Annex III §3 — education, determining access to /
steering of learning). **Accountable:** EU AI Act Compliance Officer + RAI Evaluator.

| Art. | Control | Implementation | Status |
|------|---------|----------------|--------|
| 9 | Risk management | Non-adaptive fallback on thin evidence; anomaly flags advisory-only; teacher override always available | [x] |
| 10 | Data governance | EU-hosted Postgres; pseudonymous learner id; no special-category/biometric data | [x] |
| 11 | Technical documentation | Annex IV fragment drafted ([annex-iv-fragment.md](annex-iv-fragment.md)) | [x] |
| 12 | Record-keeping / logging | Append-only `adaptive_audit` + `adaptive_teacher_override` with immutability triggers ([../contracts/audit-logging.md](../contracts/audit-logging.md)) | [x] |
| 13 | Transparency | Versioned plain-language learner labels (fr/en); teacher reasoning string on every decision | [x] |
| 14 | Human oversight | Mandatory one-click teacher override; reasoning visible; override pauses automated path; high-intervention alert at 3+/topic | [x] |
| 15 | Accuracy / robustness | Deterministic, reproducible engine; identical inputs ⇒ identical outputs; graceful degradation to non-adaptive | [x] |

## Evidence
- Engine smoke test: all five bands correct (catch_up/peer/challenge/stretch/non_adaptive).
- Live verifier: transparent label returned, Postgres-persisted, teacher override audited.
- No autonomous grading; stretch capture is qualitative only.
- No facial/emotion recognition; no behavioural advertising.
