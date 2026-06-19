# Data Model: Director Reporting Benchmarks

## ReportingPeriod

- Purpose: Approved time window that directors may use for trend and benchmark comparisons.
- Key fields: period_id, label, starts_on, ends_on, sequence, status, published_at.
- Rules: Only approved and published periods are exposed to the UI; historical comparisons must use the same approved period definitions that were active at publication time.

## MetricDefinition

- Purpose: Describes the approved metric a director can compare over time or against the national average.
- Key fields: metric_id, display_name, description, unit, aggregation_method, comparison_basis, status.
- Rules: A metric must be defined once and used consistently across establishment and national benchmark calculations.

## ClassTrendSnapshot

- Purpose: Aggregated value for one class in one establishment for one reporting period.
- Key fields: period_id, metric_id, class_id, school_id, aggregated_value, cohort_size, trend_direction, change_vs_prior, suppression_state.
- Rules: A snapshot is never returned to the UI with raw cohort-identifying values when suppression applies.

## EstablishmentBenchmarkSnapshot

- Purpose: Aggregated establishment value compared with the approved national average for the same metric and period.
- Key fields: period_id, metric_id, school_id, establishment_value, national_average_value, delta_vs_national, comparability_state, suppression_state.
- Rules: Establishment and national values must use the same metric definition and reporting period; non-comparable or delayed benchmarks must be labeled explicitly.

## SuppressionDecision

- Purpose: Captures whether a trend or benchmark slice was shown, generalized, or withheld.
- Key fields: decision_id, target_type, target_id, metric_id, period_id, reason_code, threshold_version, output_state, decided_at.
- Rules: Suppression decisions must be derivable from approved policy and auditable after display.

## ReportingAuditEvent

- Purpose: Compliance record for benchmark access, reporting-period selection, blocked scope, and suppressed result viewing.
- Key fields: event_type, actor_id, actor_role, school_scope, region_scope, period_id, metric_id, target_id, outcome, correlation_id, created_at.
- Rules: Audit events must record enough context to reconstruct what a director was allowed to see and what the portal actually returned.

---

## Suppression Policy (PHASE 0 RESEARCH - FINAL APPROVAL REQUIRED)

### Approved Cohort Size Thresholds

**Primary Rule (K-Anonymity):**
- **Minimum class cohort to display**: 10 learners
- **Minimum establishment cohort to display**: 30 learners  
- **Minimum national benchmark pool**: 100 learners (aggregated across all sampled establishments)

**Rationale**: 
- Class level (10) allows teacher-focused reporting while preventing re-identification of individual learners in small rural or specialized classes.
- Establishment level (30) balances director visibility with GDPR safety for small schools.
- National benchmark (100) ensures statistical reliability and aggregate-only disclosure.

### Secondary Rule (Re-Identification Risk)

A trend or benchmark slice MUST be suppressed if:
1. The target class or establishment has fewer than the minimum cohort threshold (above), OR
2. Visible breakdown would allow a director to infer learner identity through combination of visible metrics and known school context (e.g., "only girl in advanced math" inference), OR
3. A metric value would reveal a single learner's outcome indirectly (e.g., "class mean score 95% when max is 100% and only one learner could achieve this").

### Suppression Output States

When a result is suppressed, the portal MUST clearly communicate the reason to the director:

| State | User-Facing Message | Example |
|---|---|---|
| `ready` | (Normal display) | "Class trend: Q1→Q2 +5% engagement" |
| `suppressed_cohort_too_small` | "Detail withheld: Class has fewer than [threshold] learners. Showing establishment aggregate instead." | Class "2B" with 8 learners; show school total instead |
| `suppressed_re_identification_risk` | "Detail withheld to protect learner privacy. Contact your program analyst for approved cross-tab analysis." | Single-learner inference risk detected |
| `benchmark_unavailable` | "National average for [metric] not yet available for [period]. Last available: [prior_period]." | Latest period incomplete nationally |
| `missing_history` | "Insufficient history: Establishment onboarded [date]. First comparable trend available [next_period]." | New school, no prior period to compare |
| `incomplete_period` | "Data for [period] is still being finalized. Showing [status %] complete. Refresh [date]." | Period not yet closed |

### Enforcement Points

Suppression rules are checked and enforced **before any data leaves the backend helper layer**:

1. **GET /api/reporting/metadata** — Suppress unavailable periods; signal which metrics are unavailable for the current period.
2. **GET /api/reporting/trends** — Suppress individual class rows that fall below threshold; show establishment aggregate instead; mark suppression in response.
3. **GET /api/reporting/benchmarks** — Suppress benchmark if national average is unavailable or establishment cohort too small; return appropriate state message.
4. **Any export or shared view** — Apply the same suppression rules to downloaded data and shareable links.

### Threshold Governance

- **Approval authority**: EU AI Act Compliance Officer + GDPR Children's Data Specialist (joint sign-off required)
- **Review frequency**: Annual or when learner population model changes materially
- **Change process**: Any threshold change requires a new DPIA delta and re-approval before deployment
- **Documentation**: Thresholds and approval dates recorded in specs/005-director-reporting-benchmarks/checklists/gdpr-ai-act-compliance.md

**Status (2026-06-18)**: Thresholds proposed above; awaiting Phase 0 research finalization and compliance sign-off.