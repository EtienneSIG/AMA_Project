'use strict';
// Feature 012 — Adoption governance (pure logic).
// adopt_variant is the only decision that rolls a variant beyond experiment
// scope. It is blocked unless BOTH a teacher sign-off and a pedagogy_reviewer
// sign-off exist (Constitution IV teacher-in-the-loop + V pedagogical sign-off,
// AI Act Art. 14 human oversight). Statistical output alone can never adopt.

const REQUIRED_SIGNOFFS = ['teacher', 'pedagogy_reviewer'];

function missingSignoffs(signoffs) {
  const have = new Set((signoffs || []).map(s => s.signoff_role));
  return REQUIRED_SIGNOFFS.filter(r => !have.has(r));
}

// Gate an adoption decision. Returns { ok } or { ok:false, error, missing }.
function canAdopt(signoffs) {
  const missing = missingSignoffs(signoffs);
  if (missing.length) return { ok: false, error: 'signoff_required', missing };
  return { ok: true };
}

// Validate a generic decision: rationale is mandatory for every human decision.
function validateDecision({ decisionType, rationale, signoffs }) {
  if (!decisionType) return { ok: false, error: 'decision_type_required' };
  if (!String(rationale || '').trim()) return { ok: false, error: 'rationale_required' };
  if (decisionType === 'adopt_variant') return canAdopt(signoffs);
  return { ok: true };
}

module.exports = { REQUIRED_SIGNOFFS, missingSignoffs, canAdopt, validateDecision };
