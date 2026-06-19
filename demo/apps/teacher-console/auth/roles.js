// Feature 010 — Shared governance role constants.
// These roles gate the CMS approval state machine. They are *capability* claims
// layered on top of the base APP_ROLE (admin/teacher/...). In the demo, admins
// hold all governance capabilities; production maps them from the IdP claim set.

const GOVERNANCE_ROLES = Object.freeze({
  PEDAGOGY_LEAD: 'pedagogy_lead',
  COMPLIANCE_LEAD: 'compliance_lead',
  LOCALIZATION_LEAD: 'localization_lead',
  CURRICULUM_LEAD: 'curriculum_lead',
});

const ALL_GOVERNANCE_ROLES = Object.freeze(Object.values(GOVERNANCE_ROLES));

// Mandatory gates that can never be removed from a publishable route.
const MANDATORY_SOURCE_GATES = Object.freeze(['pedagogy_lead', 'compliance_lead']);
const MANDATORY_LOCALIZATION_GATES = Object.freeze(['localization_lead', 'pedagogy_lead', 'compliance_lead']);

function isGovernanceRole(role) {
  return ALL_GOVERNANCE_ROLES.includes(role);
}

// In the demo, an authenticated admin may act as any governance reviewer.
// A real deployment resolves capabilities from the federated identity claims.
function capabilitiesFor(user) {
  if (!user) return [];
  if (user.role === 'admin') return ALL_GOVERNANCE_ROLES.slice();
  const claimed = Array.isArray(user.governanceRoles) ? user.governanceRoles : [];
  return claimed.filter(isGovernanceRole);
}

function canActAs(user, requiredRole) {
  return capabilitiesFor(user).includes(requiredRole);
}

module.exports = {
  GOVERNANCE_ROLES,
  ALL_GOVERNANCE_ROLES,
  MANDATORY_SOURCE_GATES,
  MANDATORY_LOCALIZATION_GATES,
  isGovernanceRole,
  capabilitiesFor,
  canActAs,
};
