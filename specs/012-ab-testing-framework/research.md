# Research: A/B Testing Framework

## Decision 1: Deterministic stratified randomization in PostgreSQL-backed assignment service

- Decision: Use deterministic hash-based assignment with persisted variant allocations and optional stratification buckets (grade, school, baseline mastery quartile).
- Rationale: Ensures reproducible assignments, stable variant exposure across sessions, and balanced cohorts across hierarchy dimensions without runtime drift.
- Alternatives considered:
  - Pure random assignment at request time: rejected due to reproducibility and auditability risk.
  - External experimentation SaaS: rejected due to EU data residency and minimization constraints.

## Decision 2: PostgreSQL schema as source of truth for experiment lifecycle and assignments

- Decision: Store experiments, variants, assignment records, alerts, significance snapshots, segment outputs, and archive summaries in EU-hosted PostgreSQL with append-only audit tables.
- Rationale: Fits current architecture, supports transactional integrity for lifecycle transitions, and provides queryability for compliance audits.
- Alternatives considered:
  - Event store only: rejected due to added complexity and migration overhead for current stack.
  - In-memory cache as primary source: rejected due to durability and GDPR rights handling limitations.

## Decision 3: Near-real-time monitoring via incremental aggregation pipeline

- Decision: Implement rolling hourly aggregation jobs and daily statistical jobs producing dashboard-ready variant metrics and confidence intervals.
- Rationale: Meets <= 60 minute freshness target while avoiding expensive per-request statistical recomputation.
- Alternatives considered:
  - Batch-only end-of-day reporting: rejected because it cannot support timely harm detection and alerting.
  - Full streaming engine dependency: deferred to keep operational complexity aligned with current demo architecture.

## Decision 4: Statistical inference engine with explicit practical-significance thresholds

- Decision: Use a server-side statistics library (`simple-statistics` or equivalent) for mean/SD/CI/p-value/effect-size calculations, plus configurable practical-significance thresholds.
- Rationale: Provides transparent, reproducible calculations and prevents over-reliance on p-value alone for educational decisions.
- Alternatives considered:
  - Custom hand-rolled formulas only: rejected due to maintainability and validation risk.
  - Bayesian-only framework: deferred; may be introduced later after baseline frequentist workflow is operational.

## Decision 5: Fairness guardrails for assignment and outcome segmentation

- Decision: Add fairness diagnostics on both assignment parity and outcome parity across demographic/cohort segments; create alerts for skew/opposite effects.
- Rationale: Directly addresses Art. 5 prohibited-practices checks and constitutional anti-discrimination requirements.
- Alternatives considered:
  - Post-hoc fairness checks only at experiment end: rejected because harmful skew could persist during runtime.
  - No fairness guardrails for non-AI variants: rejected because differential harm can still occur in product experiments.

## Decision 6: Human oversight workflow for continuation and adoption

- Decision: Enforce decision states (`continue`, `stop`, `investigate`, `adopt`, `archive`) requiring named human actor + rationale; adoption requires teacher and pedagogical sign-off.
- Rationale: Enforces constitutional Principle IV/V and EU AI Act Art. 14 human oversight.
- Alternatives considered:
  - Auto-adopt winning variant when statistically significant: rejected as autonomous pedagogical decision.
  - Product-manager-only sign-off: rejected because pedagogical review is mandatory.

## Decision 7: GDPR handling for variant assignments and monitoring records

- Decision: Treat assignment records as pseudonymous learner processing; implement retention controls, role-scoped access, and DSR-aware exclusion markers for analysis jobs.
- Rationale: Meets GDPR Art. 8 protections while preserving auditability and statistical integrity metadata.
- Alternatives considered:
  - Hard delete all assignment traces on request: partially rejected because legal audit obligations require minimal retained audit metadata.
  - Keep full raw records indefinitely: rejected due to minimization and retention principles.

## Decision 8: Archive as searchable institutional learnings repository

- Decision: Archive complete experiment packets (hypothesis, design, outcomes, significance, fairness notes, decisions, lessons) with keyword and faceted search.
- Rationale: Prevents duplicate experiments and accelerates evidence-based iteration.
- Alternatives considered:
  - Store only final recommendation text: rejected due to weak reproducibility and poor compliance traceability.
  - Export-only archive without query API: rejected due to SC-006 search responsiveness requirements.
