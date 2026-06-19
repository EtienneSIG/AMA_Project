'use strict';
// Feature 007 — Adaptive Learning: deterministic, auditable scoring helpers.
// NO black-box ML. Every rule here is transparent and reproducible (Principle VII,
// AI Act Art. 15). Thresholds align with ZPD pedagogy (Learning Sciences sign-off).

// Minimum attempts before mastery evidence is considered reliable enough to drive
// an adaptive recommendation. Below this we degrade to non-adaptive mode.
const MIN_RELIABLE_ATTEMPTS = 3;

// Mastery bands (level is 0..1):
//   < 0.50           -> catch-up (scaffolded support)
//   0.50 .. < 0.80   -> peer practice (same-level consolidation)
//   >= 0.80          -> challenge (and possibly stretch)
function getAdaptiveThreshold(level) {
  if (level == null || Number.isNaN(level)) return { band: 'unknown', reason: 'non_adaptive' };
  if (level < 0.50) return { band: '0-50', reason: 'catch_up' };
  if (level < 0.80) return { band: '50-80', reason: 'peer_practice' };
  return { band: '80-plus', reason: 'challenge' };
}

// Deterministic mastery score from attempt evidence. We mirror skill_mastery.level
// (accuracy) as the primary signal and flag reliability when evidence is thin.
function calculateMasteryScore({ attempts, correct, level }) {
  const a = Number(attempts || 0);
  let m = level;
  if (m == null && a > 0) m = Number(correct || 0) / a;
  if (m == null) m = null;
  const reliable = a >= MIN_RELIABLE_ATTEMPTS && m != null;
  return { masteryLevel: m, attempts: a, reliable };
}

// Stretch qualification: sustained high mastery — 3+ consecutive correct AND level >= 0.85.
// `recentCorrect` is an array of booleans, newest first.
function detectStretchOpportunity({ level, recentCorrect }) {
  if (level == null || level < 0.85) return { qualifies: false };
  const arr = Array.isArray(recentCorrect) ? recentCorrect : [];
  let streak = 0;
  for (const c of arr) { if (c) streak++; else break; }
  return { qualifies: streak >= 3, streak };
}

// Risk anomaly flags (Art. 14 human-oversight surface). Advisory only.
function detectAnomalies({ level, priorLevel, latencyMs, correct }) {
  const flags = [];
  // Cheating suspicion: implausibly fast correct answer.
  if (correct && latencyMs != null && latencyMs > 0 && latencyMs < 1500) {
    flags.push({ type: 'suspected_cheating', severity: 'medium',
      reason: `Correct answer in ${(latencyMs / 1000).toFixed(1)}s (implausibly fast).` });
  }
  // Inconsistent performance: large mastery drop between sessions.
  if (level != null && priorLevel != null && (priorLevel - level) >= 0.5) {
    flags.push({ type: 'inconsistent_performance', severity: 'medium',
      reason: `Mastery dropped from ${Math.round(priorLevel * 100)}% to ${Math.round(level * 100)}%.` });
  }
  return flags;
}

// Deterministic catch-up sequence template for a skill. In the demo the activity
// pool is synthesised from the skill id; in production these map to curated,
// pedagogy-signed-off scaffolds (intro -> worked example -> guided -> reflection -> checkpoint).
function selectCatchUpSequence({ skillId }) {
  const base = String(skillId || 'SKILL');
  const activityIds = [
    `${base}::intro`,
    `${base}::worked-example`,
    `${base}::guided-practice`,
    `${base}::reflection`
  ];
  const checkpointActivityId = `${base}::checkpoint`;
  return { activityIds, checkpointActivityId, explanation: 'Scaffolded catch-up: intro → worked example → guided practice → reflection → checkpoint.' };
}

// Checkpoint advancement: pass at >= 0.70 mastery, else re-offer catch-up.
function checkpointPasses(level) {
  return level != null && level >= 0.70;
}

module.exports = {
  MIN_RELIABLE_ATTEMPTS,
  getAdaptiveThreshold,
  calculateMasteryScore,
  detectStretchOpportunity,
  detectAnomalies,
  selectCatchUpSequence,
  checkpointPasses
};
