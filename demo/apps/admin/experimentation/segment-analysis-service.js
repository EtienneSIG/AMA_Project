'use strict';
// Feature 012 — Segment analysis (pure logic).
// Given per-segment control/treatment value arrays, computes per-dimension
// effect deltas, significance, opposite-effect detection, and a fairness flag.

const significance = require('./significance-service');
const fairness = require('./fairness-service');

// segments: [{ dimensionKey, dimensionValue, controlValues:[...], treatmentValues:[...] }]
// (control/treatment also accepted as aliases). overallDeltaPct is the
// experiment-level relative delta used as the sign reference.
function analyze(segments, overallDeltaPct) {
  const results = [];
  for (const seg of segments || []) {
    const control = seg.controlValues || seg.control || [];
    const treatment = seg.treatmentValues || seg.treatment || [];
    const cmp = significance.compare(control, treatment);
    if (!cmp.ok) {
      results.push({
        dimensionKey: seg.dimensionKey, dimensionValue: seg.dimensionValue,
        controlMean: round2(meanOf(control)), treatmentMean: round2(meanOf(treatment)),
        deltaPct: 0, pValue: null, sampleSizeN: (control || []).length + (treatment || []).length,
        isOppositeEffect: false, fairnessFlag: 'none', insufficient: true
      });
      continue;
    }
    const fair = fairness.segmentFairness({ overallDeltaPct, segmentDeltaPct: cmp.relativeDeltaPct, pValue: cmp.pValue });
    results.push({
      dimensionKey: seg.dimensionKey, dimensionValue: seg.dimensionValue,
      controlMean: round2(cmp.control.mean), treatmentMean: round2(cmp.treatment.mean),
      deltaPct: cmp.relativeDeltaPct, pValue: cmp.pValue,
      sampleSizeN: cmp.control.n + cmp.treatment.n,
      isOppositeEffect: fair.isOppositeEffect, fairnessFlag: fair.fairnessFlag
    });
  }
  return results;
}

function meanOf(xs) { const a = (xs || []).map(Number).filter(Number.isFinite); return a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0; }
function round2(n) { return Math.round(n * 100) / 100; }

module.exports = { analyze };
