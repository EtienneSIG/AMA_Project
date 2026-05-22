# Compliance Checklist: Learner Tabbed Workspace & Per-Chapter Progress

**Purpose**: GDPR / EU AI Act / Responsible AI gate for spec 001 before tasks merge.
**Created**: 2026-05-22
**Feature**: [spec.md](../spec.md) · [plan.md](../plan.md)
**Accountable signatories**: EU AI Act Compliance Officer, GDPR Children's
Data Specialist, Responsible AI Evaluator, Cross-Agent QA Verifier.

## GDPR — children's data (Art. 8) & data minimisation

- [ ] CHK001 No new personal-data category introduced (confirmed against
      `demo/compliance/dpia-learnEU-v1.md` §"Data inventory"). — **GDPR Children's Data Specialist**
- [ ] CHK002 Consent ledger and age-16 default unchanged; parental consent
      flow not impacted by tab redesign. — **GDPR Children's Data Specialist**
- [ ] CHK003 `skills.chapter` is curriculum metadata only (no learner PII)
      and is back-filled from `demo/data/skills.csv` (no external source). — **Privacy-Preserving ML Engineer**
- [ ] CHK004 No new outbound network call; AI-tutor and Sheets continue to
      route through APIM (FR-010). — **Privacy-Preserving ML Engineer**

## EU AI Act — high-risk obligations

- [ ] CHK005 Annex IV technical file (`demo/compliance/annex-iv/`) reviewed:
      no new model or training data → no fragment change required. — **EU AI Act CO**
- [ ] CHK006 Art. 12 record-keeping: existing prompt-hash + safety-verdict
      logging path covers the redesigned UI (no new inference). — **EU AI Act CO**
- [ ] CHK007 Art. 13 transparency: every new learner-visible string has
      reviewed copy in NL, DE, PL, RO, FR-BE before market release. — **Content Localisation Lead**
- [ ] CHK008 Art. 14 oversight: the "Ask your teacher" tab does not bypass
      the teacher review queue; bookmark action only flags an *existing*
      teacher answer for the learner's Sheets. — **EU AI Act CO**
- [ ] CHK009 Art. 15 robustness: empty-state, null-chapter fallback, slow
      network (debounced tab switch) and keyboard-only navigation tested. — **Responsible AI Evaluator**

## Responsible AI — fairness & pedagogy

- [ ] CHK010 Pedagogical sign-off on chapter framing recorded in
      `demo/compliance/pedagogy-signoffs/001-tabbed-workspace.md`. — **Learning Sciences Expert**
- [ ] CHK011 No new ML decision is taken at tab-switch time (no implicit
      ranking, no personalised re-ordering of skills). — **Responsible AI Evaluator**
- [ ] CHK012 Per-cohort smoke run shows zero new violations vs the pre-redesign
      baseline (existing Content Safety + override-rate dashboards). — **Responsible AI Evaluator**

## Cross-cutting

- [ ] CHK013 Branch is `001-learner-tabbed-workspace`; commits are
      Conventional (`feat(learner): …`, `compliance(learner): …`). — **EdTech Program Orchestrator**
- [ ] CHK014 Eight-step deploy cycle (`demo/feature/EXECUTION-PLAN.md`) is
      respected: schema → helpers → routes → UI → sync → build → deploy →
      verify + commit. — **Demo Deployment Agent**
- [ ] CHK015 `/speckit.analyze` returns no critical contradictions across
      spec.md, plan.md, tasks.md. — **Cross-Agent QA Verifier**
- [ ] CHK016 Final sign-off recorded in `demo/DEPLOYMENT-REPORT.md` row
      "001-learner-tabbed-workspace" with a green authenticated smoke. — **Cross-Agent QA Verifier**

## Notes

- Items waived MUST cite the named accountable role and a one-line rationale.
- Any item flipped to **FAIL** blocks `/speckit.implement` and the eight-step
  deploy cycle.
- This checklist is the evidence pack referenced by section #12 of the next
  `Subject/AMA_Rubric_Evaluation.md`.
