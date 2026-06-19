// Parent Portal — Weekly digest template renderer (US4, T050).
// Pure, DOM-free render helpers for the weekly digest: per-child summary KPIs,
// "How to help" guidance copy, and the past-digests list. The page orchestration
// (fetch + DOM assignment) lives in index.html and delegates here so the markup
// is defined in one reviewed place. Self-contained: no external dependencies.
(function () {
  'use strict';
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  var TONE = {
    celebration: '🎉 Great week',
    support: '🤝 Needs a little support',
    neutral: '📘 Steady progress'
  };
  // Returns { kpisHtml, helpHtml } for one child's weekly summary.
  function renderSummary(summary, howToHelp) {
    if (!summary) return { kpisHtml: '', helpHtml: 'No summary available yet.' };
    var s = summary;
    var toneLabel = TONE[s.tone] || '📘';
    var kpisHtml = [
      '<div class="kpi"><div class="lbl">Items completed</div><div class="val">' + (s.itemsCompleted | 0) + '</div><div class="sub">this week</div></div>',
      '<div class="kpi"><div class="lbl">Accuracy</div><div class="val">' + Math.round((s.accuracy || 0) * 100) + '%</div><div class="sub">' + (s.correct | 0) + ' correct</div></div>',
      '<div class="kpi"><div class="lbl">Active days</div><div class="val">' + (s.activeDays | 0) + '</div><div class="sub">out of 7</div></div>',
      '<div class="kpi"><div class="lbl">Focus</div><div class="val" style="font-size:1rem;">' + toneLabel + '</div><div class="sub">' + esc(s.weakestDomain ? s.weakestDomain.domain : '—') + '</div></div>'
    ].join('');
    var helpHtml = '<strong>How to help this week:</strong> ' + esc(howToHelp || '');
    return { kpisHtml: kpisHtml, helpHtml: helpHtml };
  }
  // Returns HTML for the list of past digests (most recent first).
  function renderPastDigests(rows) {
    rows = rows || [];
    if (!rows.length) return '<div class="sheet-empty">No digests sent yet.</div>';
    return rows.map(function (d) {
      var week = d.week_start ? new Date(d.week_start).toLocaleDateString() : '';
      var sent = d.sent_at ? 'sent ' + new Date(d.sent_at).toLocaleDateString() : 'not yet sent';
      return '<div class="msg-row"><div class="who">Week of ' + esc(week) + ' · ' + esc(d.child_email || '') +
        '</div><div class="body">' + esc(d.how_to_help || '') + '</div><div class="when">' + esc(sent) + '</div></div>';
    }).join('');
  }
  window.DigestTemplate = { renderSummary: renderSummary, renderPastDigests: renderPastDigests, toneLabels: TONE };
})();
