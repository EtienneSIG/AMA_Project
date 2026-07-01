# Tasks: Rubric Readiness Gate and AMA Evidence

## Phase 1 - Gate and evidence

- [x] T001 Create `demo/scripts/verify-rubric-readiness.ps1`.
- [x] T002 Create daily RequirementMatrix evidence files for 2026-06-30.
- [x] T003 Add `engines.node = 22.x` to `demo/apps/director-fabric-app/package.json`.

## Phase 2 - Lockfile completion

- [ ] T004 Generate and commit `demo/apps/director-portal/package-lock.json`.
- [ ] T005 Generate and commit `demo/apps/director-fabric-app/package-lock.json`.
- [ ] T006 Run `npm ci --dry-run --ignore-scripts` for every demo app.

## Phase 3 - Final validation and publication

- [ ] T007 Run `powershell -ExecutionPolicy Bypass -File .\demo\scripts\verify-rubric-readiness.ps1`.
- [ ] T008 Create branch `automation/learneu-audit-fixes-20260630-1442`.
- [ ] T009 Commit, push, and open PR after the gate passes.

