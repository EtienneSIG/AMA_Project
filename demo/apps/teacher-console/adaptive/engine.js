'use strict';
// Feature 007 — Adaptive Learning: deterministic recommendation engine.
// PURE function (no DB / no I/O) so it is fully unit-testable and reproducible.
// Every adaptive output is a RECOMMENDATION only; teachers can override (Art. 14).

const H = require('./helpers');
const labels = require('./transparency-labels');

const MODEL_VERSION = 'adaptive-v1';

// Generate the next-best-activity recommendation from mastery evidence.
// Input:
//   skillId, attempts, correct, level (0..1), priorLevel, latencyMs,
//   recentCorrect (array of booleans newest-first), locale ('fr'|'en')
// Output: a recommendation object with transparent learner + teacher reasoning.
function generateAdaptiveRecommendation(ctx) {
  const { skillId, priorItemId, latencyMs, recentCorrect, locale } = ctx || {};
  const { masteryLevel, attempts, reliable } = H.calculateMasteryScore(ctx || {});

  // Graceful degradation: no opaque guessing when evidence is insufficient.
  if (!reliable) {
    const explanationTeacher = labels.teacherReason({ reason: 'non_adaptive', masteryLevel, attempts, latencyMs, dataReliable: false });
    return {
      modelVersion: MODEL_VERSION,
      skillId: skillId || null,
      priorItemId: priorItemId || null,
      reason: 'non_adaptive',
      thresholdBand: 'unknown',
      masteryLevel,
      dataReliable: false,
      recommendedActivityId: null,
      explanationLearner: labels.learnerLabel('non_adaptive', locale),
      explanationTeacher,
      anomalies: [],
      catchUp: null,
      stretch: false
    };
  }

  let { band, reason } = H.getAdaptiveThreshold(masteryLevel);
  let recommendedActivityId = null;
  let catchUp = null;
  let stretch = false;

  if (reason === 'catch_up') {
    catchUp = H.selectCatchUpSequence({ skillId });
    recommendedActivityId = catchUp.activityIds[0];
  } else if (reason === 'peer_practice') {
    recommendedActivityId = `${skillId}::peer-practice`;
  } else { // challenge band — check for stretch first
    const s = H.detectStretchOpportunity({ level: masteryLevel, recentCorrect });
    if (s.qualifies) {
      reason = 'stretch';
      stretch = true;
      recommendedActivityId = `${skillId}::stretch`;
    } else {
      recommendedActivityId = `${skillId}::challenge`;
    }
  }

  const anomalies = H.detectAnomalies({
    level: masteryLevel, priorLevel: ctx.priorLevel, latencyMs, correct: ctx.correct
  });

  const explanationTeacher = labels.teacherReason({ reason, masteryLevel, attempts, latencyMs, dataReliable: true });

  return {
    modelVersion: MODEL_VERSION,
    skillId: skillId || null,
    priorItemId: priorItemId || null,
    reason,
    thresholdBand: band,
    masteryLevel,
    dataReliable: true,
    recommendedActivityId,
    explanationLearner: labels.learnerLabel(reason, locale),
    explanationTeacher,
    anomalies,
    catchUp,
    stretch
  };
}

module.exports = { MODEL_VERSION, generateAdaptiveRecommendation };
