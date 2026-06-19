// Feature 010 — Approval workflow state machine (pure, deterministic).
// Encodes the mandatory-gate sequence and the legal transitions. No I/O.
//
// States: draft -> submitted -> in_review -> (changes_requested|rejected) -> draft
//         in_review -> approved -> published (terminal for the snapshot)
//
// Transition guards (enforced here + re-checked server-side at the DB layer):
//   - The acting reviewer's capability must match the current step's required role.
//   - Optimistic lock token must match the stored lock_version.
//   - changes_requested / rejected require a non-empty comment.
//   - publish requires state=approved AND metadata completeness (checked by caller).

const TERMINAL = Object.freeze(['published']);

function isTerminal(state) {
  return TERMINAL.includes(state);
}

// Returns the role required to act on the current step, or null if none/await publish.
function currentRequiredRole(steps, currentStepOrder) {
  if (!Array.isArray(steps) || steps.length === 0) return null;
  const idx = (currentStepOrder || 1) - 1;
  return steps[idx] || null;
}

// Compute the next workflow shape after a decision. Pure — returns a plan object,
// never mutates. The caller persists via an optimistic-locked UPDATE.
function planDecision({ steps, currentStepOrder, decision, comment, actorCapabilities }) {
  const required = currentRequiredRole(steps, currentStepOrder);
  if (!required) {
    return { ok: false, error: 'NO_PENDING_STEP' };
  }
  if (!Array.isArray(actorCapabilities) || !actorCapabilities.includes(required)) {
    return { ok: false, error: 'ROLE_NOT_AUTHORIZED', requiredRole: required };
  }
  if ((decision === 'changes_requested' || decision === 'rejected') && (!comment || !String(comment).trim())) {
    return { ok: false, error: 'COMMENT_REQUIRED', requiredRole: required };
  }
  if (decision === 'changes_requested') {
    return { ok: true, nextState: 'changes_requested', nextStepOrder: currentStepOrder, requiredRole: required, versionState: 'changes_requested' };
  }
  if (decision === 'rejected') {
    return { ok: true, nextState: 'rejected', nextStepOrder: currentStepOrder, requiredRole: required, versionState: 'rejected' };
  }
  if (decision === 'approved') {
    const isLastStep = currentStepOrder >= steps.length;
    if (isLastStep) {
      return { ok: true, nextState: 'approved', nextStepOrder: currentStepOrder, requiredRole: required, versionState: 'approved', allGatesPassed: true };
    }
    return { ok: true, nextState: 'in_review', nextStepOrder: currentStepOrder + 1, requiredRole: required, versionState: 'in_review', allGatesPassed: false };
  }
  return { ok: false, error: 'UNKNOWN_DECISION' };
}

// Guard used before publish: workflow must be fully approved.
function canPublish(workflowState) {
  return workflowState === 'approved';
}

module.exports = {
  TERMINAL,
  isTerminal,
  currentRequiredRole,
  planDecision,
  canPublish,
};
