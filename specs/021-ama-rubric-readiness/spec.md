# Feature Specification: AMA Rubric Readiness Gate & Evidence Matrix

**Feature Branch**: `021-ama-rubric-readiness`

**Created**: 2026-06-29

**Status**: Draft

**Input**: Scheduled automation audit found the central `RequirementMatrix` folder and `demo/scripts/verify-rubric-readiness.ps1` gate missing, while the App Service runtime targets Node 22 LTS.

## User Scenarios & Testing

### User Story 1 - Keep AMA readiness measurable (Priority: P0)

As the demo owner, I need a non-destructive readiness gate that validates the AMA rubric evidence, runtime alignment, lockfile reproducibility, and source syntax before the demo is marked 60/60-ready.

**Independent Test**: Run `powershell -ExecutionPolicy Bypass -File .\demo\scripts\verify-rubric-readiness.ps1` from the repo root and confirm it exits 0 only when all required evidence and reproducibility checks pass.

**Acceptance Scenarios**:

1. **Given** the App Service infrastructure targets `NODE|22-lts`, **When** the gate runs, **Then** every deployed demo app package declares `engines.node = 22.x`.
2. **Given** a demo app has dependencies, **When** the gate runs, **Then** its `package-lock.json` is present and passes `npm ci --dry-run`.
3. **Given** JavaScript and Python demo sources exist, **When** the gate runs, **Then** JavaScript syntax and Python compilation checks pass without modifying durable app data.
4. **Given** RequirementMatrix evidence is required, **When** the gate runs, **Then** the rubric extraction, daily analysis, remediation closure, monitoring evidence, and agentic handoff evidence files are present and non-empty.

## Requirements

- **FR-001**: The readiness gate MUST be non-destructive and MUST NOT call deployed mutation endpoints.
- **FR-002**: The gate MUST validate Node runtime alignment between `demo/infra/modules/app-service.bicep` and demo app `package.json` files.
- **FR-003**: The gate MUST validate dependency reproducibility with `npm ci --dry-run` for every demo app that has a `package.json`.
- **FR-004**: The gate MUST run `node --check` on demo JavaScript source files outside `node_modules`.
- **FR-005**: The gate MUST run `python -m compileall -q demo`.
- **FR-006**: The gate MUST validate the required dated RequirementMatrix evidence files for the run date.
- **FR-007**: The gate MUST print PASS/FAIL details and exit non-zero if any required check fails.
- **FR-008**: Evidence files MUST distinguish initial score and remediated score, and MUST not include secrets, tokens, browser logs, or personal data dumps.

## Success Criteria

- **SC-001**: Final gate exits 0 before any run claims AMA 60/60.
- **SC-002**: 100% of demo app packages with dependencies have synchronized lockfiles.
- **SC-003**: Runtime, monitoring, agentic handoff, and remediation closure evidence is present in `RequirementMatrix`.
- **SC-004**: No destructive production data operation is required to validate the gate.

## Assumptions

- `director-fabric-app` is kept in the gate because it is part of the director/Fabric demo surface, even though the main App Service bicep currently deploys five apps.
- In scheduled mode, ambiguous evidence gaps are remediated conservatively by documenting evidence and adding non-destructive checks rather than changing deployed data.

## Constitution Check

| Principle | Compliance |
|---|---|
| EU-Resident, Data-Minimised | Evidence is local repo documentation and non-sensitive readiness metadata only. |
| GDPR Art. 8 | No learner/parent personal data is introduced or exported. |
| EU AI Act high-risk | Adds auditability and human-readable evidence for readiness claims. |
| Teacher-in-the-loop | No autonomous learner-affecting decision flow is changed. |
| Pedagogical sign-off | No pedagogy is changed; gate protects demo reliability. |
| Outcome-contract driven | Makes the 60/60 claim reproducible and measurable. |
| Reproducible, spec-driven | Adds a spec, plan, tasks, evidence, and executable gate before implementation claims. |
