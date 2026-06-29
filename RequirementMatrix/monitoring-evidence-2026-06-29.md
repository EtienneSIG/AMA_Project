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

## P1 Browser Audit Completion

Completed at 2026-06-29 18:09 Europe/Paris using an isolated Microsoft Edge Playwright session from the automation session folder because the MCP browser profile remained locked.

| App | Status | Routes sampled | Persistent loading | Network/API errors | Console notes | Non-destructive exclusions |
|---|---|---:|---:|---:|---|---|
| learner | PASS | 6 | 0 | 0 | Generic browser 404 console message observed; targeted network trace did not surface app API failures. ONNX WASM fallback warning observed and app continued with JS fallback. | Create challenge, save sheet, send to teacher |
| parent | PASS | 4 | 0 | 0 | Generic browser 404 console message observed; no app API failures. | Save sheet |
| teacher | PASS | 6 | 0 | 0 | Generic browser 404 console message observed; no app API failures. | Send reply, save sheet, approval/moderation actions |
| admin | PASS | 2 | 0 | 0 | Generic browser 404 console message observed; no app API failures. | Reload, run health probe, save connector, generate export, create/start experiments, seed metrics |
| director | PASS | 3 | 0 | 0 | Generic browser 404 console message observed; no app API failures. | None encountered in sampled read-only routes |

### P1 Result

No P0/P1 functional regression was found in the read-only browser audit. All five apps loaded after demo sign-in, sampled safe routes rendered, and no persistent loading state was detected. Functions requiring mutation remain intentionally untested in non-destructive mode.
