'use strict';
// Feature 012 — Practical-significance policy + advisory recommendation (pure).
// Maps a statistical comparison onto a NON-binding recommended action. Adoption
// is never automated: review_for_adoption still requires teacher + pedagogy
// sign-off downstream (Constitution IV/V, AI Act Art. 14).

const cfg = require('../config/experimentation');

function isPracticallySignificant(relativeDeltaPct) {
  return Math.abs(Number(relativeDeltaPct || 0)) >= cfg.PRACTICAL_MIN_RELATIVE_DELTA_PCT;
}

// Decide an advisory action from a significance comparison result.
function recommend(cmp) {
  if (!cmp || !cmp.ok) return { recommendedAction: 'investigate', isPracticallySignificant: false, rationale: 'Insufficient sample for a reliable comparison.' };
  const practical = isPracticallySignificant(cmp.relativeDeltaPct);
  // Treatment significantly worse than control -> stop.
  if (cmp.isStatisticallySignificant && cmp.absoluteDelta < 0) {
    return { recommendedAction: 'stop', isPracticallySignificant: practical, rationale: 'Treatment significantly underperforms control; advise stopping. Human decision required.' };
  }
  // Significant + practically meaningful improvement -> review for adoption (human-gated).
  if (cmp.isStatisticallySignificant && practical && cmp.absoluteDelta > 0) {
    return { recommendedAction: 'review_for_adoption', isPracticallySignificant: true, rationale: 'Statistically and practically significant improvement; route to teacher + pedagogy review (no autonomous rollout).' };
  }
  // Significant but tiny effect -> keep gathering / investigate.
  if (cmp.isStatisticallySignificant) {
    return { recommendedAction: 'investigate', isPracticallySignificant: practical, rationale: 'Significant but below the practical-importance threshold; investigate before any decision.' };
  }
  return { recommendedAction: 'continue', isPracticallySignificant: practical, rationale: 'No significant difference yet; continue the experiment.' };
}

module.exports = { isPracticallySignificant, recommend };
