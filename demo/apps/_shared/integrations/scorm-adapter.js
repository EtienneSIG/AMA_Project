'use strict';
// Feature 009 — SCORM 1.2/2004 adapter. Parses an imsmanifest descriptor (provided as
// JSON for the demo) into normalized package metadata, and provides a learner-safe
// fallback when CDN/package assets are unavailable.

function parseManifest(input) {
  // Accepts either a parsed object or a minimal JSON manifest descriptor.
  const m = typeof input === 'string' ? safeJson(input) : (input || {});
  const version = (m.schemaversion || m.version || '').includes('2004') ? '2004' : '1.2';
  const title = m.title || (m.organizations && m.organizations.title) || 'SCORM activity';
  const launchHref = m.launchHref || m.href || 'index_lms.html';
  if (!m || (!m.title && !m.launchHref && !m.href && !m.identifier)) {
    return { ok: false, reason: 'unparseable_manifest' };
  }
  return {
    ok: true,
    packageId: m.identifier || ('SCORM-' + Math.random().toString(36).slice(2, 8).toUpperCase()),
    title, scormVersion: version, launchHref,
    manifest: { masteryScore: m.masteryScore != null ? Number(m.masteryScore) : 80, raw: m }
  };
}

function safeJson(s) { try { return JSON.parse(s); } catch { return {}; } }

// Validate a learner commit payload (lesson status + score) before persistence.
function normalizeCommit({ lessonStatus, scoreRaw, sessionTime, suspendData }, masteryScore = 80) {
  const allowed = ['passed', 'completed', 'failed', 'incomplete', 'browsed', 'not attempted'];
  let status = String(lessonStatus || 'incomplete').toLowerCase();
  if (!allowed.includes(status)) status = 'incomplete';
  let score = scoreRaw == null ? null : Math.max(0, Math.min(100, Number(scoreRaw)));
  if (score != null && (status === 'completed' || status === 'incomplete')) {
    status = score >= masteryScore ? 'passed' : (status === 'completed' ? 'failed' : status);
  }
  return { lessonStatus: status, scoreRaw: score, sessionTime: sessionTime || '00:00:00', suspendData: (suspendData || '').slice(0, 4096) };
}

// Learner-safe message when package assets can't load.
function fallbackMessage() {
  return 'This activity is temporarily unavailable. Your progress is saved — please try again shortly or continue with other work.';
}

module.exports = { parseManifest, normalizeCommit, fallbackMessage };
