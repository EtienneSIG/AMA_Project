/*
 * LearnEU — math formatting helper.
 * The AI tutor sometimes returns LaTeX math (e.g. \frac{1}{4}, \times, $...$).
 * The lightweight markdown renderer used in the apps does not render LaTeX, so it
 * would otherwise appear literally. This converts the most common LaTeX into the
 * plain, child-friendly text the demo uses (e.g. "1/4 + 1/4", "×", "√(x)").
 * Exposed as window.plainMath(text).
 */
(function () {
  var SYMBOLS = {
    '\\times': '×', '\\cdot': '·', '\\div': '÷', '\\pm': '±', '\\mp': '∓',
    '\\leq': '≤', '\\le': '≤', '\\geq': '≥', '\\ge': '≥',
    '\\neq': '≠', '\\ne': '≠', '\\approx': '≈', '\\equiv': '≡', '\\sim': '~',
    '\\pi': 'π', '\\theta': 'θ', '\\alpha': 'α', '\\beta': 'β', '\\gamma': 'γ',
    '\\delta': 'δ', '\\mu': 'µ', '\\degree': '°', '\\infty': '∞',
    '\\rightarrow': '→', '\\to': '→', '\\Rightarrow': '⇒', '\\leftarrow': '←',
    '\\ldots': '…', '\\dots': '…', '\\cdots': '…', '\\%': '%', '\\$': '$', '\\&': '&'
  };

  function stripMathDelimiters(s) {
    // Display math: $$...$$, \[...\]
    s = s.replace(/\$\$([\s\S]*?)\$\$/g, '$1');
    s = s.replace(/\\\[([\s\S]*?)\\\]/g, '$1');
    // Inline math: \(...\)
    s = s.replace(/\\\(([\s\S]*?)\\\)/g, '$1');
    // Inline $...$ — only when the content looks like math (avoids stripping currency).
    s = s.replace(/(^|[^\\])\$([^$\n]*?(?:\\|[\^_{}/])[^$\n]*?)\$/g, '$1$2');
    return s;
  }

  function convert(s) {
    if (s == null) return s;
    s = String(s);
    s = stripMathDelimiters(s);

    // \left( \right) sizing wrappers.
    s = s.replace(/\\left\s*/g, '').replace(/\\right\s*/g, '');
    // \text{...}, \mathrm{...}, \mathbf{...} → inner text.
    s = s.replace(/\\(?:text|mathrm|mathbf|mathit|operatorname)\s*\{([^{}]*)\}/g, '$1');
    // Fractions (run twice for one level of nesting): \frac{a}{b} → (a)/(b).
    for (var i = 0; i < 2; i++) {
      s = s.replace(/\\[dt]?frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, '($1)/($2)');
    }
    // \sqrt{x} → √(x), \sqrt[n]{x} → ⁿ√(x) (kept simple as root_n(x)).
    s = s.replace(/\\sqrt\s*\[([^\]]*)\]\s*\{([^{}]*)\}/g, 'root_$1($2)');
    s = s.replace(/\\sqrt\s*\{([^{}]*)\}/g, '√($1)');
    // Symbols.
    for (var k in SYMBOLS) { if (SYMBOLS.hasOwnProperty(k)) s = s.split(k).join(SYMBOLS[k]); }
    // Exponents / subscripts: drop the braces (a^{2} → a^2, x_{i} → x_i).
    s = s.replace(/\^\{([^{}]*)\}/g, '^$1').replace(/_\{([^{}]*)\}/g, '_$1');
    // Spacing macros (\, \; \: \! \quad \qquad) → a single space.
    s = s.replace(/\\(?:quad|qquad|,|;|:|!|>| )/g, ' ');
    // Any remaining \command → keep the word, drop the backslash.
    s = s.replace(/\\([a-zA-Z]+)/g, '$1');
    // Tidy: single-character (a)/(b) → a/b for readability.
    s = s.replace(/\(\s*([^()\s])\s*\)\/\(\s*([^()\s])\s*\)/g, '$1/$2');
    // Drop now-orphaned escaping backslashes before braces.
    s = s.replace(/\\([{}])/g, '$1');
    return s;
  }

  window.plainMath = convert;
})();
