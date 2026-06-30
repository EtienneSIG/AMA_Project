# Feature Specification: Rubric Readiness Gate and AMA Evidence

**Feature Branch**: `021-rubric-readiness-gate`

**Created**: 2026-06-30

**Status**: Draft

## User Scenarios & Testing

### User Story 1 - Non-destructive 60/60 readiness gate (Priority: P0)

An evaluator runs one local script and receives a deterministic PASS/FAIL view of AMA rubric readiness without mutating Azure, app data, or user-visible state.

**Independent Test**: From the repository root, run `powershell -ExecutionPolicy Bypass -File .\demo\scripts\verify-rubric-readiness.ps1`; the script reports all checks and exits non-zero on any FAIL.

## Requirements

- **FR-001**: The gate MUST be non-destructive and read only.
- **FR-002**: The gate MUST verify Node 22 parity between demo app `package.json` files and App Service Bicep.
- **FR-003**: The gate MUST verify lockfile presence and `npm ci --dry-run --ignore-scripts` for every demo app.
- **FR-004**: The gate MUST run `node --check` over demo JavaScript outside `node_modules`.
- **FR-005**: The gate MUST run `python -m compileall -q demo`.
- **FR-006**: The gate MUST verify daily RequirementMatrix monitoring, agentic handoff, and remediation evidence.
- **FR-007**: 60/60 MUST NOT be claimed unless the gate exits successfully with zero FAIL.

## Compliance

The feature is audit-only and must not expose learner data, mutate tenant state, or send outbound content.

