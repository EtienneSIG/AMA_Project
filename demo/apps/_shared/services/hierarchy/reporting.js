'use strict';
// Feature 011 — Hierarchical reporting rollup + suppression (pure logic).
// Aggregates school-level snapshots into district/region/national rollups while
// enforcing the cohort minimum-disclosure rule (>= MIN_COHORT) and a basic
// re-identification screen. No learner-level fields ever flow through here.

const { MIN_COHORT } = require('./scope');

function round1(n) { return Math.round(n * 10) / 10; }

// Aggregate an array of school snapshot rows into a single rollup + per-school rows.
// Schools below MIN_COHORT are suppressed from per-school detail but still counted
// in totals only when the overall cohort is disclosable.
// Returns { status, suppressionApplied, reidRiskFlag, totals, schools, suppressedSchoolCount }.
function rollup(snapshots) {
  const rows = Array.isArray(snapshots) ? snapshots : [];
  if (rows.length === 0) {
    return { status: 'suppressed', suppressionApplied: true, reidRiskFlag: false, totals: null, schools: [], suppressedSchoolCount: 0 };
  }

  const totalCohort = rows.reduce((s, r) => s + Number(r.cohort_size || 0), 0);
  const disclosableSchools = rows.filter(r => Number(r.cohort_size || 0) >= MIN_COHORT);
  const suppressedSchoolCount = rows.length - disclosableSchools.length;

  // Overall cohort below threshold => entire report suppressed (no safe disclosure).
  if (totalCohort < MIN_COHORT) {
    return { status: 'suppressed', suppressionApplied: true, reidRiskFlag: false, totals: null, schools: [], suppressedSchoolCount: rows.length };
  }

  // Re-identification screen: at region/national breadth a single disclosable
  // school makes the aggregate effectively identify that school's cohort.
  const reidRiskFlag = disclosableSchools.length < 2 && rows.length > 1;
  if (reidRiskFlag) {
    return { status: 'blocked_for_review', suppressionApplied: true, reidRiskFlag: true, totals: null, schools: [], suppressedSchoolCount };
  }

  // Cohort-weighted averages over disclosable schools.
  const base = disclosableSchools.length ? disclosableSchools : rows;
  const wCohort = base.reduce((s, r) => s + Number(r.cohort_size || 0), 0) || 1;
  const completion = base.reduce((s, r) => s + Number(r.completion_rate || 0) * Number(r.cohort_size || 0), 0) / wCohort;
  const mastery = base.reduce((s, r) => s + Number(r.mastery_rate || 0) * Number(r.cohort_size || 0), 0) / wCohort;
  const enrollment = rows.reduce((s, r) => s + Number(r.enrollment_count || 0), 0);

  const schools = disclosableSchools.map(r => ({
    schoolNodeId: r.school_node_id,
    schoolName: r.school_name || null,
    cohortSize: Number(r.cohort_size || 0),
    enrollmentCount: Number(r.enrollment_count || 0),
    completionRate: round1(Number(r.completion_rate || 0)),
    masteryRate: round1(Number(r.mastery_rate || 0)),
    // Low-performance alert baseline: mastery below 50%.
    alert: Number(r.mastery_rate || 0) < 50
  }));

  return {
    status: 'generated',
    suppressionApplied: suppressedSchoolCount > 0,
    reidRiskFlag: false,
    totals: {
      schoolCount: disclosableSchools.length,
      cohortSize: totalCohort,
      enrollmentCount: enrollment,
      completionRate: round1(completion),
      masteryRate: round1(mastery),
      alertSchoolCount: schools.filter(s => s.alert).length
    },
    schools,
    suppressedSchoolCount
  };
}

module.exports = { rollup, MIN_COHORT };
