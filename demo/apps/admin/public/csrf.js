// LearnEU CSRF helper — reads the learneu_csrf cookie and injects it as
// X-CSRF-Token header on all state-changing fetch() calls.
// Include this script before any application code.
'use strict';
(function() {
  const originalFetch = window.fetch;
  const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

  function getCsrfToken() {
    const m = document.cookie.match(/(?:^|;\s*)learneu_csrf=([^;]+)/);
    return m ? m[1] : '';
  }

  window.fetch = function(input, init) {
    init = init || {};
    const method = (init.method || 'GET').toUpperCase();
    if (!SAFE_METHODS.has(method)) {
      init.headers = init.headers || {};
      if (init.headers instanceof Headers) {
        if (!init.headers.has('X-CSRF-Token')) init.headers.set('X-CSRF-Token', getCsrfToken());
      } else {
        if (!init.headers['X-CSRF-Token']) init.headers['X-CSRF-Token'] = getCsrfToken();
      }
    }
    return originalFetch.call(this, input, init);
  };
})();
