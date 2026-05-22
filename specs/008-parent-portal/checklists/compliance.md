# Compliance Checklist: Parent Portal — GDPR Art. 8 Guardian Consent

**Purpose**: GDPR / EU AI Act / RAI gate before tasks merge.
**Created**: 2026-05-22
**Feature**: [spec.md](../spec.md) · [plan.md](../plan.md)
**Accountable signatories**: GDPR Children's Data Specialist, EU AI Act CO,
Privacy-Preserving ML Engineer, Responsible AI Evaluator, Cross-Agent QA
Verifier.

## GDPR — children's data (Art. 8) & lawful basis

- [ ] CHK001 Lawful basis recorded in DPIA delta: guardian consent (Art. 6(1)(a)) + parental responsibility for Art. 8 over-ride of the age-16 default. — **GDPR Children's Data Specialist**
- [ ] CHK002 Under-13 server-side floor enforced regardless of toggle state (FR-012). Test in `demo/tests/unit/parent-portal-under13-floor.test.ts`. — **GDPR Children's Data Specialist**
- [ ] CHK003 Consent ledger is append-only and chained (`prev_entry_hash`); retention = 7 years; pseudonymous child IDs. — **GDPR Children's Data Specialist**
- [ ] CHK004 No learner free-text, no learner inference output, no learner messages rendered in the parent UI (FR-007). — **Privacy-Preserving ML Engineer**

## EU AI Act — high-risk obligations

- [ ] CHK005 Art. 9: net risk reduction documented in `demo/compliance/risk-register.md` row "parent-portal-008". — **EU AI Act CO**
- [ ] CHK006 Art. 12: every consent state change logged with actor, timestamp, chained hash, child pseudonym (FR-008). — **EU AI Act CO**
- [ ] CHK007 Art. 13: plain-language consent modal reviewed in NL, DE, PL, RO, FR-BE before each market release (FR-009). — **Content Localisation Lead**
- [ ] CHK008 Art. 14: teacher-console notification on every consent change; teacher override semantics preserved. — **EU AI Act CO**
- [ ] CHK009 Annex IV technical file updated under §"Parent Portal" with the new processing flow. — **EU AI Act CO**

## Privacy-preserving ML

- [ ] CHK010 No PII transits any AI prompt as a result of a parent action (audited via prompt-hash sampling). — **Privacy-Preserving ML Engineer**
- [ ] CHK011 Capability flag served from server only — never trusted from client (a withdrawn-consent learner cannot bypass via client tampering). — **Privacy-Preserving ML Engineer**
- [ ] CHK012 No new third-party SDK; no behavioural-advertising or analytics pixel (FR-010). — **Privacy-Preserving ML Engineer**

## Responsible AI

- [ ] CHK013 Per-cohort impact assessed: withdrawal MUST NOT introduce a disparate-impact pattern (track withdrawal rate by Country/Language and surface in the fairness dashboard — feature 010). — **Responsible AI Evaluator**
- [ ] CHK014 Consent UX strings reviewed for clarity at CEFR A2 in every supported language. — **Responsible AI Evaluator**

## Cross-cutting

- [ ] CHK015 Branch `008-parent-portal`; commits Conventional. — **EdTech Program Orchestrator**
- [ ] CHK016 Eight-step deploy cycle respected (`demo/feature/EXECUTION-PLAN.md`). — **Demo Deployment Agent**
- [ ] CHK017 `/speckit.analyze` clean across spec / plan / tasks. — **Cross-Agent QA Verifier**
- [ ] CHK018 Row in `demo/DEPLOYMENT-REPORT.md` for "008-parent-portal" flipped to PASS with green authenticated smoke. — **Cross-Agent QA Verifier**

## Notes

- Items waived MUST cite the named accountable role and a one-line rationale.
- Any item flipped to **FAIL** blocks `/speckit.implement`.
- This checklist is the evidence pack cited by sections #5 and #12 of the
  next `Subject/AMA_Rubric_Evaluation.md`.
