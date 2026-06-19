'use strict';
// Feature 009 — Outbound-log redaction + payload hashing.
// Raw payloads and secrets are NEVER written to the audit trail — only a sha256 hash
// and a redacted, length-bounded summary (GDPR data minimisation).
const crypto = require('crypto');

const SECRET_KEYS = /(pass(word)?|secret|token|authorization|api[-_]?key|bearer|cookie|ssn|dob)/i;

function payloadHash(payload) {
  const s = typeof payload === 'string' ? payload : JSON.stringify(payload || {});
  return crypto.createHash('sha256').update(s).digest('hex');
}

// Pseudonymous, stable actor id for xAPI/LRS (no raw email leaves the platform).
function pseudonymise(value, salt = 'learneu-009') {
  return 'acct:' + crypto.createHash('sha256').update(salt + '|' + String(value || '')).digest('hex').slice(0, 32);
}

function redact(obj) {
  if (obj == null) return obj;
  if (typeof obj !== 'object') return obj;
  const out = Array.isArray(obj) ? [] : {};
  for (const [k, v] of Object.entries(obj)) {
    if (SECRET_KEYS.test(k)) out[k] = '«redacted»';
    else if (v && typeof v === 'object') out[k] = redact(v);
    else out[k] = v;
  }
  return out;
}

function summarise(obj, max = 400) {
  try { return JSON.stringify(redact(obj)).slice(0, max); } catch { return ''; }
}

module.exports = { payloadHash, pseudonymise, redact, summarise };
