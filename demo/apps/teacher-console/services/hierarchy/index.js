'use strict';
// Feature 011 — Hierarchy governance service orchestrator.
// Composes the pure scope/approval/reporting/benchmarking logic with the
// EU-resident DB helpers. Fail-closed: returns { enabled:false } when the
// database is offline so callers can degrade gracefully.

const scope = require('./scope');
const approvalChain = require('./approvalChain');
const reporting = require('./reporting');
const benchmarking = require('./benchmarking');

function makeHierarchyService(db) {
  const live = () => Boolean(db && db.enabled);

  async function audit(evt) {
    try { if (live() && db.logHierarchyAudit) await db.logHierarchyAudit(evt); } catch (_) {}
  }

  return {
    scope, approvalChain, reporting, benchmarking,

    // --- Scope check (deny-by-default) -----------------------------------
    async scopeCheck({ user, grants, scopeNodeId, scopeLevel, learnerLevel = false }) {
      if (!live()) return { enabled: false };
      const superuser = scope.isSuperuser(user);
      let allowed = superuser;
      let reason = superuser ? 'superuser' : null;
      if (!allowed) {
        const grant = scope.resolveGrantForScope(grants, { scopeNodeId, scopeLevel });
        allowed = Boolean(grant);
        reason = grant ? 'grant' : 'no_active_grant';
      }
      // Learner-level drill-through is denied for aggregate-only roles.
      if (allowed && learnerLevel && !scope.mayAccessLearnerLevel(user, grants)) {
        allowed = false;
        reason = 'learner_level_denied';
      }
      await audit({
        eventType: allowed ? 'scope_check_pass' : 'scope_check_deny',
        actorUser: user && user.email, actorRole: user && user.role,
        scopeLevel, scopeNodeId,
        rationale: allowed ? null : reason,
        details: { learnerLevel }
      });
      return { enabled: true, allowed, reason };
    },

    // --- Hierarchy graph + grants (admin seed/manage) --------------------
    async createNode(p) { return live() ? db.createHierarchyNode(p) : { enabled: false }; },
    async linkNodes(p) { return live() ? db.createHierarchyEdge(p) : { enabled: false }; },
    async listNodes(p) { return live() ? db.listHierarchyNodes(p) : []; },
    async grantScope({ userEmail, role, scopeLevel, scopeNodeId, actor }) {
      if (!live()) return { enabled: false };
      const row = await db.createRoleScopeGrant({ userEmail, role, scopeLevel, scopeNodeId, grantedBy: actor });
      await audit({ eventType: 'role_transition', actorUser: actor, actorRole: 'admin', scopeLevel, scopeNodeId, subjectRefType: 'role_scope_grant', subjectRefId: row && row.id, details: { userEmail, role, kind: 'grant' } });
      return row;
    },
    async transitionRole({ userEmail, role, scopeLevel, scopeNodeId, actor }) {
      if (!live()) return { enabled: false };
      const row = await db.transitionRoleGrant({ userEmail, role, scopeLevel, scopeNodeId, actor });
      await audit({ eventType: 'role_transition', actorUser: actor, actorRole: 'admin', scopeLevel, scopeNodeId, subjectRefType: 'role_scope_grant', subjectRefId: row && row.id, rationale: 'role transition (revoke+grant)', details: { userEmail, role, kind: 'transition' } });
      return row;
    },
    async grantsFor(userEmail) { return live() ? db.listActiveGrants(userEmail) : []; },

    // --- District approval chain -----------------------------------------
    async submitForApproval({ contentRef, contentTitle, districtNodeId, submittedBy }) {
      if (!live()) return { enabled: false };
      const wf = await db.createDistrictWorkflow({ contentRef, contentTitle, districtNodeId, submittedBy });
      await audit({ eventType: 'approval_submitted', actorUser: submittedBy, scopeLevel: 'district', scopeNodeId: districtNodeId, subjectRefType: 'district_approval_workflow', subjectRefId: wf && wf.id, details: { contentRef } });
      return wf;
    },

    async decideApproval({ workflowId, decision, comment, actorRoles, user }) {
      if (!live()) return { enabled: false };
      const wf = await db.getDistrictWorkflow(workflowId);
      const plan = approvalChain.planDecision({
        workflow: wf, decision, comment,
        actorRoles: actorRoles || [], isSuperuser: scope.isSuperuser(user)
      });
      if (!plan.ok) return { ok: false, error: plan.error, requiredRole: plan.requiredRole };
      // Record the immutable decision step BEFORE the state move.
      await db.recordDistrictStep({
        workflowId, gateOrder: wf.current_gate_order, requiredRole: plan.requiredRole,
        decision, decisionNote: comment || null, decidedBy: user && user.email
      });
      const moved = await db.transitionDistrictWorkflow({
        id: workflowId, expectedLockVersion: wf.lock_version,
        nextState: plan.nextState, nextGateOrder: plan.nextGateOrder, resolved: plan.resolved
      });
      if (!moved) return { ok: false, error: 'concurrency_conflict' };
      await audit({
        eventType: plan.published ? 'approval_published' : 'approval_decided',
        actorUser: user && user.email, actorRole: user && user.role,
        scopeLevel: 'district', scopeNodeId: wf.district_node_id,
        subjectRefType: 'district_approval_workflow', subjectRefId: workflowId,
        rationale: (decision === 'approved') ? null : (comment || null),
        details: { decision, gate: wf.current_gate_order, newState: plan.nextState }
      });
      return { ok: true, workflow: moved, published: plan.published };
    },

    async recordSchoolDecision({ workflowId, schoolNodeId, decision, comment, variantContentRef, user }) {
      if (!live()) return { enabled: false };
      const wf = await db.getDistrictWorkflow(workflowId);
      if (!approvalChain.canRecordAdoption(wf)) return { ok: false, error: 'not_available_to_schools' };
      if (decision === 'adapt' && !String(variantContentRef || '').trim()) {
        return { ok: false, error: 'variant_required_for_adapt' };
      }
      const row = await db.recordSchoolAdoption({
        workflowId, schoolNodeId, decision, decisionNote: comment || null,
        variantContentRef: variantContentRef || null, decidedBy: user && user.email
      });
      await audit({
        eventType: 'school_adoption_decided', actorUser: user && user.email, actorRole: user && user.role,
        scopeLevel: 'school', scopeNodeId: schoolNodeId,
        subjectRefType: 'school_adoption_decision', subjectRefId: row && row.id,
        details: { decision, workflowId }
      });
      return { ok: true, decision: row };
    },

    async pendingApprovals(districtNodeId) { return live() ? db.listPendingDistrictApprovals(districtNodeId) : []; },
    async adoptionMetrics(workflowId) { return live() ? db.getAdoptionMetrics(workflowId) : null; },
    async approvalSteps(workflowId) { return live() ? db.listDistrictSteps(workflowId) : []; },

    // --- District dashboard ----------------------------------------------
    async districtDashboard({ districtNodeId, periodStart, periodEnd, subjectCode, user }) {
      if (!live()) return { enabled: false };
      const snaps = await db.schoolSnapshotsForScope({ rootId: districtNodeId, periodStart, periodEnd, subjectCode: subjectCode || null });
      const result = reporting.rollup(snaps);
      await audit({
        eventType: result.status === 'generated' ? 'report_generated' : (result.status === 'suppressed' ? 'report_suppressed' : 'report_blocked'),
        actorUser: user && user.email, actorRole: user && user.role,
        scopeLevel: 'district', scopeNodeId: districtNodeId,
        rationale: result.status === 'generated' ? null : result.status,
        details: { mode: 'district_dashboard', schoolCount: snaps.length }
      });
      return { enabled: true, ...result };
    },

    // --- Hierarchical report (district/region/national) ------------------
    async hierarchicalReport({ scopeLevel, scopeNodeId, dimension, periodStart, periodEnd, subjectCode, user }) {
      if (!live()) return { enabled: false };
      const snaps = await db.schoolSnapshotsForScope({ rootId: scopeNodeId, periodStart, periodEnd, subjectCode: subjectCode || null });
      const result = reporting.rollup(snaps);
      const reqRow = await db.createReportRequest({
        requestedBy: user && user.email, scopeLevel, scopeNodeId, dimension: dimension || 'school',
        periodStart, periodEnd, status: result.status,
        suppressionApplied: result.suppressionApplied, reidRiskFlag: result.reidRiskFlag
      });
      await audit({
        eventType: result.status === 'generated' ? 'report_generated' : (result.status === 'suppressed' ? 'report_suppressed' : 'report_blocked'),
        actorUser: user && user.email, actorRole: user && user.role,
        scopeLevel, scopeNodeId, subjectRefType: 'hierarchical_report_request', subjectRefId: reqRow && reqRow.id,
        rationale: result.status === 'generated' ? null : result.status,
        details: { dimension, lineageId: reqRow && reqRow.lineage_id }
      });
      return { enabled: true, request: reqRow, ...result };
    },

    // --- Peer benchmarking ------------------------------------------------
    async peerComparison({ schoolNodeId, districtNodeId, periodStart, periodEnd, subjectCode, user, sameCountry = true }) {
      if (!live()) return { enabled: false };
      // School metric = its own snapshot rollup.
      const schoolSnaps = await db.schoolSnapshotsForScope({ rootId: schoolNodeId, periodStart, periodEnd, subjectCode: subjectCode || null });
      const schoolAgg = reporting.rollup(schoolSnaps);
      const districtSnaps = districtNodeId ? await db.schoolSnapshotsForScope({ rootId: districtNodeId, periodStart, periodEnd, subjectCode: subjectCode || null }) : [];
      const districtAgg = reporting.rollup(districtSnaps);
      const sTot = schoolAgg.totals || { masteryRate: 0, completionRate: 0 };
      const dTot = districtAgg.totals || { masteryRate: 0, completionRate: 0 };
      const comparisons = ['mastery', 'completion'].map(metric => benchmarking.buildComparison({
        metricCode: metric,
        schoolValue: metric === 'mastery' ? sTot.masteryRate : sTot.completionRate,
        districtAverage: metric === 'mastery' ? dTot.masteryRate : dTot.completionRate,
        // National comparison only within the same country boundary policy.
        nationalAverage: sameCountry ? (metric === 'mastery' ? dTot.masteryRate : dTot.completionRate) : null
      }));
      const records = [];
      for (const c of comparisons) {
        const rec = await db.upsertPeerBenchmark({
          schoolNodeId, districtNodeId: districtNodeId || null, metricCode: c.metricCode,
          schoolValue: c.schoolValue, districtAverage: c.districtAverage, nationalAverage: c.nationalAverage,
          gapPercent: c.gapPercent, recommendationText: c.recommendationText
        });
        records.push(rec);
      }
      await audit({ eventType: 'benchmark_requested', actorUser: user && user.email, actorRole: user && user.role, scopeLevel: 'school', scopeNodeId: schoolNodeId, details: { metrics: comparisons.map(c => c.metricCode), sameCountry } });
      return { enabled: true, comparisons: records };
    },

    async collaborationRequest({ benchmarkId, requestStatus, user }) {
      if (!live()) return { enabled: false };
      const row = await db.setBenchmarkRequestStatus({ id: benchmarkId, requestStatus, requestedBy: user && user.email });
      await audit({ eventType: 'benchmark_requested', actorUser: user && user.email, actorRole: user && user.role, scopeLevel: 'school', scopeNodeId: row && row.school_node_id, subjectRefType: 'peer_benchmark_record', subjectRefId: benchmarkId, details: { requestStatus } });
      return { ok: true, record: row };
    },

    // --- Seed helper (reporting snapshot upsert) -------------------------
    async upsertSnapshot(p) { return live() ? db.upsertReportingSnapshot(p) : { enabled: false }; },

    // --- Audit ------------------------------------------------------------
    async auditTrail(p) { return live() ? db.listHierarchyAudit(p) : []; }
  };
}

module.exports = { makeHierarchyService };
