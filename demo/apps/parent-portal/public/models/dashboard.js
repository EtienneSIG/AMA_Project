// Parent Portal — Multi-child dashboard rendering (US1, T022).
// Pure, DOM-free render helpers for the per-child dashboard: KPI tiles, mastery
// chapters, the 30-day activity sparkline, teacher Q&A, and the child <option>
// list used by the dashboard / message / digest pickers. The page keeps the
// fetch + DOM wiring and delegates markup here. Self-contained: no globals.
(function () {
  'use strict';
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  var CHAPTER = { basics: 'Basics', operations: 'Operations', representations: 'Representations', word_problems: 'Word problems' };
  function chapterTitle(id) { return CHAPTER[id] || (id || 'Other'); }

  // <option> list for a children array (re-used by child/message/digest selects).
  function childOptions(kids) {
    return (kids || []).map(function (k) {
      return '<option value="' + esc(k.childEmail) + '">' + esc(k.displayName || k.childEmail) + '</option>';
    }).join('');
  }

  // KPI tiles from mastery rows + streak stats.
  function renderKpis(masteryRows, streak) {
    var rows = masteryRows || [];
    var avg = rows.length ? Math.round(100 * rows.reduce(function (a, b) { return a + (+b.level || 0); }, 0) / rows.length) : 0;
    var mastered = rows.filter(function (r) { return (+r.level || 0) >= 0.85; }).length;
    var sk = streak || {};
    var totals = sk.totalAttempts || 0;
    var acc = totals ? Math.round(100 * (sk.accuracy || 0)) : 0;
    return [
      '<div class="kpi"><div class="lbl">Avg mastery</div><div class="val">' + avg + '%</div><div class="sub">' + rows.length + ' skills</div></div>',
      '<div class="kpi"><div class="lbl">Mastered</div><div class="val">' + mastered + '/' + rows.length + '</div><div class="sub">≥ 85% level</div></div>',
      '<div class="kpi"><div class="lbl">Current streak</div><div class="val">' + (sk.streak || 0) + 'd</div><div class="sub">' + ((sk.badges || []).length) + ' badges</div></div>',
      '<div class="kpi"><div class="lbl">Attempts (' + (sk.windowDays || 30) + 'd)</div><div class="val">' + totals + '</div><div class="sub">' + acc + '% accuracy</div></div>'
    ].join('');
  }

  // Collapsible mastery chapters grouped by chapter id.
  function renderChapters(masteryRows) {
    var rows = masteryRows || [];
    if (!rows.length) return '<div class="sheet-empty">No mastery records yet.</div>';
    var groups = {};
    rows.forEach(function (r) { var c = r.chapter || 'other'; (groups[c] = groups[c] || []).push(r); });
    var order = ['basics', 'operations', 'representations', 'word_problems'];
    var keys = Object.keys(groups).sort(function (a, b) { var ia = order.indexOf(a), ib = order.indexOf(b); return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib); });
    return keys.map(function (k) {
      var items = groups[k];
      var pct = Math.round(100 * items.reduce(function (a, b) { return a + (+b.level || 0); }, 0) / items.length);
      var skills = items.map(function (r) {
        return '<div class="skill-row"><span class="badge-pill">' + Math.round((+r.level || 0) * 100) + '%</span><strong>' + esc(r.label || r.skillId) + '</strong>' +
          (r.attempts ? ' · <span style="color:var(--grey);font-size:.8rem;">' + r.attempts + ' attempts</span>' : '') + '</div>';
      }).join('');
      return '<div class="chapter-card" onclick="this.classList.toggle(\'collapsed\')">' +
        '<div class="chapter-head"><span class="chev">▼</span><span class="chap-title">' + esc(chapterTitle(k)) + '</span><span class="chap-pct">' + pct + '%</span></div>' +
        '<div class="chapter-bar"><div style="width:' + pct + '%;"></div></div>' +
        '<div class="chapter-body" onclick="event.stopPropagation()">' + skills + '</div></div>';
    }).join('');
  }

  // 30-day activity sparkline. Server returns rows DESC; we reverse to chronological.
  function renderActivity(activityRows) {
    var days = (activityRows || []).slice().reverse();
    if (!days.length) return '<div class="sheet-empty">No recent activity.</div>';
    var max = Math.max.apply(null, [1].concat(days.map(function (d) { return +d.attempts || 0; })));
    return '<div class="activity-bar" style="height:48px;gap:4px;">' + days.map(function (d) {
      var h = Math.max(2, Math.round(46 * (+d.attempts || 0) / max));
      var has = (+d.attempts || 0) > 0 ? 'has' : '';
      return '<div class="day ' + has + '" style="height:' + h + 'px;width:14px;" title="' + esc(d.day || '') + ': ' + (d.attempts || 0) + ' attempts (' + (d.correct || 0) + ' correct)"></div>';
    }).join('') + '</div>';
  }

  // Recent teacher Q&A (read-only) for the child.
  function renderTeacherQuestions(rows) {
    var items = rows || [];
    if (!items.length) return '<div class="sheet-empty">No teacher messages yet.</div>';
    return items.map(function (qq) {
      var status = qq.status === 'answered' ? '<span class="answered">Answered</span>' : '<span class="pending">Pending</span>';
      var when = qq.created_at ? new Date(qq.created_at).toLocaleString() : '';
      var ans = qq.answered_at ? ' · answered ' + new Date(qq.answered_at).toLocaleString() : '';
      var body = qq.answer ? qq.answer : qq.question;
      return '<div class="tq-item" style="margin-bottom:.45rem;">' +
        '<div class="head"><span class="subj">' + esc(qq.subject || '(no subject)') + '</span>' + status + '</div>' +
        '<div style="font-size:.85rem;color:var(--navy);margin:.3rem 0;white-space:pre-wrap;">' + esc((body || '').slice(0, 400)) + '</div>' +
        '<div class="when">' + when + ans + '</div></div>';
    }).join('');
  }

  window.DashboardModel = {
    chapterTitle: chapterTitle,
    childOptions: childOptions,
    renderKpis: renderKpis,
    renderChapters: renderChapters,
    renderActivity: renderActivity,
    renderTeacherQuestions: renderTeacherQuestions
  };
})();
