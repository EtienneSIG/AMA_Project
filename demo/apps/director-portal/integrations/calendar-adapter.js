'use strict';
// Feature 009 — School calendar adapter + due-date guardrails.
// Normalizes closure days and computes safe due-date adjustments. Ambiguous cases are
// flagged for teacher confirmation rather than auto-applied (teacher-in-the-loop).

function toDate(d) { return (d instanceof Date) ? d : new Date(d + 'T00:00:00Z'); }
function fmt(d) { return d.toISOString().slice(0, 10); }
function isWeekend(d) { const g = d.getUTCDay(); return g === 0 || g === 6; }

// closureSet: Set of 'YYYY-MM-DD' strings. Returns the next school-open day on/after `date`.
function nextOpenDay(date, closureSet) {
  let d = toDate(date);
  for (let i = 0; i < 60; i++) {
    const key = fmt(d);
    if (!isWeekend(d) && !closureSet.has(key)) return key;
    d = new Date(d.getTime() + 86400000);
  }
  return fmt(date);
}

// Decide a due-date adjustment. Returns { action, adjustedDue, reason }.
// action: 'none' | 'auto' | 'pending_confirm'.
function adjustDueDate(originalDue, closures, { graceWindowDays = 7 } = {}) {
  const closureSet = new Set((closures || []).map(c => (typeof c === 'string' ? c : fmt(toDate(c.event_date || c.eventDate)))));
  const due = toDate(originalDue);
  const key = fmt(due);
  const onClosure = closureSet.has(key) || isWeekend(due);
  if (!onClosure) return { action: 'none', adjustedDue: key, reason: 'due date falls on a school-open day' };
  const next = nextOpenDay(due, closureSet);
  // If the shift is small, auto-apply; if it spans more than the grace window (e.g. long
  // holiday), require teacher confirmation to avoid surprising pedagogical changes.
  const gapDays = Math.round((toDate(next).getTime() - due.getTime()) / 86400000);
  if (gapDays > graceWindowDays) {
    return { action: 'pending_confirm', adjustedDue: next, reason: `closure spans ${gapDays} days (> ${graceWindowDays}d) — teacher confirmation required` };
  }
  return { action: 'auto', adjustedDue: next, reason: `original due date is a closure/weekend; shifted to next open day (+${gapDays}d)` };
}

module.exports = { nextOpenDay, adjustDueDate, fmt };
