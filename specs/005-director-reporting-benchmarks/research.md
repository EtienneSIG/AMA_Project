# Research Notes: Director Reporting Benchmarks

## Decision 1: Extend the existing director portal instead of adding a new reporting service

- Decision: Implement the feature by extending `demo/apps/director-portal/` and the shared DB helper layer already introduced by Feature 004.
- Rationale: The current portal already owns director authentication, fail-closed scope handling, audit logging, and reporting metadata discovery. Adding a new service would widen the architecture without improving the demo increment.
- Alternatives considered: A separate reporting microservice or moving the feature into the admin app. Rejected because both options add routing and governance surface area that the current demo does not need.

## Decision 2: Keep benchmark and trend logic in shared helpers, not in the browser

- Decision: Compute trend, benchmark, suppression, and unavailable-data states in backend helpers before returning JSON to the UI.
- Rationale: Suppression and scope enforcement are compliance controls, not presentation concerns. Keeping them server-side prevents accidental learner-level leakage from client-side filtering or derived calculations.
- Alternatives considered: Computing comparison deltas in browser code after fetching broad aggregates. Rejected because it weakens the privacy boundary and makes audit reasoning harder.

## Decision 3: Treat reporting periods and metric definitions as approved reference data

- Decision: Model reporting periods and metric definitions explicitly for the feature increment and expose only approved combinations through reporting metadata.
- Rationale: The spec requires comparability across periods and against the national average. Approved period and metric metadata gives the UI a constrained contract and reduces inconsistent comparisons.
- Alternatives considered: Letting the UI build arbitrary period comparisons from raw dates. Rejected because that would create ambiguous comparisons and increase the risk of misuse.

## Decision 4: Make suppression and unavailable data first-class result states

- Decision: Return explicit result states such as `suppressed`, `missing-history`, `benchmark-unavailable`, and `ready` for trend and benchmark endpoints.
- Rationale: The feature depends on small-cohort protection and accurate interpretation. Distinguishing these states in the API keeps the UI honest and auditable.
- Alternatives considered: Returning empty arrays or nulls without explanation. Rejected because it makes it hard for directors and reviewers to tell whether data is missing, blocked, or truly absent.

## Decision 5: Extend the existing portal audit pattern rather than inventing a parallel audit store

- Decision: Reuse the current director portal session and audit-event pattern for benchmark opens, period changes, and suppression outcomes.
- Rationale: Feature 004 already established the audit trail expected for director reporting. Extending the same pattern preserves continuity and keeps verification simple.
- Alternatives considered: UI-only analytics or a separate benchmark audit table. Rejected because the current audit model is already sufficient for the demo increment.

## Decision 6: Keep Power BI embed optional for this increment

- Decision: The benchmark and class-trend increment should be deliverable as native portal cards and tables even if Power BI embed remains configured for the broader reporting view.
- Rationale: The user asked for an increment implementable in the current demo by extending helpers, APIs, and UI. Native benchmark payloads fit that goal and avoid coupling all new functionality to Fabric embed availability.
- Alternatives considered: Requiring a new Power BI report for every trend and benchmark interaction. Rejected because it slows iteration and weakens the self-contained demo path.