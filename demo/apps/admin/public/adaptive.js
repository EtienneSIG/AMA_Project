/* Feature 007 — Adaptive Learning client helper (shared).
 * Synced to learner-web/public and teacher-console/public.
 * State-changing fetches are auto-CSRF-protected by /csrf.js.
 * Exposes window.LearnEUAdaptive. */
(function () {
  'use strict';

  async function postJSON(url, body) {
    const r = await fetch(url, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {})
    });
    let d = {}; try { d = await r.json(); } catch (_) {}
    return { ok: r.ok, status: r.status, data: d };
  }
  async function getJSON(url) {
    const r = await fetch(url, { cache: 'no-store' });
    let d = {}; try { d = await r.json(); } catch (_) {}
    return { ok: r.ok, status: r.status, data: d };
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  // ---- Learner ----
  // Ask the engine for the next-best activity after an attempt was persisted.
  async function next({ itemId, correct, latencyMs, skillId, device }) {
    const { ok, data } = await postJSON('/api/learner/adaptive/next', { itemId, correct, latencyMs, skillId, device });
    return ok ? data : null;
  }

  // Render the transparent "why this activity" banner into a container element.
  function renderLearnerLabel(el, data) {
    if (!el) return;
    if (!data) { el.style.display = 'none'; el.innerHTML = ''; return; }
    const reasonColor = {
      catch_up: '#9A3412', peer_practice: '#1D4ED8', challenge: '#15803D',
      stretch: '#7C3AED', non_adaptive: '#475569'
    }[data.reason] || '#475569';
    let progress = '';
    if (data.catchUp && data.catchUp.activityIds) {
      const n = data.catchUp.activityIds.length;
      const i = data.catchUp.currentIndex || 0;
      progress = '<div style="margin-top:.35rem;font-size:.78rem;color:#9A3412;">Catch-up checkpoint: '
        + esc(i) + ' of ' + esc(n) + ' activities · then a quick check.</div>'
        + '<div style="height:6px;border-radius:999px;background:#FEE2E2;margin-top:.3rem;overflow:hidden;">'
        + '<div style="height:6px;width:' + Math.round((i / Math.max(n, 1)) * 100) + '%;background:#F97316;"></div></div>';
    }
    el.style.display = 'block';
    el.innerHTML =
      '<div style="border:1px solid #E2E8F0;border-left:4px solid ' + reasonColor + ';border-radius:8px;padding:.55rem .7rem;background:#F8FAFC;">'
      + '<div style="font-size:.7rem;letter-spacing:.04em;text-transform:uppercase;color:' + reasonColor + ';font-weight:700;">Why this next 🤖</div>'
      + '<div style="font-size:.92rem;color:#0F172A;margin-top:.2rem;">' + esc(data.label) + '</div>'
      + progress
      + (data.dataReliable === false
          ? '<div style="margin-top:.3rem;font-size:.72rem;color:#475569;">Your teacher decides what comes next while we gather more evidence.</div>'
          : '')
      + '</div>';
  }

  async function getPath() { const { data } = await getJSON('/api/learner/adaptive/path'); return data; }
  async function getState() { const { data } = await getJSON('/api/learner/adaptive/state'); return data && data.state; }
  async function saveState(body) { const { data } = await postJSON('/api/learner/adaptive/state', body); return data; }
  async function advanceCatchUp(id, body) { const { data } = await postJSON('/api/learner/adaptive/catchup/' + id + '/advance', body); return data; }

  // ---- Teacher ----
  async function teacherLearner(email) { const { data } = await getJSON('/api/teacher/adaptive/learner/' + encodeURIComponent(email)); return data; }
  async function teacherOverride(decisionId, body) { return postJSON('/api/teacher/adaptive/override/' + decisionId, body); }
  async function teacherStretchFeedback(id, body) { return postJSON('/api/teacher/adaptive/stretch/' + id + '/feedback', body); }

  window.LearnEUAdaptive = {
    next, renderLearnerLabel, getPath, getState, saveState, advanceCatchUp,
    teacherLearner, teacherOverride, teacherStretchFeedback, esc
  };
})();
