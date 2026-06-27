/*
 * LearnEU — Editorial theme toggle REMOVED (Spec 020).
 * The optional "Editorial GIC" theme switch is no longer offered. This script now
 * only ENFORCES the default theme: it strips any `theme-gic` class, removes any
 * lingering `.theme-dongle` control, and clears the stored preference so a value
 * saved before this change can never re-apply the alternative theme.
 * Idempotent, dependency-free, safe on cached pages. Kept as a file so existing
 * `<script src="/theme-toggle.js">` references keep working.
 */
(function () {
  var KEY = 'learneu_theme';

  function enforceDefault() {
    try { document.body.classList.remove('theme-gic'); } catch (e) {}
    // Remove any previously-rendered toggle (injected or inlined, e.g. login.html).
    var existing = document.querySelectorAll('.theme-dongle');
    for (var i = 0; i < existing.length; i++) {
      if (existing[i] && existing[i].parentNode) existing[i].parentNode.removeChild(existing[i]);
    }
    // Drop any stored preference so it cannot re-enable the alternative theme later.
    try { localStorage.removeItem(KEY); } catch (e) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', enforceDefault);
  } else {
    enforceDefault();
  }
})();
