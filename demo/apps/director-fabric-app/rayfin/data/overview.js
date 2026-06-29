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
      schools: visible.length
    },
    national: NATIONAL,
    schools: visible.map(s => ({ id: s.id, name: s.name, region: s.region, lat: s.lat, lng: s.lng, learners: s.learners, mastery: s.mastery, engagement: s.engagement, trend: s.trend })),
    nationalTrend: [0.56, 0.59, 0.61]
  };
}

module.exports = { SCHOOLS, NATIONAL, overview };
