'use strict';
// Feature 009 — Retry with exponential backoff + dead-letter signalling (AI Act Art. 15 robustness).

// Runs `attemptFn` up to maxAttempts times. attemptFn() should resolve on success or throw on failure.
// Returns { ok, value?, attempts, deadLetter, lastError }. Never throws.
async function withRetry(attemptFn, { maxAttempts = 3, baseDelayMs = 50, onAttempt } = {}) {
  let lastError = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const value = await attemptFn(attempt);
      if (typeof onAttempt === 'function') onAttempt({ attempt, outcome: 'success' });
      return { ok: true, value, attempts: attempt, deadLetter: false, lastError: null };
    } catch (e) {
      lastError = e && e.message ? e.message : String(e);
      if (typeof onAttempt === 'function') onAttempt({ attempt, outcome: 'retry', error: lastError });
      if (attempt < maxAttempts) {
        const delay = baseDelayMs * Math.pow(2, attempt - 1);
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }
  return { ok: false, value: null, attempts: maxAttempts, deadLetter: true, lastError };
}

module.exports = { withRetry };
