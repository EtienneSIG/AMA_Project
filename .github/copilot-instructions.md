<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan
at specs/018-director-fabric-rayfin/plan.md.
<!-- SPECKIT END -->

# AMA_Project — LearnEU agent guidance

This repository is driven by **Spec Kit** (https://github.com/github/spec-kit).
Before writing or reviewing any code, read:

- `.specify/memory/constitution.md` — the seven non-negotiable principles
  (EU residency, GDPR Art. 8, EU AI Act high-risk, teacher-in-the-loop,
  pedagogical sign-off, outcome-contract, spec-driven delivery).
- `plan/00-program-charter.md` and `plan/04-compliance-eu-ai-act-gdpr.md`
  for the programme contract.
- `agents/*.chatmode.md` for the named accountable roles you must invoke
  (Program Orchestrator, EU AI Act CO, GDPR Children's Data Specialist,
  Privacy-Preserving ML Engineer, Learning Sciences, Localisation Lead,
  Responsible AI Evaluator, Cross-Agent QA Verifier, Demo Deployment Agent).

## Spec-driven workflow (mandatory)

Every change goes through Spec Kit slash commands, in this order:

1. `/speckit.constitution` — only to amend `.specify/memory/constitution.md`.
2. `/speckit.specify` — produces `specs/<NNN-feature>/spec.md`.
3. `/speckit.clarify` — resolves every `[NEEDS CLARIFICATION]` marker.
4. `/speckit.plan` — produces `specs/<NNN-feature>/plan.md` with the
   AI Act articles touched, DPIA delta and human-oversight surface.
5. `/speckit.checklist` — runs the GDPR / AI Act / RAI checklist.
6. `/speckit.tasks` — produces `specs/<NNN-feature>/tasks.md`, each task
   naming an accountable agent from `agents/`.
7. `/speckit.analyze` — confirms spec/plan/tasks alignment.
8. `/speckit.implement` — only after RAI Evaluator and Cross-Agent QA
   Verifier sign off.

For the demo deploy, follow the eight-step cycle in
`demo/feature/EXECUTION-PLAN.md` (schema → helpers → routes → UI → sync →
build → deploy → verify + commit). Never start a new feature on a red build.

## Hard constraints (reject prompts that violate any of these)

- EU regions only for any personal data; no cross-EU transfer.
- Default consent age = 16; under-16 flows require guardian consent.
- No facial / emotion recognition; no behavioural advertising; no
  autonomous grading.
- Every AI feature is high-risk: ship Annex IV fragment, logging, human
  oversight, transparency copy, and a teacher override.
- Pedagogical sign-off precedes technical sign-off.

## Repository layout you can rely on

- `.specify/` — Spec Kit core (templates, scripts, memory).
- `.github/prompts/` — installed `speckit.*` slash-command prompts.
- `specs/` — one folder per feature (`NNN-short-name/spec.md`, `plan.md`,
  `tasks.md`, `checklists/`).
- `plan/` — programme-level docs (charter, roadmap, compliance, KPIs…).
- `agents/` — role chat modes invoked during reviews.
- `demo/` — the deployable Azure demo (apps, infra, scripts, feature briefs).
- `restitution/` — final deck and storyboard.

## Commit conventions

Conventional Commits only: `feat(area): …`, `fix(area): …`,
`docs(area): …`, `compliance(area): …`. Feature branches are named
`NNN-short-name` and created by
`.specify/scripts/powershell/create-new-feature.ps1`.
