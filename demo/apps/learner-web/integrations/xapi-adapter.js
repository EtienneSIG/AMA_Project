'use strict';
// Feature 009 — xAPI statement builder + validator. Actors are pseudonymised before any
// statement leaves the platform (GDPR data minimisation — no raw learner email to the LRS).
const crypto = require('crypto');
const { pseudonymise } = require('./audit-redaction');

const VERBS = {
  completed: 'http://adlnet.gov/expapi/verbs/completed',
  answered: 'http://adlnet.gov/expapi/verbs/answered',
  attempted: 'http://adlnet.gov/expapi/verbs/attempted',
  passed: 'http://adlnet.gov/expapi/verbs/passed',
  failed: 'http://adlnet.gov/expapi/verbs/failed'
};

function buildStatement({ learnerEmail, verb, objectId, objectName, result }) {
  const v = VERBS[verb] || VERBS.attempted;
  const statement = {
    id: crypto.randomUUID(),
    actor: { objectType: 'Agent', account: { homePage: 'https://learneu.demo', name: pseudonymise(learnerEmail) } },
    verb: { id: v, display: { 'en-US': verb } },
    object: { id: objectId || 'https://learneu.demo/activity', definition: { name: { 'en-US': objectName || 'Activity' } } },
    result: result || {},
    timestamp: new Date().toISOString()
  };
  return statement;
}

// Minimal structural validation (xAPI core required fields).
function validate(statement) {
  if (!statement || !statement.id) return { ok: false, reason: 'missing id' };
  if (!statement.actor || !statement.actor.account) return { ok: false, reason: 'missing actor' };
  if (!statement.verb || !statement.verb.id) return { ok: false, reason: 'missing verb' };
  if (!statement.object || !statement.object.id) return { ok: false, reason: 'missing object' };
  // Ensure no raw email leaked into the actor.
  if (/@/.test(statement.actor.account.name || '')) return { ok: false, reason: 'actor not pseudonymised' };
  return { ok: true };
}

module.exports = { buildStatement, validate, VERBS };
