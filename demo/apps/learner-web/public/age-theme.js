/*
 * LearnEU — Feature 014: Age-Adaptive Theming resolver (learner app).
 *
 * Self-contained, no deps. Coexists with /theme-toggle.js (Editorial GIC) — it uses a
 * SEPARATE body-class namespace (theme-age-*) and a separate storage key, so the two
 * never collide.
 *
 * Deterministic age-band rule (NO inference — reads a provided age band only):
 *   age  < 8        -> theme-age-kids
 *   8 <= age <= 13  -> theme-age-brick   (8–13 inclusive)
 *   age >= 14       -> theme-age-game
 *   unknown / fail  -> neutral default (no class)
 *
 * Age source (first match wins, all explicit — never inferred from behaviour/biometrics):
 *   1. window.LEARNER_AGE            (number)
 *   2. window.LEARNER_AGE_BAND       ('kids' | 'brick' | 'game')
 *   3. <body data-age="11">          attribute
 *   4. <meta name="learner-age" content="11">
 *
 * Override (set by teacher/parent surfaces): localStorage 'learneu_age_theme_override'
 * holding one of 'kids' | 'brick' | 'game' | 'auto'. Override wins over the age rule.
 *
 * Accessibility: honours prefers-reduced-motion / prefers-contrast and the explicit
 * preferences in localStorage ('learneu_a11y_reduced_motion', 'learneu_a11y_high_contrast').
 *
 * Activation: include this once per learner page, e.g. <script src="/age-theme.js" defer></script>,
 * and it self-injects /themes/age-themes.css. Presentation-only.
 */
(function () {
  var OVERRIDE_KEY = 'learneu_age_theme_override';
  var RM_KEY = 'learneu_a11y_reduced_motion';
  var HC_KEY = 'learneu_a11y_high_contrast';
  var CLASSES = ['theme-age-kids', 'theme-age-brick', 'theme-age-game'];
  var BAND_TO_CLASS = { kids: 'theme-age-kids', brick: 'theme-age-brick', game: 'theme-age-game' };

  function ls(key) { try { return localStorage.getItem(key); } catch (e) { return null; } }

  // Deterministic mapping from an explicit age (number) to a band. No inference.
  function ageToBand(age) {
    if (typeof age !== 'number' || isNaN(age)) return null;
    if (age < 8) return 'kids';
    if (age <= 13) return 'brick'; // 8–13 inclusive
    return 'game';
  }

  function readAgeBand() {
    // Override first.
    var ov = ls(OVERRIDE_KEY);
    if (ov && ov !== 'auto' && BAND_TO_CLASS[ov]) return ov;

    // Demo/testing affordance: explicit ?ageband=kids|brick|game or ?age=<n> in the URL
    // (explicit input, never inferred from behaviour/biometrics).
    try {
      var qs = new URLSearchParams(window.location.search);
      var qb = qs.get('ageband');
      if (qb && BAND_TO_CLASS[qb]) return qb;
      var qa = qs.get('age');
      if (qa) { var qbnd = ageToBand(parseInt(qa, 10)); if (qbnd) return qbnd; }
    } catch (e) {}

    // Explicit numeric age.
    if (typeof window.LEARNER_AGE === 'number') {
      var b = ageToBand(window.LEARNER_AGE);
      if (b) return b;
    }
    // Explicit band.
    if (window.LEARNER_AGE_BAND && BAND_TO_CLASS[window.LEARNER_AGE_BAND]) return window.LEARNER_AGE_BAND;

    // data-age attribute.
    var dataAge = document.body && document.body.getAttribute('data-age');
    if (dataAge) { var b2 = ageToBand(parseInt(dataAge, 10)); if (b2) return b2; }

    // meta tag.
    var meta = document.querySelector('meta[name="learner-age"]');
    if (meta) { var b3 = ageToBand(parseInt(meta.getAttribute('content'), 10)); if (b3) return b3; }

    return null; // unknown -> neutral default
  }

  function prefersReducedMotion() {
    if (ls(RM_KEY) === '1') return true;
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  function prefersHighContrast() {
    if (ls(HC_KEY) === '1') return true;
    return window.matchMedia && (window.matchMedia('(prefers-contrast: more)').matches ||
                                 window.matchMedia('(forced-colors: active)').matches);
  }

  function injectCss() {
    if (document.querySelector('link[data-age-themes]')) return;
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/themes/age-themes.css';
    link.setAttribute('data-age-themes', '1');
    document.head.appendChild(link);
  }

  function apply() {
    var body = document.body;
    if (!body) return;
    // Remove any existing age classes (idempotent), then apply the resolved one.
    CLASSES.forEach(function (c) { body.classList.remove(c); });
    var band = readAgeBand();
    if (band && BAND_TO_CLASS[band]) body.classList.add(BAND_TO_CLASS[band]); // else neutral default

    body.classList.toggle('theme-reduced-motion', !!prefersReducedMotion());
    body.classList.toggle('theme-contrast-high', !!prefersHighContrast());
  }

  // Public hook for teacher/parent override surfaces and live preference changes.
  window.LearnEUAgeTheme = {
    setOverride: function (band) { try { localStorage.setItem(OVERRIDE_KEY, band); } catch (e) {} apply(); },
    clearOverride: function () { try { localStorage.setItem(OVERRIDE_KEY, 'auto'); } catch (e) {} apply(); },
    setReducedMotion: function (on) { try { localStorage.setItem(RM_KEY, on ? '1' : '0'); } catch (e) {} apply(); },
    setHighContrast: function (on) { try { localStorage.setItem(HC_KEY, on ? '1' : '0'); } catch (e) {} apply(); },
    resolve: readAgeBand,
    refresh: apply
  };

  function start() { injectCss(); apply(); }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
  // React to OS-level accessibility changes.
  if (window.matchMedia) {
    try {
      window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', apply);
      window.matchMedia('(prefers-contrast: more)').addEventListener('change', apply);
    } catch (e) { /* older browsers: ignore */ }
  }
})();
