# Quickstart: Interoperability - SCORM, xAPI, SIS Integration

## Prerequisites

1. Confirm EU-hosted infrastructure is active for app, database, blob storage, and Key Vault.
2. Ensure connector DPAs are documented for SIS, LRS, SSO, and calendar partners.
3. Confirm admin role access to integration configuration screens.

## Step 1: Configure and validate connectors

1. Configure connectors for `scorm`, `xapi`, `sis`, `sso`, and `calendar` with Key Vault secret references.
2. Run connector validation for each integration.
3. Confirm non-EU endpoint validation fails closed.
4. Verify `integration_config_validated` audit entries exist.

## Step 2: SCORM flow verification

1. Upload one SCORM 1.2 and one SCORM 2004 package.
2. Verify package parse succeeds and launch entrypoint is registered.
3. Assign package to a learner and launch from learner portal.
4. Complete module and verify score/status/time are persisted within 5 seconds p95.
5. Confirm external and internal audit events are present.

## Step 3: xAPI flow verification

1. Configure LRS endpoint and auth mode.
2. Perform learner actions (start, complete, score).
3. Verify xAPI statements are queued and delivered.
4. Force one delivery failure and verify retry + dead-letter behavior.
5. Verify >=95% delivery success in test window and auditable failure records.

## Step 4: SIS sync and SSO verification

1. Trigger manual SIS delta sync.
2. Verify learner, teacher, class, and enrollment updates are applied idempotently.
3. Create a synthetic conflict and resolve it via admin queue.
4. Configure SSO federation (OIDC/ADFS profile) and test login with school credentials.
5. Verify under-16 learners still pass through parental consent gate.

## Step 5: Calendar sync verification

1. Import school calendar with at least one closure day.
2. Create assignment due on closure day.
3. Verify due date shifts to next school-open day or prompts teacher confirmation.
4. Verify learner and teacher UI show adjusted due date context.

## Step 6: GDPR export verification

1. Submit a GDPR export request for a learner.
2. Verify package generation includes profile, assignments, scores, feedback, consent records, and AI reasoning artifacts where applicable.
3. Verify package outputs use CSV/PDF + README and ZIP encryption is enabled.
4. Verify delivery link is secure and expires after configured TTL.
5. Verify end-to-end fulfillment is tracked and auditable.

## Step 7: Audit and compliance checks

1. Query audit logs for all connector call types and outcomes.
2. Confirm all external API calls include correlation IDs and redacted payloads.
3. Validate no secret material appears in DB, app logs, or audit logs.
4. Confirm DPIA delta and processor list updates are complete.

## Expected outcomes

- SCORM completion capture, xAPI delivery, SIS sync, SSO login, and calendar adjustment all operational.
- Secure credential model enforced through Key Vault references.
- Immutable external API audit trail available for compliance review.
- GDPR export flow meets format and timing obligations.
