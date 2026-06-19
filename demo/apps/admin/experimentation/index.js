'use strict';
// Feature 012 — A/B Testing Framework service orchestrator.
// Composes the pure statistical/fairness/lifecycle logic with EU-resident DB
// helpers and the immutable audit writer. Fails closed ({ enabled:false }) when
// the database is offline so the router can degrade gracefully.

const cfg = require('../config/experimentation');
const crypto = require('crypto');
const randomization = require('./randomization-service');
const fairness = require('./fairness-service');
const significance = require('./significance-service');
const sigPolicy = require('./significance-policy');
const lifecycle = require('./lifecycle-service');
const governance = require('./governance-service');
const alertEngine = require('./alert-engine');
const segmentAnalysis = require('./segment-analysis-service');
const monitoring = require('./monitoring-aggregator');
const { makeAuditLog } = require('./audit-log');
const { makeDsrService } = require('./dsr-exclusion-service');
const { makeArchiveService } = require('./archive-service');

function makeExperimentService(db) {
  const live = () => Boolean(db && db.enabled);
  const audit = makeAuditLog(db);
  const dsr = makeDsrService(db, audit);
  const archive = makeArchiveService(db, audit);

  // Build the target-ratio map { variantKey: share } from variants.
  function targetRatios(variants) {
    const total = variants.reduce((s, v) => s + Number(v.traffic_weight || 0), 0) || 1;
    const out = {};
    for (const v of variants) out[v.variant_key] = Number(v.traffic_weight || 0) / total;
    return out;
  }

  return {
    cfg, randomization, fairness, significance, sigPolicy, lifecycle, governance,
    alertEngine, segmentAnalysis, monitoring, dsr, archive, audit,

    // ---- Definition --------------------------------------------------------
    async createExperiment(p, ctx) {
      if (!live()) return { enabled: false };
      // Build the traffic ratio map from the variant payload (keyed by variant_key).
      const ratio = {};
      for (const v of p.variants || []) ratio[v.variantKey] = Number(v.trafficWeight || 0);
      const seed = crypto.randomBytes(16).toString('hex');
      const exp = await db.createExperiment({
        name: p.name, hypothesis: p.hypothesis, owner: p.createdBy || (ctx && ctx.actor) || null,
        targetScope: p.targetSegmentJson || {}, successMetric: p.successMetric,
        ratio, minDurationDays: p.plannedDurationDays || cfg.MIN_DURATION_DAYS, seed
      });
      const variants = [];
      for (const v of p.variants || []) {
        variants.push(await db.createVariant({
          experimentId: exp.experiment_id, variantKey: v.variantKey, config: v.config || {},
          trafficWeight: v.trafficWeight, isControl: Boolean(v.isControl)
        }));
      }
      await audit({ experimentId: exp.experiment_id, eventType: 'state_change', actor: ctx && ctx.actor, actorRole: ctx && ctx.actorRole, payload: { to: 'draft', name: exp.name } });
      return { ok: true, experiment: exp, variants };
    },

    async listExperiments(params) { return live() ? db.listExperiments(params || {}) : []; },
    async getExperimentBundle(id) {
      if (!live()) return { enabled: false };
      const experiment = await db.getExperiment(id);
      if (!experiment) return { ok: false, error: 'experiment_not_found' };
      const variants = await db.listVariants(id);
      return { ok: true, experiment, variants };
    },

    // ---- Validation + lifecycle -------------------------------------------
    async validate(id, ctx) {
      if (!live()) return { enabled: false };
      const experiment = await db.getExperiment(id);
      if (!experiment) return { ok: false, error: 'experiment_not_found' };
      const variants = await db.listVariants(id);
      const check = lifecycle.validateForStart({ experiment, variants, projectedCohort: null });
      if (!check.ok) return { ok: false, error: 'validation_failed', errors: check.errors, warnings: check.warnings };
      const moved = await db.updateExperimentStatus({ id, status: 'validated' });
      await audit({ experimentId: id, eventType: 'state_change', actor: ctx && ctx.actor, actorRole: ctx && ctx.actorRole, payload: { from: experiment.status, to: 'validated', warnings: check.warnings } });
      return { ok: true, experiment: moved, warnings: check.warnings };
    },

    // Deterministic stratified assignment for a learner cohort, then a fairness gate.
    async start({ id, cohort, ctx }) {
      if (!live()) return { enabled: false };
      const experiment = await db.getExperiment(id);
      if (!experiment) return { ok: false, error: 'experiment_not_found' };
      if (!lifecycle.canTransition(experiment.status, 'running')) return { ok: false, error: 'invalid_transition', from: experiment.status };
      const variants = await db.listVariants(id);
      const ratios = targetRatios(variants);
      const byStratum = {};
      for (const learner of cohort || []) {
        const a = randomization.assignOne({ seed: experiment.seed, experimentId: id, learnerPseudonym: learner.pseudonym, variants, strata: learner.strata || {} });
        await db.upsertAssignment({ experimentId: id, variantId: a.variant.variant_id, learnerPseudonym: learner.pseudonym, strata: learner.strata || {}, method: a.method, seedVersion: a.seedVersion });
        const sk = Object.keys(learner.strata || {}).sort().map(k => `${k}=${learner.strata[k]}`).join(',') || 'all';
        byStratum[sk] = byStratum[sk] || {};
        byStratum[sk][a.variant.variant_key] = (byStratum[sk][a.variant.variant_key] || 0) + 1;
      }
      const parity = fairness.assignmentParity(byStratum, ratios);
      // Emit fairness alerts; block start on high-risk skew.
      for (const a of alertEngine.fairnessAlerts(parity.status, parity.flags.length ? `Assignment skew on ${parity.flags.length} stratum/variant pair(s).` : null)) {
        await db.insertAlert({ experimentId: id, ...a });
        await audit({ experimentId: id, eventType: 'alert_emitted', actor: ctx && ctx.actor, actorRole: ctx && ctx.actorRole, payload: a });
      }
      await audit({ experimentId: id, eventType: 'assignment_generated', actor: ctx && ctx.actor, actorRole: ctx && ctx.actorRole, payload: { cohort: (cohort || []).length, fairness: parity.status } });
      if (parity.status === 'high_risk') {
        return { ok: false, error: 'fairness_block', fairnessStatus: parity.status, flags: parity.flags };
      }
      const moved = await db.updateExperimentStatus({ id, status: 'running', startAt: new Date().toISOString() });
      await audit({ experimentId: id, eventType: 'state_change', actor: ctx && ctx.actor, actorRole: ctx && ctx.actorRole, payload: { to: 'running' } });
      return { ok: true, experiment: moved, fairnessStatus: parity.status, flags: parity.flags };
    },

    async assignmentSummary(id) {
      if (!live()) return { enabled: false };
      const variants = await db.listVariants(id);
      const ratios = targetRatios(variants);
      const assignments = await db.listAssignments(id);
      const byStratum = {};
      const byVariant = {};
      for (const a of assignments) {
        byVariant[a.variant_key] = (byVariant[a.variant_key] || 0) + 1;
        const sk = a.strata_json && Object.keys(a.strata_json).length
          ? Object.keys(a.strata_json).sort().map(k => `${k}=${a.strata_json[k]}`).join(',') : 'all';
        byStratum[sk] = byStratum[sk] || {};
        byStratum[sk][a.variant_key] = (byStratum[sk][a.variant_key] || 0) + 1;
      }
      const parity = fairness.assignmentParity(byStratum, ratios);
      return { enabled: true, total: assignments.length, byVariant, fairnessStatus: parity.status, flags: parity.flags };
    },

    async getAssignmentForLearner(p) { return live() ? db.getAssignment(p) : { enabled: false }; },

    // ---- Monitoring --------------------------------------------------------
    // events: [{ variantId, variantKey, value }] for the success metric.
    async ingestSnapshot({ id, metricName, events, ctx }) {
      if (!live()) return { enabled: false };
      const snaps = monitoring.aggregate(events, metricName);
      for (const s of snaps) {
        await db.insertMetricSnapshot({ experimentId: id, variantId: s.variantId, metricName: s.metricName,
          sampleSizeN: s.sampleSizeN, meanValue: s.meanValue, medianValue: s.medianValue, stdDev: s.stdDev, ci95Low: s.ci95Low, ci95High: s.ci95High });
      }
      // Underperformance + drift detection vs control snapshot.
      const variants = await db.listVariants(id);
      const controlVariant = variants.find(v => v.is_control);
      const controlSnap = snaps.find(s => controlVariant && s.variantId === controlVariant.variant_id);
      const treatments = snaps.filter(s => !controlVariant || s.variantId !== controlVariant.variant_id);
      const alerts = [
        ...alertEngine.detectUnderperformance(controlSnap ? controlSnap.meanValue : 0, treatments.map(t => ({ variant_key: t.variantKey, mean_value: t.meanValue, metric_name: metricName }))),
        ...alertEngine.detectSampleDrift(snaps.map(s => ({ variant_key: s.variantKey, sample_size_n: s.sampleSizeN })))
      ];
      for (const a of alerts) {
        await db.insertAlert({ experimentId: id, ...a });
        await audit({ experimentId: id, eventType: 'alert_emitted', actor: ctx && ctx.actor, actorRole: ctx && ctx.actorRole, payload: a });
      }
      return { ok: true, snapshots: snaps, alerts };
    },

    async monitoringView(id) {
      if (!live()) return { enabled: false };
      const snaps = await db.latestSnapshots(id);
      const fresh = monitoring.freshness(snaps.length ? snaps[0].computed_at : null);
      const openAlerts = await db.listAlerts({ experimentId: id, status: 'open' });
      return { enabled: true, snapshots: snaps, freshness: fresh, openAlerts };
    },

    async listAlerts(p) { return live() ? db.listAlerts(p) : []; },
    async acknowledgeAlert({ alertId, by, experimentId, ctx }) {
      if (!live()) return { enabled: false };
      const row = await db.acknowledgeAlert({ alertId, by });
      if (row) await audit({ experimentId, eventType: 'alert_emitted', actor: ctx && ctx.actor, actorRole: ctx && ctx.actorRole, payload: { action: 'acknowledged', alertId } });
      return { ok: Boolean(row), alert: row };
    },
    async alertSummary() { return live() ? db.activeAlertSummary() : []; },

    // ---- Significance ------------------------------------------------------
    // controlValues / treatment arrays supplied by caller (or pulled from events).
    async computeSignificance({ id, controlValues, treatmentValues, controlVariantId, treatmentVariantId, ctx }) {
      if (!live()) return { enabled: false };
      const cmp = significance.compare(controlValues, treatmentValues);
      const rec = sigPolicy.recommend(cmp);
      if (!cmp.ok) {
        return { ok: false, error: cmp.reason, recommendedAction: rec.recommendedAction };
      }
      const row = await db.insertSignificance({
        experimentId: id, controlVariantId, treatmentVariantId,
        pValue: cmp.pValue, effectSize: cmp.effectSize, effectInterpretation: cmp.effectInterpretation,
        absoluteDelta: cmp.absoluteDelta, relativeDeltaPct: cmp.relativeDeltaPct,
        isStatisticallySignificant: cmp.isStatisticallySignificant, isPracticallySignificant: rec.isPracticallySignificant,
        recommendedAction: rec.recommendedAction
      });
      await audit({ experimentId: id, eventType: 'significance_computed', actor: ctx && ctx.actor, actorRole: ctx && ctx.actorRole, payload: { pValue: cmp.pValue, effect: cmp.effectInterpretation, recommended: rec.recommendedAction } });
      return { ok: true, comparison: cmp, recommendation: rec, result: row };
    },
    async latestSignificance(id) { return live() ? db.latestSignificance(id) : null; },

    // ---- Segmentation ------------------------------------------------------
    async computeSegments({ id, segments, overallDeltaPct, ctx }) {
      if (!live()) return { enabled: false };
      const results = segmentAnalysis.analyze(segments, overallDeltaPct || 0);
      const persisted = [];
      let highRisk = false;
      for (const r of results) {
        persisted.push(await db.insertSegmentResult({ experimentId: id, ...r }));
        if (r.fairnessFlag === 'high_risk') highRisk = true;
      }
      if (highRisk) {
        const a = { alertType: 'fairness_skew', severity: 'critical', message: 'High-risk differential impact detected in segment analysis; rollout blocked pending Responsible AI + Learning Sciences review.' };
        await db.insertAlert({ experimentId: id, ...a });
        await audit({ experimentId: id, eventType: 'alert_emitted', actor: ctx && ctx.actor, actorRole: ctx && ctx.actorRole, payload: a });
      }
      await audit({ experimentId: id, eventType: 'segment_analyzed', actor: ctx && ctx.actor, actorRole: ctx && ctx.actorRole, payload: { segments: results.length, highRisk } });
      return { ok: true, segments: persisted, highRisk };
    },
    async listSegments(id) { return live() ? db.listSegmentResults(id) : []; },

    // ---- Sign-off + decisions ---------------------------------------------
    async recordSignoff({ id, signoffRole, signedBy, note, ctx }) {
      if (!live()) return { enabled: false };
      if (!['teacher', 'pedagogy_reviewer'].includes(signoffRole)) return { ok: false, error: 'invalid_signoff_role' };
      const row = await db.recordSignoff({ experimentId: id, signoffRole, signedBy, note });
      await audit({ experimentId: id, eventType: 'signoff_recorded', actor: ctx && ctx.actor, actorRole: ctx && ctx.actorRole, payload: { signoffRole, signedBy } });
      return { ok: true, signoff: row };
    },
    async listSignoffs(id) { return live() ? db.listSignoffs(id) : []; },

    async decide({ id, decisionType, rationale, decisionRole, decisionBy, ctx }) {
      if (!live()) return { enabled: false };
      const experiment = await db.getExperiment(id);
      if (!experiment) return { ok: false, error: 'experiment_not_found' };
      const signoffs = await db.listSignoffs(id);
      const gate = governance.validateDecision({ decisionType, rationale, signoffs });
      if (!gate.ok) return gate; // { ok:false, error, missing? }
      const row = await db.insertDecision({ experimentId: id, decisionType, decisionBy, decisionRole, rationale });
      await audit({ experimentId: id, eventType: 'decision_recorded', actor: decisionBy || (ctx && ctx.actor), actorRole: decisionRole || (ctx && ctx.actorRole), payload: { decisionType, rationale } });
      // Lifecycle side-effects for stop / archive transitions.
      let moved = experiment;
      if (decisionType === 'stop' && lifecycle.canTransition(experiment.status, 'completed')) {
        moved = await db.updateExperimentStatus({ id, status: 'completed', endAt: new Date().toISOString() });
        await audit({ experimentId: id, eventType: 'state_change', actor: ctx && ctx.actor, actorRole: ctx && ctx.actorRole, payload: { to: 'completed' } });
      }
      if (experiment.status === 'completed' && (decisionType === 'adopt_variant' || decisionType === 'stop')) {
        moved = await db.updateExperimentStatus({ id, status: 'decided' });
        await audit({ experimentId: id, eventType: 'state_change', actor: ctx && ctx.actor, actorRole: ctx && ctx.actorRole, payload: { to: 'decided' } });
      }
      return { ok: true, decision: row, experiment: moved };
    },
    async listDecisions(id) { return live() ? db.listDecisions(id) : []; },

    // ---- Archive -----------------------------------------------------------
    async archiveExperiment(p) {
      if (!live()) return { enabled: false };
      const exp = await db.getExperiment(p.id);
      if (exp && exp.status !== 'archived' && lifecycle.canTransition(exp.status, 'archived')) {
        await db.updateExperimentStatus({ id: p.id, status: 'archived' });
        await audit({ experimentId: p.id, eventType: 'state_change', actor: p.actor, actorRole: p.actorRole, payload: { to: 'archived' } });
      }
      return this.archive.archive({ experimentId: p.id, lessonsLearned: p.lessonsLearned, keywords: p.keywords, finalOutcome: p.finalOutcome, actor: p.actor, actorRole: p.actorRole });
    },
    async searchArchives(params, ctx) { return this.archive.search(params, ctx); },

    // ---- History + audit ---------------------------------------------------
    async history(id) { return live() ? db.listExperimentAudit({ experimentId: id, limit: 500 }) : []; },
    async auditTrail(p) { return live() ? db.listExperimentAudit(p || {}) : []; }
  };
}

module.exports = { makeExperimentService };
