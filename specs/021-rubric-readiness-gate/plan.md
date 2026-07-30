# Implementation Plan: Rubric Readiness Gate and AMA Evidence

## Scope

Create a local non-destructive gate and daily evidence files that certify or block AMA 60/60 readiness.

## Technical Approach

- Add `demo/scripts/verify-rubric-readiness.ps1`.
- Maintain daily evidence in `RequirementMatrix/`.
- Keep checks deterministic and explicit; every failed prerequisite is a FAIL.
- Reuse existing package managers and static check surfaces only.

## Validation

- Run the gate from the repository root.
- Treat missing lockfiles, unsynchronized locks, syntax failures, or missing evidence as blocking FAIL.

