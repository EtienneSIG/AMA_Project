'use strict';
// Feature 009 — SIS roster sync adapter. Computes an idempotent diff between the incoming
// roster and current learners, classifies identity conflicts, and produces an upsert plan.
// Data minimisation: only id, name, class, and (optional) age are processed.
const crypto = require('crypto');

function rosterChecksum(roster) {
  const norm = (roster || []).map(r => `${r.externalId}|${r.email}|${r.classId}`).sort().join('\n');
  return crypto.createHash('sha256').update(norm).digest('hex');
}

// Build an idempotent plan. `existingByEmail` maps email -> { externalId, classId }.
// Returns { upserts:[], conflicts:[] }. A conflict = same email mapped to a different
// external id (identity collision) -> queued for manual review (never auto-merged).
// Collisions are detected both against existing records AND within the same batch.
function planSync(roster, existingByEmail = {}) {
  const upserts = []; const conflicts = [];
  const seen = {}; // email -> externalId already accepted in this batch
  for (const r of (roster || [])) {
    if (!r.email || !r.externalId) { conflicts.push({ learnerRef: r.email || r.externalId || 'unknown', conflictType: 'missing_key', details: r }); continue; }
    const email = r.email.toLowerCase();
    const existing = existingByEmail[email];
    const priorExternalId = (existing && existing.externalId) || seen[email];
    if (priorExternalId && priorExternalId !== r.externalId) {
      conflicts.push({ learnerRef: r.email, conflictType: 'identity_collision', details: { incoming: r.externalId, existing: priorExternalId } });
      continue;
    }
    seen[email] = r.externalId;
    upserts.push({ email, externalId: r.externalId, name: r.name || '', classId: r.classId || null, age: r.age != null ? Number(r.age) : null });
  }
  return { upserts, conflicts };
}

module.exports = { rosterChecksum, planSync };
