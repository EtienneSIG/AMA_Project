'use strict';
// Feature 011 — Multi-School Hierarchy governance routes.
// Mounted by the shared server.js (synced apps) and by the bespoke admin /
// director-portal servers. Every route self-gates by req.user.role and, where
// relevant, by scope-aware grants. Aggregate-only roles never receive learner
// fields; all rollups apply suppression + re-identification screening.

const { makeHierarchyService } = require('./services/hierarchy');

module.exports = function mountHierarchy(app, { db, APP_ROLE } = {}) {
  if (!app || !db) return;
  const svc = makeHierarchyService(db);

  function requireRole(roles) {
    return (req, res, next) => {
      const role = req.user && req.user.role;
      if (!role || !roles.includes(role)) {
        return res.status(403).json({ error: 'forbidden', detail: 'Insufficient role for hierarchy endpoint.' });
      }
      next();
    };
  }
  function guard(res) {
    if (!db.enabled) { res.status(503).json({ error: 'database not configured' }); return false; }
    return true;
  }
  async function actorRoles(req) {
    const grants = await svc.grantsFor(req.user && req.user.email);
    return { grants, roles: (grants || []).map(g => g.role) };
  }

  // ---- Scope check (any authenticated user) -----------------------------
  app.get('/api/hierarchy/rbac/scope-check', async (req, res) => {
    if (!guard(res)) return;
    const grants = await svc.grantsFor(req.user && req.user.email);
    const out = await svc.scopeCheck({
      user: req.user, grants,
      scopeNodeId: req.query.scopeNodeId,
      scopeLevel: req.query.scopeLevel || null,
      learnerLevel: String(req.query.learnerLevel || '') === 'true'
    });
    res.json(out);
  });

  // ---- Admin seed / hierarchy management --------------------------------
  app.post('/api/hierarchy/nodes', requireRole(['admin']), async (req, res) => {
    if (!guard(res)) return;
    const { nodeType, displayName, countryCode, externalRef } = req.body || {};
    if (!nodeType || !displayName) return res.status(400).json({ error: 'nodeType and displayName required' });
    const row = await svc.createNode({ nodeType, displayName, countryCode: countryCode || null, externalRef: externalRef || null });
    res.status(201).json({ node: row });
  });

  app.get('/api/hierarchy/nodes', requireRole(['admin', 'director']), async (req, res) => {
    if (!guard(res)) return;
    const rows = await svc.listNodes({ nodeType: req.query.nodeType || null, countryCode: req.query.countryCode || null });
    res.json({ nodes: rows });
  });

  app.post('/api/hierarchy/edges', requireRole(['admin']), async (req, res) => {
    if (!guard(res)) return;
    const { parentNodeId, childNodeId, changeReason } = req.body || {};
    if (!parentNodeId || !childNodeId) return res.status(400).json({ error: 'parentNodeId and childNodeId required' });
    const row = await svc.linkNodes({ parentNodeId, childNodeId, changeReason: changeReason || null, createdBy: req.user.email });
    res.status(201).json({ edge: row });
  });

  app.post('/api/hierarchy/grants', requireRole(['admin']), async (req, res) => {
    if (!guard(res)) return;
    const { userEmail, role, scopeLevel, scopeNodeId } = req.body || {};
    if (!userEmail || !role || !scopeLevel || !scopeNodeId) return res.status(400).json({ error: 'userEmail, role, scopeLevel, scopeNodeId required' });
    const row = await svc.grantScope({ userEmail, role, scopeLevel, scopeNodeId, actor: req.user.email });
    res.status(201).json({ grant: row });
  });

  app.post('/api/hierarchy/grants/transition', requireRole(['admin']), async (req, res) => {
    if (!guard(res)) return;
    const { userEmail, role, scopeLevel, scopeNodeId } = req.body || {};
    if (!userEmail || !role || !scopeLevel || !scopeNodeId) return res.status(400).json({ error: 'userEmail, role, scopeLevel, scopeNodeId required' });
    const row = await svc.transitionRole({ userEmail, role, scopeLevel, scopeNodeId, actor: req.user.email });
    res.json({ grant: row });
  });

  app.get('/api/hierarchy/grants/mine', async (req, res) => {
    if (!guard(res)) return;
    const rows = await svc.grantsFor(req.user && req.user.email);
    res.json({ grants: rows });
  });

  app.post('/api/hierarchy/snapshots', requireRole(['admin']), async (req, res) => {
    if (!guard(res)) return;
    const b = req.body || {};
    if (!b.periodStart || !b.periodEnd || !b.schoolNodeId) return res.status(400).json({ error: 'periodStart, periodEnd, schoolNodeId required' });
    const row = await svc.upsertSnapshot({
      periodStart: b.periodStart, periodEnd: b.periodEnd, schoolNodeId: b.schoolNodeId,
      subjectCode: b.subjectCode || 'ALL', cohortSize: Number(b.cohortSize || 0),
      enrollmentCount: Number(b.enrollmentCount || 0), completionRate: Number(b.completionRate || 0),
      masteryRate: Number(b.masteryRate || 0)
    });
    res.status(201).json({ snapshot: row });
  });

  // ---- District dashboard + hierarchical reporting ----------------------
  app.get('/api/hierarchy/district/dashboard', requireRole(['admin', 'director']), async (req, res) => {
    if (!guard(res)) return;
    const { districtNodeId, periodStart, periodEnd, subjectCode } = req.query;
    if (!districtNodeId || !periodStart || !periodEnd) return res.status(400).json({ error: 'districtNodeId, periodStart, periodEnd required' });
    const out = await svc.districtDashboard({ districtNodeId, periodStart, periodEnd, subjectCode: subjectCode || null, user: req.user });
    res.json(out);
  });

  app.get('/api/hierarchy/reporting/hierarchical', requireRole(['admin', 'director']), async (req, res) => {
    if (!guard(res)) return;
    const { scopeLevel, scopeNodeId, dimension, periodStart, periodEnd, subjectCode } = req.query;
    if (!scopeLevel || !scopeNodeId || !periodStart || !periodEnd) return res.status(400).json({ error: 'scopeLevel, scopeNodeId, periodStart, periodEnd required' });
    const out = await svc.hierarchicalReport({ scopeLevel, scopeNodeId, dimension: dimension || 'school', periodStart, periodEnd, subjectCode: subjectCode || null, user: req.user });
    res.json(out);
  });

  app.post('/api/hierarchy/reporting/hierarchical/export', requireRole(['admin', 'director']), async (req, res) => {
    if (!guard(res)) return;
    const b = req.body || {};
    if (!b.scopeLevel || !b.scopeNodeId || !b.periodStart || !b.periodEnd) return res.status(400).json({ error: 'scopeLevel, scopeNodeId, periodStart, periodEnd required' });
    const out = await svc.hierarchicalReport({ scopeLevel: b.scopeLevel, scopeNodeId: b.scopeNodeId, dimension: b.dimension || 'school', periodStart: b.periodStart, periodEnd: b.periodEnd, subjectCode: b.subjectCode || null, user: req.user });
    if (!out.enabled) return res.status(503).json({ error: 'database not configured' });
    // Export guard: only a generated (non-suppressed/blocked) report may be exported.
    if (out.status !== 'generated') {
      return res.status(409).json({ error: 'export_blocked', status: out.status, detail: 'Report is suppressed or blocked for review and cannot be exported.' });
    }
    res.json({ exported: true, format: 'pdf', lineageId: out.request && out.request.lineage_id, totals: out.totals });
  });

  // ---- District approval chain ------------------------------------------
  app.post('/api/hierarchy/district-approvals', requireRole(['admin', 'director']), async (req, res) => {
    if (!guard(res)) return;
    const { contentRef, contentTitle, districtNodeId } = req.body || {};
    if (!contentRef || !districtNodeId) return res.status(400).json({ error: 'contentRef and districtNodeId required' });
    const wf = await svc.submitForApproval({ contentRef, contentTitle: contentTitle || null, districtNodeId, submittedBy: req.user.email });
    res.status(201).json({ workflow: wf });
  });

  app.get('/api/hierarchy/district-approvals/pending', requireRole(['admin', 'director']), async (req, res) => {
    if (!guard(res)) return;
    const rows = await svc.pendingApprovals(req.query.districtNodeId || null);
    res.json({ pending: rows });
  });

  app.post('/api/hierarchy/district-approvals/:workflowId/decisions', requireRole(['admin', 'director']), async (req, res) => {
    if (!guard(res)) return;
    const { decision, comment } = req.body || {};
    const { roles } = await actorRoles(req);
    const out = await svc.decideApproval({ workflowId: req.params.workflowId, decision, comment, actorRoles: roles, user: req.user });
    if (out.enabled === false) return res.status(503).json({ error: 'database not configured' });
    if (!out.ok) return res.status(out.error === 'role_not_authorized' ? 403 : 409).json(out);
    res.json(out);
  });

  app.post('/api/hierarchy/district-approvals/:workflowId/school-decisions', requireRole(['admin', 'director']), async (req, res) => {
    if (!guard(res)) return;
    const { schoolNodeId, decision, comment, variantContentRef } = req.body || {};
    if (!schoolNodeId || !decision) return res.status(400).json({ error: 'schoolNodeId and decision required' });
    const out = await svc.recordSchoolDecision({ workflowId: req.params.workflowId, schoolNodeId, decision, comment, variantContentRef, user: req.user });
    if (out.enabled === false) return res.status(503).json({ error: 'database not configured' });
    if (!out.ok) return res.status(400).json(out);
    res.json(out);
  });

  app.get('/api/hierarchy/district-approvals/:workflowId/adoption-metrics', requireRole(['admin', 'director']), async (req, res) => {
    if (!guard(res)) return;
    const m = await svc.adoptionMetrics(req.params.workflowId);
    res.json({ metrics: m });
  });

  app.get('/api/hierarchy/district-approvals/:workflowId/steps', requireRole(['admin', 'director']), async (req, res) => {
    if (!guard(res)) return;
    const rows = await svc.approvalSteps(req.params.workflowId);
    res.json({ steps: rows });
  });

  // ---- Peer benchmarking -------------------------------------------------
  app.get('/api/hierarchy/benchmarking/peer-comparisons', requireRole(['admin', 'director']), async (req, res) => {
    if (!guard(res)) return;
    const { schoolNodeId, districtNodeId, periodStart, periodEnd, subjectCode, sameCountry } = req.query;
    if (!schoolNodeId || !periodStart || !periodEnd) return res.status(400).json({ error: 'schoolNodeId, periodStart, periodEnd required' });
    const out = await svc.peerComparison({ schoolNodeId, districtNodeId: districtNodeId || null, periodStart, periodEnd, subjectCode: subjectCode || null, user: req.user, sameCountry: String(sameCountry || 'true') !== 'false' });
    res.json(out);
  });

  app.post('/api/hierarchy/benchmarking/collaboration-requests', requireRole(['admin', 'director']), async (req, res) => {
    if (!guard(res)) return;
    const { benchmarkId, requestStatus } = req.body || {};
    if (!benchmarkId || !requestStatus) return res.status(400).json({ error: 'benchmarkId and requestStatus required' });
    const out = await svc.collaborationRequest({ benchmarkId, requestStatus, user: req.user });
    if (out.enabled === false) return res.status(503).json({ error: 'database not configured' });
    res.json(out);
  });

  // ---- Audit -------------------------------------------------------------
  app.get('/api/hierarchy/audit', requireRole(['admin', 'director']), async (req, res) => {
    if (!guard(res)) return;
    const rows = await svc.auditTrail({ eventType: req.query.eventType || null, limit: Number(req.query.limit || 100) });
    res.json({ events: rows });
  });
};
