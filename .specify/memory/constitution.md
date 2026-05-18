# LearnEU Constitution

This constitution governs every artefact produced for the **LearnEU** programme
(Case Study 33 — AI-Driven Personalised Learning Platform for a European EdTech
Group). It is binding for human contributors and AI coding agents alike.
Whenever Spec Kit produces a spec, plan, task list, checklist or
implementation, it MUST be checked against the principles below.

Authoritative source documents:

- [Subject/case-study-33-edtech-personalised-learning.md](../../Subject/case-study-33-edtech-personalised-learning.md)
- [plan/00-program-charter.md](../../plan/00-program-charter.md)
- [plan/04-compliance-eu-ai-act-gdpr.md](../../plan/04-compliance-eu-ai-act-gdpr.md)
- [plan/05-kpis-outcomes.md](../../plan/05-kpis-outcomes.md)
- [plan/07-governance-rai.md](../../plan/07-governance-rai.md)

## Core Principles

### I. EU-Resident, Data-Minimised by Default (NON-NEGOTIABLE)

All personal data of learners, teachers and guardians is processed and stored
in **EU regions only**. Centralisation of children's personal data is
forbidden; prefer on-device, federated, or pseudonymised processing. Every
spec MUST state which data classes (PII, pseudonymous, telemetry, content) it
touches and justify why each one is needed. No cross-border transfer outside
the EU. No third-party SDK that exfiltrates learner data.

### II. GDPR Article 8 First (Children's Data)

The platform treats every end user as a minor unless proven otherwise.
Digital-consent age defaults to **16** (strictest of the five markets).
Parental/guardian consent flows, age-gating, and a working data-subject
rights surface (access, rectification, erasure) are part of the definition
of "done" for any learner-facing feature. A DPIA delta is updated and signed
off by the DPO before release.

### III. EU AI Act High-Risk Discipline (NON-NEGOTIABLE)

Adaptive learning, automated assessment and content localisation are
classified **high-risk** under Annex III §3. Every AI feature MUST ship with:
a risk-management entry (Art. 9), data-governance evidence (Art. 10), an
Annex IV technical-file fragment, logging hooks (Art. 12), transparency
copy for learners and teachers (Art. 13), a documented human-oversight
control (Art. 14), and accuracy/robustness/cybersecurity evidence (Art. 15).
Facial recognition, emotion recognition and any prohibited practice listed
in Art. 5 are out of scope and MUST NOT be added.

### IV. Teacher-in-the-Loop, No Autonomous Decisions

No AI output may directly affect a learner's grade, level, placement or
content access without a teacher review surface able to override it. Every
spec involving recommendations or assessment MUST describe the teacher
override path and persist the override for audit. Learners and parents must
be able to see, in plain language, why a recommendation was made.

### V. Pedagogical Sign-Off Before Technical Sign-Off

Every learner-facing feature MUST be reviewed by the Learning Sciences
specialist for ZPD-fit, formative-assessment alignment and Universal Design
for Learning before any architecture or implementation work is approved.
"Engagement" metrics alone never justify a release.

### VI. Outcome-Contract Driven

The case-study outcome contract is the single source of truth for "success":

| KPI | Target |
|---|---|
| Outcome gap (high vs low schools) | **−26%** |
| Teacher administrative time | **−45%** |
| Localisation cycle (months → weeks) | **12 → 6** |
| GDPR Art. 8 compliance | **100% maintained** |
| EU AI Act conformity | **CE-marked before go-live** |

Every spec MUST map at least one Success Criterion (SC-###) to one of these
KPIs. Features that do not move the contract are de-prioritised.

### VII. Reproducible, Spec-Driven Delivery

All work flows through Spec Kit: `/speckit.constitution` →
`/speckit.specify` → `/speckit.clarify` → `/speckit.plan` →
`/speckit.tasks` → `/speckit.analyze` → `/speckit.implement`. Specs,
plans and tasks live under `specs/<NNN-feature-name>/` and are committed
**before** the corresponding code. The demo MUST be re-deployable from a
clean tenant by following `plan/09-step-by-step-tutorial.md` and
`demo/DEPLOYMENT-TUTORIAL.md` end-to-end.

## Compliance & Security Constraints

- Data residency: West Europe / North Europe Azure regions only.
- Identity: Azure AD B2C with guardian-consent flow for under-16 accounts.
- Network: APIM in front of every AI endpoint; Azure Content Safety on every
  learner-visible generated text; private endpoints for data stores.
- Model governance: model cards, evaluation reports and bias scans for every
  released model version; Responsible AI Council gate before promotion.
- Observability: structured logs for every AI inference (prompt-hash, model
  version, safety verdict, user role — never raw learner PII).
- Prohibited: behavioural advertising, commercial profiling, facial/emotion
  recognition, cross-EU data transfers, autonomous grading.

## Development Workflow & Quality Gates

1. **Spec** — `specs/<NNN-feature-name>/spec.md` (`/speckit.specify`).
   No tech choices in the spec; user stories prioritised P1/P2/P3, each
   independently testable; Success Criteria tied to the outcome contract.
2. **Clarify** — `/speckit.clarify` to resolve every `[NEEDS CLARIFICATION]`
   marker before planning. Open clarifications block planning.
3. **Plan** — `specs/<NNN-feature-name>/plan.md` (`/speckit.plan`). MUST list
   the EU AI Act articles touched, the DPIA delta, and the human-oversight
   surface.
4. **Checklist** — `/speckit.checklist` runs the GDPR/AI-Act/RAI checklist
   from `.specify/templates/checklist-template.md`. All items green or
   explicitly waived by the named accountable role.
5. **Tasks** — `/speckit.tasks`. Each task names an accountable agent from
   `agents/` (e.g. `gdpr-children-data-specialist`, `responsible-ai-evaluator`).
6. **Analyze** — `/speckit.analyze` to confirm spec/plan/tasks alignment.
7. **Implement** — `/speckit.implement` only after the Responsible AI
   Evaluator and the Cross-Agent QA Verifier sign off.
8. **Deploy & verify** — follow the eight-step cycle in
   `demo/feature/EXECUTION-PLAN.md` (schema → helpers → routes → UI → sync →
   build → deploy → verify + commit). No feature is "done" without a green
   authenticated smoke test.

Branching: one feature = one branch `NNN-short-name` created by
`.specify/scripts/powershell/create-new-feature.ps1`. Commits MUST be
conventional (`feat(...):`, `fix(...):`, `docs(...):`, `compliance(...):`).

## Governance

This constitution supersedes ad-hoc practice. Amendments require:

1. A pull request modifying this file with a clear rationale.
2. Approval from the Program Orchestrator, the EU AI Act Compliance Officer
   and the GDPR Children's Data Specialist (three named roles in `agents/`).
3. Update of the version block below and a migration note in
   `plan/06-risks-register.md` if any previously-shipped feature is now
   non-compliant.

All pull requests MUST verify compliance with the seven core principles in
their description. The Cross-Agent QA Verifier blocks merges that do not.
Use `.github/copilot-instructions.md` for day-to-day agent guidance and the
`agents/*.chatmode.md` files for role-specific reviews.

**Version**: 1.0.0 | **Ratified**: 2026-05-18 | **Last Amended**: 2026-05-18
