# 06 — Risk Register (top risks)

Severity = Likelihood × Impact (1–5 each). Owners review **monthly** at Steering Committee.

| # | Risk | L | I | Sev | Owner | Mitigation | Contingency |
|---|---|---|---|---|---|---|---|
| R1 | A national DPA blocks our DPIA in one market | 3 | 5 | 15 | DPO | Engage DPAs in P0; co-design DPIA with local counsel | Delay that market; proceed with others |
| R2 | EU AI Act conformity assessment fails | 2 | 5 | 10 | AI Act CO | Build Annex IV file from M0; mock CA in P2 | 8-week remediation; pilot stays NL-only until pass |
| R3 | Federated learning runtime doesn't converge for adaptive model | 3 | 4 | 12 | ML Lead | Spike on synthetic data in P0; DP fallback to central training on consented samples only | Centralised model on opt-in cohort; reduced personalisation depth |
| R4 | Localisation quality below pedagogical bar (back-translation drift) | 4 | 4 | 16 | Editorial Director | Glossaries v0 in P0; reviewer-in-the-loop never optional | Reduce automation; staff additional reviewers |
| R5 | Teacher override rate explodes (low trust) | 3 | 4 | 12 | UX Lead + RAI | Co-design with teachers in P0–P1; explainability in console; CPD programme | Pause feature, retrain, redesign UX |
| R6 | Bias disparity > 5pp on a launched cohort | 3 | 5 | 15 | RAI | Per-cohort gates in release; quarterly re-evaluation | Roll back model version; targeted dataset rebalancing |
| R7 | Microsoft sub-processor change breaches EU residency | 2 | 5 | 10 | DPO + Architecture | Quarterly sub-processor review; Azure Policy enforcement of regions | Switch service; serious-incident report (AI Act Art. 73 if applicable) |
| R8 | Cost runaway on Azure OpenAI for localisation at scale | 4 | 3 | 12 | FinOps | Provisioned Throughput Units for predictable load; caching of repeated localisations; smaller fine-tuned models for routine work | Throttle generation; switch to PTU vs PAYG |
| R9 | School onboarding lags target | 4 | 3 | 12 | Country Mgrs | Onboarding playbook; CSM per market; ministry partnerships | Adjust market launch order |
| R10 | Serious AI incident requiring Art. 73 reporting | 1 | 5 | 5 | RAI + DPO | Robust monitoring + kill switch + drilled IR | Activate IR; notify within statutory window |
| R11 | Children's data exposed via SIS integration vulnerability | 2 | 5 | 10 | Security | Private Endpoints; OAuth 2.0 + mTLS; pen tests; Defender alerts | IR + Art. 33/34 GDPR notifications; rotate keys |
| R12 | Content Safety false negatives expose minors to inappropriate content | 2 | 5 | 10 | RAI + Editorial | Defence-in-depth: Content Safety + heuristics + reviewer sampling; post-publication takedown SLA | Takedown < 2h; root-cause analysis published internally |

## Risk policy
- New risk → log within 48h
- Severity ≥ 12 → escalate to Steering Committee at next meeting
- Severity ≥ 20 → emergency Steering Committee within 5 working days
- All R-class risks reviewed at every phase gate
