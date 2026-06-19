'use strict';
// Feature 009 — Interoperability runtime routes (learner + teacher surfaces).
// Mounted by the shared server.js for learner-web / parent-portal / teacher-console.
// Admin connector management lives in the bespoke demo/apps/admin/server.js.
//
// Compliance posture:
//   - All outbound integration calls are audit-logged (AI Act Art. 12) with a correlation id.
//   - Non-EU endpoints fail closed (EU residency); secrets are Key Vault references only.
//   - Learner core flow never blocks on connector outages (availability safeguard).
//   - Due-date changes that span long closures require teacher confirmation (teacher-in-the-loop).

const scormAdapter = require('./integrations/scorm-adapter');
const xapiAdapter = require('./integrations/xapi-adapter');
const xapiWorker = require('./integrations/xapi-worker');
const calendarAdapter = require('./integrations/calendar-adapter');
const { payloadHash, summarise } = require('./integrations/audit-redaction');

module.exports = function mountInterop(app, { db, APP_ROLE } = {}) {
  if (!app || !db) return;

  function requireRole(roles) {
    return (req, res, next) => {
      const role = req.user && req.user.role;
      if (!role || !roles.includes(role)) {
        return res.status(403).json({ error: 'forbidden', detail: 'Insufficient role for interoperability endpoint.' });
      }
      next();
    };
  }

  const corr = () => (typeof db.newCorrelationId === 'function' ? db.newCorrelationId() : 'cid-' + Math.random().toString(36).slice(2, 10));

  // ===================== LEARNER SURFACE — SCORM =====================

  // GET /api/learner/scorm/packages — list activities the learner can launch.
  app.get('/api/learner/scorm/packages', requireRole(['student', 'admin']), async (req, res) => {
    try {
      const pkgs = await db.listScormPackages();
      res.json({ packages: (pkgs || []).filter(p => p.status === 'parsed' || p.status === 'enabled').map(p => ({
        packageId: p.package_id, title: p.title, scormVersion: p.scorm_version
      })) });
    } catch (e) { res.status(500).json({ error: 'scorm_list_failed' }); }
  });

  // POST /api/learner/scorm/:packageId/launch — open the player shell.
  app.post('/api/learner/scorm/:packageId/launch', requireRole(['student', 'admin']), async (req, res) => {
    const cid = corr();
    try {
      const pkg = await db.getScormPackage({ packageId: req.params.packageId });
      if (!pkg) return res.status(404).json({ error: 'package_not_found' });
      await db.logExternalApiAudit({ correlationId: cid, connectorType: 'scorm', eventType: 'scorm_launch', endpoint: pkg.launch_href, outcome: 'success', statusCode: 200, payloadHash: payloadHash(pkg.package_id), redactedSummary: `launch ${pkg.package_id}`, actor: req.user.email }).catch(() => {});
      res.json({ ok: true, packageId: pkg.package_id, title: pkg.title, scormVersion: pkg.scorm_version, launchHref: pkg.launch_href, masteryScore: (pkg.manifest && pkg.manifest.masteryScore) || 80, transparency: 'This activity is delivered by an external SCORM package. Your completion and score are recorded.' });
    } catch (e) {
      // Connector/asset outage — learner-safe fallback, core flow not blocked.
      await db.logExternalApiAudit({ correlationId: cid, connectorType: 'scorm', eventType: 'scorm_parse_failed', outcome: 'failure', statusCode: 503, redactedSummary: summarise({ err: e && e.message }), actor: req.user && req.user.email }).catch(() => {});
      res.status(200).json({ ok: false, fallback: true, message: scormAdapter.fallbackMessage() });
    }
  });

  // POST /api/learner/scorm/:packageId/commit — persist lesson status/score/time.
  app.post('/api/learner/scorm/:packageId/commit', requireRole(['student', 'admin']), async (req, res) => {
    const cid = corr();
    try {
      const pkg = await db.getScormPackage({ packageId: req.params.packageId });
      if (!pkg) return res.status(404).json({ error: 'package_not_found' });
      const masteryScore = (pkg.manifest && pkg.manifest.masteryScore) || 80;
      const norm = scormAdapter.normalizeCommit(req.body || {}, masteryScore);
      const attempt = await db.recordScormAttempt({ packageId: pkg.package_id, learnerEmail: req.user.email, lessonStatus: norm.lessonStatus, scoreRaw: norm.scoreRaw, sessionTime: norm.sessionTime, suspendData: norm.suspendData, committed: true });
      // Emit an xAPI statement (queued; delivery is async and never blocks the learner).
      try {
        const verb = norm.lessonStatus === 'passed' ? 'passed' : (norm.lessonStatus === 'failed' ? 'failed' : 'completed');
        const stmt = xapiAdapter.buildStatement({ learnerEmail: req.user.email, verb, objectId: 'https://learneu.demo/scorm/' + pkg.package_id, objectName: pkg.title, result: { score: { raw: norm.scoreRaw }, completion: norm.lessonStatus !== 'incomplete' } });
        if (xapiAdapter.validate(stmt).ok) {
          await db.enqueueXapiStatement({ statementId: stmt.id, actorHash: stmt.actor.account.name, verb, objectId: stmt.object.id, result: stmt.result });
          await db.logExternalApiAudit({ correlationId: cid, connectorType: 'xapi', eventType: 'xapi_statement_built', outcome: 'success', statusCode: 202, payloadHash: payloadHash(stmt.id), redactedSummary: `queued ${verb}`, actor: 'system' }).catch(() => {});
        }
      } catch { /* xAPI is best-effort */ }
      await db.logExternalApiAudit({ correlationId: cid, connectorType: 'scorm', eventType: 'scorm_commit', outcome: 'success', statusCode: 200, payloadHash: payloadHash(pkg.package_id), redactedSummary: `status=${norm.lessonStatus} score=${norm.scoreRaw}`, actor: req.user.email }).catch(() => {});
      res.json({ ok: true, lessonStatus: norm.lessonStatus, scoreRaw: norm.scoreRaw, attemptId: attempt && attempt.id });
    } catch (e) { res.status(500).json({ error: 'scorm_commit_failed' }); }
  });

  // ===================== LEARNER SURFACE — Due dates =====================

  // GET /api/learner/due-dates — return assignment due dates aligned to the school calendar.
  app.get('/api/learner/due-dates', requireRole(['student', 'admin']), async (req, res) => {
    try {
      const adjustments = await db.listDueDateAdjustments({ limit: 50 });
      const applied = (adjustments || []).filter(a => a.status === 'auto' || a.status === 'confirmed');
      res.json({ dueDates: applied.map(a => ({
        assignmentId: a.assignment_id,
        originalDue: a.original_due,
        adjustedDue: a.adjusted_due,
        reason: a.reason,
        status: a.status,
        note: a.adjusted_due ? 'Adjusted to the next school-open day.' : null
      })) });
    } catch (e) { res.status(500).json({ error: 'due_dates_failed' }); }
  });

  // ===================== TEACHER SURFACE =====================

  // GET /api/teacher/xapi/insights — aggregate LRS completion stats (no learner PII).
  app.get('/api/teacher/xapi/insights', requireRole(['teacher', 'admin']), async (req, res) => {
    try {
      const stats = await db.xapiDeliveryStats();
      res.json({ delivery: stats, transparency: 'Aggregate completion signals from the connected LRS. Learner identities are pseudonymised before any data leaves the platform.' });
    } catch (e) { res.status(500).json({ error: 'xapi_insights_failed' }); }
  });

  // GET /api/teacher/due-dates/pending — adjustments awaiting teacher confirmation.
  app.get('/api/teacher/due-dates/pending', requireRole(['teacher', 'admin']), async (req, res) => {
    try {
      const pending = await db.listDueDateAdjustments({ status: 'pending_confirm', limit: 100 });
      res.json({ pending: (pending || []).map(a => ({ id: a.id, assignmentId: a.assignment_id, originalDue: a.original_due, adjustedDue: a.adjusted_due, reason: a.reason })) });
    } catch (e) { res.status(500).json({ error: 'due_dates_pending_failed' }); }
  });

  // POST /api/teacher/due-dates/:id/confirm — teacher confirms or rejects an adjustment.
  app.post('/api/teacher/due-dates/:id/confirm', requireRole(['teacher', 'admin']), async (req, res) => {
    const cid = corr();
    try {
      const decision = (req.body && req.body.decision) === 'reject' ? 'rejected' : 'confirmed';
      const row = await db.confirmDueDateAdjustment({ id: req.params.id, status: decision, teacherEmail: req.user.email });
      if (!row) return res.status(404).json({ error: 'adjustment_not_found' });
      await db.logExternalApiAudit({ correlationId: cid, connectorType: 'calendar', eventType: 'due_date_override_confirmed', outcome: 'success', statusCode: 200, payloadHash: payloadHash(String(req.params.id)), redactedSummary: `decision=${decision}`, actor: req.user.email }).catch(() => {});
      res.json({ ok: true, status: decision });
    } catch (e) { res.status(500).json({ error: 'due_date_confirm_failed' }); }
  });

  // POST /api/teacher/xapi/drain — manually flush the xAPI queue (demo/ops convenience).
  app.post('/api/teacher/xapi/drain', requireRole(['teacher', 'admin']), async (req, res) => {
    const cid = corr();
    try {
      const out = await xapiWorker.drainQueue(db, { correlationId: cid, endpoint: 'https://lrs.learneu.eu/xapi', simulateOutage: Boolean(req.body && req.body.simulateOutage) });
      res.json({ ok: true, ...out });
    } catch (e) { res.status(500).json({ error: 'xapi_drain_failed' }); }
  });
};
