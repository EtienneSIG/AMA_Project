# Tasks: Rubric Readiness Gate and AMA Evidence

## Phase 1 - Gate and evidence

- [x] T001 Create `demo/scripts/verify-rubric-readiness.ps1`.
- [x] T002 Create daily RequirementMatrix evidence files.
- [x] T003 Add `engines.node = 22.x` to `demo/apps/director-fabric-app/package.json`.

## Phase 2 - Lockfile completion

- [x] T004 Generate and commit `demo/apps/director-portal/package-lock.json`.
- [x] T005 Generate and commit `demo/apps/director-fabric-app/package-lock.json`.
- [x] T006 Run `npm ci --dry-run --ignore-scripts` for every demo app.

## Phase 3 - Final validation and publication

- [x] T007 Run `powershell -ExecutionPolicy Bypass -File .\demo\scripts\verify-rubric-readiness.ps1`.
- [ ] T008 Commit, push, and open PR after the gate passes.

