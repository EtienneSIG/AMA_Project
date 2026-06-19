// Parent Portal — Parent ↔ teacher messaging rendering (US2, T031).
// Pure, DOM-free render helpers for the message thread plus a tiny helper that
// selects the inbound, delivered, unread messages whose read-receipts should be
// posted. The page keeps the fetch + DOM wiring and delegates markup here.
// Self-contained: no globals. Moderation state (quarantined) is surfaced inline.
(function () {
  'use strict';
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // Render a conversation thread (oldest → newest). Parent messages show as "You".
  function renderThread(messages) {
    var msgs = messages || [];
    if (!msgs.length) return '<div class="sheet-empty">No messages yet.</div>';
    return msgs.map(function (m) {
      var who = m.sender_role === 'parent' ? 'You' : 'Teacher';
      var when = m.created_at ? new Date(m.created_at).toLocaleString() : '';
      var quarantined = m.delivery_state === 'quarantined' ? '<span class="state quarantined">awaiting review</span>' : '';
      return '<div class="msg-row ' + esc(m.sender_role) + '"><div style="display:flex;justify-content:space-between;align-items:center;">' +
        '<span class="who">' + who + ' ' + quarantined + '</span><span class="when">' + esc(when) + '</span></div>' +
        '<div class="body">' + esc(m.body || '') + '</div></div>';
    }).join('');
  }

  // Inbound (teacher), delivered, not-yet-read messages → their ids (for read receipts).
  function unreadInboundIds(messages) {
    return (messages || [])
      .filter(function (m) { return m.sender_role !== 'parent' && !m.read_at && m.delivery_state === 'delivered'; })
      .map(function (m) { return m.id; });
  }

  // Map a send response to user-facing status copy (moderation-aware).
  function sendStatus(ok, body) {
    if (!ok) return (body && body.error) || 'Failed to send.';
    return (body && body.moderation) || 'Message sent.';
  }

  window.MessagesModel = {
    renderThread: renderThread,
    unreadInboundIds: unreadInboundIds,
    sendStatus: sendStatus
  };
})();
