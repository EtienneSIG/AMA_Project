'use strict';
// Feature 007 — Adaptive Learning: immutable audit writer + telemetry (Art. 12 & 15).
// Thin wrapper over db.logAdaptiveAudit so route code stays declarative. Best-effort:
// audit failures are logged to console but never block the learner experience
// (availability safeguard) — though every successful adaptive decision IS audited.

// Capture a monotonic start time for latency telemetry.
function startTimer() {
  const t0 = Date.now();
  return () => Date.now() - t0;
}

// Write one immutable audit event. `db` is the shared db module.
async function writeAudit(db, { eventType, learnerEmail, teacherEmail, data, latencyMs }) {
  try {
    return await db.logAdaptiveAudit({ eventType, learnerEmail, teacherEmail, data, latencyMs });
  } catch (e) {
    console.error('[adaptive-audit] failed:', e && e.message, '| event:', eventType);
    return null;
  }
}

module.exports = { startTimer, writeAudit };
