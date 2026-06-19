'use strict';
// Feature 012 — A/B Testing Framework routes.
// Mounted by the shared server.js (synced apps: learner/parent/teacher) and by
// the bespoke admin / director-portal servers. Every mutating route self-gates
// by req.user.role. Statistical output is advisory; adopt_variant is blocked
// without teacher + pedagogy sign-off. All actions append to an immutable audit.

const { makeExperimentService } = require('./experimentation');

module.exports = function mountExperiments(app, { db, APP_ROLE } = {}) {
  if (!app || !db) return;
  const svc = makeExperimentService(db);

  function requireRole(roles) {
    return (req, res, next) => {
      const role = req.user && req.user.role;
      if (!role || !roles.includes(role)) {
        return res.status(403).json({ ok: false, error: 'forbidden', detail: 'Insufficient role for experiments endpoint.' });
      }
      next();
    };
  }
  function guard(res) {
    if (!db.enabled) { res.status(503).json({ ok: false, error: 'database not configured' }); return false; }
    return true;
  }
  function ctxOf(req) { return { actor: req.user && req.user.email, actorRole: req.user && req.user.role }; }

  // ---- Definition --------------------------------------------------------
  app.post('/api/experiments', requireRole(['admin']), async (req, res) => {
    if (!guard(res)) return;
    const b = req.body || {};
    if (!b.name || !b.hypothesis || !b.successMetric) return res.status(400).json({ ok: false, error: 'name, hypothesis, successMetric required' });
    if (!Array.isArray(b.variants) || b.variants.length < 2) return res.status(400).json({ ok: false, error: 'at least two variants required' });
    const out = await svc.createExperiment({
      name: b.name, hypothesis: b.hypothesis, description: b.description || null, successMetric: b.successMetric,
      targetSegmentJson: b.targetSegment || {}, plannedDurationDays: b.plannedDurationDays || null,
      minSamplePerVariant: b.minSamplePerVariant || null, createdBy: req.user.email,
      variants: b.variants
    }, ctxOf(req));
    if (out && out.enabled === false) return res.status(503).json({ ok: false, error: 'database not configured' });
    res.status(201).json(out);
  });

  app.get('/api/experiments', requireRole(['admin', 'director']), async (req, res) => {
    if (!guard(res)) return;
    const rows = await svc.listExperiments({ status: req.query.status || null });
    res.json({ ok: true, experiments: rows });
  });

  app.get('/api/experiments/:id', requireRole(['admin', 'director']), async (req, res) => {
    if (!guard(res)) return;
    const out = await svc.getExperimentBundle(req.params.id);
    if (out && out.ok === false) return res.status(404).json(out);
    res.json(out);
  });

  // ---- Validation + lifecycle -------------------------------------------
  app.post('/api/experiments/:id/validate', requireRole(['admin']), async (req, res) => {
    if (!guard(res)) return;
    const out = await svc.validate(req.params.id, ctxOf(req));
    if (out && out.ok === false) return res.status(out.error === 'experiment_not_found' ? 404 : 422).json(out);
    res.json(out);
  });

  app.post('/api/experiments/:id/start', requireRole(['admin']), async (req, res) => {
    if (!guard(res)) return;
    const cohort = Array.isArray(req.body && req.body.cohort) ? req.body.cohort : [];
    const out = await svc.start({ id: req.params.id, cohort, ctx: ctxOf(req) });
    if (out && out.ok === false) {
      const code = out.error === 'experiment_not_found' ? 404 : (out.error === 'fairness_block' ? 409 : 422);
      return res.status(code).json(out);
    }
    res.json(out);
  });

  // ---- Assignments -------------------------------------------------------
  app.get('/api/experiments/:id/assignments/summary', requireRole(['admin', 'director']), async (req, res) => {
    if (!guard(res)) return;
    res.json(await svc.assignmentSummary(req.params.id));
  });

  app.get('/api/experiments/:id/assignments/lookup', requireRole(['admin']), async (req, res) => {
    if (!guard(res)) return;
    const out = await svc.getAssignmentForLearner({ experimentId: req.params.id, learnerPseudonym: req.query.learner });
    res.json({ ok: true, assignment: out || null });
  });

  // DSR / consent-revocation exclusion.
  app.post('/api/experiments/:id/assignments/exclude', requireRole(['admin']), async (req, res) => {
    if (!guard(res)) return;
    const b = req.body || {};
    if (!b.learner) return res.status(400).json({ ok: false, error: 'learner required' });
    const out = await svc.dsr.exclude({ experimentId: req.params.id, learnerPseudonym: b.learner, reason: b.reason || 'dsr_request', ...ctxOf(req) });
    res.json(out);
  });

  // ---- Monitoring --------------------------------------------------------
  app.post('/api/experiments/:id/snapshots', requireRole(['admin']), async (req, res) => {
    if (!guard(res)) return;
    const b = req.body || {};
    if (!b.metricName || !Array.isArray(b.events)) return res.status(400).json({ ok: false, error: 'metricName and events[] required' });
    const out = await svc.ingestSnapshot({ id: req.params.id, metricName: b.metricName, events: b.events, ctx: ctxOf(req) });
    res.json(out);
  });

  app.get('/api/experiments/:id/monitoring', requireRole(['admin', 'director']), async (req, res) => {
    if (!guard(res)) return;
    res.json(await svc.monitoringView(req.params.id));
  });

  app.get('/api/experiments/:id/alerts', requireRole(['admin', 'director']), async (req, res) => {
    if (!guard(res)) return;
    res.json({ ok: true, alerts: await svc.listAlerts({ experimentId: req.params.id, status: req.query.status || null }) });
  });

  app.post('/api/experiments/:id/alerts/:alertId/acknowledge', requireRole(['admin']), async (req, res) => {
    if (!guard(res)) return;
    const out = await svc.acknowledgeAlert({ alertId: req.params.alertId, by: req.user.email, experimentId: req.params.id, ctx: ctxOf(req) });
    if (out && out.ok === false) return res.status(404).json(out);
    res.json(out);
  });

  // ---- Significance ------------------------------------------------------
  app.post('/api/experiments/:id/significance', requireRole(['admin', 'director']), async (req, res) => {
    if (!guard(res)) return;
    const b = req.body || {};
    if (!Array.isArray(b.controlValues) || !Array.isArray(b.treatmentValues)) {
      return res.status(400).json({ ok: false, error: 'controlValues[] and treatmentValues[] required' });
    }
    const out = await svc.computeSignificance({
      id: req.params.id, controlValues: b.controlValues, treatmentValues: b.treatmentValues,
      controlVariantId: b.controlVariantId || null, treatmentVariantId: b.treatmentVariantId || null, ctx: ctxOf(req)
    });
    if (out && out.ok === false && out.error === 'insufficient_sample') return res.status(422).json(out);
    res.json(out);
  });

  app.get('/api/experiments/:id/significance', requireRole(['admin', 'director']), async (req, res) => {
    if (!guard(res)) return;
    res.json({ ok: true, result: await svc.latestSignificance(req.params.id) });
  });

  // ---- Segmentation ------------------------------------------------------
  app.post('/api/experiments/:id/segments', requireRole(['admin', 'director']), async (req, res) => {
    if (!guard(res)) return;
    const b = req.body || {};
    if (!Array.isArray(b.segments)) return res.status(400).json({ ok: false, error: 'segments[] required' });
    const out = await svc.computeSegments({ id: req.params.id, segments: b.segments, overallDeltaPct: b.overallDeltaPct || 0, ctx: ctxOf(req) });
    res.json(out);
  });

  app.get('/api/experiments/:id/segments', requireRole(['admin', 'director']), async (req, res) => {
    if (!guard(res)) return;
    res.json({ ok: true, segments: await svc.listSegments(req.params.id) });
  });

  // ---- Sign-off (teacher console + admin) -------------------------------
  app.post('/api/experiments/:id/signoff', requireRole(['teacher', 'admin']), async (req, res) => {
    if (!guard(res)) return;
    const b = req.body || {};
    // Teacher role records the teaching sign-off; admin may record pedagogy_reviewer.
    const role = b.signoffRole || (req.user.role === 'teacher' ? 'teacher' : 'pedagogy_reviewer');
    const out = await svc.recordSignoff({ id: req.params.id, signoffRole: role, signedBy: req.user.email, note: b.note || null, ctx: ctxOf(req) });
    if (out && out.ok === false) return res.status(400).json(out);
    res.status(201).json(out);
  });

  app.get('/api/experiments/:id/signoffs', requireRole(['admin', 'teacher', 'director']), async (req, res) => {
    if (!guard(res)) return;
    res.json({ ok: true, signoffs: await svc.listSignoffs(req.params.id) });
  });

  // ---- Decisions (governance-gated) -------------------------------------
  app.post('/api/experiments/:id/decisions', requireRole(['admin']), async (req, res) => {
    if (!guard(res)) return;
    const b = req.body || {};
    if (!b.decisionType) return res.status(400).json({ ok: false, error: 'decisionType required' });
    const out = await svc.decide({
      id: req.params.id, decisionType: b.decisionType, rationale: b.rationale,
      decisionRole: b.decisionRole || req.user.role, decisionBy: req.user.email, ctx: ctxOf(req)
    });
    if (out && out.ok === false) {
      if (out.error === 'experiment_not_found') return res.status(404).json(out);
      if (out.error === 'signoff_required') return res.status(409).json(out);
      return res.status(400).json(out);
    }
    res.status(201).json(out);
  });

  app.get('/api/experiments/:id/decisions', requireRole(['admin', 'director']), async (req, res) => {
    if (!guard(res)) return;
    res.json({ ok: true, decisions: await svc.listDecisions(req.params.id) });
  });

  // ---- Archive -----------------------------------------------------------
  app.post('/api/experiments/:id/archive', requireRole(['admin']), async (req, res) => {
    if (!guard(res)) return;
    const b = req.body || {};
    const out = await svc.archiveExperiment({
      id: req.params.id, lessonsLearned: b.lessonsLearned || null, keywords: b.keywords || [],
      finalOutcome: b.finalOutcome || null, actor: req.user.email, actorRole: req.user.role
    });
    if (out && out.ok === false) return res.status(404).json(out);
    res.status(201).json(out);
  });

  app.get('/api/experiments/archive/search', requireRole(['admin', 'director']), async (req, res) => {
    if (!guard(res)) return;
    const out = await svc.searchArchives({
      keyword: req.query.keyword || null, outcome: req.query.outcome || null, metric: req.query.metric || null
    }, ctxOf(req));
    res.json(out);
  });

  // ---- Audit + history ---------------------------------------------------
  app.get('/api/experiments/:id/history', requireRole(['admin', 'director']), async (req, res) => {
    if (!guard(res)) return;
    res.json({ ok: true, events: await svc.history(req.params.id) });
  });

  // ---- Director oversight summary ---------------------------------------
  app.get('/api/experiments/oversight/summary', requireRole(['admin', 'director']), async (req, res) => {
    if (!guard(res)) return;
    const experiments = await svc.listExperiments({});
    const alerts = await svc.alertSummary();
    res.json({ ok: true, experiments, alertSummary: alerts });
  });
};
