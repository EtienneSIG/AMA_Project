'use strict';
// Feature 012 — Monitoring aggregation (pure logic).
// Folds raw per-learner metric events into per-variant summary snapshots with a
// 95% CI and a freshness indicator. DSR-excluded learners are dropped before
// aggregation (caller filters by is_excluded_from_analysis).

const significance = require('./significance-service');
const cfg = require('../config/experimentation');

// events: [{ variantId, variantKey, value }]
function aggregate(events, metricName) {
  const byVariant = new Map();
  for (const e of events || []) {
    if (!byVariant.has(e.variantId)) byVariant.set(e.variantId, { variantId: e.variantId, variantKey: e.variantKey, values: [] });
    byVariant.get(e.variantId).values.push(Number(e.value));
  }
  const snaps = [];
  for (const g of byVariant.values()) {
    const d = significance.describe(g.values);
    const ci = significance.ci95(d.mean, d.sd, d.n);
    snaps.push({
      variantId: g.variantId, variantKey: g.variantKey, metricName,
      sampleSizeN: d.n, meanValue: round2(d.mean), medianValue: round2(d.median),
      stdDev: round2(d.sd), ci95Low: round2(ci.low), ci95High: round2(ci.high)
    });
  }
  return snaps;
}

// Freshness: minutes since the most recent snapshot computed_at.
function freshness(latestComputedAt) {
  if (!latestComputedAt) return { lagMinutes: null, fresh: false };
  const lag = (Date.now() - new Date(latestComputedAt).getTime()) / 60000;
  return { lagMinutes: Math.round(lag), fresh: lag <= cfg.FRESHNESS_SLA_MINUTES };
}

function round2(n) { return Math.round(n * 100) / 100; }

module.exports = { aggregate, freshness };
