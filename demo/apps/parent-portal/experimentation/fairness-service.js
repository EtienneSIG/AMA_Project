'use strict';
// Feature 012 — Fairness diagnostics (pure logic).
// Two surfaces:
//  1) Assignment parity — does each stratum receive variants close to target ratio?
//  2) Differential impact — do segment outcomes move in opposite directions?
// Outputs a status of none / monitor / high_risk so the orchestrator can block
// rollout on high-risk skew (Art. 5 anti-discrimination, Art. 10 governance).

const cfg = require('../config/experimentation');

// Assignment parity across a set of strata. `assignmentsByStratum` is a map:
//   { stratumLabel: { variantKey: count } }
// `targets` is { variantKey: targetShare } summing to ~1.
function assignmentParity(assignmentsByStratum, targets) {
  const flags = [];
  let worst = 'none';
  for (const [stratum, counts] of Object.entries(assignmentsByStratum || {})) {
    const total = Object.values(counts).reduce((s, n) => s + Number(n || 0), 0);
    if (total === 0) continue;
    for (const [vk, target] of Object.entries(targets || {})) {
      const share = (Number(counts[vk] || 0)) / total;
      const rel = target > 0 ? Math.abs(share - target) / target : 0;
      let level = 'none';
      if (rel > cfg.FAIRNESS_HIGH_RISK_DELTA) level = 'high_risk';
      else if (rel > cfg.FAIRNESS_MONITOR_DELTA) level = 'monitor';
      if (level !== 'none') {
        flags.push({ stratum, variantKey: vk, observedShare: round3(share), targetShare: target, relativeSkew: round3(rel), level });
        if (level === 'high_risk') worst = 'high_risk';
        else if (worst !== 'high_risk') worst = 'monitor';
      }
    }
  }
  return { status: worst, flags };
}

// Differential impact for a single segment comparison.
// Returns fairness_flag + opposite-effect boolean given control/treatment means
// of an overall positive experiment vs this segment.
function segmentFairness({ overallDeltaPct, segmentDeltaPct, pValue }) {
  const opposite = (Number(overallDeltaPct) >= 0) !== (Number(segmentDeltaPct) >= 0) && Math.abs(Number(segmentDeltaPct)) > 0.0001;
  let flag = 'none';
  if (opposite && pValue != null && pValue <= cfg.SEGMENT_HIGH_RISK_P) flag = 'high_risk';
  else if (opposite) flag = 'monitor';
  return { isOppositeEffect: opposite, fairnessFlag: flag };
}

function round3(n) { return Math.round(n * 1000) / 1000; }

module.exports = { assignmentParity, segmentFairness };
