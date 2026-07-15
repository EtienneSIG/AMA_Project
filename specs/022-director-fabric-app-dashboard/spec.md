# Feature Specification: Director Fabric App — Dashboard in the Director AppBackend (EULearn)

**Feature Branch**: `022-director-fabric-app-dashboard`

**Created**: 2026-07-15

**Status**: Delivered

**Input**: User description: "Use the Director Fabric app to reproduce the director application dashboard in Fabric" (workspace **EULearn**, F16 capacity, Postgres mirroring).

> **Delivered increment (2026-07-15)** — The director dashboard now runs **natively as a Microsoft Fabric App (Rayfin)** inside the existing **`Director` AppBackend** (`f51f6c63…`) in the **EULearn** workspace (F16 capacity, `learneu` MirroredDatabase over `pg-learneu-demo`). Built from the Rayfin **`dataapp`** template (`@microsoft/rayfin-cli` 1.33.2), bound to the existing item, and deployed with `npx rayfin up`. The frontend reproduces the reference director dashboard pixel-close: 10 KPI cards (learners, schools, mastery, engagement, completion, attendance, time-on-task, at-risk, satisfaction, gap-vs-national), an establishment-vs-national bar chart, a **Leaflet + OpenStreetMap schools map** with mastery-coloured markers, and a mastery trend line. A live connection to the `LearnEU - Director Reporting` semantic model (`directorModel`) is also registered for DAX-backed variants.

> **Relationship to Feature 018**: 018 planned the native Fabric (Rayfin) reporting app and shipped the visual dashboard inside `director-portal`. **022 delivers that app as a first-class Fabric Apps item** — the `Director` AppBackend in EULearn — using the current Rayfin `dataapp` template and CLI, reproducing the same dashboard so it is browsable directly in the Fabric portal.

## Clarifications

### Session 2026-07-15 (confirmed by user)

- Q: Which workspace/capacity hosts the app? → A: **EULearn**, GUID `127a12ab-fa94-421b-bee3-4f534264d3ff`, on **F16** capacity `ed67f96d-a6e5-4ce8-bc15-7f013de444ef`, with `learneu` **MirroredDatabase** over the EU-resident `pg-learneu-demo`.
- Q: Complete the existing app, not a new Power BI report. → A: Reuse the existing **`Director` AppBackend** item (`f51f6c63-b942-4276-9baf-af7f45e2f13c`); do not create Power BI report items. An erroneously created Power BI report was removed.
- Q: What must the dashboard look like? → A: The **reference director-portal dashboard** — KPI cards, establishment-vs-national bars, the Netherlands **Leaflet map**, and the mastery trend line. Pixel parity takes priority.
- Q: Identity note. → A: The **Fabric MCP tools authenticate as a different (MSIT) identity** that cannot see EULearn; all EULearn work uses the **`az` / Fabric REST + Rayfin CLI** identity `esigwald@microsoft.com` (tenant `63e6b296…`).

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Director dashboard runs inside the Director Fabric App (Priority: P1)

A user opens the **`Director`** Fabric App in the EULearn workspace and sees the director analytics dashboard rendered by the native Fabric (Rayfin) app — not a Power BI report and not an external portal.

**Why this priority**: Delivering the dashboard as the Director Fabric App is the core requested change; it makes the analytics browsable directly in Fabric.

**Independent Test**: Open the `Director` AppBackend from the Fabric portal (Developer/Fabric experience); confirm the dashboard renders with KPI cards, bars, map, and trend.

**Acceptance Scenarios**:

1. **Given** the `Director` AppBackend, **When** it is opened, **Then** the Rayfin app renders the director dashboard (KPIs + bars + map + trend).
2. **Given** the deploy, **When** `npx rayfin up` runs, **Then** it **reuses** item `f51f6c63…` (no new item is created).
3. **Given** the reference dashboard, **When** the Fabric app renders, **Then** the layout and visuals match it (KPI set, establishment-vs-national bars, NL map, trend line).

---

### User Story 2 — Bound to EULearn on EU-resident F16 capacity (Priority: P1)

The app is deployed only to the EULearn workspace on its F16 capacity, reusing the existing Director item, with the Postgres-mirrored semantic model registered for live DAX variants.

**Why this priority**: Constitution I/II — the reporting surface and any data path must stay EU-resident and governed.

**Independent Test**: Inspect the deployment registry / item metadata; confirm `fabricItemId=f51f6c63…` and `fabricWorkspaceId=127a12ab…` (EULearn), and that the `directorModel` connection points to semantic model `5f98fc5b…`.

**Acceptance Scenarios**:

1. **Given** the deploy config, **When** the app is published, **Then** it targets EULearn (F16) and the existing Director item only.
2. **Given** the semantic model connection, **When** a DAX query runs via `fabric-app-data`, **Then** it resolves against `LearnEU - Director Reporting` (`5f98fc5b…`).
3. **Given** the map/tiles, **When** the dashboard renders, **Then** external OSM tiles are flagged as a demo dependency (EU-hosted tiles for strict prod residency).

---

### User Story 3 — Reproducible, re-deployable Fabric App project (Priority: P2)

The Rayfin project is committed so the app can be rebuilt and redeployed (`npm run build:fabric` → `npx rayfin up --workspace EULearn`) and re-binds to the existing Director item.

**Why this priority**: Operational safety and reproducibility of the demo deliverable.

**Independent Test**: From a fresh checkout, `npm install`, `npx rayfin login`, `npx rayfin up --workspace EULearn --yes` re-binds to `f51f6c63…` (registry pre-seeds the item) and redeploys.

**Acceptance Scenarios**:

1. **Given** the committed project, **When** a redeploy runs, **Then** the CLI reports "Redeployment detected — reusing Rayfin item f51f6c63…".
2. **Given** deployment-specific secrets, **When** committed, **Then** `rayfin/.env` and `rayfin/.deployments.json` are git-ignored (re-derived on deploy).

## Requirements *(mandatory)*

- **FR-001**: The director dashboard MUST render inside the existing `Director` AppBackend (`f51f6c63…`) in EULearn.
- **FR-002**: Deployment MUST reuse the existing Director item — never create a new AppBackend or Power BI report.
- **FR-003**: The dashboard MUST reproduce the reference portal dashboard: 10 KPI cards, establishment-vs-national bars, the Netherlands Leaflet/OSM map with mastery-coloured markers, and a mastery trend line.
- **FR-004**: The app MUST be built from the Rayfin `dataapp` template and deployed via the Rayfin CLI (`@microsoft/rayfin-cli`).
- **FR-005**: A live connection (`directorModel`) to the `LearnEU - Director Reporting` semantic model (`5f98fc5b…`) MUST be registered for DAX-backed variants.
- **FR-006**: The target workspace/capacity MUST be EU-resident (EULearn / F16). No cross-EU transfer of personal data; dashboard fixtures are aggregated, non-personal.
- **FR-007**: Deployment-specific env (`rayfin/.env`, `rayfin/.deployments.json`, `node_modules`, `dist`, generated types) MUST be git-ignored.

## Success Criteria *(mandatory)*

- **SC-001**: Opening the `Director` AppBackend shows the director dashboard (KPIs + bars + map + trend).
- **SC-002**: `npx rayfin up` reuses item `f51f6c63…` (verified in CLI output and item metadata).
- **SC-003**: The dashboard visually matches the reference portal dashboard.
- **SC-004**: The `directorModel` DAX connection returns results against `5f98fc5b…`.
- **SC-005**: A fresh checkout can rebuild and redeploy without creating a new item.
