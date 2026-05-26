# LearnEU — CXO Pitch · Slide-by-slide story

> This document captures the **storytelling arc** of the 21-slide restitution.
> Use it as a cheat-sheet to understand the narrative before presenting.
> French version: `pitch.md`.

---

## Narrative arc in 4 acts

| Act | Slides | Key message |
|---|---|---|
| **I — Why now** | 01 → 04 | The gap is a delivery problem, not a content problem. Compliance is our competitive moat. |
| **II — What we sign for** | 05 → 07 | Four contractual numbers. Three personas, three quantified wins. |
| **III — How we get there** | 08 → 18 | One platform, three AIs, zero data leaving the EU. Trust, adoption, delivery. |
| **IV — What we ask** | 19 → 21 | Six managed risks, one board dashboard, three decisions today. |

---

## Slide by slide

### Act I — Why now

**Slide 01 · Title — "4.1 million kids. One promise."**
Emotional opening. We frame the scope: personalise, protect minors' privacy, stay European end-to-end. Not slideware — a real slice deployed on Azure West Europe.

**Slide 02 · Executive Summary — "What we sign for"**
Four numbers, one contract, zero excuses:
- **4.1M** EU learners (NL · BE · DE · PL · RO)
- **−26pp** outcome-gap closed in 12 months
- **−45%** teacher administrative time returned
- **100%** GDPR Art. 8 + AI Act CE-marked compliance

> *If you only remember one slide, this is the one.*

**Slide 03 · The gap — "Same content. Different kids. 40-point gap."**
A factual observation: 40-point spread between best and worst-performing schools on identical content. This is not a content quality issue — it is a **delivery** issue. Personalisation refuses that fatality.

**Slide 04 · Strategic thesis — "Compliance is the moat."**
> *"Compliance is not a tax on the product. It is the product."*

From 2027, European ministries will only buy EU-resident, AI Act-compliant educational AI. No one ticks both boxes today. Window: 18–24 months.

---

### Act II — What we sign for

**Slide 05 · Outcome contract — "−26% · −45% · 12mo → 6wk · 100% GDPR"**
Four numbers pulled verbatim from the case study. Every month, we report the trajectory to the board — not only at end-of-programme.

**Slide 06 · Value at stake — "€55M annual run-rate value"**
Breakdown: €28M teacher productivity + €18M market ARR + €9M retention. Investment €18–22M → payback ≤ 24 months with 3 markets live.

**Slide 07 · Three personas — "Lucas, Mr Klein, Sophie"**
- **Lucas** (12-year-old, DE): content calibrated to his zone of maximum progress (P-correct ≈ 0.7), formative feedback, never punitive grading.
- **Mr Klein** (teacher): 45% less admin, every AI hint explainable and revocable in one click.
- **Sophie** (mother): native-language portal, GDPR Art. 8 controls as hero, human teacher decides — by contract.

---

### Act III — How we get there

**Slide 08 · Solution on a page — "One platform. Three AIs. Zero data leaving the EU."**
Three AI capabilities (adaptive, localisation, assessment) on 8 Azure services, all in EU regions. Key point: minor data does **not** leave the device by default (on-device ONNX, federated learning, differential privacy, Confidential Computing).

**Slide 09 · Compliance posture — "Compliance is a release gate."**
Not an end-of-programme deliverable. GDPR: align to the strictest country (NL — 16 years), DPIA per market in Phase 0, minimisation by design. AI Act: everything high-risk by default, Annex IV file built feature by feature, CE-marking before Phase 3 exits.

**Slide 10 · Responsible AI — "No autonomous decision touches a learner. Ever."**
The model proposes, the teacher validates or overrides in one click. Override traced in App Insights. Override rate = KPI (target ≤ 10%). RAI gate at every release: fairness, calibration, safety, transparency. Per-cohort disparity is *blocking*.

**Slide 11 · Data strategy — "Less data. Better governed. Never re-identifiable."**
Zero PII in Gold aggregates. 30-day erasure SLA (automated). 100% customer-managed keys. 3 EU regions. Microsoft Purview holds the catalog with a "Child Personal Data — Restricted" label. Azure Policy blocks any resource deployed outside EU or without CMK.

**Slide 12 · Security & EU residency — "EU only. By design. By contract."**
Zero-trust end-to-end. Private Endpoints everywhere. CMK on all storage and AI services. Confidential Computing for re-identifiable workloads. 3 EU regions + DR. Quarterly sub-processor verification. Immutable WORM logs = AI Act Art. 12 evidence.

**Slide 13 · Teacher experience — "Teachers are the product team."**
20 NL pilot schools co-designing from Phase 0 (not final validation). The Teacher Council holds a pedagogical veto on every release. Override rate tracked as a trust signal. 90 minutes onboarding, one CSM per market, CPD credits.

**Slide 14 · Market & localisation — "5 markets. One pipeline. 6 weeks each."**
NL (M5, 20 schools) → DE (M8, 50+ schools, CE-marked) → BE/PL/RO (M10, picked on ministry traction). Pipeline: glossaries in P0 → Azure OpenAI + AI Search grounded on national curriculum → mandatory human reviewer. Target: 80% first-pass acceptance.

**Slide 15 · Operating model — "Two councils. Nine agents. One chain."**
Monthly Steering Committee (KPI/risk/budget). Bi-weekly Responsible AI Council (release gates). Architecture Review Board. Teacher Council per release. 9 specialist agents with named accountability. The cross-agent QA = internal auditor.

**Slide 16 · Roadmap — "5 phases. 12 months. Every gate is a hard stop."**
P0–P1 (M0–M5): foundations + MVP + DPIA + landing zone. P2 (M5–M8): NL pilot 20 schools. P3 (M8–M10): CE-marked + DE launch. P4 (M10–M12): 3rd market + DR drill. No additional market until the previous one is on KPI trajectory.

**Slide 17 · Live demo — "7 minutes. Three personas. One backend. West Europe."**
Pre-flight: 3 green pills. Teacher Console (Mr Klein, remediation plan for Lucas). Learner Web (ONNX picker, P-correct ≈ 0.7). Parent Portal (GDPR Art. 8 hero, German-language reply). Admin Console (Activity + Safety panels, live audit trail). If a pill drops, we narrate — no hidden fallback mode.

**Slide 18 · Investment & FinOps — "Predictable. Optimised. Sustainable."**
€18–22M build over 12 months (45% platform, 30% AI, 25% compliance/UX). €6M/year steady-state run (55% Azure, 35% people, 10% sub-proc). Payback ≤ 24 months. €2M contingency on R8 (OpenAI cost). Cost/learner/month = board KPI.

---

### Act IV — What we ask

**Slide 19 · Risks — "Top 6 risks. Owned. Mitigated. Contingent."**
R1: DPA blocks DPIA → engage from M0. R3: federated learning fails to converge → DP central fallback. R4: localisation quality drift → reviewer never optional. R6: bias disparity > 5pp → blocking release gate + rollback. R8: OpenAI cost → PTUs + cache + €2M reserve.

**Slide 20 · Board dashboard — "What the board sees. Every month."**
5 outcome KPIs (K1–K5) + adoption. Compliance posture (DPIA freshness, erasure SLA, Annex IV coverage, overrides, incidents). Heat-map of the 6 top risks. Cost/learner/month + carbon proxy. If a tile goes red, the board sees it before the programme does.

**Slide 21 · The ask — "Three decisions. Today."**
1. **Mandate the DPIAs** across the 5 countries → unlocks Phase 0.
2. **Release €3.5M** for Phase 0 (landing zone, DPIAs, Annex IV skeleton).
3. **Name the Responsible AI Council chair** at the next steering.
4. Endorse the outcome contract as board-scorecard KPIs.
5. Confirm NL → DE sequencing; markets 3–5 decided at the M10 gate.

---

## Closing line

> **"Personalised. Private. European."**
