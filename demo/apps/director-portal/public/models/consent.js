/* Parental consent flow — GDPR Art. 8 (Feature 6, US3, T041).
 *
 * Drives the token-based consent page: fetches the disclosure for a consent token,
 * renders a plain-language review + an EXPLICIT consent checkbox, and submits the
 * parent's grant/decline decision. Granting requires the checkbox to be ticked.
 *
 * Exposes window.ConsentFlow.init() which consent-pending.html calls when a ?token=
 * query parameter is present. With no token the static "waiting" card is shown instead.
 */
(function () {
  'use strict';

  function el(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function rightsList(rights) {
    if (!rights) return '';
    var order = ['legalBasis', 'dataResidency', 'withdrawable', 'retention', 'noProfiling', 'controller'];
    var items = order.filter(function (k) { return rights[k]; })
      .map(function (k) { return '<li>' + esc(rights[k]) + '</li>'; }).join('');
    return items ? '<ul class="rights">' + items + '</ul>' : '';
  }

  function setStatus(html, kind) {
    var box = el('consentForm');
    if (box) box.innerHTML = html;
    var card = el('consentCard');
    if (card && kind) card.setAttribute('data-state', kind);
  }

  async function fetchDisclosure(token) {
    var r = await fetch('/api/consent/requests/' + encodeURIComponent(token), { cache: 'no-store' });
    if (!r.ok) {
      if (r.status === 404) return { error: 'invalid_token' };
      return { error: 'unavailable' };
    }
    return r.json();
  }

  async function submitDecision(token, decision, agree) {
    var r = await fetch('/api/consent/requests/' + encodeURIComponent(token) + '/decide', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision: decision, agree: agree })
    });
    var data = {};
    try { data = await r.json(); } catch (_) { /* ignore */ }
    return { ok: r.ok, status: r.status, data: data };
  }

  function renderResolved(decision, childName) {
    if (decision === 'granted') {
      setStatus(
        '<div class="icon">\u2705</div>' +
        '<h1>Consent granted</h1>' +
        '<p>Thank you. You have granted consent for <strong>' + esc(childName) + '</strong> to use LearnEU. ' +
        'They can now sign in. You can withdraw this consent at any time from the Parent Portal.</p>',
        'done');
    } else {
      setStatus(
        '<div class="icon">\u2716\uFE0F</div>' +
        '<h1>Consent declined</h1>' +
        '<p>You have declined consent for <strong>' + esc(childName) + '</strong>. ' +
        'Their account will stay locked. You can grant consent later from the Parent Portal.</p>',
        'done');
    }
  }

  function renderForm(token, info) {
    var name = esc(info.childDisplayName || 'this learner');
    setStatus(
      '<div class="icon">\uD83D\uDD12</div>' +
      '<h1>Parental consent for ' + name + '</h1>' +
      '<p>Because <strong>' + name + '</strong> is under 16, European data protection law ' +
      '(<strong>GDPR Article 8</strong>) requires a parent or guardian to consent before they can use LearnEU.</p>' +
      '<p class="version">Disclosure version: <code>' + esc(info.disclosureVersion || 'v1.0') + '</code></p>' +
      rightsList(info.rights) +
      '<label class="agree"><input type="checkbox" id="agreeBox" /> ' +
      'I am the parent or legal guardian of ' + name + ' and I explicitly consent to LearnEU ' +
      'processing their data as described above.</label>' +
      '<p class="err" id="consentErr" hidden></p>' +
      '<div class="actions">' +
      '<button id="grantBtn" type="button">Grant consent</button>' +
      '<button id="declineBtn" type="button" class="secondary">Decline</button>' +
      '</div>',
      'form');

    var grantBtn = el('grantBtn');
    var declineBtn = el('declineBtn');
    var errBox = el('consentErr');

    function busy(on) {
      if (grantBtn) grantBtn.disabled = on;
      if (declineBtn) declineBtn.disabled = on;
    }
    function showErr(msg) {
      if (!errBox) return;
      errBox.textContent = msg;
      errBox.hidden = false;
    }

    grantBtn.addEventListener('click', async function () {
      var agree = !!(el('agreeBox') && el('agreeBox').checked);
      if (!agree) { showErr('Please tick the box to give explicit consent before granting.'); return; }
      if (errBox) errBox.hidden = true;
      busy(true);
      var res = await submitDecision(token, 'granted', true);
      busy(false);
      if (res.ok) { renderResolved('granted', info.childDisplayName); return; }
      if (res.status === 410) { renderExpired(); return; }
      showErr((res.data && res.data.message) || 'Could not record consent. Please try again.');
    });

    declineBtn.addEventListener('click', async function () {
      if (errBox) errBox.hidden = true;
      busy(true);
      var res = await submitDecision(token, 'declined', false);
      busy(false);
      if (res.ok) { renderResolved('declined', info.childDisplayName); return; }
      if (res.status === 410) { renderExpired(); return; }
      showErr((res.data && res.data.message) || 'Could not record your decision. Please try again.');
    });
  }

  function renderExpired() {
    setStatus(
      '<div class="icon">\u23F0</div>' +
      '<h1>This consent link has expired</h1>' +
      '<p>For safety, consent links are valid for a limited time. Please ask the school to send a new link, ' +
      'or grant consent directly from the Parent Portal.</p>',
      'expired');
  }

  function renderInvalid() {
    setStatus(
      '<div class="icon">\u26A0\uFE0F</div>' +
      '<h1>Consent link not found</h1>' +
      '<p>This link is not valid. Please check the link in your message, or grant consent from the Parent Portal.</p>',
      'invalid');
  }

  async function init() {
    var token = new URLSearchParams(window.location.search).get('token');
    if (!token) return; // No token: the static waiting card stays as-is.
    setStatus('<div class="icon">\u23F3</div><p>Loading consent request\u2026</p>', 'loading');
    var info;
    try { info = await fetchDisclosure(token); }
    catch (_) { info = { error: 'unavailable' }; }
    if (!info || info.error === 'invalid_token') { renderInvalid(); return; }
    if (info.error) {
      setStatus('<div class="icon">\u26A0\uFE0F</div><h1>Service unavailable</h1>' +
        '<p>We could not load this consent request right now. Please try again shortly.</p>', 'error');
      return;
    }
    if (info.status === 'expired') { renderExpired(); return; }
    if (info.status === 'granted') { renderResolved('granted', info.childDisplayName); return; }
    if (info.status === 'declined') { renderResolved('declined', info.childDisplayName); return; }
    renderForm(token, info);
  }

  window.ConsentFlow = { init: init, fetchDisclosure: fetchDisclosure, submitDecision: submitDecision };
})();
