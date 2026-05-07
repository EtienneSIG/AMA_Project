# 07 — Governance & Responsible AI

## Governance bodies

### Steering Committee (monthly)
- **Chair:** Group CEO
- **Members:** Group CDO, DPO, AI Act Compliance Officer, RAI Lead, Program Lead, Country Managers
- **Mandate:** approve phase gates, KPI tracking, budget, risk escalations, public communications

### Architecture Review Board (bi-weekly)
- **Chair:** Group Cloud Architect
- **Members:** Lead Architects per workstream, Security Architect, FinOps Lead
- **Mandate:** approve material design changes, region/service decisions, third-party additions

### Responsible AI Council (bi-weekly)
- **Chair:** RAI Lead
- **Members:** Learning Sciences Lead, AI Act Compliance Officer, GDPR Specialist, Privacy ML Lead, Editorial Director, one Teacher Advocate (rotating from advisory teacher panel)
- **Mandate:** **owns the model release gate**, evaluates fairness/safety/transparency, signs off PMM reports

### Country Working Groups (weekly)
- **Chair:** Country Manager
- **Members:** Local DPO contact, Local Editorial Lead, CSM, Customer Reps (rotating)
- **Mandate:** local roll-out, parental/teacher engagement, ministry liaison

### Teacher Advisory Panel (monthly)
- 12–20 teachers across markets; rotating membership
- Co-design AI features and oversight UX
- Veto on user-facing flows that fail teacher acceptance test

## Responsible AI principles (operationalised)

| Principle | Operational meaning |
|---|---|
| Fairness | Per-cohort gates ≤ 5pp disparity; quarterly re-evaluation |
| Reliability & Safety | Release gate + Content Safety + adversarial tests + kill switch |
| Privacy & Security | Privacy-by-design (federated, DP, on-device) + EU residency + CMK + Confidential Compute |
| Inclusiveness | UDL + multilingual + accessibility WCAG 2.2 AA + SEN-aware design |
| Transparency | Model cards + age-appropriate notices + teacher explainability |
| Accountability | RACI + DPO + AI Act CO + RAI Council + named release approvers per model |

## Decision rights

| Decision | Authority |
|---|---|
| Approve new market launch | Steering Committee |
| Approve model release | RAI Council |
| Approve material architecture change | Architecture Review Board |
| Pause feature in production | RAI Lead **or** DPO **or** Country Manager |
| Public incident communication | Steering Committee (within IR runbook) |

## Continuous evaluation cycle

```
Production telemetry ──► Continuous Eval (Azure ML) ──► RAI Dashboard
                                                       │
                                                       ▼
                                                Quarterly RAI report
                                                       │
                       ┌───────────────────────────────┤
                       ▼                               ▼
              Annex IV update                  PMM report (AI Act Art. 72)
                       │                               │
                       └────────► Steering Committee ◄─┘
```

## Audit & assurance
- Internal audit of compliance dashboard quarterly
- External audit (e.g. ISO 27001 + SOC 2 Type II) annually from Phase 4
- AI Act post-market monitoring report annually (or upon any serious incident)
