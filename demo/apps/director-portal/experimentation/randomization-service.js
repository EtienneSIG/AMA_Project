'use strict';
// Feature 012 — Deterministic stratified randomization (pure logic).
// Assignment is reproducible: hash(seed + experimentId + learnerKey) -> [0,1)
// mapped onto cumulative variant traffic weights. No PRNG state, no learner PII
// (caller supplies an opaque pseudonym).

const crypto = require('crypto');
const cfg = require('../config/experimentation');

// Stable hash in [0,1) from arbitrary string parts.
function hashUnit(...parts) {
  const h = crypto.createHash('sha256').update(parts.join('|')).digest();
  // Use the first 6 bytes as an unsigned integer for a stable fraction.
  const n = h.readUIntBE(0, 6);
  return n / 0xffffffffffff;
}

// Resolve which variant a unit value falls into given ordered variants.
function variantForUnit(variants, unit) {
  const ordered = [...variants].sort((a, b) => (a.variant_key < b.variant_key ? -1 : 1));
  const total = ordered.reduce((s, v) => s + Number(v.traffic_weight || 0), 0) || 1;
  let cum = 0;
  for (const v of ordered) {
    cum += Number(v.traffic_weight || 0) / total;
    if (unit < cum) return v;
  }
  return ordered[ordered.length - 1];
}

// Deterministic assignment for one learner.
// strata may include grade/school/mastery bucket; it is recorded but, for
// stratified balancing, the stratum is folded into the hash so each stratum is
// independently balanced across variants.
function assignOne({ seed, experimentId, learnerPseudonym, variants, strata = {}, method = 'stratified_hash' }) {
  const stratumKey = method === 'stratified_hash'
    ? Object.keys(strata).sort().map(k => `${k}=${strata[k]}`).join(',')
    : '';
  const unit = hashUnit(seed || cfg.SEED_VERSION, experimentId, stratumKey, learnerPseudonym);
  const variant = variantForUnit(variants, unit);
  return { variant, unit, seedVersion: cfg.SEED_VERSION, method };
}

module.exports = { hashUnit, variantForUnit, assignOne };
