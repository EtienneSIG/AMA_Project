'use strict';
// Feature 007 — Adaptive Learning routes (learner + teacher surfaces).
// Mounted by the shared server.js for learner-web / parent-portal / teacher-console.
// Routes are role-gated; the same file serves both apps because server.js is synced.
//
// Compliance posture (EU AI Act HIGH-RISK, Annex III §3):
//   - Every adaptive decision is a RECOMMENDATION, logged immutably (Art. 12).
//   - Teachers see full reasoning and can override anytime (Art. 14).
//   - Learners see plain-language "why this activity" labels (Art. 13).
//   - No reliable mastery evidence => non-adaptive fallback (no opaque guessing).

const engine = require('./adaptive/engine');
const audit = require('./adaptive/audit');
const scope = require('./adaptive/scope');

module.exports = function mountAdaptive(app, { db, APP_ROLE } = {}) {
  if (!app || !db) return;

  const isLearnerApp = () => APP_ROLE === 'student';
  const isTeacherApp = () => APP_ROLE === 'teacher' || APP_ROLE === 'admin';

  // Guard: only signed-in learners hit learner routes; only teachers/admins hit teacher routes.
  function requireRole(roles) {
    return (req, res, next) => {
      const role = req.user && req.user.role;
      if (!role || !roles.includes(role)) {
        return res.status(403).json({ error: 'forbidden', detail: 'Insufficient role for adaptive endpoint.' });
      }
      next();
    };
  }

  // Recent correctness for a skill (newest-first) — drives stretch streak detection.
  async function recentCorrectForSkill(email, skillId, limit = 8) {
    if (!skillId || typeof db._query !== 'function') return [];
    const r = await db._query(
      `SELECT ia.correct
         FROM item_attempts ia
         JOIN item_skills isk ON isk.item_id = ia.item_id
        WHERE ia.email = $1 AND isk.skill_id = $2
        ORDER BY ia.created_at DESC
        LIMIT $3`,
      [email, skillId, limit]
    );
    return r && r.rows ? r.rows.map(x => Boolean(x.correct)) : [];
  }

  // ===================== LEARNER SURFACE =====================

  // POST /api/learner/adaptive/next
  // Called by the learner UI right after an attempt is persisted. Returns the
  // next-best-activity recommendation with a transparent learner label.
  app.post('/api/learner/adaptive/next', requireRole(['student', 'admin']), async (req, res) => {
    const done = audit.startTimer();
    const u = req.user;
    const { itemId, correct, latencyMs, device } = req.body || {};
    let skillId = (req.body && req.body.skillId) || null;
    try {
      if (!skillId && itemId) {
        const skills = await db.skillsForItem({ itemId });
        skillId = skills[0] || null;
      }

      const mastery = skillId ? await db.masteryForSkill({ email: u.email, skillId }) : null;
      const recentCorrect = skillId ? await recentCorrectForSkill(u.email, skillId) : [];

      const rec = engine.generateAdaptiveRecommendation({
        skillId,
        priorItemId: itemId || null,
        attempts: mastery ? mastery.attempts : 0,
        correct: typeof correct === 'boolean' ? correct : null,
        level: mastery ? Number(mastery.level) : null,
        priorLevel: null,
        latencyMs: latencyMs == null ? null : Number(latencyMs),
        recentCorrect,
        locale: u.language || 'en'
      });

      // Persist the decision (append-only audit record of the recommendation).
      const decision = await db.recordAdaptiveDecision({
        learnerEmail: u.email,
        skillId: rec.skillId,
        priorItemId: rec.priorItemId,
        recommendedActivityId: rec.recommendedActivityId,
        reason: rec.reason,
        masteryLevel: rec.masteryLevel,
        thresholdBand: rec.thresholdBand,
        modelVersion: rec.modelVersion,
        explanationLearner: rec.explanationLearner,
        explanationTeacher: rec.explanationTeacher,
        dataReliable: rec.dataReliable
      });

      const latency = done();
      await audit.writeAudit(db, {
        eventType: rec.dataReliable ? 'decision_made' : 'non_adaptive_fallback',
        learnerEmail: u.email,
        data: { decisionId: decision && decision.id, reason: rec.reason, band: rec.thresholdBand, masteryLevel: rec.masteryLevel, recommendedActivityId: rec.recommendedActivityId, anomalies: rec.anomalies },
        latencyMs: latency
      });

      // Catch-up: start a scaffolded sequence if none is active for this skill.
      let catchUpSequence = null;
      if (rec.reason === 'catch_up' && rec.catchUp && skillId) {
        catchUpSequence = await db.getActiveCatchUpSequence({ email: u.email, skillId });
        if (!catchUpSequence) {
          catchUpSequence = await db.startCatchUpSequence({
            email: u.email, skillId,
            activityIds: rec.catchUp.activityIds,
            checkpointActivityId: rec.catchUp.checkpointActivityId
          });
          await audit.writeAudit(db, {
            eventType: 'catch_up_started', learnerEmail: u.email,
            data: { sequenceId: catchUpSequence && catchUpSequence.id, skillId, activityIds: rec.catchUp.activityIds }
          });
        }
      }

      // Stretch: record the opportunity.
      if (rec.reason === 'stretch' && skillId) {
        const st = await db.recordStretchActivity({ email: u.email, skillId, activityId: rec.recommendedActivityId, teacherAssigned: false });
        await audit.writeAudit(db, { eventType: 'stretch_triggered', learnerEmail: u.email, data: { stretchId: st && st.id, skillId, activityId: rec.recommendedActivityId } });
      }

      // Anomaly flags -> immutable log for teacher oversight.
      for (const a of rec.anomalies) {
        await audit.writeAudit(db, { eventType: 'anomaly_flagged', learnerEmail: u.email, data: { skillId, ...a } });
      }

      // Persist cross-device resume state.
      await db.saveAdaptivePathState({
        email: u.email,
        currentActivityId: rec.recommendedActivityId,
        sequenceId: catchUpSequence ? catchUpSequence.id : null,
        checkpointProgress: catchUpSequence ? `${(catchUpSequence.current_index || 0)} of ${catchUpSequence.activity_ids.length} catch-up activities` : null,
        device: device || ''
      });

      res.json({
        ok: true,
        store: db.enabled ? 'postgres' : 'memory',
        decisionId: decision && decision.id,
        reason: rec.reason,
        band: rec.thresholdBand,
        recommendedActivityId: rec.recommendedActivityId,
        label: rec.explanationLearner,
        dataReliable: rec.dataReliable,
        catchUp: catchUpSequence ? {
          id: catchUpSequence.id,
          activityIds: catchUpSequence.activity_ids,
          checkpointActivityId: catchUpSequence.checkpoint_activity_id,
          currentIndex: catchUpSequence.current_index,
          status: catchUpSequence.status
        } : null,
        latencyMs: latency
      });
    } catch (e) {
      console.error('[adaptive/next]', e && e.message);
      res.status(500).json({ error: 'adaptive_failed', detail: String(e && e.message || e) });
    }
  });

  // GET /api/learner/adaptive/path — current adaptive path + last decision + resume state.
  app.get('/api/learner/adaptive/path', requireRole(['student', 'admin']), async (req, res) => {
    const u = req.user;
    try {
      const decisions = await db.listAdaptiveDecisionsForLearner({ email: u.email, limit: 10 });
      const state = await db.getAdaptivePathState({ email: u.email });
      res.json({ enabled: db.enabled, latest: decisions[0] || null, decisions, state });
    } catch (e) {
      res.status(500).json({ error: String(e && e.message || e) });
    }
  });

  // GET /api/learner/adaptive/state — cross-device resume point.
  app.get('/api/learner/adaptive/state', requireRole(['student', 'admin']), async (req, res) => {
    const u = req.user;
    try {
      const state = await db.getAdaptivePathState({ email: u.email });
      res.json({ enabled: db.enabled, state });
    } catch (e) {
      res.status(500).json({ error: String(e && e.message || e) });
    }
  });

  // POST /api/learner/adaptive/state — save resume point (cross-device continuation).
  app.post('/api/learner/adaptive/state', requireRole(['student', 'admin']), async (req, res) => {
    const u = req.user;
    const { currentActivityId, sequenceId, checkpointProgress, priorHints, priorFeedback, device } = req.body || {};
    try {
      const prev = await db.getAdaptivePathState({ email: u.email });
      const state = await db.saveAdaptivePathState({
        email: u.email, currentActivityId, sequenceId, checkpointProgress, priorHints, priorFeedback, device
      });
      if (prev && device && prev.last_device && prev.last_device !== device) {
        await audit.writeAudit(db, { eventType: 'resume', learnerEmail: u.email, data: { fromDevice: prev.last_device, toDevice: device, currentActivityId } });
      }
      res.json({ ok: true, state });
    } catch (e) {
      res.status(500).json({ error: String(e && e.message || e) });
    }
  });

  // POST /api/learner/adaptive/catchup/:id/advance — checkpoint advancement logic.
  // Body: { level } current mastery at the checkpoint. >=0.70 passes; else re-catch-up.
  app.post('/api/learner/adaptive/catchup/:id/advance', requireRole(['student', 'admin']), async (req, res) => {
    const u = req.user;
    const id = Number(req.params.id);
    const level = req.body && req.body.level != null ? Number(req.body.level) : null;
    const atCheckpoint = req.body && req.body.atCheckpoint === true;
    try {
      const passes = level != null && level >= 0.70;
      if (atCheckpoint) {
        if (passes) {
          const seq = await db.advanceCatchUpSequence({ id, status: 'completed', finalMastery: level });
          await audit.writeAudit(db, { eventType: 'checkpoint_passed', learnerEmail: u.email, data: { sequenceId: id, level } });
          return res.json({ ok: true, passed: true, sequence: seq });
        }
        const seq = await db.advanceCatchUpSequence({ id, status: 're_catch_up', currentIndex: 0 });
        await audit.writeAudit(db, { eventType: 'checkpoint_failed', learnerEmail: u.email, data: { sequenceId: id, level } });
        return res.json({ ok: true, passed: false, sequence: seq });
      }
      // Advance one scaffolded step.
      const cur = req.body && req.body.currentIndex != null ? Number(req.body.currentIndex) : null;
      const seq = await db.advanceCatchUpSequence({ id, currentIndex: cur });
      await audit.writeAudit(db, { eventType: 'path_changed', learnerEmail: u.email, data: { sequenceId: id, currentIndex: cur } });
      res.json({ ok: true, sequence: seq });
    } catch (e) {
      res.status(500).json({ error: String(e && e.message || e) });
    }
  });

  // ===================== TEACHER SURFACE =====================

  // GET /api/teacher/adaptive/learner/:email — full adaptive path diagnostics + override history.
  app.get('/api/teacher/adaptive/learner/:email', requireRole(['teacher', 'admin']), async (req, res) => {
    const learnerEmail = String(req.params.email || '').toLowerCase();
    try {
      const allow = await scope.assertTeacherScope(db, req.user, learnerEmail);
      if (!allow.ok) return res.status(403).json({ error: 'out_of_scope', detail: allow.reason });

      const decisions = await db.listAdaptiveDecisionsForLearner({ email: learnerEmail, limit: 50 });
      const overrides = await db.listAdaptiveOverridesForLearner({ email: learnerEmail, limit: 50 });
      const stretch = await db.listStretchForLearner({ email: learnerEmail, limit: 25 });
      const auditTrail = await db.listAdaptiveAudit({ learnerEmail, limit: 50 });
      const anomalies = auditTrail.filter(a => a.event_type === 'anomaly_flagged');

      // High-intervention: any skill with >=3 overrides.
      const bySkill = {};
      for (const o of overrides) { const k = o.skill_id || 'none'; bySkill[k] = (bySkill[k] || 0) + 1; }
      const highIntervention = Object.entries(bySkill).filter(([, n]) => n >= 3).map(([skillId, count]) => ({ skillId, count }));

      // Log the teacher access (accountability for broad/demo scope).
      await audit.writeAudit(db, { eventType: 'path_changed', learnerEmail, teacherEmail: req.user.email, data: { action: 'teacher_view', scope: allow.scope } });

      res.json({ enabled: db.enabled, learnerEmail, decisions, overrides, stretch, anomalies, highIntervention, scope: allow.scope });
    } catch (e) {
      res.status(500).json({ error: String(e && e.message || e) });
    }
  });

  // POST /api/teacher/adaptive/override/:decisionId — mandatory human oversight (Art. 14).
  app.post('/api/teacher/adaptive/override/:decisionId', requireRole(['teacher', 'admin']), async (req, res) => {
    const done = audit.startTimer();
    const decisionId = Number(req.params.decisionId);
    const { overrideActivityId, reasoning } = req.body || {};
    try {
      const decision = await db.getAdaptiveDecision({ id: decisionId });
      if (!decision) return res.status(404).json({ error: 'decision_not_found' });

      const allow = await scope.assertTeacherScope(db, req.user, decision.learner_email);
      if (!allow.ok) return res.status(403).json({ error: 'out_of_scope', detail: allow.reason });

      const override = await db.recordAdaptiveOverride({
        decisionId,
        learnerEmail: decision.learner_email,
        teacherEmail: req.user.email,
        skillId: decision.skill_id,
        recommendedActivityId: decision.recommended_activity_id,
        overrideActivityId: overrideActivityId || null,
        reasoning: reasoning || null
      });
      await db.markDecisionOverridden({ id: decisionId });

      // Pause/redirect any active catch-up path for this skill.
      if (decision.skill_id) {
        const seq = await db.getActiveCatchUpSequence({ email: decision.learner_email, skillId: decision.skill_id });
        if (seq) await db.advanceCatchUpSequence({ id: seq.id, status: 'overridden' });
      }

      const latency = done();
      await audit.writeAudit(db, {
        eventType: 'override_applied', learnerEmail: decision.learner_email, teacherEmail: req.user.email,
        data: { decisionId, overrideId: override && override.id, overrideActivityId: overrideActivityId || null, reasoning: reasoning || null, scope: allow.scope },
        latencyMs: latency
      });

      // High-intervention alert (>=3 overrides on the same skill).
      const count = decision.skill_id ? await db.countOverridesForTopic({ email: decision.learner_email, skillId: decision.skill_id }) : 0;
      let highIntervention = false;
      if (count >= 3) {
        highIntervention = true;
        await audit.writeAudit(db, { eventType: 'high_intervention', learnerEmail: decision.learner_email, teacherEmail: req.user.email, data: { skillId: decision.skill_id, overrideCount: count } });
      }

      res.json({ ok: true, overrideId: override && override.id, highIntervention, overrideCount: count, latencyMs: latency });
    } catch (e) {
      console.error('[adaptive/override]', e && e.message);
      res.status(500).json({ error: 'override_failed', detail: String(e && e.message || e) });
    }
  });

  // POST /api/teacher/adaptive/stretch/:id/feedback — qualitative teacher feedback on a stretch outcome.
  app.post('/api/teacher/adaptive/stretch/:id/feedback', requireRole(['teacher', 'admin']), async (req, res) => {
    const id = Number(req.params.id);
    const { feedback, completed } = req.body || {};
    try {
      const row = await db.updateStretchFeedback({ id, teacherEmail: req.user.email, feedback, completed });
      if (!row) return res.status(404).json({ error: 'stretch_not_found' });
      await audit.writeAudit(db, { eventType: 'stretch_completed', learnerEmail: row.learner_email, teacherEmail: req.user.email, data: { stretchId: id, completed: Boolean(completed) } });
      res.json({ ok: true, stretch: row });
    } catch (e) {
      res.status(500).json({ error: String(e && e.message || e) });
    }
  });

  console.log(`[${APP_ROLE}] adaptive routes mounted`);
};
