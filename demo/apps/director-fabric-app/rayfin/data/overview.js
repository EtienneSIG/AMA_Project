'use strict';

// Aggregated, EU-resident demo dataset for the director dashboard (Netherlands).
// All values are establishment/region aggregates — no learner-level rows. Suppression
// thresholds in model.js still apply at the report layer; this overview is pre-cleared.

const SCHOOLS = [
  { id: 'SCH-AMSTERDAM-01', name: 'Amsterdam Noord', region: 'REG-NL-NORTH', lat: 52.39, lng: 4.92, learners: 320, mastery: 0.67, engagement: 0.74, trend: [0.62, 0.65, 0.67] },
  { id: 'SCH-ROTTERDAM-01', name: 'Rotterdam Centrum', region: 'REG-NL-RANDSTAD', lat: 51.92, lng: 4.48, learners: 410, mastery: 0.64, engagement: 0.70, trend: [0.60, 0.62, 0.64] },
  { id: 'SCH-UTRECHT-01', name: 'Utrecht West', region: 'REG-NL-RANDSTAD', lat: 52.09, lng: 5.11, learners: 285, mastery: 0.71, engagement: 0.78, trend: [0.66, 0.69, 0.71] },
  { id: 'SCH-EINDHOVEN-01', name: 'Eindhoven Zuid', region: 'REG-NL-SOUTH', lat: 51.44, lng: 5.48, learners: 240, mastery: 0.69, engagement: 0.72, trend: [0.63, 0.66, 0.69] },
  { id: 'SCH-GRONINGEN-01', name: 'Groningen', region: 'REG-NL-NORTH', lat: 53.22, lng: 6.57, learners: 180, mastery: 0.58, engagement: 0.64, trend: [0.55, 0.56, 0.58] }
];

const NATIONAL = { mastery: 0.61, engagement: 0.69, learners: 5400 };

// Approximate Netherlands border as [lng, lat] points (projected client-side with the
// same transform as the school dots, so the outline and the markers always line up).
const NL_BORDER = [
  [6.05, 53.50], [6.83, 53.44], [7.21, 53.24], [7.05, 52.64], [6.69, 52.49],
  [6.95, 52.44], [7.03, 51.99], [6.16, 51.90], [6.11, 51.66], [5.95, 51.83],
  [6.02, 51.43], [6.17, 51.16], [5.64, 50.84], [5.80, 51.10], [5.13, 51.32],
  [4.55, 51.42], [3.85, 51.45], [3.36, 51.40], [3.51, 51.62], [4.07, 52.00],
  [4.20, 52.30], [4.55, 52.46], [4.72, 52.96], [5.04, 52.63], [5.43, 52.90],
  [5.34, 53.30], [5.86, 53.41], [6.05, 53.50]
];

function overview(scope = {}) {
  const schoolIds = new Set(scope.schoolIds || []);
  const regionIds = new Set(scope.regionIds || []);
  const inScope = SCHOOLS.filter(s => schoolIds.has(s.id) || regionIds.has(s.region));
  const visible = inScope.length ? inScope : SCHOOLS; // demo: show all if no precise match
  const learners = visible.reduce((a, s) => a + s.learners, 0);
  const mastery = visible.reduce((a, s) => a + s.mastery * s.learners, 0) / learners;
  const engagement = visible.reduce((a, s) => a + s.engagement * s.learners, 0) / learners;
  return {
    kpis: {
      learners,
      mastery: Math.round(mastery * 100) / 100,
      engagement: Math.round(engagement * 100) / 100,
      gapVsNational: Math.round((mastery - NATIONAL.mastery) * 100),
      schools: visible.length,
      completion: Math.round((0.62 + mastery * 0.3) * 100) / 100,
      attendance: 0.94,
      timeOnTaskMin: 28,
      atRisk: Math.round((1 - mastery) * 0.4 * 100),
      satisfaction: 4.3
    },
    national: NATIONAL,
    schools: visible.map(s => ({ id: s.id, name: s.name, region: s.region, lat: s.lat, lng: s.lng, learners: s.learners, mastery: s.mastery, engagement: s.engagement, trend: s.trend })),
    nationalTrend: [0.56, 0.59, 0.61],
    nlBorder: NL_BORDER
  };
}

module.exports = { SCHOOLS, NATIONAL, NL_BORDER, overview };
