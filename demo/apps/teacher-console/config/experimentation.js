'use strict';
// Feature 012 — A/B Testing Framework configuration & policy thresholds.
// Centralises the governance-relevant constants so fairness, significance, and
// lifecycle services share a single source of truth.

module.exports = {
  // Lifecycle
  MIN_DURATION_DAYS: 7,
  MIN_SAMPLE_PER_VARIANT: 100, // warning threshold (policy-configurable)

  // Fairness (assignment parity): max allowed relative deviation of a stratum's
  // variant share from the target ratio before a flag is raised.
  FAIRNESS_MONITOR_DELTA: 0.10, // >10% relative skew => monitor
  FAIRNESS_HIGH_RISK_DELTA: 0.20, // >20% => high_risk (block)

  // Statistical significance
  ALPHA: 0.05, // two-sided significance level
  // Effect-size (Cohen's d) interpretation bands.
  EFFECT_BANDS: [
    { max: 0.2, label: 'negligible' },
    { max: 0.5, label: 'small' },
    { max: 0.8, label: 'medium' },
    { max: Infinity, label: 'large' }
  ],
  // Practical significance: minimum relative delta (%) that matters pedagogically.
  PRACTICAL_MIN_RELATIVE_DELTA_PCT: 5,

  // Monitoring
  FRESHNESS_SLA_MINUTES: 60,
  UNDERPERFORMANCE_REL_DROP_PCT: 15, // treatment > 15% worse than control => alert

  // Segmentation fairness
  SEGMENT_HIGH_RISK_P: 0.05,

  // Valid enums (mirror schema CHECK constraints)
  SUCCESS_METRICS: ['engagement', 'mastery', 'completion', 'time_on_task', 'custom'],
  EXPERIMENT_STATES: ['draft', 'validated', 'running', 'paused', 'completed', 'decided', 'archived'],
  DECISION_TYPES: ['continue', 'stop', 'investigate', 'adopt_variant', 'archive'],
  SEED_VERSION: 'v1'
};
