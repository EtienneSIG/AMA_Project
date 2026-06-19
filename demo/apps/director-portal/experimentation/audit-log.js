'use strict';
// Feature 012 — Immutable audit writer (AI Act Art. 12).
// Computes a stable payload hash so tampering with the JSON is detectable, then
// appends to experiment_audit_event (DB trigger forbids update/delete).

const crypto = require('crypto');

function payloadHash(payload) {
  const canonical = JSON.stringify(payload || {}, Object.keys(payload || {}).sort());
  return crypto.createHash('sha256').update(canonical).digest('hex').slice(0, 32);
}

// Returns a writer bound to a db client. Fails closed (no-op) when db disabled.
function makeAuditLog(db) {
  return async function write({ experimentId, eventType, actor, actorRole, payload }) {
    if (!db || !db.enabled || !db.logExperimentAudit) return null;
    try {
      return await db.logExperimentAudit({
        experimentId: experimentId || null,
        eventType,
        actor: actor || null,
        actorRole: actorRole || null,
        payloadHash: payloadHash(payload || {}),
        payload: payload || {}
      });
    } catch (_) { return null; }
  };
}

module.exports = { payloadHash, makeAuditLog };
