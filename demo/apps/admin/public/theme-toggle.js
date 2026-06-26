/*
 * LearnEU — "Editorial GIC" theme toggle (whole-app).
 * Injects the top-right dongle, persists the choice, and applies/removes the
 * `theme-gic` class on <body>. Paired with /theme.css. Self-contained, no deps.
 */
(function () {
  var KEY = 'learneu_theme';

  function isOn() {
    try { return localStorage.getItem(KEY) === 'gic'; } catch (e) { return false; }
  }
  function apply(on) {
    document.body.classList.toggle('theme-gic', on);
    var sw = document.getElementById('themeToggle');
    if (sw) sw.setAttribute('aria-checked', String(on));
  }
  function toggle() {
    var on = !document.body.classList.contains('theme-gic');
    apply(on);
    try { localStorage.setItem(KEY, on ? 'gic' : 'default'); } catch (e) {}
  }

  function mount() {
    // Apply persisted choice as early as possible.
    apply(isOn());
    if (document.querySelector('.theme-dongle')) return; // already present (e.g. login.html)

    var wrap = document.createElement('div');
    wrap.className = 'theme-dongle';
    wrap.innerHTML =
      '<span class="theme-dongle__label">Editorial</span>' +
      '<button type="button" class="theme-dongle__switch" id="themeToggle" role="switch" ' +
      'aria-checked="false" aria-label="Toggle editorial theme"></button>';
    document.body.appendChild(wrap);
    wrap.querySelector('#themeToggle').addEventListener('click', toggle);
    apply(isOn());
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
