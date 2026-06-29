'use strict';

// Governed, aggregated-only data model for the Rayfin Fabric backend.
// No learner-level rows ever leave this module. Suppression + scope run here,
// before any aggregate reaches the frontend (FR-007/FR-008/FR-009, F005 parity).

// Approved K-anonymity thresholds (reused from Feature 005, re-implemented Fabric-side).
const MIN_COHORT = { class: 10, establishment: 30, national: 100 };

const APPROVED_PERIODS = [
  { id: '2025-T1', label: 'Term 1 2025' },
  { id: '2025-T2', label: 'Term 2 2025' },
  { id: '2026-T1', label: 'Term 1 2026' }
];

const APPROVED_METRICS = [
  { id: 'mastery', label: 'Outcome mastery' },
  { id: 'engagement', label: 'Engagement' }
];

// Deterministic EU-resident aggregate fixtures (mirror of pg-learneu-demo analytics).
// cohortSize stays backend-side only — never serialised to the frontend.
const FIXTURES = [
  { schoolId: 'SCH-AMSTERDAM-01', regionId: 'REG-NL-NORTH', dimension: 'CLS-7A', metric: 'mastery', periodId: '2025-T1', value: 0.62, cohortSize: 24 },
  { schoolId: 'SCH-AMSTERDAM-01', regionId: 'REG-NL-NORTH', dimension: 'CLS-7A', metric: 'mastery', periodId: '2025-T2', value: 0.67, cohortSize: 24 },
  { schoolId: 'SCH-AMSTERDAM-01', regionId: 'REG-NL-NORTH', dimension: 'CLS-7A', metric: 'mastery', periodId: '2026-T1', value: 0.71, cohortSize: 23 },
  { schoolId: 'SCH-AMSTERDAM-01', regionId: 'REG-NL-NORTH', dimension: 'CLS-7B', metric: 'mastery', periodId: '2025-T1', value: 0.58, cohortSize: 7 },
  { schoolId: 'SCH-AMSTERDAM-01', regionId: 'REG-NL-NORTH', dimension: 'CLS-7B', metric: 'mastery', periodId: '2025-T2', value: 0.60, cohortSize: 8 },
  { schoolId: 'SCH-ROTTERDAM-01', regionId: 'REG-NL-RANDSTAD', dimension: 'CLS-8A', metric: 'mastery', periodId: '2025-T2', value: 0.64, cohortSize: 28 },
  { schoolId: 'SCH-AMSTERDAM-01', regionId: 'REG-NL-NORTH', dimension: 'establishment', metric: 'mastery', periodId: '2025-T2', value: 0.65, cohortSize: 320 },
  { schoolId: null, regionId: null, dimension: 'national', metric: 'mastery', periodId: '2025-T2', value: 0.61, cohortSize: 5400 }
];

function tierFor(dimension) {
  if (dimension === 'national') return 'national';
  if (dimension === 'establishment') return 'establishment';
  return 'class';
}

// Fail-closed row-level scope: a row is in-scope only if its school/region is authorised.
function inScope(row, scope) {
  const schools = new Set(scope.schoolIds || []);
  const regions = new Set(scope.regionIds || []);
  if (row.dimension === 'national') return true; // national benchmark is public aggregate
  if (row.schoolId && schools.has(row.schoolId)) return true;
  if (row.regionId && regions.has(row.regionId)) return true;
  return false;
}

function isSuppressed(row) {
  return row.cohortSize < MIN_COHORT[tierFor(row.dimension)];
}

// Strip cohortSize and any sub-threshold rows before returning to the caller.
function publicPoint(row) {
  return { periodId: row.periodId, value: row.value };
}

function runReport({ reportId, scope, period, metric = 'mastery', limit = 50, offset = 0 }) {
  if (!scope || (!(scope.schoolIds || []).length && !(scope.regionIds || []).length)) {
    return { reportId, state: 'scope_denied', series: [], notes: 'No authorised scope.' };
  }
  if (!APPROVED_PERIODS.some(p => p.id === period)) {
    return { reportId, state: 'invalid_period', series: [] };
  }
  const scopedRows = FIXTURES.filter(r => r.metric === metric && inScope(r, scope));
  const kept = scopedRows.filter(r => !isSuppressed(r));
  if (scopedRows.length && !kept.length) {
    return { reportId, state: 'suppressed_small_cohort', series: [], notes: 'Cohorts below K-anonymity thresholds are suppressed.' };
  }
  const byDim = {};
  for (const r of kept) (byDim[r.dimension] = byDim[r.dimension] || []).push(r);
  const series = Object.entries(byDim).slice(offset, offset + limit).map(([dim, rows]) => ({
    dimension: dim,
    points: rows.sort((a, b) => a.periodId.localeCompare(b.periodId)).map(publicPoint)
  }));
  return {
    reportId,
    state: series.length ? 'ready' : 'empty',
    period: APPROVED_PERIODS.find(p => p.id === period) || null,
    series,
    notes: 'Aggregated within your establishment; cohorts below thresholds suppressed.'
  };
}

module.exports = { MIN_COHORT, APPROVED_PERIODS, APPROVED_METRICS, runReport };
