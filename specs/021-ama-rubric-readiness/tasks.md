# Tasks: AMA Rubric Readiness Gate & Evidence Matrix

## Phase 1 - Evidence and Spec Kit

- [X] T001 Create Spec Kit spec/plan/tasks for the AMA readiness gate.
- [X] T002 Create `RequirementMatrix` daily evidence files for 2026-06-29.

## Phase 2 - Runtime and Reproducibility

- [X] T003 Add `engines.node = 22.x` to `demo/apps/director-fabric-app/package.json`.
- [X] T004 Generate missing synchronized lockfiles for director app surfaces.

## Phase 3 - Gate

- [X] T005 Add non-destructive `demo/scripts/verify-rubric-readiness.ps1`.
- [X] T006 Validate Node 22 runtime alignment in package metadata and bicep.
- [X] T007 Validate lockfiles with `npm ci --dry-run`.
- [X] T008 Validate JavaScript with `node --check` outside `node_modules`.
- [X] T009 Validate Python sources with `python -m compileall -q demo`.
- [X] T010 Validate RequirementMatrix monitoring, agentic handoff, and remediation closure evidence.

## Phase 4 - Finalization

- [X] T011 Run the final readiness gate from repo root.
- [ ] T012 Deploy Azure only after explicit deployment need and passing tests; no deployment required for local gate/evidence remediation.
