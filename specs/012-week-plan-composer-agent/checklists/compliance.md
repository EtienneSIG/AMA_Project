# Compliance Checklist: Week-Plan Composer Agent

**Purpose**: GDPR / EU AI Act / RAI gate before tasks merge.
**Created**: 2026-05-22
**Feature**: [spec.md](../spec.md) · [plan.md](../plan.md)
**Accountable signatories**: EU AI Act CO, GDPR Children's Data Specialist,
Privacy-Preserving ML Engineer, Learning Sciences Expert, Responsible AI
Evaluator, Cross-Agent QA Verifier.

## GDPR & data minimisation

- [ ] CHK001 Consent withdrawal (spec 008 capability flag) hard-gates the agent (FR-010). Test in `tests/unit/week-plan-no-pii.test.ts`. — **GDPR Children's Data Specialist**
- [ ] CHK002 No raw learner PII in any AOAI payload — pseudonymous learner id + mastery vector + chapter labels only (FR-003). — **Privacy-Preserving ML Engineer**
- [ ] CHK003 AI Search index contains curriculum content only; no learner record indexed. — **Privacy-Preserving ML Engineer**
- [ ] CHK004 DPIA delta merged in `demo/compliance/dpia-learnEU-v1.md` §"Week-Plan Composer". — **GDPR Children's Data Specialist**

## EU AI Act — high-risk runtime surface

- [ ] CHK005 Art. 9: risk-register row "week-plan-composer-012" lists auto-pause as mitigation. — **EU AI Act CO**
- [ ] CHK006 Art. 10: AI Search index header documents corpus provenance. — **EU AI Act CO**
- [ ] CHK007 Art. 12: every run logs tool sequence, model version, prompt hash, Content Safety verdict, cohort keys (FR-011); every decision logs actor + timestamp + edits + comment (FR-006). — **EU AI Act CO**
- [ ] CHK008 Art. 13: published plan card shows teacher attribution + `accepted_at` (FR-008). — **EU AI Act CO**
- [ ] CHK009 Art. 14: server-side teacher gate (`POST /api/week-plan/propose` refuses persist without `teacher_approved=true`, FR-005); contract test enforces it. — **EU AI Act CO**
- [ ] CHK010 Art. 15: release-gate auto-pause on override > 10 %, safety > 0.1 %, cohort disparity > 5 pp (FR-009); pause is non-overridable in code; resume recorded in `week_plan_pauses`. — **Responsible AI Evaluator**
- [ ] CHK011 Annex IV fragment `demo/compliance/annex-iv/week-plan-composer.md` covers system description, intended purpose, risk mitigation, oversight, post-market monitoring. — **EU AI Act CO**

## Responsible AI — release gates

- [ ] CHK012 Override rate measured per cohort and surfaced in the fairness dashboard (spec 010). — **Responsible AI Evaluator**
- [ ] CHK013 Safety violation rate measured over rolling 1 000 proposals. — **Responsible AI Evaluator**
- [ ] CHK014 Per-cohort acceptance disparity computed using the spec 010 disparity calculation (single source of truth). — **Responsible AI Evaluator**
- [ ] CHK015 Auto-pause notification reaches the Responsible AI Evaluator within ≤ 5 min of breach. — **Responsible AI Evaluator**

## Pedagogy

- [ ] CHK016 ZPD targeting at P=0.7 designed and reviewed by Learning Sciences. — **Learning Sciences Expert**
- [ ] CHK017 Rationale text reviewed for clarity at CEFR A2 in every supported language. — **Learning Sciences Expert**

## Cross-cutting

- [ ] CHK018 Branch `012-week-plan-composer-agent`; commits Conventional. — **EdTech Program Orchestrator**
- [ ] CHK019 Eight-step deploy cycle respected. — **Demo Deployment Agent**
- [ ] CHK020 `/speckit.analyze` clean across spec / plan / tasks. — **Cross-Agent QA Verifier**
- [ ] CHK021 `restitution/slides/slide-09-autonomy.md` updated to reference the agent surface. — **Demo Deployment Agent**
- [ ] CHK022 Row added to `demo/DEPLOYMENT-REPORT.md` "week-plan-composer-012" flipped to PASS with authenticated green smoke. — **Cross-Agent QA Verifier**

## Notes

- Items waived MUST cite the named accountable role and a one-line rationale.
- Any item flipped to **FAIL** blocks `/speckit.implement` and the eight-step
  deploy cycle.
- This checklist is the evidence pack cited by sections #9 and #12 of the
  next `Subject/AMA_Rubric_Evaluation.md`.
