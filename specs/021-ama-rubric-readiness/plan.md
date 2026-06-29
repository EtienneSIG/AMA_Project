# Implementation Plan: AMA Rubric Readiness Gate & Evidence Matrix

## Technical Context

The demo repo already has feature-specific verification scripts but no central 60/60 readiness gate and no root `RequirementMatrix` evidence folder. The App Service bicep targets `NODE|22-lts`, so app package metadata and lockfiles must be aligned.

## Implementation

1. Create `RequirementMatrix` evidence files for 2026-06-29.
2. Add `demo/scripts/verify-rubric-readiness.ps1` as a non-destructive gate.
3. Align `director-fabric-app` with Node 22 and add missing package locks for reproducible `npm ci --dry-run`.
4. Validate with existing syntax/build surfaces: `npm ci --dry-run`, `node --check`, `python -m compileall -q demo`, feature smoke scripts where safe.

## Non-Regression Strategy

- Gate fails if runtime metadata drifts from Node 22.
- Gate fails if any package lock is missing or out of sync.
- Gate fails if required RequirementMatrix files are missing or empty.
- Gate preserves deployed data by using local source checks and lockfile dry-runs.

## Risks

- Existing black-box browser automation was unavailable because the Playwright MCP profile was locked. Use read-only HTTP checks as fallback and document the limitation.
- Some feature-level smoke tests contact deployed services and may depend on environment availability; the final readiness gate focuses on deterministic non-destructive readiness checks.
