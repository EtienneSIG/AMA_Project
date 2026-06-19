'use strict';
// Feature 009 — GDPR Art. 15 export orchestration. Collects a subject's data, builds a
// manifest (CSV/PDF/README structure), and produces an *encrypted* package descriptor with
// an expiring secure link. The demo does not write a real ZIP to Blob; it produces the
// manifest + encryption envelope metadata so the lifecycle is auditable end-to-end.
const crypto = require('crypto');

const LINK_TTL_DAYS = 7;
const SLA_DAYS = 30;

// Collect the subject's data from available helpers. Best-effort; missing tables are skipped.
async function collectSubjectData(db, subjectEmail) {
  const sections = {};
  const safe = async (fn) => { try { return await fn(); } catch { return null; } };
  sections.mastery = await safe(() => db.listMasteryForLearner ? db.listMasteryForLearner({ email: subjectEmail }) : null);
  sections.attempts = await safe(() => db.recentAttempts ? db.recentAttempts({ email: subjectEmail, limit: 500 }) : null);
  sections.adaptiveDecisions = await safe(() => db.listAdaptiveDecisionsForLearner ? db.listAdaptiveDecisionsForLearner({ email: subjectEmail, limit: 500 }) : null);
  sections.scormAttempts = await safe(() => db.listScormAttempts ? db.listScormAttempts({ learnerEmail: subjectEmail, limit: 500 }) : null);
  return sections;
}

function buildManifest(subjectEmail, sections) {
  const files = [
    { name: 'README.txt', type: 'text', description: 'Explanation of the export, the data controller, and your GDPR rights.' },
    { name: 'profile.csv', type: 'csv', description: 'Account and enrolment data.' },
    { name: 'learning-records.csv', type: 'csv', description: 'Attempts, mastery, adaptive decisions, SCORM records.' },
    { name: 'transparency.pdf', type: 'pdf', description: 'Human-readable summary of automated decisions affecting you.' }
  ];
  const counts = Object.fromEntries(Object.entries(sections).map(([k, v]) => [k, Array.isArray(v) ? v.length : 0]));
  return { subjectEmail, generatedAt: new Date().toISOString(), files, recordCounts: counts, format: 'encrypted-zip' };
}

// Produce an encryption envelope (metadata only — the key is held by the controller/KMS).
function encryptionEnvelope() {
  return { algorithm: 'AES-256-GCM', keyRef: '@KeyVault(name=kv-learneu;secret=export-key)', iv: crypto.randomBytes(12).toString('hex') };
}

function secureLink(requestId) {
  const token = crypto.randomBytes(24).toString('base64url');
  const expires = new Date(Date.now() + LINK_TTL_DAYS * 86400000);
  return { url: `https://app-admin-learneu-demo.azurewebsites.net/api/admin/exports/${requestId}/download?t=${token}`, expiresAt: expires.toISOString() };
}

function slaDueAt() { return new Date(Date.now() + SLA_DAYS * 86400000).toISOString(); }

module.exports = { collectSubjectData, buildManifest, encryptionEnvelope, secureLink, slaDueAt, LINK_TTL_DAYS, SLA_DAYS };
