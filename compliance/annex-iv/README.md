# AI Act Annex IV — Consolidated Conformity Dossier

> **Purpose:** roll the **per-feature** Annex IV fragments up into a single technical file
> per high-risk AI system, as required before CE-marking (AI Act **Art. 11 + Annex IV**).
> Every LearnEU AI feature is treated as **high-risk** (Annex III §3 — education).
>
> This is an **index + consolidation** layer. The authoritative technical detail lives in the
> per-feature fragments linked below; this file assembles them into the Annex IV structure and
> tracks the CE-marking readiness of each system.

## High-risk AI systems in scope

| AI system | Feature | Per-feature Annex IV fragment | Status |
|---|---|---|---|
| Adaptive next-best-activity | 007 | [../../specs/007-adaptive-learning/checklists/annex-iv-fragment.md](../../specs/007-adaptive-learning/checklists/annex-iv-fragment.md) | 🟢 Fragment complete |
| Teacher-in-the-loop assessment | 008 | [../../specs/008-teacher-assessment/contracts/annex-iv-fragment.md](../../specs/008-teacher-assessment/contracts/annex-iv-fragment.md) | 🟢 Fragment complete |
| Curriculum localisation / CMS | 010 | [../../specs/010-cms-versioning/contracts/annex-iv-fragment.md](../../specs/010-cms-versioning/contracts/annex-iv-fragment.md) | 🟢 Fragment complete |
| Director / board reporting controls | 005 | covered in [../../specs/005-director-reporting-benchmarks/plan.md](../../specs/005-director-reporting-benchmarks/plan.md) + checklists | 🟡 Fragment to be extracted to `contracts/annex-iv-fragment.md` |
| AI tutor (video links / voice) | 015 / 016 | see specs 015, 016 checklists | 🟡 Fragment to be consolidated |

## Annex IV structure (programme-level, per system)

For each system above, the technical file MUST cover:

1. **General description** — intended purpose, provider, versions, deployment form. *(non-autonomous, teacher-in-the-loop by design)*
2. **Design specifications** — logic, key design choices, algorithms; what the system optimises and the assumptions. *(deterministic/rule-based where used at decision time; no covert profiling)*
3. **System architecture & resources** — components, compute, data flows *(EU-hosted Postgres, Azure OpenAI EU behind APIM, on-device/pseudonymous adaptive model)*.
4. **Data & data governance (Art. 10)** — training/validation/test provenance, data classes, pseudonymisation, bias controls.
5. **Human oversight (Art. 14)** — the teacher override surface, reasoning transparency, escalation, pause-on-override.
6. **Accuracy, robustness, cybersecurity (Art. 15)** — metrics, fallbacks, fail-closed behaviour, tests.
7. **Risk management system (Art. 9)** — hazard analysis, residual-risk decisions, monitoring.
8. **Record-keeping / logging (Art. 12)** — append-only audit tables, retention.
9. **Post-market monitoring plan (Art. 72)** — telemetry, incident reporting, periodic re-evaluation.

## CE-marking readiness checklist

- [ ] All in-scope systems have a **complete** Annex IV fragment (005, 015/016 pending extraction).
- [ ] Risk-management file (Art. 9) frozen per released version.
- [ ] Data-governance evidence (Art. 10) attached per system.
- [ ] Human-oversight design (Art. 14) verified by Responsible AI Evaluator.
- [ ] Post-market monitoring plan (Art. 72) signed by the EU AI Act Compliance Officer.
- [ ] Conformity assessment completed and **EU Declaration of Conformity** issued before Phase-3 exit.

## Owner & sign-off

- **Owner:** EU AI Act Compliance Officer ([../../agents/eu-ai-act-compliance-officer.chatmode.md](../../agents/eu-ai-act-compliance-officer.chatmode.md)).
- **Independent check:** Responsible AI Evaluator + Cross-Agent QA Verifier before any production release.
- **Programme narrative:** [../../plan/04-compliance-eu-ai-act-gdpr.md](../../plan/04-compliance-eu-ai-act-gdpr.md).
