'use strict';
// Feature 011 — Scope-aware RBAC primitives (deny-by-default).
// Maps the seven hierarchy roles to scope levels and resolves whether an actor
// may access a requested scope node. Cohort minimum-disclosure constant lives
// here because reporting and benchmarking both depend on it.

const MIN_COHORT = 10; // GDPR Art. 8 / re-identification: minimum disclosable cohort.

// Which scope levels each role may operate at.
const ROLE_SCOPE_LEVELS = {
  teacher: ['school'],
  school_director: ['school'],
  district_pedagogist: ['district'],
  district_curriculum_lead: ['district'],
  district_director: ['district', 'region'],
  country_manager: ['region', 'country'],
  compliance_reviewer: ['district', 'region', 'country']
};

// Roles that may never see learner-level detail (aggregated-only above school).
const AGGREGATE_ONLY_ROLES = new Set([
  'district_pedagogist', 'district_curriculum_lead', 'district_director',
  'country_manager', 'compliance_reviewer'
]);

// District approval gate roles (mandatory; pedagogy gate first per Constitution V).
const APPROVAL_GATES = [
  { order: 1, role: 'district_pedagogist' },
  { order: 2, role: 'district_curriculum_lead' },
  { order: 3, role: 'country_manager' }
];

// Admin is a demo superuser that may act in any governance capacity.
function isSuperuser(user) {
  return user && (user.role === 'admin');
}

// Deny-by-default: return the matching active grant for a requested scope, or null.
function resolveGrantForScope(grants, { scopeNodeId, scopeLevel }) {
  if (!Array.isArray(grants)) return null;
  return grants.find(g =>
    g.status === 'active' &&
    String(g.scope_node_id) === String(scopeNodeId) &&
    (!scopeLevel || g.scope_level === scopeLevel)
  ) || null;
}

// Does the actor hold ANY active grant of one of the given roles?
function hasRole(grants, roles) {
  if (!Array.isArray(grants)) return false;
  const want = new Set(roles);
  return grants.some(g => g.status === 'active' && want.has(g.role));
}

// May this actor request learner-level drill-through? Only school-scope roles.
function mayAccessLearnerLevel(user, grants) {
  if (isSuperuser(user)) return true;
  if (!Array.isArray(grants)) return false;
  return grants.some(g => g.status === 'active' && !AGGREGATE_ONLY_ROLES.has(g.role) && g.scope_level === 'school');
}

module.exports = {
  MIN_COHORT,
  ROLE_SCOPE_LEVELS,
  AGGREGATE_ONLY_ROLES,
  APPROVAL_GATES,
  isSuperuser,
  resolveGrantForScope,
  hasRole,
  mayAccessLearnerLevel
};
