# Quickstart: CMS Versioning and Content Approval Workflow

## Purpose

Validate end-to-end behavior for versioning, multi-step approval, localization branching, metadata governance, rollback safety, and deprecation lifecycle.

## Prerequisites

- Feature branch context: `010-cms-versioning`
- EU-hosted PostgreSQL environment available
- Admin/test users with roles:
  - content_creator
  - pedagogy_lead
  - compliance_lead
  - localization_lead
  - admin_operator
- Seed content item in default locale (for example `nl-NL`)

## Scenario 1: Base Locale Version Publish

1. Create draft version `1.0.0` with full metadata tags.
2. Submit for approval.
3. Approve as pedagogy lead.
4. Approve as compliance lead.
5. Publish.

Expected results:
- Version status becomes published.
- Current published pointer resolves to `1.0.0`.
- Audit events exist for submit, approve (both roles), and publish.

## Scenario 2: Minor Update and Rollback Safety

1. Create version `1.1.0` from `1.0.0`.
2. Run the same approval flow and publish.
3. Execute rollback action targeting `1.0.0` snapshot.
4. Verify assignment remap process completes.

Expected results:
- Rollback is recorded as a new promoted version event (history not rewritten).
- Learner responses from `1.1.0` remain archived and linked.
- "Content updated" marker is emitted for active sessions.
- Rollback completion time is under 5 minutes.

## Scenario 3: Localization Branch Independence

1. Create `es-ES` localization branch from source `1.0.0`.
2. Edit localized content and submit localized approval flow.
3. Approve with localization lead, pedagogy lead, compliance lead.
4. Publish locale branch.
5. Publish source locale update `1.2.0`.
6. Verify `es-ES` branch receives update advisory and remains unchanged until merge/adapt/defer action.

Expected results:
- Localized branch content remains independent after source update.
- Lineage view shows branch root and source references.
- Merge/adapt/defer decision is captured in audit log.

## Scenario 4: Metadata Query and Governance Visibility

1. Query by curriculum filters (grade + subject + standard).
2. Open result item and inspect version/approval provenance.

Expected results:
- Search returns tagged versions with assignment counts.
- Transparency view includes change summary and approval trail.

## Scenario 5: Deprecation and Archive Lifecycle

1. Deprecate published item with EOL date and replacement item.
2. Confirm teacher/admin warning labels are visible.
3. Advance to EOL date and run archive job.

Expected results:
- New assignments are blocked after EOL.
- Item transitions to archived state.
- Existing learner evidence remains queryable for audit.

## Negative Tests

- Attempt publish without pedagogy approval: must fail.
- Attempt publish without compliance approval: must fail.
- Attempt localization publish without localization lead approval: must fail.
- Concurrent decision on same approval step with stale lock version: second request must fail with concurrency error.

## Compliance Verification Checklist

- Art. 12 logging:
  - All lifecycle events present with actor, role, timestamp, rationale (where required).
- Art. 13 transparency:
  - Version lineage and approval provenance visible in governance surfaces.
- EU residency:
  - Data stores and app deployment remain in approved EU regions only.
- DPIA delta:
  - Approval-state and metadata processing update is documented.
