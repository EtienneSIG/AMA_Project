# Quickstart: Multi-School Hierarchy, Approval Chains, and Hierarchical Reporting

## Purpose

Validate end-to-end behavior for hierarchy-aware RBAC, district approval chains, school adoption autonomy, district/region/national reporting, suppression safety, and auditability.

## Prerequisites

- Feature branch context: `011-multi-school-hierarchy`
- EU-hosted PostgreSQL instance available
- Test users with roles:
  - school_director
  - district_pedagogist
  - district_curriculum_lead
  - district_director
  - country_manager
  - compliance_reviewer
- Seed hierarchy data:
  - 1 country
  - 2 districts
  - at least 7 schools per district
  - class assignments with mixed cohort sizes (including cohorts <10)

## Scenario 1: Scope-Aware Access Enforcement

1. Log in as School Director A with scope limited to School A.
2. Open reporting for School A and confirm access.
3. Attempt access to School B, district-level drill views outside School A, and another district report endpoint.

Expected results:
- School A data loads successfully.
- All out-of-scope requests are denied.
- Denial responses and rationale are logged in audit events.

## Scenario 2: District Approval Chain

1. Create district-level lesson draft.
2. Submit for approval.
3. Approve as district pedagogist.
4. Approve as district curriculum lead.
5. Approve as country manager/compliance gate.

Expected results:
- Workflow progresses sequentially with no skipped gates.
- Final state becomes `available_to_schools`.
- Each decision writes immutable audit entries with actor, role, timestamp, and rationale where needed.

## Scenario 3: School Adoption Autonomy

1. As School Director A, choose `adopt` for approved district lesson.
2. As School Director B, choose `adapt` and create school variant.
3. As School Director C, choose `decline` with note.

Expected results:
- All decisions are persisted and reflected in adoption metrics.
- `adapt` records variant linkage.
- District-level adoption dashboard shows adopt/adapt/decline counts and rates.

## Scenario 4: Hierarchical Reporting (`district -> region -> national`)

1. Log in as district director and generate district report by school for Jan-Jun.
2. Log in as country manager and generate region-level and national-level reports for same period.
3. Export each report to PDF.

Expected results:
- District view shows school aggregates and district averages.
- Region/national views show rolled-up aggregates only.
- Export follows same scope and suppression policies as on-screen views.

## Scenario 5: Suppression and Re-Identification Protection

1. Request report slice containing a class with cohort size 8.
2. Request a filtered slice that could cause combinational re-identification risk.

Expected results:
- Cohort <10 cells are suppressed with explanatory message.
- High-risk slice is blocked or escalated for manual review.
- Suppression and block outcomes are logged for compliance review.

## Scenario 6: Peer Benchmarking Workflow

1. As school director, open comparison for fractions completion.
2. Confirm school value vs district and national averages.
3. Submit peer collaboration request to identified high-performing school.

Expected results:
- Benchmark values are shown only within allowed country boundaries.
- Collaboration request status transitions to `requested` and notification event is captured.

## Scenario 7: Role Transition Handling

1. Promote a user from school director to district director.
2. Attempt old school-only endpoint with stale session.
3. Refresh session and open district dashboard.

Expected results:
- Old role scope is revoked immediately.
- New district scope is granted immediately after refresh/re-auth.
- Transition and enforcement actions are present in audit trail.

## Negative Tests

- Attempt approval decision by user without required gate role: must fail with authorization error.
- Attempt report generation outside grant scope: must fail and log denial.
- Attempt learner-level drill-through from district/country role: must fail by contract.
- Attempt export when report state is `blocked_for_review`: must fail with explanatory response.

## Compliance Verification Checklist

- Art. 10 data governance:
  - Scope metadata quality checks and grant recertification records are present.
  - Aggregation lineage ID is attached to generated reports.
- Art. 12 logging:
  - Access checks, approvals, adoption decisions, report outcomes, and benchmark requests are logged immutably.
- Art. 14 human oversight:
  - District approval and school adoption actions require explicit human decisions.
- GDPR/Residency:
  - No cross-establishment data leakage in tests.
  - No learner-level data exposure above school role.
  - Data remains in EU-hosted services.
