# Compliance Checklist: Autoscale Load Test for learner-web

**Purpose**: GDPR / EU AI Act / RAI gate before tasks merge.
**Created**: 2026-05-22
**Feature**: [spec.md](../spec.md) · [plan.md](../plan.md)
**Accountable signatories**: Demo Deployment Agent, Cross-Agent QA Verifier,
EU AI Act CO (light-touch).

## Safety & data

- [ ] CHK001 Script refuses production-slot names (FR-008). Unit test in `tests/unit/load-test-no-prod.test.ts`. — **Demo Deployment Agent**
- [ ] CHK002 Synthetic traffic contains no PII; no fields resemble learner identifiers (FR-009). — **Demo Deployment Agent**
- [ ] CHK003 EU North dev slot only; no cross-region traffic. — **Demo Deployment Agent**

## EU AI Act — robustness

- [ ] CHK004 Art. 15: report verdict references the Bicep autoscale rule on FAIL. — **EU AI Act CO**
- [ ] CHK005 Annex IV §"Operational resilience" updated with a link to the latest report. — **EU AI Act CO**

## Reproducibility & evidence

- [ ] CHK006 Deterministic seed captured in `manifest.json` (FR-010). — **Demo Deployment Agent**
- [ ] CHK007 KQL query `demo/observability/autoscale-events.kql` reproduces the events for any given window. — **Demo Deployment Agent**
- [ ] CHK008 Report contains all required sections (FR-005). — **Cross-Agent QA Verifier**
- [ ] CHK009 Section #11 of next `Subject/AMA_Rubric_Evaluation.md` cites the report. — **Cross-Agent QA Verifier**

## Cross-cutting

- [ ] CHK010 Branch `011-autoscale-load-test`; commits Conventional. — **EdTech Program Orchestrator**
- [ ] CHK011 `/speckit.analyze` clean. — **Cross-Agent QA Verifier**
- [ ] CHK012 Row added to `demo/DEPLOYMENT-REPORT.md` "operational resilience" section, flipped to PASS on first green run. — **Demo Deployment Agent**

## Notes

- Items waived MUST cite the named accountable role and a one-line rationale.
- Any item flipped to **FAIL** blocks the rubric-defence claim.
