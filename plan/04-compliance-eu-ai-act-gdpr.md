# 04 — Compliance: EU AI Act + GDPR Article 8

This document is the **single source of truth** for compliance posture across the program. Updated by the **EU AI Act Compliance Officer** and the **GDPR Children's Data Specialist** at every gate.

---

## Part A — EU AI Act (high-risk, Annex III §3)

### Risk classification per AI feature
| Feature | Classification | Why |
|---|---|---|
| Adaptive learner model | **High-risk** | Determines content access & influences educational outcomes |
| Curriculum localisation AI | **Limited-risk** (transparency) — but operationally treated as high-risk because outputs are consumed by learners | Caution-default; specific AI Act category for content generation = transparency obligations |
| Automated assessment AI | **High-risk** | Evaluates learning outcomes (Annex III §3(b)) |

> ⚠️ Any feature touching grading or content access is treated as **high-risk by default**.

### Article-by-article checklist (per high-risk feature)

| Article | Requirement | How we implement | Evidence artifact |
|---|---|---|---|
| 9 — Risk management | Continuous risk system across lifecycle | Risk register per feature, reviewed at each phase gate | `risk-register-<feature>.md` |
| 10 — Data & data governance | Representative, relevant, error-checked datasets; bias detection | Per-cohort sampling, fairness audits in RAI gate | Data sheets per dataset |
| 11 — Technical documentation | Annex IV technical file | Maintained in `compliance/annex-iv/<feature>/` | Technical file PDF + sources |
| 12 — Record-keeping | Automatic logging of inputs/outputs/model version/overrides | App Insights + immutable Storage + KQL workbook | Log retention policy |
| 13 — Transparency to users | Users informed they interact with high-risk AI; instructions for use | In-product notices (teacher + parent + learner age-appropriate); model cards | Model cards + UX screenshots |
| 14 — Human oversight | Effective oversight by natural persons | Teacher override on every assessment + content change; oversight playbook | Oversight playbook + override telemetry |
| 15 — Accuracy, robustness, cybersecurity | Declared accuracy + robustness; protection against attack | Release gate thresholds; adversarial test in CI | Eval reports + threat model |
| 17 — QMS | Documented quality management system | ISO-9001-style QMS doc covering this product | QMS document |
| 43 — Conformity assessment | Internal control or notified body | Default: internal control; notified body if any condition under §1 applies | CA report + EU declaration of conformity |
| 47 — EU declaration of conformity | Issued before placing on market | Signed by Group CEO before Phase 3 exit | Declaration |
| 49 — CE marking | Affixed; registered in EU database (Art. 71) | After CA pass | CE mark + DB registration |
| 72 — Post-market monitoring | Active monitoring + plan | Continuous evaluation pipeline + quarterly PMM report | PMM plan + reports |
| 73 — Serious incident reporting | Report within statutory windows | Incident response runbook tied to Sentinel + DPO escalation | Runbook + drill records |

### Prohibited (Art. 5) — explicit don'ts in our system
- ❌ No emotion recognition in education contexts
- ❌ No social scoring of learners
- ❌ No subliminal techniques or behavioural manipulation
- ❌ No biometric categorisation of minors

### Conformity assessment route
- **Default**: internal control (Art. 43 §2) since the system is covered by Annex III §3 and follows harmonised standards once published
- **Re-evaluation triggers**: substantial modification (Art. 43 §4) — new market, new modality, model architecture change

---

## Part B — GDPR (esp. Article 8)

### Per-country digital consent age
NL 16 · BE 13 · DE 16 · PL 16 · RO 16 → **design for 16 by default**

### Lawful basis matrix
| Processing purpose | Preferred lawful basis | Notes |
|---|---|---|
| School-mandated curriculum delivery & assessment | **Art. 6(1)(e) public interest** when the school is the controller | Most NL/DE/PL public schools |
| Service contract with private vocational schools | **Art. 6(1)(b) contract** | Private vocational players |
| Optional features beyond curriculum (e.g. parent insights) | **Art. 6(1)(a) consent** with verifiable parental consent for <16 | Granular per feature |
| Special category data (e.g. SEN status) | **Art. 9(2)(g) substantial public interest** with member-state law basis | Verify per country |
| Automated decisions with significant effect | **Art. 22 safeguards** + AI Act Art. 14 oversight | Right to human intervention |

### Data minimisation by design
- No raw learner names in ML pipelines — pseudonymise at ingestion
- Behavioural signals aggregated client-side where possible
- Default retention aligned to statutory school-record obligations per country (do not exceed)
- Automatic deletion workflows on contract end / consent withdrawal

### DPIA scope (mandatory)
Triggered by Art. 35 §3(a) (systematic and extensive evaluation including profiling), §3(b) (large-scale special categories), and the involvement of children.

DPIA produced **per country** and updated at every phase gate.

### Data subject rights
- Access (Art. 15) — parent + learner (age-appropriate) self-service in Parent Portal
- Erasure (Art. 17) — automated workflow with cascade across OneLake / Feature Store / Logs (logs may retain hashed references for AI Act Art. 12 compliance)
- Restriction / Objection / Portability — supported via portal
- **Art. 22** — human review available within 5 working days

### International transfers
- **None** outside EU
- Verify Microsoft sub-processors per service quarterly
- Use **EU Data Boundary** for all in-scope services

---

## Joint compliance dashboard
Maintained by RAI Lead + DPO; surfaced in Steering Committee monthly.

| Indicator | Owner | Threshold |
|---|---|---|
| % features with up-to-date Annex IV file | AI Act CO | 100% |
| % markets with current DPIA (< 12 months) | DPO | 100% |
| # serious AI incidents (Art. 73) | RAI | 0 |
| # GDPR breaches (Art. 33) | DPO | 0 |
| Override rate per assessment AI | RAI | < 10% steady-state |
| Mean time to honour erasure request | DPO | ≤ 30 days (statutory) |
