'use strict';
// Feature 012 — Experiment lifecycle guardrails (pure logic).
// draft -> validated -> running -> paused -> completed -> decided -> archived
// Every transition is validated; illegal transitions are rejected with a reason.

const ALLOWED = {
  draft: ['validated'],
  validated: ['running', 'draft'],
  running: ['paused', 'completed'],
  paused: ['running', 'completed'],
  completed: ['decided'],
  decided: ['archived'],
  archived: []
};

function canTransition(from, to) {
  return Boolean(ALLOWED[from] && ALLOWED[from].includes(to));
}

// Pre-start validation: returns { ok, warnings, errors }.
function validateForStart({ experiment, variants, projectedCohort }) {
  const errors = [];
  const warnings = [];
  if (!experiment) errors.push('experiment_not_found');
  if (!variants || variants.length < 2) errors.push('need_at_least_two_variants');
  if (variants && variants.filter(v => v.is_control).length !== 1) errors.push('exactly_one_control_required');
  const totalWeight = (variants || []).reduce((s, v) => s + Number(v.traffic_weight || 0), 0);
  if (variants && variants.length && Math.abs(totalWeight - 1) > 0.001) errors.push('traffic_weights_must_sum_to_1');
  if (experiment && Number(experiment.min_duration_days || 0) < 7) errors.push('duration_must_be_at_least_7_days');
  if (projectedCohort != null && projectedCohort < 100) warnings.push('cohort_below_recommended_minimum_100');
  return { ok: errors.length === 0, errors, warnings };
}

module.exports = { ALLOWED, canTransition, validateForStart };
