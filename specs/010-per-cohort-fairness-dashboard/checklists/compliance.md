# Compliance Checklist: Per-Cohort Fairness Dashboard

**Purpose**: GDPR / EU AI Act / RAI gate before tasks merge.
**Created**: 2026-05-22
**Feature**: [spec.md](../spec.md) · [plan.md](../plan.md)
**Accountable signatories**: Responsible AI Evaluator, EU AI Act CO,
GDPR Children's Data Specialist, Cross-Agent QA Verifier.

## Data minimisation & re-identification risk

- [ ] CHK001 Cohorts with `n < 10` suppressed; suppression visible (FR-005). — **GDPR Children's Data Specialist**
- [ ] CHK002 Page exposes aggregates only — no individual-level data in DOM or CSV (FR-008). — **GDPR Children's Data Specialist**
- [ ] CHK003 Gender axis collapses gracefully if the column is unavailable (Assumption A1). — **Privacy-Preserving ML Engineer**
- [ ] CHK004 EU-only data path inherited from existing admin app. — **Demo Deployment Agent**

## EU AI Act — high-risk obligations

- [ ] CHK005 Art. 9: new monitoring surface noted in `demo/compliance/risk-register.md` row "fairness-010". — **EU AI Act CO**
- [ ] CHK006 Art. 12: CSV export carries `window_start`, `window_end`, `exported_at`. — **EU AI Act CO**
- [ ] CHK007 Art. 13: red-flag banner references the RAI release-gate threshold (5 pp). — **EU AI Act CO**
- [ ] CHK008 Art. 15: deterministic CSV verified; KQL workbook reproduces the same numbers. — **Responsible AI Evaluator**
- [ ] CHK009 Annex IV: dashboard + CSV format documented under §"Fairness monitoring". — **EU AI Act CO**

## Responsible AI

- [ ] CHK010 Cohort axes (country, language, SEN, gender) approved as fair-impact dimensions. — **Responsible AI Evaluator**
- [ ] CHK011 Banner copy reviewed for clarity and absence of false reassurance. — **Responsible AI Evaluator**
- [ ] CHK012 Release-gate process documents that any red banner blocks release until investigation. — **Responsible AI Evaluator**

## Cross-cutting

- [ ] CHK013 Branch `010-per-cohort-fairness-dashboard`; commits Conventional. — **EdTech Program Orchestrator**
- [ ] CHK014 Eight-step deploy cycle respected. — **Demo Deployment Agent**
- [ ] CHK015 `/speckit.analyze` clean. — **Cross-Agent QA Verifier**
- [ ] CHK016 Section #7 of next `Subject/AMA_Rubric_Evaluation.md` cites this dashboard. — **Cross-Agent QA Verifier**

## Notes

- Items waived MUST cite the named accountable role and a one-line rationale.
- Any item flipped to **FAIL** blocks `/speckit.implement`.
