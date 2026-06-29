# Monitoring Evidence - 2026-06-29

## Evidence Summary

The readiness gate validates that monitoring and audit evidence exists before claiming AMA 60/60.

## Source Evidence

- `demo/scripts/acceptance_tests.ps1` includes Monitor, App Service, Key Vault, APIM/AOAI, AI Search, AML, Fabric, Content Safety, and Purview checks.
- `demo/scripts/verify-director-portal.ps1`, `verify-hierarchy-011.ps1`, `verify-app-shell-019.ps1`, and `verify-ux-020.ps1` provide feature-level smoke checks.
- `demo/infra/modules/app-service.bicep` configures Linux App Services with diagnostics-related app settings and Node 22 runtime.

## Daily Audit Result

- Monitoring evidence file present: PASS.
- Final readiness gate required before score claim: PASS only when `verify-rubric-readiness.ps1` exits 0.

## Data Minimization

This evidence records only repo-level readiness metadata and does not include personal data, tokens, browser logs, or production dumps.
