'use strict';
// Feature 012 — Statistical significance (pure logic, no external deps).
// Welch's two-sample t-test (unequal variances) with a normal-approximation
// two-sided p-value, Cohen's d effect size, and a 95% CI on the mean difference.
// Suitable for the demo's continuous engagement/mastery metrics.

const cfg = require('../config/experimentation');

// Summary stats from an array of numbers.
function describe(values) {
  const xs = (values || []).map(Number).filter(v => Number.isFinite(v));
  const n = xs.length;
  if (n === 0) return { n: 0, mean: 0, median: 0, sd: 0 };
  const mean = xs.reduce((s, v) => s + v, 0) / n;
  const variance = n > 1 ? xs.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1) : 0;
  const sd = Math.sqrt(variance);
  const sorted = [...xs].sort((a, b) => a - b);
  const median = n % 2 ? sorted[(n - 1) / 2] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
  return { n, mean, median, sd, variance };
}

// Standard normal CDF (Abramowitz & Stegun 7.1.26 approximation).
function normalCdf(z) {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp(-z * z / 2);
  let p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return z > 0 ? 1 - p : p;
}

// 95% CI half-width on a mean given sd and n (normal approx, z=1.96).
function ci95(mean, sd, n) {
  if (n < 2) return { low: mean, high: mean };
  const se = sd / Math.sqrt(n);
  const h = 1.96 * se;
  return { low: mean - h, high: mean + h };
}

function effectLabel(d) {
  const a = Math.abs(d);
  return (cfg.EFFECT_BANDS.find(b => a < b.max) || { label: 'large' }).label;
}

// Welch two-sample comparison of control vs treatment value arrays.
function compare(controlValues, treatmentValues) {
  const c = describe(controlValues);
  const t = describe(treatmentValues);
  if (c.n < 2 || t.n < 2) {
    return { ok: false, reason: 'insufficient_sample', control: c, treatment: t };
  }
  const seDiff = Math.sqrt(c.variance / c.n + t.variance / t.n) || 1e-9;
  const meanDiff = t.mean - c.mean;
  const tStat = meanDiff / seDiff;
  const pValue = 2 * (1 - normalCdf(Math.abs(tStat)));
  // Pooled SD for Cohen's d.
  const pooledSd = Math.sqrt(((c.n - 1) * c.variance + (t.n - 1) * t.variance) / (c.n + t.n - 2)) || 1e-9;
  const cohensD = meanDiff / pooledSd;
  const relDeltaPct = c.mean !== 0 ? (meanDiff / Math.abs(c.mean)) * 100 : 0;
  const ciT = ci95(t.mean, t.sd, t.n);
  return {
    ok: true,
    control: c, treatment: t,
    pValue: round4(pValue),
    tStat: round4(tStat),
    effectSize: round4(cohensD),
    effectInterpretation: effectLabel(cohensD),
    absoluteDelta: round4(meanDiff),
    relativeDeltaPct: round2(relDeltaPct),
    isStatisticallySignificant: pValue < cfg.ALPHA,
    ci95Low: round4(ciT.low),
    ci95High: round4(ciT.high)
  };
}

function round2(n) { return Math.round(n * 100) / 100; }
function round4(n) { return Math.round(n * 10000) / 10000; }

module.exports = { describe, normalCdf, ci95, compare, effectLabel };
