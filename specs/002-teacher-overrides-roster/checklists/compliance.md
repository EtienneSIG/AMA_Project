# Compliance Checklist: Teacher Overrides Audit Trail & Pseudonymous Class Roster

**Purpose**: GDPR Art. 8 + EU AI Act high-risk + Responsible AI checks for
feature `002-teacher-overrides-roster` before any code is merged.
**Created**: 2026-05-18
**Feature**: [spec.md](../spec.md) · [plan.md](../plan.md) · [tasks.md](../tasks.md)

## EU AI Act (high-risk, Annex III §3)

- [ ] CHK001 Risk-management entry added to `plan/06-risks-register.md`
  ("AI mastery rating miscalibrated") with the override as mitigation
  (Art. 9). *(owner: eu-ai-act-compliance-officer)*
- [ ] CHK002 Data-governance evidence: no new personal-data class
  collected; `teacher_overrides` covered by the existing teacher-action
  retention policy (Art. 10). *(owner: gdpr-children-data-specialist)*
- [ ] CHK003 Annex IV fragment drafted and appended to
  `plan/04-compliance-eu-ai-act-gdpr.md` (Art. 11). *(owner: eu-ai-act-compliance-officer)*
- [ ] CHK004 Structured audit log lines emitted on every write and read,
  PII-free, retained 12 months in Log Analytics EU (Art. 12). *(owner: privacy-preserving-ml-engineer)*
- [ ] CHK005 Transparency copy in the override modal explains override
  consequences and audit visibility (Art. 13). *(owner: eu-ai-act-compliance-officer + content-localisation-lead)*
- [ ] CHK006 Human oversight surface implemented end-to-end:
  pencil → modal → submit → mastery read reflects override (Art. 14). *(owner: learning-sciences-expert + privacy-preserving-ml-engineer)*
- [ ] CHK007 Accuracy / robustness / cybersecurity: server-side role
  gate, idempotency key, contract test on roster shape (Art. 15). *(owner: cross-agent-qa-verifier)*
- [ ] CHK008 No Art. 5 prohibited practice introduced (no emotion
  recognition, no social scoring, no biometric categorisation). *(owner: eu-ai-act-compliance-officer)*

## GDPR Article 8 & children's data

- [ ] CHK010 DPIA delta recorded in `plan.md` (purpose, retention,
  access scope, DSAR path). *(owner: gdpr-children-data-specialist)*
- [ ] CHK011 Roster response shape strictly `pseudonym`, `progress_pct`,
  `last_active_at`, `pending_questions` — automated contract test in
  `acceptance_tests.ps1`. *(owner: cross-agent-qa-verifier)*
- [ ] CHK012 Automated PII scan run on a recorded roster response
  (no email, no first name from the synthetic set, no birth date). *(owner: gdpr-children-data-specialist)*
- [ ] CHK013 Right-to-erasure preserved: audit entry on a deleted
  learner pseudonymises the learner reference (no resurrection of
  identifying data). *(owner: gdpr-children-data-specialist)*
- [ ] CHK014 No new outbound network call; no new third-party SDK;
  data stays West-Europe. *(owner: privacy-preserving-ml-engineer)*

## Responsible AI

- [ ] CHK020 Bias / fairness review: monitor override acceptance rate
  per teacher cohort to detect systematic disagreement with the AI on
  protected sub-populations (proxy: school SES band, language). *(owner: responsible-ai-evaluator)*
- [ ] CHK021 Model card / feature card updated to mention the override
  surface as the primary safety net. *(owner: responsible-ai-evaluator)*
- [ ] CHK022 Release gate signed off in writing before T047 commit. *(owner: responsible-ai-evaluator)*

## Pedagogical sign-off

- [ ] CHK030 Four-level vocabulary (Beginner / Practising / Proficient /
  Mastered) validated against ZPD framing. *(owner: learning-sciences-expert)*
- [ ] CHK031 Override modal copy reviewed for clarity to a teacher who
  has not been trained on AI Act vocabulary. *(owner: learning-sciences-expert)*

## Localisation & accessibility

- [ ] CHK040 All new UI strings translated to NL, DE, PL, RO, FR-BE
  via the existing pipeline. *(owner: content-localisation-lead)*
- [ ] CHK041 Modal is keyboard-reachable, focus-trapped, announced by
  screen readers; level select is a real `<select>` with a `<label>`. *(owner: edtech-program-orchestrator)*

## Cross-Agent QA gate

- [ ] CHK050 All probes in `demo/scripts/acceptance_tests.ps1` pass on
  the deployed instance. *(owner: cross-agent-qa-verifier)*
- [ ] CHK051 No new GDPR / AI Act finding in the QA report. *(owner: cross-agent-qa-verifier)*
- [ ] CHK052 Conventional-commit message ready: `feat(teacher): overrides
  audit trail and pseudonymous roster`. *(owner: cross-agent-qa-verifier)*

## Notes

- Check items off as completed: `[x]`.
- Each unchecked CHK with a non-null owner blocks the
  Responsible AI release gate (CHK022) and the final commit (CHK052).
- Waivers MUST be documented inline and signed by the named owner.
