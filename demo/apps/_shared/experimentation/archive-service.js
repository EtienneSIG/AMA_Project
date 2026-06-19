'use strict';
// Feature 012 — Archive packet assembly (orchestration helper).
// Builds the institutional record (hypothesis, design, assignment summary,
// results, decisions, lessons) and persists/searches it.

function makeArchiveService(db, audit) {
  return {
    async archive({ experimentId, lessonsLearned, keywords, finalOutcome, actor, actorRole }) {
      if (!db || !db.enabled) return { enabled: false };
      const exp = await db.getExperiment(experimentId);
      if (!exp) return { ok: false, error: 'experiment_not_found' };
      const variants = await db.listVariants(experimentId);
      const counts = await db.assignmentCounts(experimentId);
      const sig = await db.latestSignificance(experimentId);
      const decisions = await db.listDecisions(experimentId);
      const summary = {
        name: exp.name, hypothesis: exp.hypothesis, successMetric: exp.success_metric,
        variants: variants.map(v => ({ key: v.variant_key, isControl: v.is_control, weight: Number(v.traffic_weight) })),
        assignmentCounts: counts.map(c => ({ variantKey: c.variant_key, assigned: c.assigned_n, active: c.active_n })),
        significance: sig ? { pValue: Number(sig.p_value), effect: sig.effect_interpretation, recommended: sig.recommended_action } : null,
        decisionCount: decisions.length
      };
      const row = await db.upsertArchive({ experimentId, summary, lessonsLearned, keywords: keywords || [], finalOutcome, archivedBy: actor });
      if (row && audit) await audit({ experimentId, eventType: 'archive_written', actor, actorRole, payload: { finalOutcome, keywords: keywords || [] } });
      return { ok: Boolean(row), archive: row };
    },
    async search(params, ctx) {
      if (!db || !db.enabled) return { enabled: false };
      const rows = await db.searchArchives(params || {});
      if (audit && ctx) await audit({ eventType: 'data_accessed', actor: ctx.actor, actorRole: ctx.actorRole, payload: { action: 'archive_search', params: params || {} } });
      return { ok: true, results: rows };
    }
  };
}

module.exports = { makeArchiveService };
