# Feature Specification: Board FinOps & Governance Power BI Report (EULearn / Fabric)

**Feature Branch**: `023-board-finops-governance-report`

**Created**: 2026-07-30

**Status**: Draft

**Input**: User description: "Build a Power BI report for the board on Fabric ([EULearn workspace](https://app.powerbi.com/groups/127a12ab-fa94-421b-bee3-4f534264d3ff/list?ctid=63e6b296-bb9b-4234-81a1-0718d1ea9887&experience=fabric-developer)). The dashboard will help board members with cost per active user per month, model routing, recurring FinOps review, teacher time, localisation velocity, DPIA freshness …"

> **Scope guard** — This feature creates **new** Fabric items (a dedicated board semantic model and a board report) in the **EULearn** workspace. It does **not** modify any existing item (Director AppBackend `f51f6c63…`, `LearnEU - Director Reporting` semantic model `5f98fc5b…`, or any existing report). The board report is an additive, read-only governance surface.

## Clarifications

### Session 2026-07-30

- Q: Which workspace/capacity hosts the report? → A: **EULearn**, GUID `127a12ab-fa94-421b-bee3-4f534264d3ff`, tenant `63e6b296-bb9b-4234-81a1-0718d1ea9887`, on the EU-resident **F16** capacity.
- Q: Who is the audience? → A: **Board members / executive committee** — a quarterly/monthly governance and FinOps read-out, not an operational dashboard.
- Q: Which KPIs? → A: (1) **Cost per active user per month**, (2) **Model routing** (spend/volume mix across models), (3) **Recurring FinOps review** (monthly cost & token trend), (4) **Teacher time** (hours saved / response time), (5) **Localisation velocity** (terms localised per month per language), (6) **DPIA freshness** (age of the DPIA / governance register and overdue reviews).
- Q: Data residency & privacy? → A: The board report shows **aggregated, non-personal** figures only. All items stay in the EU-resident EULearn workspace. No cross-EU transfer; no learner-level personal data on the board surface.
- Q: Must it touch the existing director model/app? → A: **No.** A dedicated board semantic model is created so the existing director reporting stack is untouched.
- Q: Identity note. → A: All EULearn work uses the **`az` / Fabric REST** identity `esigwald@microsoft.com` (tenant `63e6b296…`); the Fabric MCP tools authenticate as a different (MSIT) identity that cannot see EULearn.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Board sees cost per active user and the FinOps trend (Priority: P1)

A board member opens the **Board FinOps & Governance** report in EULearn and immediately sees the current **cost per active user per month**, the total monthly platform cost, and the month-over-month trend, so they can judge whether unit economics are improving.

**Why this priority**: Unit economics (cost per active user) is the single most-asked board FinOps question; it anchors the whole read-out.

**Independent Test**: Open the report in the Fabric/Power BI portal; confirm a "Cost per active user" KPI card and a monthly trend line render with values.

**Acceptance Scenarios**:

1. **Given** the report, **When** it opens, **Then** a KPI card shows the latest **cost per active user (EUR/month)** and a line chart shows its monthly trend.
2. **Given** the report, **When** it opens, **Then** cards show **total monthly cost** and **monthly active users**.

---

### User Story 2 — Board reviews model routing and recurring FinOps (Priority: P1)

A board member reviews how spend and request volume are distributed across the AI models the platform routes to, and the recurring monthly cost/token trend, so they can govern model-mix decisions and budget.

**Why this priority**: Model routing is the main lever for FinOps optimisation; the board must see the mix behind the cost.

**Independent Test**: Confirm a model-routing chart (spend and/or volume per model) and a recurring FinOps trend render.

**Acceptance Scenarios**:

1. **Given** the report, **When** it opens, **Then** a chart breaks down **cost (and request share) by model**.
2. **Given** the report, **When** it opens, **Then** a recurring-FinOps visual shows **monthly cost and token volume** over time.

---

### User Story 3 — Board sees governance health: DPIA freshness, teacher time, localisation velocity (Priority: P1)

A board member checks non-financial governance and value signals: how fresh the DPIA / governance register is (and which reviews are overdue), how much teacher time the platform saves, and how fast localisation is progressing.

**Why this priority**: The board's accountability under the EU AI Act / GDPR requires visible evidence that governance artefacts are current and that the pedagogical value (teacher time) and localisation commitments are on track.

**Independent Test**: Confirm a governance-freshness visual (days since last review per artefact, overdue count), a teacher-time visual, and a localisation-velocity visual render.

**Acceptance Scenarios**:

1. **Given** the report, **When** it opens, **Then** a visual shows **days since last review** per governance artefact and a card shows the count of **overdue reviews**.
2. **Given** the report, **When** it opens, **Then** a card/visual shows **teacher hours saved** (and average response time).
3. **Given** the report, **When** it opens, **Then** a visual shows **localisation velocity** (terms localised per month, by language).

---

### User Story 4 — Additive, EU-resident, reproducible (Priority: P2)

The report and its semantic model are new EULearn items that leave existing reporting untouched, stay EU-resident, and can be rebuilt/redeployed from the committed definitions.

**Why this priority**: Operational safety (no regression to the live director stack) and Constitution I/II (EU residency, governed reporting).

**Independent Test**: From a fresh checkout run the deploy script; confirm it creates/updates only the board items and reports the existing director items are unchanged.

**Acceptance Scenarios**:

1. **Given** the committed definitions, **When** the deploy script runs, **Then** it creates a **new** board semantic model and a **new** board report in EULearn and does **not** modify existing items.
2. **Given** the target, **When** the deploy runs, **Then** items are created only in the EU-resident EULearn workspace (F16).

## Requirements *(mandatory)*

- **FR-001**: The report MUST render in the **EULearn** workspace (`127a12ab…`) as a Power BI report backed by a dedicated **board** semantic model.
- **FR-002**: The report MUST present, at minimum, these board KPIs: **cost per active user per month**, **total monthly cost**, **monthly active users**, **model routing** (cost/volume by model), **recurring FinOps** (monthly cost & token trend), **teacher time** (hours saved / response time), **localisation velocity** (terms per month by language), and **DPIA / governance freshness** (days since review + overdue count).
- **FR-003**: The report MUST show **aggregated, non-personal** figures only — no learner-level personal data on the board surface.
- **FR-004**: The board semantic model MUST be a **new** item and MUST NOT modify the existing `LearnEU - Director Reporting` model (`5f98fc5b…`), the Director AppBackend (`f51f6c63…`), or any existing report.
- **FR-005**: All items MUST stay EU-resident (EULearn / F16). No cross-EU transfer of personal data.
- **FR-006**: The semantic model and report MUST be **reproducible** from committed TMDL / report definitions plus a deploy script using the Fabric REST helpers (`work/fabric/FabricRest.ps1`).
- **FR-007**: The board figures MUST be modelled as governance-grade aggregates (board fixtures derived from platform telemetry categories: AI usage/cost, model mix, teacher Q&A, localisation glossary, and the governance/DPIA register). A production variant MAY later bind live to the EU-resident Postgres mirror the director model already uses; that binding is out of scope here and MUST NOT alter the existing model.
- **FR-008**: The governance register MUST include, per artefact, its **type** (DPIA / AI Act Annex IV / RAI / Records of Processing), **last-reviewed date**, **review interval**, and **owner**, so freshness and overdue status are computable.

## Success Criteria *(mandatory)*

- **SC-001**: Opening the board report shows cost per active user (card + monthly trend), total monthly cost, and active users.
- **SC-002**: The report shows model routing (cost/volume by model) and the recurring monthly FinOps trend.
- **SC-003**: The report shows DPIA/governance freshness (days since review per artefact + overdue count), teacher time, and localisation velocity.
- **SC-004**: The board semantic model and report exist as **new** items in EULearn; the director model/app and existing reports are byte-for-byte unchanged.
- **SC-005**: A fresh checkout can rebuild and redeploy the board items from committed definitions.

## Compliance & governance notes

- **EU AI Act / GDPR (Constitution I, II, IV)**: The board surface is aggregated and non-personal; it is a governance transparency artefact (it *reports on* DPIA freshness and does not process personal data). Residency: EULearn / F16 only.
- **Human oversight**: The report is decision-support for the board; it does not automate any decision. FinOps and governance actions remain human-owned.
- **Accountable agents**: EU AI Act Compliance Officer (governance register semantics), GDPR Children's Data Specialist (confirm no personal data on the board surface), Responsible AI Evaluator + Cross-Agent QA Verifier (sign-off before any production/live-data variant).
