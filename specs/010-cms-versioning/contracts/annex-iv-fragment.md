# Annex IV Technical-File Fragment — CMS Versioning & Approval Governance (Feature 010)

> Contributes to the programme-level high-risk technical file (EU AI Act Annex IV).

## (a) Intended purpose & nature

A **non-autonomous** governance capability for the content lifecycle: authoring,
versioning, multi-role approval, localization branching, metadata discovery,
deprecation/archive, and transparency. It does **not** make autonomous decisions
about learners; it governs *which content* reaches them and records *who approved it*.

## (b) Content lifecycle & approval-gate design

- Immutable semantic-version snapshots (`content_version`); corrections create new versions.
- Configurable approval route with non-removable mandatory gates: **pedagogy_lead → compliance_lead** for source; **localization_lead → pedagogy_lead → compliance_lead** for localization branches (`policyRepository.js`, `workflowStateMachine.js`).
- Publish/rollback/deprecate/archive/merge are human-triggered with captured rationale.

## (c) Data governance (Art. 10)

Approved data classes: content versions, approval-state history, reviewer comments,
lifecycle transitions, pseudonymous operator identity, role claims, curriculum
metadata, change summaries. No new learner-level or sensitive child categories.

## (d) Risk-management outcomes (Art. 9)

See `risk-register.md`. Each identified risk (accidental publication, rollback to a
non-compliant version, merge of unreviewed localized content, loss of approval
provenance, reviewer-identity exposure) maps to a mitigation and a recorded
residual-risk acceptance.

## (e) Human oversight (Art. 14)

Named reviewer roles approve every publish; optimistic-lock prevents parallel
conflicting decisions; reject/changes-requested require a comment. No autonomous
lifecycle action exists.

## (f) Logging, transparency & robustness (Art. 12/13/15)

- **Art. 12**: append-only `content_audit_event` + `approval_step_record` (DB triggers reject mutation).
- **Art. 13**: teacher provenance + lineage endpoints expose version origin and approval rationale.
- **Art. 15**: fail-closed publish (approved workflow + complete metadata) and rollback (new promoted snapshot); server-side state validation; EU-resident storage.

**Verification**: `demo/scripts/verify-cms.ps1` — 18/18 live on Azure West Europe.
