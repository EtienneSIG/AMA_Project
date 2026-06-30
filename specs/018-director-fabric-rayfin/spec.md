# Feature Specification: Director Portal — Native Fabric (Rayfin) Analytics App

**Feature Branch**: `018-director-fabric-rayfin`

**Created**: 2026-06-26

**Status**: Draft

**Input**: User description: "Instead of using Power BI Embedded, use the Rayfin framework to create a Fabric app in the director app on Fabric data."

> **Delivered increment (2026-06-30)** — Cut-over complete (`migrationState=complete`, Power BI fallback off, `PBI_CLIENT_SECRET` removed). The Fabric app (`app-director-fabric-learneu-demo`, North Europe) now ships a **visual director dashboard**: standard EdTech KPIs (learners, schools, mastery, engagement, completion, attendance, time-on-task, at-risk, satisfaction, gap-vs-national), an establishment-vs-national bar chart, a **Google-Maps-style schools map (Leaflet + OpenStreetMap tiles)** with mastery-coloured markers, and a mastery trend line — all from EU-resident aggregates via `/api/overview`. All **Power BI mentions removed** from the director-portal UI. (Demo note: OSM tiles are an external resource; a EU-hosted tile provider would be used for strict prod residency.)

> **Note on the framework**: **Rayfin** is Microsoft's **Fabric Apps** framework/CLI (preview) for building full-stack apps with **Microsoft Fabric as the backend** — scaffolded via `npm create @microsoft/rayfin`, deployed with `npx rayfin up`. Refs: [Fabric Apps — Rayfin](https://www.microsoft.com/en-us/microsoft-fabric/features/rayfin) · [Create & deploy a Fabric app with the Rayfin CLI](https://learn.microsoft.com/fabric/apps/create-app-with-cli). The director analytics app is built as a **Rayfin Fabric App** (Fabric-hosted backend + static frontend) and surfaced inside the director portal, replacing Power BI Embedded.

## Clarifications

### Session 2026-06-26 (confirmed by user, with sources)

- Q: What does "Rayfin" refer to for building the director's Fabric analytics app? → A: The **Microsoft Fabric Apps framework/CLI ("Rayfin", preview)** — a first-party way to build full-stack apps with **Fabric as the backend**. The app is scaffolded with the Rayfin CLI (`npm create @microsoft/rayfin`), its backend/data model is **hosted on Fabric** (`rayfin/data/` → Fabric DB, configured in `rayfin/rayfin.yml`), and its frontend is a static app surfaced/embedded in the director portal. It replaces Power BI Embedded.
- Q: Which Fabric data feeds the app and where do suppression/scope run? → A: The Rayfin app's Fabric backend reads the existing **EU-resident mirrored analytics data** (from `pg-learneu-demo` via `demo/ml/fabric_mirroring/`). **Small-cohort suppression and row-level scope are enforced in the Rayfin Fabric backend** (data model + backend queries) before any aggregate reaches the frontend — reusing Feature 005's approved thresholds/rules, re-implemented in the Fabric backend.
- Q: How is the cut-over from Power BI Embedded handled? → A: Deploy the Rayfin Fabric App (`npx rayfin up`) and switch the director portal's reporting surface from the Power BI embed to the embedded/linked Rayfin app via config (`backend: powerbi-embedded | fabric-app`). Power BI Embedded remains a fallback until validated parity, then its tokens are retired.
- Q: Operational note — Fabric Apps is in **preview**. → A: Requires the **Fabric Apps workload enabled in the tenant** and an EU-resident Fabric workspace/capacity; preview status is tracked as a delivery risk (see plan research R8).

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Replace Power BI Embedded with a Native Fabric App (Priority: P1)

A director opens the reporting area of the director portal and sees analytics rendered by a custom Fabric (Rayfin) application reading directly from Fabric data, instead of an embedded Power BI report. The director sees the same (or richer) KPIs — class trends, benchmarks, outcome-gap, suppressed small cohorts — with equal or better interactivity.

**Why this priority**: Replacing the Power BI Embedded surface with the native Fabric app is the core requested change and the smallest slice that delivers value; parity with today's reporting is the baseline.

**Independent Test**: Open the director reporting page; confirm the analytics are served by the Fabric (Rayfin) app querying Fabric data (no Power BI Embedded iframe/token), with the current KPIs present and interactive.

**Acceptance Scenarios**:

1. **Given** a director opens reporting, **When** the page loads, **Then** analytics are rendered by the Fabric (Rayfin) app reading Fabric data, with **no** Power BI Embedded report/token in use.
2. **Given** the current reporting KPIs (trends, benchmarks, outcome-gap, small-cohort suppression), **When** the new app renders, **Then** all are present with parity or improvement and the same suppression/privacy rules.
3. **Given** a director interacts (filter by class/period), **When** they change a control, **Then** the Fabric app updates the visuals from Fabric data within an acceptable latency budget.

---

### User Story 2 — Governed, EU-Resident Fabric Data Access (Priority: P1)

The Fabric app reads only governed, EU-resident Fabric datasets, honouring row-level/role-based security so each director sees only their authorised schools/classes, and small cohorts remain suppressed.

**Why this priority**: Constitution I and II — analytics over children's outcomes must stay EU-resident, access-controlled, and privacy-preserving; this is non-negotiable for the new data path.

**Independent Test**: Two directors with different scopes open the app; each sees only their authorised data; a class below the suppression threshold shows "Suppressed", not raw values.

**Acceptance Scenarios**:

1. **Given** a director with a defined scope, **When** the Fabric app queries data, **Then** role-based/row-level security restricts results to the director's authorised schools/classes.
2. **Given** a cohort below the minimum size, **When** a metric would reveal it, **Then** the value is suppressed and labelled, consistent with existing reporting rules.
3. **Given** all queries, **When** they execute, **Then** data stays within EU-resident Fabric capacity with no cross-EU transfer.

---

### User Story 3 — Embed the Fabric App in the Director Portal with Migration Path (Priority: P2)

The Fabric (Rayfin) app is embedded/integrated into the existing director portal navigation, and there is a controlled migration from the current Power BI Embedded config (`report-config.js`, `config/reporting.json`, `/api/reporting/*`) to the new Fabric app, with a fallback during transition.

**Why this priority**: Smooth replacement and operational safety; depends on the app existing and reaching parity first.

**Independent Test**: Toggle the reporting backend from Power BI Embedded to the Fabric app via configuration; confirm the portal renders the Fabric app and that rollback restores the previous embed if needed.

**Acceptance Scenarios**:

1. **Given** the new Fabric app is integrated, **When** a director navigates to reporting, **Then** it appears within the existing portal shell/navigation consistently with portal UX.
2. **Given** a configuration switch, **When** the reporting backend is set to "fabric-app", **Then** the portal serves the Fabric app; **When** set to "powerbi-embedded", **Then** the legacy embed serves (controlled migration/rollback).
3. **Given** the migration, **When** complete and validated, **Then** Power BI Embedded tokens/config can be retired without breaking the portal.

### Edge Cases

- Fabric capacity is paused/unavailable: the app shows a clear status and (if enabled) falls back to the legacy embed or a cached view, never exposing an error-only screen.
- A director's scope changes mid-session: access is re-evaluated; out-of-scope data is not shown.
- Fabric dataset schema changes: the app degrades gracefully and surfaces a maintenance notice rather than wrong numbers.
- Authentication/token to Fabric expires: silent refresh or a clear re-auth prompt; no data leaks across tenants.
- Large result sets: queries are paginated/aggregated server-side in Fabric to keep the portal responsive.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The director portal reporting surface MUST be rendered by a **Rayfin Fabric App** (Microsoft Fabric Apps framework) — a Fabric-hosted backend plus static frontend, scaffolded and deployed with the Rayfin CLI — surfaced/embedded in the director portal, replacing the Power BI Embedded report.
- **FR-002**: The Fabric app MUST achieve at least parity with current reporting KPIs (class trends, benchmarks, outcome-gap, small-cohort suppression) and interactivity.
- **FR-003**: All data access MUST honour role-based/row-level security so directors see only their authorised schools/classes.
- **FR-004**: Small-cohort suppression and existing privacy rules MUST be enforced identically (or more strictly) in the new app.
- **FR-005**: All Fabric data and compute MUST remain in EU-resident capacity with no cross-EU transfer.
- **FR-006**: The Fabric app MUST be integrated within the existing director portal navigation/shell for a consistent UX.
- **FR-007**: A configuration-driven migration path MUST allow switching between "powerbi-embedded" and "fabric-app" backends, with rollback, during transition.
- **FR-008**: The app MUST handle Fabric capacity/availability/auth failures gracefully (status messaging and optional fallback), never showing wrong numbers.
- **FR-009**: All director analytics access MUST be logged/auditable consistent with platform governance.
- **FR-010**: Aggregations and pagination MUST occur server-side in Fabric to keep the portal responsive for large datasets.

### Key Entities

- **FabricReportApp**: The Rayfin Fabric App instance (data-model: `RayfinAppConfig` / `rayfin.yml`) embedded in the director portal, with its Fabric-hosted backend and frontend visuals.
- **FabricDataset**: The governed, EU-resident Fabric data feeding the app (data-model: the `rayfin/data/` model over the existing mirror) — aggregates only (outcomes, trends, benchmarks).
- **ReportingBackendConfig**: Configuration selecting the active backend ("powerbi-embedded" | "fabric-app") and migration state, extending today's `config/reporting.json`.
- **DirectorScope**: Role/row-level security scope mapping a director to authorised schools/classes; passed to the embedded app as a portal-signed `ScopeContext` and enforced fail-closed in the Rayfin backend.
- **AnalyticsAccessLog**: Audit record of director analytics access (data-model: `ReportingAccessLog`) — report-access events written by the Rayfin backend and ingested by the portal into one shared trail.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: **100%** of director reporting is served by the Fabric (Rayfin) app from Fabric data, with **0** Power BI Embedded reports/tokens in the live path after migration.
- **SC-002**: **100%** parity (or improvement) on existing KPIs and suppression rules, validated against the current reporting output.
- **SC-003**: **0** instances of a director viewing data outside their authorised scope; **100%** of sub-threshold cohorts suppressed.
- **SC-004**: **100%** of Fabric data/compute remains in EU-resident capacity (verified by configuration/audit).
- **SC-005**: The reporting page renders within an acceptable latency budget (target p95 ≤ **5 seconds** initial, ≤ **2 seconds** on filter change).
- **SC-006**: Migration is reversible: switching backends via configuration works in **100%** of test runs without portal breakage.
- **SC-007**: Improved director analytics support data-informed interventions that advance the −26% outcome-gap KPI.

## Assumptions

- A Microsoft Fabric workspace with EU-resident capacity and governed datasets (outcomes, trends, benchmarks) is available to the director portal, with the **Fabric Apps (Rayfin) workload enabled in the tenant** (preview).
- "Rayfin" is Microsoft's Fabric Apps framework/CLI (confirmed): the app is scaffolded with `npm create @microsoft/rayfin` and deployed with `npx rayfin up`; its backend (incl. suppression/scope) is Fabric-hosted and reads the existing EU-resident mirrored analytics data.
- The current Power BI Embedded integration (`director-portal/reporting/report-config.js`, `config/reporting.json`, `/api/reporting/metadata`, `/api/reporting/embed/:id`) is the surface being replaced and provides the parity baseline.
- Authentication to Fabric uses governed, EU-resident identity; no learner PII is exposed in director aggregates beyond existing reporting.

## Constitution Check

| Principle | How this spec complies |
|---|---|
| I. EU-Resident, Data-Minimised | All Fabric data and compute stay in EU-resident capacity; aggregates only, with small-cohort suppression; no cross-EU transfer. |
| II. GDPR Art. 8 | Reporting shows governed aggregates, not raw children's PII; role/row-level security and suppression protect minors' data. |
| III. EU AI Act high-risk | This is a reporting/visualisation change, not an AI decision system; if any analytic model is surfaced, it inherits logging/transparency/override from its source feature. |
| IV. Teacher-in-the-loop | Directors view information to inform human decisions; the app takes no autonomous action on learners. |
| V. Pedagogical sign-off | KPI definitions and benchmarks remain those reviewed by Learning Sciences; presentation parity is validated. |
| VI. Outcome-contract driven | SC-007 ties improved analytics to the −26% outcome-gap KPI and data-informed interventions. |
| VII. Reproducible, spec-driven | Configuration-driven, reversible migration with measurable parity and residency criteria. |
