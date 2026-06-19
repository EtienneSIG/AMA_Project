'use strict';
// Feature 009 — xAPI delivery worker. Drains the pending queue, delivers to the configured
// LRS with retry/backoff, and dead-letters on persistent failure. Every attempt is audited.
// In the demo there is no external LRS, so delivery is simulated; a forced-outage flag lets
// tests exercise the retry + dead-letter path. Learner flow is never blocked by delivery.
const { withRetry } = require('./retry-policy');
const { payloadHash, summarise } = require('./audit-redaction');

// Deliver a single statement. `simulateOutage` forces failure for the failure-path test.
async function deliverOne(db, row, { correlationId, endpoint, simulateOutage } = {}) {
  const result = await withRetry(async (attempt) => {
    await db.logExternalApiAudit({
      correlationId, connectorType: 'xapi', eventType: 'xapi_delivery_attempted',
      endpoint, outcome: 'retry', statusCode: null, payloadHash: payloadHash(row.statement_id),
      redactedSummary: `attempt ${attempt} for ${row.statement_id}`, actor: 'system'
    });
    if (simulateOutage) throw new Error('lrs_unavailable (simulated)');
    return { delivered: true };
  }, { maxAttempts: 3, baseDelayMs: 20 });

  if (result.ok) {
    await db.updateXapiStatus({ statementId: row.statement_id, status: 'delivered', attempts: result.attempts });
    await db.logExternalApiAudit({ correlationId, connectorType: 'xapi', eventType: 'xapi_delivery_attempted', endpoint, outcome: 'success', statusCode: 200, payloadHash: payloadHash(row.statement_id), redactedSummary: 'delivered', actor: 'system' });
    return { statementId: row.statement_id, status: 'delivered', attempts: result.attempts };
  }
  await db.updateXapiStatus({ statementId: row.statement_id, status: 'dead_letter', attempts: result.attempts, lastError: result.lastError });
  await db.logExternalApiAudit({ correlationId, connectorType: 'xapi', eventType: 'xapi_dead_lettered', endpoint, outcome: 'dead_letter', statusCode: 503, payloadHash: payloadHash(row.statement_id), redactedSummary: summarise({ lastError: result.lastError }), actor: 'system' });
  return { statementId: row.statement_id, status: 'dead_letter', attempts: result.attempts };
}

// Drain up to `limit` pending statements.
async function drainQueue(db, { correlationId, endpoint, simulateOutage, limit } = {}) {
  const pending = await db.listPendingXapi({ limit: limit || 50 });
  const out = [];
  for (const row of pending) out.push(await deliverOne(db, row, { correlationId, endpoint, simulateOutage }));
  return { processed: out.length, results: out };
}

module.exports = { deliverOne, drainQueue };
