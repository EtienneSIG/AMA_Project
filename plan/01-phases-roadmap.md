# 01 — Phases & Roadmap

A **5-phase** program over **12 months**, then steady-state scale-up. Each phase has a hard exit gate — no phase advances without the **Responsible AI Council** + **Steering Committee** sign-off.

## Phase overview

| Phase | Months | Theme | Exit gate |
|---|---|---|---|
| **P0 — Discovery & Foundations** | M0–M2 | Legal, pedagogical, and platform foundations | DPIA + AI Act risk assessment approved; landing zone live |
| **P1 — Build (MVP)** | M2–M5 | Three AI features behind feature flags, NL pilot only | Internal alpha passes RAI release gate v1 |
| **P2 — Pilot (NL)** | M5–M8 | Closed pilot in 20 NL schools | KPI trend confirmed; conformity assessment dossier complete |
| **P3 — Conformity & 2nd Market** | M8–M10 | CE marking; launch DE | CE marking obtained; DE ≥ 50 schools live |
| **P4 — Scale-out** | M10–M12 | Add a 3rd market; harden ops | All 5 outcome KPIs on trajectory |
| **P5 — Steady-state** | M12+ | Continuous evaluation, content velocity | Quarterly RAI re-evaluation never below thresholds |

---

## P0 — Discovery & Foundations (M0–M2)

**Workstreams kicked off:** Legal/DPO, Compliance, Platform, Learning Sciences, Localisation

**Key deliverables**
- Program charter signed (this folder)
- **DPIA** v1 (per market) — owner: GDPR Specialist
- **AI Act risk classification & technical file skeleton** — owner: AI Act Compliance Officer
- **Azure landing zone** in EU regions (West Europe primary, North Europe DR), tenant + subscriptions per environment
- **Identity** baseline: Azure AD B2C tenants per country, Entra ID for staff
- **Data governance**: Microsoft Purview deployed, sensitivity labels for "Child Personal Data — Restricted"
- **Pedagogical reference frameworks** documented per market
- **Localisation glossaries** v0 per subject × per country

**Exit gate**
- DPIA approved by all 5 national DPAs (or sign-off documented)
- AI Act Annex IV technical file skeleton complete
- Landing zone passes Microsoft Cloud Adoption Framework readiness review

---

## P1 — Build MVP (M2–M5)

**Workstreams active:** Platform, Privacy ML, Assessment AI, Localisation, Teacher UX, RAI

**Key deliverables**
- **Adaptive learner model v0** — federated training prototype on synthetic data
- **Curriculum localisation pipeline v0** — Azure OpenAI + glossaries + human review
- **Automated assessment AI v0** — structured assignments only (MCQ, fill-in, short answer with rubric)
- **Teacher console v0** — overrides, explanations, content selection oversight
- **Parent portal v0** — transparency notices, consent management, rights requests
- **Logging & monitoring** per AI Act Art. 12 — App Insights + immutable audit storage
- **Content Safety** integrated on all generative outputs

**Exit gate**
- RAI release gate v1 passed on synthetic data
- Internal alpha with 50 employee testers — no critical incidents
- Localisation pipeline validated for 1 subject × 2 languages

---

## P2 — Pilot in NL (M5–M8)

**Schools:** 20 NL schools (mix of urban / rural, public / vocational, decile spread)

**Deliverables**
- Live deployment in NL only, behind country feature flag
- DPIA v2 (post-pilot data flows)
- **Continuous evaluation** in production via Azure ML monitoring
- Weekly RAI dashboard to Steering Committee
- Conformity assessment dossier (Annex IV) finalised
- Teacher training programme

**Exit gate (KPI trends, on a 3-month rolling basis)**
- Outcome-gap reduction trending toward −26% (≥ −10pp at gate)
- Teacher admin time reduction ≥ −20pp
- Localisation cycle ≤ 8 weeks
- Fairness disparity ≤ 5pp across cohorts
- Zero reportable incidents

---

## P3 — Conformity & 2nd Market (M8–M10)

**Deliverables**
- **CE marking** obtained (route: internal control under AI Act Art. 43 §2 if applicable, otherwise notified body)
- DE launch — start with 30 schools, ramp to 50
- Per-market DPIA + curriculum mapping
- Localisation cycle proven ≤ 6 weeks for DE

**Exit gate**
- CE marking in place
- DE: ≥ 50 schools live, KPIs trending in line with NL

---

## P4 — Scale-out (M10–M12)

**Deliverables**
- 3rd market launch (BE, PL or RO based on readiness)
- Cost optimisation pass (FinOps mode)
- Resilience: multi-region failover drill executed
- SOC2 Type II readiness (optional, for B2B sales)

**Exit gate**
- 3 markets live
- All 5 outcome KPIs on or ahead of plan
- Cost / learner / month within budget

---

## P5 — Steady-state (M12+)

- Continuous evaluation cycle (quarterly RAI re-evaluation)
- Content velocity ≥ X new units per week per market
- Annual AI Act post-market monitoring report
- Annual GDPR Art. 30 records review

---

## Critical-path dependencies

```
DPIA (M0–M2)  ──┐
                ├──► Pilot go-ahead (M5)
AI Act risk (M0–M2) ─┤
Landing zone (M0–M2) ┤
                     │
Federated runtime (M2–M4) ──► Learner model v0 (M5)
Glossaries (M0–M2) ──► Localisation v0 (M3)
Pedagogical sign-off (per feature) ──► RAI gate ──► Release
```
