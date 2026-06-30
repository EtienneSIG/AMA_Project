# AMA Rubric EMEA - extracted readiness controls

Date: 2026-06-30

This artifact captures the local, non-destructive readiness controls used for the LearnEU AMA remediation gate.

## Controls

- Runtime parity: demo App Service infrastructure must target `NODE|22-lts`; every demo app must declare `engines.node = 22.x`.
- Dependency reproducibility: every demo app must include a synchronized `package-lock.json` validated with `npm ci --dry-run --ignore-scripts`.
- Static runtime safety: every JavaScript file under `demo/` outside `node_modules` must pass `node --check`.
- Python demo safety: `python -m compileall -q demo` must pass.
- Monitoring evidence: RequirementMatrix must contain daily monitoring/audit evidence.
- Agentic handoff evidence: RequirementMatrix must contain daily state graph / handoff evidence.
- Remediation closure: RequirementMatrix must distinguish initial score from remediated score and list remaining gaps.

