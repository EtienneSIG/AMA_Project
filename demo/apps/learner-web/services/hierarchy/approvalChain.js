'use strict';
// Feature 011 — District approval chain state machine (pure logic).
// Gates are mandatory and ordered: district_pedagogist -> district_curriculum_lead
// -> country_manager. The pedagogy gate is first per Constitution V. There is no
// autonomous publish: every gate decision is a named human action with rationale
// required for changes_requested / rejected.

const { APPROVAL_GATES } = require('./scope');

function gateForOrder(order) {
  return APPROVAL_GATES.find(g => g.order === order) || null;
}

// Plan the next workflow state given a decision at the current gate.
// Returns { ok, error?, nextState, nextGateOrder, requiredRole, resolved, published }.
function planDecision({ workflow, decision, comment, actorRoles, isSuperuser }) {
  if (!workflow) return { ok: false, error: 'workflow_not_found' };
  if (!['submitted', 'in_review'].includes(workflow.state)) {
    return { ok: false, error: 'workflow_not_open' };
  }
  const gate = gateForOrder(workflow.current_gate_order);
  if (!gate) return { ok: false, error: 'invalid_gate' };

  // Human oversight (Art. 14): actor must hold the required role for this gate.
  const roleSet = new Set(actorRoles || []);
  if (!isSuperuser && !roleSet.has(gate.role)) {
    return { ok: false, error: 'role_not_authorized', requiredRole: gate.role };
  }

  if ((decision === 'changes_requested' || decision === 'rejected') && !String(comment || '').trim()) {
    return { ok: false, error: 'comment_required' };
  }

  if (decision === 'rejected') {
    return { ok: true, nextState: 'rejected', nextGateOrder: workflow.current_gate_order, requiredRole: gate.role, resolved: true, published: false };
  }
  if (decision === 'changes_requested') {
    return { ok: true, nextState: 'changes_requested', nextGateOrder: 1, requiredRole: gate.role, resolved: false, published: false };
  }
  if (decision === 'approved') {
    const isLast = workflow.current_gate_order >= APPROVAL_GATES.length;
    if (isLast) {
      return { ok: true, nextState: 'available_to_schools', nextGateOrder: workflow.current_gate_order, requiredRole: gate.role, resolved: true, published: true };
    }
    return { ok: true, nextState: 'in_review', nextGateOrder: workflow.current_gate_order + 1, requiredRole: gate.role, resolved: false, published: false };
  }
  return { ok: false, error: 'invalid_decision' };
}

// May a school record an adoption decision for this workflow?
function canRecordAdoption(workflow) {
  return Boolean(workflow && workflow.state === 'available_to_schools');
}

module.exports = { gateForOrder, planDecision, canRecordAdoption, APPROVAL_GATES };
