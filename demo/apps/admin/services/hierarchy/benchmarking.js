'use strict';
// Feature 011 — Peer benchmarking + best-practice recommendation rules (pure).
// Compares a school metric against district/national baselines and produces an
// approved-template recommendation when the gap is material. National comparison
// is permitted only within the same country boundary (enforced by the caller).

const GAP_THRESHOLD = 10; // percentage points considered material.

const RECOMMENDATION_TEMPLATES = {
  mastery: 'Mastery is {gap} pts below the district average. Consider peer lesson-study with higher-performing schools and targeted small-group remediation.',
  completion: 'Completion is {gap} pts below the district average. Review pacing, scaffolding and check-in cadence with the curriculum lead.',
  default: 'Performance on {metric} trails the district average by {gap} pts. Initiate a peer review to identify transferable practices.'
};

function computeGap(schoolValue, districtAverage) {
  const s = Number(schoolValue || 0);
  const d = Number(districtAverage || 0);
  return Math.round((d - s) * 10) / 10; // positive => school is behind.
}

function recommendationFor({ metricCode, gapPercent }) {
  if (gapPercent < GAP_THRESHOLD) return null;
  const tpl = RECOMMENDATION_TEMPLATES[metricCode] || RECOMMENDATION_TEMPLATES.default;
  return tpl.replace('{gap}', String(gapPercent)).replace('{metric}', metricCode);
}

// Build a comparison record for one metric.
function buildComparison({ metricCode, schoolValue, districtAverage, nationalAverage = null }) {
  const gapPercent = computeGap(schoolValue, districtAverage);
  return {
    metricCode,
    schoolValue: Number(schoolValue || 0),
    districtAverage: Number(districtAverage || 0),
    nationalAverage: nationalAverage == null ? null : Number(nationalAverage),
    gapPercent,
    recommendationText: recommendationFor({ metricCode, gapPercent })
  };
}

module.exports = { GAP_THRESHOLD, computeGap, recommendationFor, buildComparison };
