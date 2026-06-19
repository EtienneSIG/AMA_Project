# Director Reporting Contract

## Purpose

Define the interface boundary for the director reporting benchmark increment added on top of the existing director portal.

## Required behaviors

- The reporting surface must require an authenticated director with a non-empty authorized school or region scope.
- All trend and benchmark payloads must be aggregated-only and already filtered by the director's authorized scope before they reach the UI.
- The API must distinguish `ready`, `suppressed`, `missing-history`, and `benchmark-unavailable` states explicitly.
- The UI must explain what is being compared, which period is active, and whether privacy or data-availability rules changed the displayed result.
- Reporting remains advisory only and must not trigger learner-level actions automatically.

## Metadata contract

`GET /api/reporting/metadata`

Response fields:

- scope
- supportedPeriods[]
- supportedMetrics[]
- benchmarkAvailability[]
- reports[]
- status

Behavior:

- Returns only approved period and metric combinations.
- Fails closed when scope is absent.
- Includes enough metadata for the UI to avoid constructing unsupported comparisons.

## Class trend contract

`GET /api/reporting/trends?periodId=<id>&previousPeriodId=<id>&metricId=<id>`

Response fields:

- scope
- metric
- currentPeriod
- previousPeriod
- rows[]

Each row contains:

- classId
- classLabel
- status
- currentValue
- previousValue
- change
- trendDirection
- message

Behavior:

- Returns only classes within the authorized establishment.
- Uses `status=suppressed` when cohort rules block the slice.
- Uses `status=missing-history` when comparison data is incomplete.

## Benchmark contract

`GET /api/reporting/benchmarks?periodId=<id>&metricId=<id>`

Response fields:

- scope
- metric
- period
- benchmark

Benchmark object contains:

- status
- establishmentValue
- nationalAverageValue
- delta
- interpretation
- message

Behavior:

- Uses the same metric definition and reporting period for both sides of the comparison.
- Uses `status=benchmark-unavailable` when the national reference is incomplete or unpublished.
- Uses `status=suppressed` when the establishment slice is too small to show safely.

## Audit contract

Audit coverage required for:

- director portal access
- reporting-period selection
- benchmark view open
- suppression outcome returned
- blocked no-scope access

Minimum audit fields:

- actor_id
- actor_role
- school_scope
- region_scope
- period_id
- metric_id
- target_type
- target_id
- outcome
- correlation_id
- created_at