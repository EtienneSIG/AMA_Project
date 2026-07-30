# Tasks: Director Fabric App — Dashboard in the Director AppBackend (EULearn)

**Input**: Design documents from `/specs/022-director-fabric-app-dashboard/`

**Prerequisites**: plan.md, spec.md

**Organization**: Tasks are grouped by phase so the increment ships as a bounded demo slice: identity/compliance gate, scaffold + bind, dashboard build, then deploy + verify. All tasks are **delivered** (2026-07-15).

**Tests**: No TDD suite requested; verification follows the demo pattern — Rayfin CLI dry-run/status, `fabric-app-data query` DAX smoke, `npm run build:fabric`, and a Fabric REST item check.

> **Implementation notes (avoid overwrites)**:
> - The Rayfin app under `demo/apps/director-rayfin/` is **greenfield** (scaffolded from the Rayfin `dataapp` template). Frontend in `src/`, config in `rayfin/rayfin.yml` + `fabric.yaml`.
> - Never create a new AppBackend or Power BI report — **reuse the existing `Director` item** `f51f6c63…` via the pre-seeded deployment registry.
> - EULearn work uses the **`az`/Rayfin CLI identity** (`esigwald@microsoft.com`), NOT the Fabric MCP identity (MSIT, cannot see EULearn).
> - `rayfin/.env` + `rayfin/.deployments.json` are **git-ignored** (auto-managed, re-derived on deploy).

---

## Phase 1: Identity & Compliance Gate

**Purpose**: Confirm the correct identity/workspace and EU residency before touching the app.

**⚠️ GATE: Confirm identity + EU residency before deploy.**

- [x] T001 EdTech Program Orchestrator: confirm the active identity is `esigwald@microsoft.com` (tenant `63e6b296…`) and that it can reach **EULearn** via `az`/Fabric REST (the Fabric MCP identity is MSIT and 404s EULearn) (Accountable: agents/edtech-program-orchestrator.chatmode.md)
- [x] T002 EU AI Act Compliance Officer: confirm **EULearn** workspace + **F16** capacity are EU-resident and that the dashboard renders **aggregated, non-personal** fixtures; record OSM-tiles as a demo residency caveat (Accountable: agents/eu-ai-act-compliance-officer.chatmode.md)
- [x] T003 Cross-Agent QA Verifier: remove the erroneously created Power BI report from EULearn and confirm the deliverable is the **`Director` AppBackend** only (Accountable: agents/cross-agent-qa-verifier.chatmode.md)

---

## Phase 2: Foundational — Scaffold & Bind (Blocking)

**Purpose**: Create a valid Rayfin `dataapp` project bound to the existing Director item, with the semantic model registered.

**⚠️ CRITICAL**: No dashboard work before the project is bound to `f51f6c63…`.

- [x] T004 Demo Deployment Agent: install `@microsoft/rayfin-cli` and scaffold the Rayfin **`dataapp`** template into demo/apps/director-rayfin/ (`rayfin init . --template dataapp --project-name Director`) (Accountable: agents/demo-deployment-agent.chatmode.md)
- [x] T005 Demo Deployment Agent: pre-seed demo/apps/director-rayfin/rayfin/.deployments.json (key `eulearn`) with `fabricItemId=f51f6c63…` + `fabricWorkspaceId=127a12ab…` so `rayfin up` **reuses** the existing Director item (Accountable: agents/demo-deployment-agent.chatmode.md)
- [x] T006 Privacy-Preserving ML Engineer: register the governed semantic-model connection `directorModel` → `LearnEU - Director Reporting` (`5f98fc5b…`) via `fabric-app-data add` and generate demo/apps/director-rayfin/src/fabric.generated.ts (Accountable: agents/privacy-preserving-ml-engineer.chatmode.md)
- [x] T007 [P] Learning Sciences Expert: validate the director metrics via DAX smoke queries (`Correctness Rate`, `National Correctness Rate`, `Assigned Learners`, mastery-by-market, trend-by-day) with `fabric-app-data query directorModel` (Accountable: agents/learning-sciences-expert.chatmode.md)

**Checkpoint**: Rayfin `dataapp` project bound to the Director item; semantic model reachable via DAX.

---

## Phase 3: Dashboard Build (User Story 1 + 3)

**Purpose**: Reproduce the reference director dashboard and build the static bundle.

- [x] T008 Demo Deployment Agent: add two additive measures to the semantic model — `Schools In Scope` / `Regions In Scope` (`DISTINCTCOUNT` on Hierarchy Assignments) via Fabric REST `updateDefinition` (Accountable: agents/demo-deployment-agent.chatmode.md)
- [x] T009 Demo Deployment Agent: port the EU-resident, aggregated demo fixtures to demo/apps/director-rayfin/src/overview-data.ts (schools, national, NL coords, trends; scope = Amsterdam Noord + Groningen for pixel parity) (Accountable: agents/demo-deployment-agent.chatmode.md)
- [x] T010 Learning Sciences Expert: author the dashboard in demo/apps/director-rayfin/src/App.tsx — 10 KPI cards, establishment-vs-national bars, Netherlands **Leaflet/OSM map** (mastery-coloured markers + popups), and the mastery trend line, matching the reference layout (Accountable: agents/learning-sciences-expert.chatmode.md)
- [x] T011 [P] Demo Deployment Agent: add Leaflet 1.9.4 CSS/JS (CDN) + the app title to demo/apps/director-rayfin/index.html (Accountable: agents/demo-deployment-agent.chatmode.md)
- [x] T012 Demo Deployment Agent: build with `npm run build:fabric` (fabric-app-data generate → tsc --noCheck → vite build); confirm `dist/` is produced (Accountable: agents/demo-deployment-agent.chatmode.md)

**Checkpoint**: Dashboard builds cleanly and reproduces the reference visuals.

---

## Phase 4: Deploy & Verify (User Story 1 + 2)

**Purpose**: Deploy to the existing Director item and verify.

- [x] T013 Demo Deployment Agent: deploy with `npx rayfin up --workspace EULearn --yes`; confirm the CLI reports **"Redeployment detected — reusing Rayfin item f51f6c63…"** and prints the hosting URL (Accountable: agents/demo-deployment-agent.chatmode.md)
- [x] T014 Cross-Agent QA Verifier: verify via Fabric REST that item `f51f6c63…` is still `AppBackend` named **"Director"** (no new item created) and that the workspace item inventory is unchanged except the removed PBI report (Accountable: agents/cross-agent-qa-verifier.chatmode.md)
- [x] T015 [P] EU AI Act Compliance Officer: document the access path (Fabric portal Developer/Fabric experience — the Power BI experience hides AppBackend items) and the deep link to the Director app (Accountable: agents/eu-ai-act-compliance-officer.chatmode.md)
- [x] T016 EdTech Program Orchestrator: ensure `rayfin/.env` + `rayfin/.deployments.json` are git-ignored and commit the reproducible project (Accountable: agents/edtech-program-orchestrator.chatmode.md)

**Checkpoint**: The `Director` Fabric App renders the dashboard in EULearn; redeploys re-bind to the same item.

---

## Dependencies & Execution Order

- **Phase 1 (T001–T003)** gates everything (identity + residency + clean deliverable).
- **Phase 2 (T004–T007)** blocks the build; T005 (item binding) is the critical reuse guard.
- **Phase 3 (T008–T012)** depends on Phase 2; T009→T010 sequential (data before UI), T011 parallel.
- **Phase 4 (T013–T016)** depends on a green build; T013 before T014–T016.

## Verification (delivered)

- `npx rayfin login status` → signed in as `esigwald@microsoft.com`.
- `npx fabric-app-data query directorModel --file <dax>` → Mastery 0.53, Learners 9, Schools 7, mastery-by-market NL/DE vary, trend 93 days.
- `npm run build:fabric` → `dist/` built.
- `npx rayfin up --workspace EULearn --yes` → "Redeployment detected — reusing Rayfin item f51f6c63…"; hosting URL `https://ruby-elm-7fe615b7ac-swedencentral.webapp.fabricapps.net`.
- Fabric REST `/items/f51f6c63…` → `displayName=Director`, `type=AppBackend` (unchanged).
