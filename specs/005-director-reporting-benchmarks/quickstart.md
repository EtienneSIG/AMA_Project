# Quickstart: Director Reporting Benchmarks

1. Confirm the existing director portal from Feature 004 is healthy and the PostgreSQL-backed hierarchy and scope tables are reachable from the director portal app.
2. Seed or verify at least one establishment with:
   - two or more approved reporting periods,
   - multiple classes in scope,
   - one class large enough to show,
   - one class small enough to suppress,
   - one national benchmark snapshot for the selected metric.
3. Sign in as `director@learneu.demo` and verify `/api/auth/me` returns a granted director scope.
4. Call the reporting metadata endpoint and confirm it returns approved periods, metrics, and benchmark availability information for the current scope.
5. Call the class trend endpoint for one approved period pair and confirm only classes inside the authorized establishment are returned.
6. Call the benchmark endpoint for one approved metric and period and confirm the establishment value and national average use the same definition.
7. Verify at least one suppressed slice returns a suppression state and explanatory message instead of raw values.
8. Sign in as `director.noscope@learneu.demo` and verify metadata, trend, and benchmark calls fail closed.
9. Load the director portal UI and confirm the period selector, class trend section, and benchmark section render with plain-language explanations for suppression and unavailable data.
10. Review audit output and confirm portal access, reporting-period changes, benchmark opens, and suppression outcomes were logged.

## Suggested verification calls

- `GET /api/reporting/metadata`
- `GET /api/reporting/trends?periodId=<current>&previousPeriodId=<prior>&metricId=<metric>`
- `GET /api/reporting/benchmarks?periodId=<current>&metricId=<metric>`
- `POST /api/reporting/session`

## Success checks

- Authorized directors only receive establishment-scoped aggregated trend and benchmark data.
- Suppressed cohorts never expose exact underlying values.
- Missing national data is labeled as unavailable rather than misrepresented.
- No-scope users remain blocked from reporting data.
- Audit logs preserve actor, scope, period, metric, and outcome for each reporting interaction.