// Feature 010 — Approval policy resolution.
// Resolves the ordered reviewer-role sequence for a given content/branch type,
// guaranteeing the non-removable mandatory gates (AI Act Art. 14 human oversight,
// Constitution V pedagogical sign-off, localization-lead gate for branches).

const { MANDATORY_SOURCE_GATES, MANDATORY_LOCALIZATION_GATES } = require('../../auth/roles');

// Default routes used when no DB policy override is configured.
const DEFAULT_SOURCE_STEPS = Object.freeze(['pedagogy_lead', 'compliance_lead']);
const DEFAULT_LOCALIZATION_STEPS = Object.freeze(['localization_lead', 'pedagogy_lead', 'compliance_lead']);

// Ensures mandatory gates are present and correctly ordered. Mandatory gates are
// appended (preserving order) if a custom policy omitted them — fail safe, never
// fail open.
function enforceMandatoryGates(steps, branchType) {
  const required = branchType === 'localization' ? MANDATORY_LOCALIZATION_GATES : MANDATORY_SOURCE_GATES;
  const out = Array.isArray(steps) && steps.length ? steps.slice() : [];
  for (const gate of required) {
    if (!out.includes(gate)) out.push(gate);
  }
  // For localization, the localization_lead must come first.
  if (branchType === 'localization' && out[0] !== 'localization_lead') {
    const filtered = out.filter((r) => r !== 'localization_lead');
    return ['localization_lead', ...filtered];
  }
  return out;
}

function defaultSteps(branchType) {
  return branchType === 'localization' ? DEFAULT_LOCALIZATION_STEPS.slice() : DEFAULT_SOURCE_STEPS.slice();
}

// Given an optional DB policy row, return the effective ordered steps.
function resolveSteps(policyRow, branchType) {
  let steps = null;
  if (policyRow && policyRow.steps_json) {
    steps = Array.isArray(policyRow.steps_json) ? policyRow.steps_json : null;
  }
  if (!steps || !steps.length) steps = defaultSteps(branchType);
  return enforceMandatoryGates(steps, branchType);
}

module.exports = {
  DEFAULT_SOURCE_STEPS,
  DEFAULT_LOCALIZATION_STEPS,
  enforceMandatoryGates,
  defaultSteps,
  resolveSteps,
};
