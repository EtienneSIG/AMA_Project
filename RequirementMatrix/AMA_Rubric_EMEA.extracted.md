# AMA Rubric EMEA - Extracted Readiness Criteria

**Date**: 2026-06-29

## Extracted 60/60 Gate Criteria

The daily LearnEU readiness gate validates the following non-destructive criteria before a 60/60 remediation score can be claimed:

1. Runtime alignment: demo App Service infrastructure targets `NODE|22-lts`, and every demo app package declares `engines.node = 22.x`.
2. Reproducibility: every demo app with a `package.json` has a synchronized `package-lock.json` validated by `npm ci --dry-run`.
3. Source integrity: demo JavaScript files outside `node_modules` pass `node --check`.
4. Python integrity: demo Python sources compile with `python -m compileall -q demo`.
5. Monitoring evidence: daily monitoring/audit evidence exists in `RequirementMatrix`.
6. Agentic evidence: daily agentic handoff/state-graph evidence exists in `RequirementMatrix`.
7. Remediation closure: daily remediation file distinguishes initial score and remediated score.

## Non-Destructive Scope

The gate does not create, mutate, approve, reject, publish, start, stop, or delete deployed demo data. It validates source, metadata, lockfiles, and evidence artifacts only.
