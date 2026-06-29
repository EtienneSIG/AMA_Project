# Tasks: Director Portal — Native Fabric (Rayfin) Analytics App

**Input**: Design documents from `/specs/018-director-fabric-rayfin/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/reporting-api.md, quickstart.md

**Organization**: Tasks are grouped by user story so the increment can ship in bounded demo slices: a compliance + scaffold foundation, then replacing Power BI Embedded with the Rayfin Fabric App (MVP), then governed EU-resident data access, then the embedded migration/rollback path.

**Tests**: No TDD unit suite was requested; verification follows the existing demo pattern — PowerShell acceptance/verify scripts (`verify-director-portal.ps1`, `acceptance_tests.ps1`) + the executable `quickstart.md`.

> **Implementation notes (avoid overwrites)**:
> - The **Rayfin Fabric App** under `demo/apps/director-fabric-app/` is **greenfield** (scaffolded by `npm create @microsoft/rayfin`). Its backend/data model lives in `rayfin/data/`; its frontend in `src/`.
> - The **host** `demo/apps/director-portal/` already contains Feature 004/005 code. `server.js`, `config/reporting.json`, `reporting/report-config.js`, `reporting/embed-token.js`, and `public/index.html` must be **EXTENDED additively** (keep the existing Power BI embed fields/route as the fallback) — do not regenerate.
> - `demo/apps/_shared/` is the source of truth for shared `db/`, `auth.js`, `contentSafety.js` (mirrored by `_shared/sync.ps1`); edit `_shared/` then sync, never a per-app mirror.
> - Reuse Feature 005's approved suppression policy (class ≥ 10 / establishment ≥ 30 / national ≥ 100 + re-identification rules) — re-implemented in the Rayfin Fabric backend.

---

## Phase 1: Setup & Compliance Gate (Shared)

**Purpose**: Lock the Phase 0 compliance gates, Annex IV evidence, fixtures, and runbook before any code lands.

**⚠️ GATE: All three Phase 0 sign-offs (plan.md) MUST be recorded before Phase 2 begins.**

- [x] T000 EU AI Act Compliance Officer + GDPR Children's Data Specialist: confirm **EU residency** of the target Fabric workspace + capacity and **approve reuse of the Feature 005 suppression policy** for the Rayfin Fabric backend; record approvals/dates in specs/018-director-fabric-rayfin/checklists/gdpr-ai-act-compliance.md (Accountable: agents/eu-ai-act-compliance-officer.chatmode.md and agents/gdpr-children-data-specialist.chatmode.md)
- [x] T000a EU AI Act Compliance Officer: approve **Fabric Apps (Rayfin) preview** workload enablement in the tenant and record preview-risk acceptance (mitigation: Power BI fallback + parity gate) in specs/018-director-fabric-rayfin/checklists/gdpr-ai-act-compliance.md (Accountable: agents/eu-ai-act-compliance-officer.chatmode.md)
- [x] T000b Privacy-Preserving ML Engineer: block all Phase 2 tasks until T000 and T000a are recorded; confirm Phase 0 gate completion before Foundational work begins (Accountable: agents/privacy-preserving-ml-engineer.chatmode.md)
- [x] T001 EdTech Program Orchestrator: append the Fabric (Rayfin) reporting increment scope, touched files, and demo verification entry points to demo/apps/director-portal/README.md (Accountable: agents/edtech-program-orchestrator.chatmode.md) — **EXISTING FILE: append a section; do not overwrite.**
- [x] T002 [P] EU AI Act Compliance Officer: author the Annex IV technical-file fragment for the Fabric reporting controls (intended purpose + non-autonomous nature, Rayfin app backend pipeline, Fabric-side suppression enforcement, Art. 9 risk outcomes incl. preview-status risk, Art. 10 data classes, Art. 12 logging, Art. 13 transparency/fallback states, Art. 14 advisory-only oversight, Art. 15 fail-closed scope + residency) in specs/018-director-fabric-rayfin/contracts/annex-iv-fragment.md (Accountable: agents/eu-ai-act-compliance-officer.chatmode.md)
- [x] T003 [P] Cross-Agent QA Verifier: refine the executable quickstart cases (parity, EU residency, scope_denied, suppressed_small_cohort, fabric_unavailable/fallback, rollback) in specs/018-director-fabric-rayfin/quickstart.md (Accountable: agents/cross-agent-qa-verifier.chatmode.md)
- [x] T004 [P] Demo Deployment Agent: confirm/extend deterministic aggregate fixtures (approved periods, in-scope classes, sub-threshold suppressed cohorts, national snapshots) feeding the Fabric mirror in demo/scripts/seed_learners.ps1 and demo/ml/fabric_mirroring/ (Accountable: agents/demo-deployment-agent.chatmode.md)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Scaffold the Rayfin app, model the governed Fabric backend (with suppression + scope), and wire the host portal's backend selector + metadata/health routes.

**⚠️ CRITICAL**: No user story work starts before this phase is complete.

- [x] T005 Demo Deployment Agent: scaffold the Rayfin app via `npm create @microsoft/rayfin@latest -- director-fabric-app --workspace <eu-workspace>` into demo/apps/director-fabric-app/; commit rayfin/rayfin.yml pinned to the **EU** Fabric workspace/capacity and the project skeleton (rayfin/.env excluded from secrets) (Accountable: agents/demo-deployment-agent.chatmode.md)
- [x] T006 [P] Privacy-Preserving ML Engineer: define the governed, **aggregated-only** data model (class-trend, establishment/national benchmark views over the existing mirror; no learner-level rows; **server-side pagination/limits for large result sets per FR-010**) in demo/apps/director-fabric-app/rayfin/data/ (Accountable: agents/privacy-preserving-ml-engineer.chatmode.md)
- [x] T007 GDPR Children's Data Specialist: implement K-anonymity suppression (class ≥ 10 / establishment ≥ 30 / national ≥ 100) + indirect re-identification in the Rayfin backend (rayfin/data/) so aggregates are suppression-cleared **before leaving the backend**; cohort sizes never reach the frontend (Accountable: agents/gdpr-children-data-specialist.chatmode.md)
- [x] T008 [P] EU AI Act Compliance Officer: implement fail-closed **row-level director scope** binding in the Rayfin backend so the frontend cannot widen scope or read out-of-scope data in demo/apps/director-fabric-app/rayfin/data/ (Accountable: agents/eu-ai-act-compliance-officer.chatmode.md)
- [x] T009 EdTech Program Orchestrator: extend demo/apps/director-portal/config/reporting.json with `backend` (`powerbi-embedded`|`fabric-app`), `migrationState`, `rayfinApp` {url, fabricItemId, region}, and the governed `reports[]` defs; keep the `powerbi` block for fallback (Accountable: agents/edtech-program-orchestrator.chatmode.md) — **EXISTING FILE: extend additively; preserve the existing fabric/powerbi/reports structure and `normalizeReport`/scope logic in reporting/report-config.js.**
- [x] T010 EU AI Act Compliance Officer: extend demo/apps/director-portal/server.js — `GET /api/reporting/metadata` returns backend, scope, reports, periods, the `rayfinApp` embed link, and EU `residency`; add `GET /api/reporting/health` (rayfinApp region/euResident/capacity) (Accountable: agents/eu-ai-act-compliance-officer.chatmode.md) — **EXISTING ROUTES: extend the metadata response additively; keep `GET /api/reporting/embed/:id` intact as fallback.**

**Checkpoint**: Rayfin app scaffolded with a governed, suppressing, scope-bound backend; host portal exposes backend selection, metadata, and health. User stories can begin.

---

## Phase 3: User Story 1 — Replace Power BI Embedded with a Native Fabric App (Priority: P1) 🎯 MVP

**Goal**: A director's reporting renders from the Rayfin Fabric App (no Power BI Embedded), with parity on class trends, benchmarks, and outcome-gap.

**Independent Test**: Open the director reporting page → analytics are served by the Rayfin app (no Power BI iframe/token in the live path) and the KPIs match the parity baseline.

### Implementation for User Story 1

- [x] T011 [P] [US1] Demo Deployment Agent: build the Rayfin app frontend report views (class-evolution trend, establishment-vs-national benchmark, ready/empty/suppressed states) in demo/apps/director-fabric-app/src/ (Accountable: agents/demo-deployment-agent.chatmode.md)
- [x] T012 [US1] Privacy-Preserving ML Engineer: implement the Rayfin backend report queries (`class-evolution`, `establishment-vs-national`) over rayfin/data/ returning suppression-cleared aggregates **with server-side pagination/limits (FR-010)** in demo/apps/director-fabric-app/rayfin/data/ (depends on T006, T007) (Accountable: agents/privacy-preserving-ml-engineer.chatmode.md)
- [x] T013 [US1] Demo Deployment Agent: deploy the app to EU Fabric — `npx rayfin up --dry-run` then `npx rayfin up`; capture the hosted app URL + Fabric item id via `npx rayfin up status --json` and record them for T014 (Accountable: agents/demo-deployment-agent.chatmode.md)
- [x] T014 [US1] EdTech Program Orchestrator: embed the Rayfin app frontend as an **iframe of its hosted Fabric app URL** in demo/apps/director-portal/public/index.html behind `backend = fabric-app` (reuse the existing `/api/reporting/metadata` fetch + reporting container; add the iframe surface), and **mint a portal-signed `ScopeContext`** (authenticated director identity + authorised schools/regions, short-lived) passed to the embedded app at load (Accountable: agents/edtech-program-orchestrator.chatmode.md) — **EXISTING FILE: extend; do not regenerate the page.**
- [x] T015 [P] [US1] Cross-Agent QA Verifier: extend demo/scripts/verify-director-portal.ps1 to assert reporting renders from the Rayfin app (no Power BI token in the live path) and KPIs match the parity baseline (Accountable: agents/cross-agent-qa-verifier.chatmode.md)
- [x] T015a [P] [US1] Cross-Agent QA Verifier: add a **latency/performance check for SC-005** (initial render p95 ≤ 5 s, filter/period change p95 ≤ 2 s) to demo/scripts/verify-director-portal.ps1 (Accountable: agents/cross-agent-qa-verifier.chatmode.md)
- [x] T016 [US1] Learning Sciences Expert: validate that metric/benchmark definitions and plain-language interpretations in the app views preserve pedagogical parity with the prior report in demo/apps/director-fabric-app/src/ (Accountable: agents/learning-sciences-expert.chatmode.md)

**Checkpoint**: User Story 1 is independently functional — the director reporting surface is served by the Rayfin Fabric App at parity.

---

## Phase 4: User Story 2 — Governed, EU-Resident Fabric Data Access (Priority: P1)

**Goal**: The Rayfin backend reads only governed, EU-resident data, enforces row-level scope per director, suppresses small cohorts, and exposes no learner-level data.

**Independent Test**: Two directors with different scopes each see only their authorised data; a sub-threshold class shows "Suppressed", not raw values; all processing stays in EU Fabric.

### Implementation for User Story 2

- [x] T017 [P] [US2] Cross-Agent QA Verifier: extend demo/scripts/verify-director-portal.ps1 to assert `scope_denied` for out-of-scope classes, `suppressed_small_cohort` for sub-threshold cohorts, and that no `cohortSize`/learner-level field appears in any frontend payload (Accountable: agents/cross-agent-qa-verifier.chatmode.md)
- [x] T018 [US2] EU AI Act Compliance Officer: enforce **residency fail-closed** — assert `rayfinApp.region` is EU at startup/health and refuse `fabric-app` reports if non-EU; surface in `GET /api/reporting/health` in demo/apps/director-portal/server.js (depends on T010) (Accountable: agents/eu-ai-act-compliance-officer.chatmode.md)
- [x] T019 [US2] Privacy-Preserving ML Engineer: the director portal mints a **portal-signed `ScopeContext`**; the **Rayfin backend verifies the signature and enforces row-level scope fail-closed** on every query so each director sees only authorised schools/classes (depends on T008, T012, T014) (Accountable: agents/privacy-preserving-ml-engineer.chatmode.md)
- [x] T020 [US2] EU AI Act Compliance Officer: the **Rayfin backend writes each report-access event** (backend, state, scope, correlation id, source); the director portal **ingests** those events — plus its own metadata/health/embed events — into the shared `ReportingAccessLog` in demo/apps/director-portal/server.js + demo/apps/_shared/db/index.js (Art. 12) (Accountable: agents/eu-ai-act-compliance-officer.chatmode.md)
- [x] T021 [P] [US2] Responsible AI Evaluator: verify the suppression, residency, scope, and no-learner-level guarantees against the contract test checklist in specs/018-director-fabric-rayfin/contracts/reporting-api.md (Accountable: agents/responsible-ai-evaluator.chatmode.md)

**Checkpoint**: User Stories 1 AND 2 both work — parity reporting plus enforced EU-resident, scoped, suppressed data access.

---

## Phase 5: User Story 3 — Embed the Fabric App with a Reversible Migration Path (Priority: P2)

**Goal**: The Rayfin app is embedded in the existing portal navigation, with a config-driven, reversible switch between Power BI Embedded and the Fabric app, plus graceful fallback.

**Independent Test**: Toggle the reporting backend via config; the portal renders the Rayfin app or the legacy Power BI embed accordingly, and rollback restores the previous view without breakage.

### Implementation for User Story 3

- [x] T022 [US3] EdTech Program Orchestrator: implement config-driven backend switching in demo/apps/director-portal/server.js (`powerbi-embedded`|`fabric-app`) so the portal serves the Rayfin embed or the legacy embed based on reporting.json `backend`/`migrationState` (Accountable: agents/edtech-program-orchestrator.chatmode.md) — **EXISTING: extend; keep the embed route as the fallback path.**
- [x] T023 [P] [US3] Privacy-Preserving ML Engineer: implement graceful failure — on Fabric capacity/app unavailable or auth failure, return `fabric_unavailable` or (if enabled) `fallback_powerbi`, never an error-only screen or wrong numbers; reuse the admin `POST /api/admin/fabric/wakeup` for capacity resume (depends on T010) (Accountable: agents/privacy-preserving-ml-engineer.chatmode.md)
- [x] T024 [P] [US3] Cross-Agent QA Verifier: extend demo/scripts/verify-director-portal.ps1 to assert backend switch, fallback, and rollback (`fabric-app` ↔ `powerbi-embedded`) without portal breakage (Accountable: agents/cross-agent-qa-verifier.chatmode.md)
- [x] T025 [US3] Demo Deployment Agent: document partial redeploys (`npx rayfin up staticapp deploy`, `npx rayfin up db apply`) and the `migrationState = complete` cut-over steps in demo/apps/director-portal/README.md and specs/018-director-fabric-rayfin/quickstart.md (Accountable: agents/demo-deployment-agent.chatmode.md)

**Checkpoint**: All user stories are independently functional; migration is reversible.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Finalize compliance evidence, full validation, cut-over, and documentation.

- [x] T026 [P] EU AI Act Compliance Officer: finalize the Annex IV fragment with as-built evidence (Art. 9/10/12/13/14/15 + preview-risk mitigation) in specs/018-director-fabric-rayfin/contracts/annex-iv-fragment.md (Accountable: agents/eu-ai-act-compliance-officer.chatmode.md)
- [x] T027 [P] Cross-Agent QA Verifier: run the full specs/018-director-fabric-rayfin/quickstart.md validation end-to-end (parity, residency, scope, suppression, fallback, rollback) (Accountable: agents/cross-agent-qa-verifier.chatmode.md)
- [x] T028 [P] Demo Deployment Agent: extend demo/scripts/acceptance_tests.ps1 with the director Fabric-app reporting scenarios + audit assertions (Accountable: agents/demo-deployment-agent.chatmode.md)
- [x] T029 [P] EdTech Program Orchestrator: update specs/INDEX.md and demo/PROGRESS.md / demo/apps/director-portal/README.md to reflect the Fabric (Rayfin) reporting backend (Accountable: agents/edtech-program-orchestrator.chatmode.md)
- [x] T030 EU AI Act Compliance Officer + GDPR Children's Data Specialist: after validated parity AND the Phase 0 gate, set `migrationState = complete` and retire Power BI tokens/secrets (`PBI_CLIENT_SECRET`, embed config) → **0** Power BI tokens in the live path (SC-001) (Accountable: agents/eu-ai-act-compliance-officer.chatmode.md and agents/gdpr-children-data-specialist.chatmode.md)
- [x] T031 Responsible AI Evaluator + Cross-Agent QA Verifier: final RAI + QA sign-off before any production cut-over (Accountable: agents/responsible-ai-evaluator.chatmode.md and agents/cross-agent-qa-verifier.chatmode.md)

---

## Dependencies & Execution Order

- **Phase 1 (Setup/Gate)** → **Phase 2 (Foundational)** → **Phase 3 (US1)** → **Phase 4 (US2)** → **Phase 5 (US3)** → **Phase 6 (Polish)**.
- **Hard gate**: T000, T000a (recorded by T000b) block all of Phase 2+.
- **Within Phase 2**: T005 (scaffold) precedes T006/T007/T008 (backend model/suppression/scope); T009/T010 (host portal config + routes) can proceed in parallel with the Rayfin backend work but must land before US tasks that embed/query it.
- **US1**: T012 depends on T006/T007; T013 (deploy) depends on T011/T012; T014 (iframe embed + signed ScopeContext) depends on T010/T013; T015a (latency) depends on T014.
- **US2**: T018 depends on T010; T019 (signed scope verified in the Rayfin backend) depends on T008/T012/T014; T020 (app-side audit + portal ingest) depends on T010/T014.
- **US3**: T022/T023 depend on T010 (+ T014 embed); T024 depends on T022/T023.
- **Polish**: T030 depends on US1/US2 parity + T000 gate; T031 is the final sign-off.

## Parallel Execution Examples

- **Phase 1**: T002, T003, T004 in parallel (different files); T000/T000a are the gate.
- **Phase 2**: T006 and T008 in parallel (both in rayfin/data/, coordinate), and T009/T010 (host portal) in parallel with the Rayfin backend tasks.
- **US1**: T011 (frontend) ∥ early T012 (backend queries); T015 (verify) ∥ T016 (pedagogical parity) once T014 lands.
- **US2**: T017 (verify) ∥ T021 (RAI check) while T018/T019/T020 are implemented.

## Implementation Strategy

- **MVP = User Story 1** (Phases 1–3): the director reporting surface served by the Rayfin Fabric App at parity, behind the `fabric-app` switch with Power BI as fallback.
- **Increment 2 = User Story 2**: enforce EU residency, row-level scope, and suppression in the Fabric backend.
- **Increment 3 = User Story 3**: reversible migration + graceful fallback, then cut-over and Power BI token retirement in Polish.
- Never start US implementation on a red Phase 0 gate; never cut over before validated parity + RAI/QA sign-off.

---

## Summary

- **Total tasks**: 35 items (T000–T031, including T000a/T000b and T015a).
- **Per user story**: US1 = 7 (T011–T016, T015a) · US2 = 5 (T017–T021) · US3 = 4 (T022–T025).
- **Setup/Gate**: 7 (T000–T004) · **Foundational**: 6 (T005–T010) · **Polish**: 6 (T026–T031).
- **Parallel opportunities**: ~14 tasks marked [P].
- **MVP scope**: User Story 1 (Phases 1–3).
- **Independent test criteria**: US1 — reporting served by Rayfin app at parity (no PBI in live path); US2 — scoped, EU-resident, suppressed access with no learner-level data; US3 — reversible backend switch + graceful fallback.
