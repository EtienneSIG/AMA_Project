# Implementation Plan: Director Fabric App — Dashboard in the Director AppBackend (EULearn)

**Branch**: `022-director-fabric-app-dashboard` | **Date**: 2026-07-15 | **Spec**: `/specs/022-director-fabric-app-dashboard/spec.md`

**Input**: Feature specification from `/specs/022-director-fabric-app-dashboard/spec.md`

## Summary

Deliver the director dashboard as a **native Microsoft Fabric App (Rayfin)** running inside the existing **`Director` AppBackend** (`f51f6c63…`) in the **EULearn** workspace (F16 capacity, `learneu` MirroredDatabase over EU-resident `pg-learneu-demo`). The app is scaffolded from the Rayfin **`dataapp`** template with `@microsoft/rayfin-cli`, **bound to the existing item** via a pre-seeded deployment registry, and deployed with `npx rayfin up --workspace EULearn`. The frontend ([src/App.tsx](../../demo/apps/director-rayfin/src/App.tsx)) reproduces the reference director dashboard pixel-close (KPI cards, establishment-vs-national bars, Netherlands **Leaflet/OSM map**, mastery trend), driven by aggregated, non-personal demo fixtures ported from `director-fabric-app/rayfin/data/overview.js`. A live semantic-model connection (`directorModel` → `5f98fc5b…`) is registered for DAX-backed variants.

> **Relationship to Feature 018**: 018 planned/shipped the Rayfin reporting inside `director-portal`. **022 delivers it as a first-class Fabric Apps item** (the `Director` AppBackend) using the current Rayfin `dataapp` template + CLI, browsable directly in the Fabric portal. No 018 behaviour is regressed.

## Technical Context

**Language/Version**: TypeScript + React 19 + Vite 8 (Rayfin `dataapp` template); Node.js + npm for the Rayfin/`fabric-app-data` CLIs.

**Primary Dependencies**: `@microsoft/rayfin-cli` 1.33.2 (scaffold/deploy: `rayfin init`, `rayfin up`, `rayfin login status`), `@microsoft/fabric-app-data(-cli)` (semantic-model connection + DAX: `fabric-app-data add|generate|query`), `@microsoft/fabric-app-data-embed-client` (runtime SDK), Leaflet 1.9.4 (CDN) for the map.

**Storage / Data**:
- **Reference dashboard data**: EU-resident, aggregated, non-personal demo fixtures ported to [src/overview-data.ts](../../demo/apps/director-rayfin/src/overview-data.ts) (schools, national, NL coords, trends). No learner-level rows.
- **Live model (variants)**: `LearnEU - Director Reporting (Postgres VNG Final)` semantic model `5f98fc5b…` over the `learneu` mirror; registered as connection `directorModel` in `fabric.yaml` → `src/fabric.generated.ts`.

**Identity (critical)**: The **Fabric MCP tools** authenticate as a different **MSIT** identity that cannot see EULearn (404/403). All EULearn work uses the **`az` / Fabric REST + Rayfin CLI** identity `esigwald@microsoft.com` (tenant `63e6b296…`). Rayfin login was already valid (`rayfin login status`).

**Item binding**: `rayfin init --item-id`/registry pre-seed writes `rayfin/.deployments.json` keyed by the sanitized workspace name (`eulearn`) with `fabricItemId=f51f6c63…` + `fabricWorkspaceId=127a12ab…`; `rayfin up --workspace EULearn` then **reuses** the item instead of creating one.

**Testing**: `npx rayfin up --dry-run --verbose` (plan preview, no API calls), `npx fabric-app-data query directorModel --file <dax>` (DAX smoke against the model), `npm run build:fabric` (generate + tsc --noCheck + vite build), Fabric REST item check (`/workspaces/<ws>/items/<id>`).

**Target Platform**: **Microsoft Fabric (EULearn, F16, EU-resident)** hosts the AppBackend + static frontend; served at the Fabric Apps hosting URL (`*.webapp.fabricapps.net`).

**Project Type**: A **Fabric App (Rayfin `dataapp`)** — Fabric-hosted backend + static React frontend — under [demo/apps/director-rayfin/](../../demo/apps/director-rayfin/).

**Performance Goals**: Static dashboard renders on load; KPIs/bars/trend from in-bundle fixtures (no query latency); map initialises via Leaflet `useEffect` with `fitBounds`/`invalidateSize`.

**Constraints**:
- EU residency: EULearn workspace + F16 capacity only; dashboard fixtures are aggregated, non-personal.
- Reuse the existing Director item; never create a new AppBackend or Power BI report.
- OSM tiles/Leaflet are loaded from a CDN — a **demo dependency**; strict prod residency would use EU-hosted tiles and self-hosted Leaflet.
- Deployment-specific env (`rayfin/.env`, `rayfin/.deployments.json`) is git-ignored (re-derived on deploy).

## AI Act / GDPR surface

- **Articles touched**: read-only, advisory reporting only; no new autonomous or learner-impacting AI decisioning (no change to the Art. 9–15 posture established by 018/005).
- **DPIA delta**: none — the dashboard renders aggregated, non-personal fixtures; the live model path reuses 005/018's governed semantic model.
- **Human-oversight surface**: reporting is advisory and human-led; no automated decisions.
- **Residency**: EULearn/F16 (EU). Demo caveat: external OSM tiles.

## Phase 0 — Research (resolved)

- **R1** Rayfin CLI availability: `@microsoft/rayfin-cli` resolves on the internal feed (public npm blocked by proxy); the `@microsoft/rayfin` create-initializer is absent → use `rayfin init` on an existing project. **Resolved.**
- **R2** AppBackend edits: not supported via Fabric REST `getDefinition/updateDefinition` (400) → must use the Rayfin CLI. **Resolved.**
- **R3** Item reuse: `rayfin up` creates a new item unless a deployment record with `fabricItemId` exists; pre-seed `rayfin/.deployments.json` (key `eulearn`). **Resolved.**
- **R4** School-level mastery: the mirrored model's `school_id` (Hierarchy Assignments) does not propagate to Item Attempts (inconsistent join keys) → DAX variants break down by `market`; the reference dashboard uses fixtures for pixel parity. **Resolved.**

## Progress Tracking

- [x] Phase 0 research resolved
- [x] Phase 1 project scaffolded + bound to Director item
- [x] Phase 2 dashboard authored + built
- [x] Phase 3 deployed (item reused) + verified
