# Tasks: Board FinOps & Governance Power BI Report (EULearn / Fabric)

**Feature**: `023-board-finops-governance-report` | **Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

Each task names the accountable agent (from `agents/`). Human sign-off gates are left **unchecked** until the named role approves.

## Phase 1 — Semantic model (board fixtures + measures)

- [X] **T001** [Demo Deployment Agent] Author `work/fabric/board-finops/semanticmodel/.platform` and `definition.pbism` (SemanticModel item, display name "LearnEU - Board FinOps & Governance").
- [X] **T002** [Demo Deployment Agent] Author `definition/model.tmdl` referencing the five fixture tables.
- [X] **T003** [Demo Deployment Agent] Author `tables/Monthly FinOps.tmdl` — inline `#table` (Month, Active Users, Cost EUR, Tokens) + measures: Total Cost (EUR), Active Users, **Cost per Active User (EUR)**, Total Tokens, Latest Cost per Active User.
- [X] **T004** [Demo Deployment Agent] Author `tables/Model Routing.tmdl` — inline `#table` (Model, Requests, Cost EUR) + measures: Routed Requests, Model Cost (EUR), **Cost Share %**.
- [X] **T005** [Demo Deployment Agent] Author `tables/Teacher Time.tmdl` — inline `#table` (Month, Hours Saved, Avg Response Hours, Questions Answered) + measures: **Teacher Hours Saved**, Avg Response Hours, Questions Answered.
- [X] **T006** [Content Localisation Lead] Author `tables/Localisation.tmdl` — inline `#table` (Month, Language, Terms Localised) + measures: **Localisation Velocity (terms/mo)**, Terms Localised.
- [X] **T007** [EU AI Act Compliance Officer] Author `tables/Governance Register.tmdl` — inline `#table` (Artefact, Type, Last Reviewed, Interval Days, Owner) + measures: **Days Since Review**, **Overdue Reviews**, Newest/Oldest Review.

## Phase 2 — Report

- [X] **T008** [Demo Deployment Agent] Author `work/fabric/board-finops/report/.platform` (Report) and `definition.pbir` (`byConnection` placeholder filled at deploy).
- [X] **T009** [Demo Deployment Agent] Author `work/fabric/deploy-board-finops.ps1`: build `report.json` (title; KPI cards: Cost/Active User, Total Monthly Cost, Active Users, Overdue Reviews, Teacher Hours Saved, Localisation Velocity; charts: cost-per-active-user trend, model routing, recurring FinOps cost/tokens, localisation velocity, governance freshness table) using the director-dashboard builder helpers.
- [X] **T010** [Demo Deployment Agent] Add `New-FabricSemanticModel` helper to `work/fabric/FabricRest.ps1`.

## Phase 3 — Deploy & verify

- [X] **T011** [Demo Deployment Agent] Run the deploy: create the board semantic model (new item), capture its id, write `definition.pbir` `byConnection`, create the board report (new item) in EULearn.
- [X] **T012** [Cross-Agent QA Verifier] Verify both items exist in EULearn, the report renders, KPIs populate, and existing director items (`5f98fc5b…`, `f51f6c63…`) are unchanged.

## Phase 4 — Human sign-off gates (governance)

- [ ] **T013** [GDPR Children's Data Specialist] Confirm the board surface exposes **no** learner personal data (aggregates only).
- [ ] **T014** [EU AI Act Compliance Officer] Confirm governance-register semantics and transparency framing (Art. 13) are correct.
- [ ] **T015** [Responsible AI Evaluator] + [Cross-Agent QA Verifier] Sign off before any future live-data (Postgres-bound) variant.

## Notes

- **Additive only**: all Fabric items created here are new. No existing item (director model/app, existing reports) is edited — enforced by targeting only the board item ids the deploy script creates.
- **EU residency**: EULearn / F16 only; identity is the `az`/Fabric REST `esigwald@microsoft.com` tenant `63e6b296…`.
