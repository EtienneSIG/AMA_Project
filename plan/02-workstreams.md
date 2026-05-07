# 02 — Workstreams

Each workstream has a **lead**, a primary **specialist agent**, and a clear **outcome contribution**.

| # | Workstream | Lead | Primary agent | Contributes to outcome |
|---|---|---|---|---|
| WS1 | Legal, DPO, Compliance | Group DPO | `gdpr-children-data-specialist`, `eu-ai-act-compliance-officer` | C1, C2, C4 — Compliance maintained |
| WS2 | Platform & Landing Zone | Cloud Architect | (use main `azure-data-ai-architect`) | Foundation for all KPIs |
| WS3 | Privacy-Preserving Learner Model | ML Eng Lead | `privacy-preserving-ml-engineer` | Outcome gap −26% (personalisation) |
| WS4 | Automated Assessment AI | NLP Lead | `privacy-preserving-ml-engineer` + `learning-sciences-expert` | Teacher admin time −45% |
| WS5 | Curriculum Localisation | Editorial Director | `content-localisation-lead` | Localisation 12mo → 6w |
| WS6 | Teacher Experience & Oversight | UX Lead | `learning-sciences-expert` | Teacher trust + AI Act Art. 14 |
| WS7 | Parent Transparency & Rights | Product Manager | `gdpr-children-data-specialist` | GDPR rights + Art. 8 consent |
| WS8 | Responsible AI & Evaluation | RAI Lead | `responsible-ai-evaluator` | Quality gate for every release |
| WS9 | FinOps & Operations | SRE Lead | (use main `azure-finops`) | Cost per learner under budget |
| WS10 | Change & Adoption | Country Managers | n/a | School onboarding rate |

---

## WS1 — Legal, DPO, Compliance
**Outputs:** DPIA per market, Records of Processing, parental consent flows, AI Act Annex IV technical file, conformity assessment package, post-market monitoring plan.

## WS2 — Platform & Landing Zone
**Outputs:** Azure landing zone (CAF-aligned), per-environment subscriptions (Dev / Test / Pre-Prod / Prod), regional pinning (West Europe primary, France Central for FR-BE residency option, Germany West Central for DE residency option), Purview catalog, Defender for Cloud, Key Vault Managed HSM, network isolation (VNet + Private Endpoints), shared DevOps with required-reviewers gates.

## WS3 — Privacy-Preserving Learner Model
**Outputs:** Federated learning runtime (option: Flower on AKS Confidential), DP-SGD training pipeline, on-device ONNX inference, model registry with cards/sheets, ε budget tracker per learner.

## WS4 — Automated Assessment AI
**Outputs:** Rubric-based grading models per subject, calibrated confidence outputs, teacher-override UX, formative-feedback generator (Azure OpenAI with Content Safety), audit trail.

## WS5 — Curriculum Localisation
**Outputs:** Authoring pipeline (Markdown + LRMI), curriculum-mapping vector index (AI Search), translation prompt packs + glossaries, reviewer tooling, content versioning (Fabric Lakehouse).

## WS6 — Teacher Experience & Oversight
**Outputs:** Teacher console (override, explain, intervene), oversight playbook per AI feature, training programme + certification, in-product nudges to keep override muscle alive.

## WS7 — Parent Transparency & Rights
**Outputs:** Parent portal (consent, view, erase, export), age-appropriate notices, multilingual UX, integration with country-specific eID where available.

## WS8 — Responsible AI & Evaluation
**Outputs:** Golden evaluation datasets (synthetic), continuous-evaluation pipelines (Azure ML), RAI dashboard, release gate enforcement, quarterly RAI report.

## WS9 — FinOps & Operations
**Outputs:** Cost dashboards per workstream, optimisation backlog (right-sizing, reservations, Fabric capacity tuning, Azure OpenAI PTU vs PAYG), incident response runbooks, DR drills.

## WS10 — Change & Adoption
**Outputs:** School onboarding playbook, teacher CPD partnership, parent communications, ministry/inspector engagement plan per market.

---

## RACI snapshot (key decisions)

| Decision | Sponsor | DPO | AI Act CO | RAI | Architecture | Country Mgr |
|---|---|---|---|---|---|---|
| Lawful basis per processing | A | R | C | I | I | C |
| Release a model to production | I | C | C | **R/A** | C | I |
| Add a new market | **R/A** | C | C | C | C | R |
| Major architecture change | A | I | C | C | **R** | I |
| Public incident communication | **R/A** | C | C | C | I | C |

R = Responsible · A = Accountable · C = Consulted · I = Informed
