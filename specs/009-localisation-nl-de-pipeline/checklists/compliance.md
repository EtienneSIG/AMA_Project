# Compliance Checklist: Localisation NL→DE Pipeline

**Purpose**: GDPR / EU AI Act / RAI gate before tasks merge.
**Created**: 2026-05-22
**Feature**: [spec.md](../spec.md) · [plan.md](../plan.md)
**Accountable signatories**: Content Localisation Lead, Privacy-Preserving
ML Engineer, Responsible AI Evaluator, EU AI Act CO, Cross-Agent QA Verifier.

## Data governance & PII isolation

- [ ] CHK001 Pipeline payloads contain curriculum content only; contract test `tests/contract/localisation-no-pii.test.ts` enforces it. — **Privacy-Preserving ML Engineer**
- [ ] CHK002 LearnEU glossary header documents corpus provenance (Art. 10). — **Content Localisation Lead**
- [ ] CHK003 All processing in EU North; APIM and AOAI endpoints pinned to EU regions. — **Privacy-Preserving ML Engineer**
- [ ] CHK004 No new outbound call beyond the existing APIM → AOAI path. — **Demo Deployment Agent**

## EU AI Act — high-risk obligations

- [ ] CHK005 Art. 12: prompt hash, model version, safety verdict logged for every translation call. — **EU AI Act CO**
- [ ] CHK006 Art. 13: published DE artefact carries `provenance` block (source unit id, model version, reviewer id, accepted_at). — **EU AI Act CO**
- [ ] CHK007 Art. 14: reviewer queue is mandatory; `safety_rejected` jobs never reach reviewers; separation of duties enforced (FR-010). — **EU AI Act CO**
- [ ] CHK008 Art. 15: post-publish glossary-term linter catches violations before the artefact reaches `learner-web`. — **Responsible AI Evaluator**
- [ ] CHK009 Annex IV: pipeline overview + RUN report template appended under §"Localisation". — **EU AI Act CO**

## Responsible AI — translation quality

- [ ] CHK010 Translation quality benchmark: ≥ 95 % glossary-term fidelity on a held-out sample of 50 segments. — **Responsible AI Evaluator**
- [ ] CHK011 Reviewer training material updated to include glossary-diff interpretation. — **Content Localisation Lead**
- [ ] CHK012 Per-cohort impact considered: if the DE artefact has measurable disparate effect on the DE cohort vs control, escalate before market release. — **Responsible AI Evaluator**

## Cross-cutting

- [ ] CHK013 Branch `009-localisation-nl-de-pipeline`; commits Conventional. — **EdTech Program Orchestrator**
- [ ] CHK014 Eight-step deploy cycle respected for the demo run. — **Demo Deployment Agent**
- [ ] CHK015 `/speckit.analyze` clean. — **Cross-Agent QA Verifier**
- [ ] CHK016 `demo/DEPLOYMENT-REPORT.md` localisation row moves PARTIAL → PASS. — **Demo Deployment Agent**
- [ ] CHK017 `restitution/slides/slide-14-market-localisation.md` cites the RUN report. — **Demo Deployment Agent**

## Notes

- Items waived MUST cite the named accountable role and a one-line rationale.
- Any item flipped to **FAIL** blocks `/speckit.implement`.
- This checklist is the evidence pack cited by section #5 of the next
  `Subject/AMA_Rubric_Evaluation.md`.
