# Quickstart: A/B Testing Framework

## Purpose

Validate end-to-end experiment flow: definition -> randomization -> monitoring -> significance -> segmentation -> decision -> archive, with constitutional and compliance gates.

## Prerequisites

- Feature branch checked out: `012-ab-testing-framework`.
- Admin and teacher/pedagogy reviewer test accounts available.
- EU-hosted PostgreSQL reachable from app environment.
- Seed learner cohort includes hierarchy attributes (grade, school, district, baseline mastery quartile).

## Step 1: Create and validate an experiment

1. Sign in as product manager in admin surface.
2. Create experiment:
   - Hypothesis: weekly challenge increases engagement.
   - Variants: A (control), B (weekly challenge).
   - Target: grades 4-5 across selected schools.
   - Duration: 14 days.
   - Success metric: engagement sessions/week.
3. Validate configuration.
4. Confirm validation enforces cohort size warning, measurable metric, and duration >= 7 days.

Expected result:
- Experiment moves to `validated` state.
- Audit event recorded for creation and validation.

## Step 2: Start experiment and verify stratified assignment

1. Start experiment from validated state.
2. Trigger assignment generation for target learners.
3. Query assignment summary by strata (grade, school, baseline mastery quartile).
4. Verify learners remain in same variant across repeated sessions.

Expected result:
- Experiment state becomes `running`.
- Assignment distribution is balanced per configured ratio.
- Fairness diagnostic report shows no high-risk allocation skew.
- Assignment events logged in audit trail.

## Step 3: Validate monitoring and alert workflow

1. Simulate daily metrics ingestion for A and B.
2. Open monitoring dashboard and check freshness timestamp.
3. Inject an underperformance scenario for B.
4. Verify alert appears with severity and recommended action.
5. Record reviewer decision: `investigate` with rationale.

Expected result:
- Dashboard freshness <= 60 minutes.
- Alert generated and visible with confidence context.
- Decision and rationale persisted and auditable.

## Step 4: Run statistical significance analysis

1. Execute daily significance job.
2. Inspect output fields:
   - p-value
   - 95% CI
   - effect size and interpretation
   - practical significance flag
3. Confirm recommendation is advisory, not automatic rollout.

Expected result:
- Statistical outputs populated per variant comparison.
- No automatic `adopt_variant` action is generated.

## Step 5: Run segmented outcome analysis

1. Request segment breakdown by grade and SES.
2. Verify per-segment sample size and p-value are shown.
3. Simulate opposite effects in at least one segment.
4. Confirm system flags differential impact.

Expected result:
- Segment results include variant deltas and statistical context.
- Opposite-effect warning appears and is captured in alerts/logs.

## Step 6: Enforce human oversight before adoption

1. Attempt to adopt treatment variant with only product-manager approval.
2. Verify action is blocked.
3. Add teacher review and pedagogy reviewer sign-off.
4. Re-submit adoption decision.

Expected result:
- Adoption blocked until required reviewers sign off.
- Final decision includes all approvers and rationale.

## Step 7: Archive and search learnings repository

1. Archive completed experiment with lessons learned text.
2. Search archive by keyword (`engagement`), metric, and audience.
3. Open one archived experiment and export as template.

Expected result:
- Archive entry includes hypothesis, methodology, results, decision rationale, and fairness notes.
- Search response returns in < 5 seconds for typical queries.

## Step 8: GDPR and audit verification

1. Mark one learner assignment as excluded due to DSR/consent revocation.
2. Re-run analysis job.
3. Confirm sample size adjusts and exclusion is documented.
4. Extract audit stream for full experiment lifecycle.

Expected result:
- Excluded learner no longer contributes to analytics.
- Audit trail contains complete ordered events for lifecycle transitions.
- No audit record update/delete operations are permitted.

## Exit Criteria

- All steps pass with expected results.
- Constitution check remains green for Principles I-VII.
- Feature artifacts are ready for `/speckit.tasks` decomposition.
