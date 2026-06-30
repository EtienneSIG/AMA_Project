# Agentic handoff evidence - 2026-06-30

## State graph

1. Precheck repository paths and required files.
2. Read Spec Kit index.
3. Run read-only public app checks.
4. Map findings to rubric/runtime readiness.
5. Create gate and evidence artifacts.
6. Stop on repository shell/git validation denial.

## Handoff

Next human or agent action:

1. Open a writable shell in `C:\Users\esigwald\01_Dev\AMA_Project`.
2. Generate missing lockfiles with `npm install --package-lock-only` in `demo/apps/director-portal` and `demo/apps/director-fabric-app`.
3. Run `powershell -ExecutionPolicy Bypass -File .\demo\scripts\verify-rubric-readiness.ps1`.
4. Commit only the gate, evidence, spec, lockfile, and runtime changes if the gate passes.

