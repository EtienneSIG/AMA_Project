'use strict';
// Feature 012 — Alert detection (pure logic).
// Derives runtime safety/fairness alerts from current snapshots + fairness state.
// The orchestrator persists whatever this returns.

const cfg = require('../config/experimentation');

// Detect underperformance: treatment mean materially below control mean.
function detectUnderperformance(controlMean, treatmentSnaps) {
  const out = [];
  for (const t of treatmentSnaps || []) {
    if (controlMean > 0) {
      const dropPct = ((controlMean - Number(t.mean_value || 0)) / controlMean) * 100;
      if (dropPct >= cfg.UNDERPERFORMANCE_REL_DROP_PCT) {
        out.push({
          alertType: 'underperformance',
          severity: dropPct >= cfg.UNDERPERFORMANCE_REL_DROP_PCT * 2 ? 'critical' : 'warning',
          message: `Variant ${t.variant_key} is ${dropPct.toFixed(1)}% below control on ${t.metric_name}.`
        });
      }
    }
  }
  return out;
}

// Sample drift: a variant's sample size is far from its expected share.
function detectSampleDrift(snaps) {
  const total = (snaps || []).reduce((s, x) => s + Number(x.sample_size_n || 0), 0);
  if (total === 0 || !snaps || snaps.length < 2) return [];
  const expected = total / snaps.length;
  const out = [];
  for (const s of snaps) {
    const rel = expected > 0 ? Math.abs(Number(s.sample_size_n || 0) - expected) / expected : 0;
    if (rel > 0.5) {
      out.push({ alertType: 'sample_drift', severity: 'warning', message: `Variant ${s.variant_key} sample size deviates ${(rel * 100).toFixed(0)}% from expected.` });
    }
  }
  return out;
}

// Fairness escalation from assignment-parity or segment fairness state.
function fairnessAlerts(fairnessStatus, detail) {
  if (fairnessStatus === 'high_risk') {
    return [{ alertType: 'fairness_skew', severity: 'critical', message: detail || 'High-risk fairness skew detected; rollout blocked pending review.' }];
  }
  if (fairnessStatus === 'monitor') {
    return [{ alertType: 'fairness_skew', severity: 'warning', message: detail || 'Fairness skew above monitoring threshold.' }];
  }
  return [];
}

module.exports = { detectUnderperformance, detectSampleDrift, fairnessAlerts };
