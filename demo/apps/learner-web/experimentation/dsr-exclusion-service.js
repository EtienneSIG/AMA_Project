'use strict';
// Feature 012 — DSR / consent-revocation exclusion (orchestration helper).
// Marks a learner's assignment as excluded from analysis and records the reason
// so downstream snapshots/significance recompute on the effective sample.

function makeDsrService(db, audit) {
  return {
    async exclude({ experimentId, learnerPseudonym, reason, actor, actorRole }) {
      if (!db || !db.enabled) return { enabled: false };
      const row = await db.markAssignmentExcluded({ experimentId, learnerPseudonym, reason: reason || 'dsr_request' });
      if (row && audit) {
        await audit({ experimentId, eventType: 'data_accessed', actor, actorRole, payload: { action: 'dsr_exclude', learnerPseudonym, reason: reason || 'dsr_request' } });
      }
      return { ok: Boolean(row), assignment: row };
    }
  };
}

module.exports = { makeDsrService };
