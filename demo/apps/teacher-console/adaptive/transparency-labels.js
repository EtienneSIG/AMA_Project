'use strict';
// Feature 007 — Adaptive Learning transparency copy (EU AI Act Art. 13).
// Versioned, plain-language. Learner labels are pedagogically grounded and never
// expose algorithm internals (no thresholds, no model version, no scores).
// Teacher reasoning is explicit and auditable. Reviewed by Learning Sciences +
// Content Localisation before release.

const LABELS_VERSION = 'transparency-v1';

// Learner-facing plain-language labels per recommendation reason.
const LEARNER = {
  catch_up: {
    fr: "Reprenons les bases ensemble, étape par étape. 💪",
    en: "Let's build this up step by step. 💪"
  },
  peer_practice: {
    fr: "Tu progresses bien — continue avec un exercice du même niveau. 👍",
    en: "You're getting there — keep going with a same-level activity. 👍"
  },
  challenge: {
    fr: "Tu maîtrises ! Essaie un défi plus relevé. 🚀",
    en: "You've got this! Try a tougher challenge. 🚀"
  },
  stretch: {
    fr: "Excellent ! Voici une activité d'approfondissement pour aller plus loin. 🌟",
    en: "Excellent! Here's a stretch activity to go further. 🌟"
  },
  non_adaptive: {
    fr: "Continue à t'entraîner — ton enseignant choisit la suite avec toi.",
    en: "Keep practising — your teacher picks what comes next with you."
  }
};

// Teacher-facing reasoning template (full transparency, Art. 14 oversight).
function teacherReason({ reason, masteryLevel, attempts, latencyMs, dataReliable }) {
  const pct = masteryLevel == null ? 'n/a' : Math.round(masteryLevel * 100) + '%';
  if (!dataReliable) {
    return `Insufficient/unreliable mastery evidence (${attempts || 0} attempts). System defaulted to NON-ADAPTIVE mode; no automated path applied — teacher decides.`;
  }
  const sec = latencyMs == null ? 'n/a' : (latencyMs / 1000).toFixed(1) + 's';
  const band = reason === 'catch_up' ? '0–50%'
    : reason === 'peer_practice' ? '50–80%'
    : (reason === 'challenge' || reason === 'stretch') ? '80%+' : 'n/a';
  const tail = reason === 'stretch'
    ? ' Sustained high mastery (3+ consecutive 85%+) → stretch opportunity surfaced.'
    : '';
  return `Based on ${pct} mastery (${attempts || 0} attempts, band ${band}, last completion ${sec}), system recommended ${reason.replace('_', ' ')}.${tail} This is a recommendation only — override anytime.`;
}

function learnerLabel(reason, locale) {
  const r = LEARNER[reason] || LEARNER.non_adaptive;
  return r[locale === 'fr' ? 'fr' : 'en'];
}

module.exports = { LABELS_VERSION, learnerLabel, teacherReason, LEARNER };
