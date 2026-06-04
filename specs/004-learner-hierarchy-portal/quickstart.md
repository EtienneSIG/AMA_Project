# Quickstart: Learner Data Hierarchy and Director Portal

1. Confirm the EU-hosted demo environment is available and that the Fabric / Power BI reporting dependency is provisioned for the feature branch.
	- The director portal app must be provisioned through the same infra path as the existing demo apps (network integration + DB reachability).
	- A manually created web app without the expected network integration can serve UI and metadata endpoints but may time out on DB-backed hierarchy queries.
2. Seed or verify sample learner records with class, school, and region membership so that at least one complete hierarchy path exists and one exception path exists.
3. Sign in with a director identity that has an explicit school and region scope.
4. Open the director portal and confirm the landing state shows only aggregated reporting content.
5. Open the embedded report and verify the report renders for the authorized scope only.
6. Sign in with a user that does not have director scope and verify the portal shows a safe no-access state.
7. Change one learner hierarchy assignment and confirm the historical reporting view preserves the prior period while the current period reflects the new assignment.
8. Check the audit trail for portal access, report usage, and hierarchy change events.
9. Confirm incomplete hierarchy records are surfaced as exceptions and do not alter published totals.

## Reconciliation sample

- Query the hierarchy summary endpoint for a fixed date:
	- `GET /api/data/hierarchy?asOf=2026-06-01`
- Verify class, school, and region totals are coherent for the same learner population.
- Verify open exceptions are present when seeded conflict or missing-link cases exist.

## Audit expectations

- Access attempts: `director_portal_access` events include actor, role, scope, timestamp, outcome.
- Report usage: `director_report_usage` and `director-portal-session` events include report id and outcome.
- Configuration state: `reporting_config_state` is emitted when metadata is missing or fail-closed.
- Hierarchy updates: `hierarchy_change` events are expected whenever assignment updates are introduced.

## Success checks

- Rollups reconcile at class, school, and region levels.
- Unauthorized access never reveals embedded report content.
- Audit entries include actor role, scope, timestamp, and outcome.
- The first permitted report opens within the target latency window for authorized directors.

## Validation snapshot (2026-06-04)

- `verify-director-portal.ps1` passed against `https://app-director-portal-learneu-demo.azurewebsites.net`.
- `/api/reporting/metadata` returned `status=ready` with the approved `Director Governance Overview` report from the `EULearn` workspace.
- `/api/data/hierarchy/storage` confirmed live PostgreSQL counts after VNet integration: `learner_hierarchy_assignment=10`, `reporting_scope=3`, `hierarchy_exception=2`, `director_profile=2`.
- Director app VNet integration was added to `vnet-learneu-demo/snet-apps`, resolving private PostgreSQL reachability.