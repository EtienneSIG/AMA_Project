# Art. 9 Risk Register — CMS Versioning & Approval (Feature 010)

Residual risk accepted before publish-default changes. Owner: Responsible AI Evaluator.

| # | Risk | Likelihood | Impact | Mitigation | Residual | Accepted |
|---|------|-----------|--------|-----------|----------|----------|
| R1 | Unauthorized / accidental publication of unreviewed content | Low | High | Fail-closed publish guard: requires fully approved workflow (pedagogy + compliance) AND complete metadata; publish blocked otherwise | Low | [x] |
| R2 | Rollback to a non-compliant prior version | Low | High | Rollback only targets a previously published/superseded snapshot; creates a NEW promoted version (auditable), rationale mandatory | Low | [x] |
| R3 | Merge of unreviewed localized content into a published branch | Low | Medium | Localization branches are copy-on-write and independently gated (localization_lead first); merge is an explicit human choice (merge/adapt/defer) | Low | [x] |
| R4 | Loss of approval provenance | Very low | High | `content_audit_event` + `approval_step_record` append-only (DB triggers reject UPDATE/DELETE); lineage walk preserves ancestry | Very low | [x] |
| R5 | Reviewer-identity exposure | Low | Medium | Operator identity is an actor string; reviewer identifiers pseudonymisable on erasure; transparency view exposes roles/rationale, not personal data | Low | [x] |
| R6 | Concurrent conflicting approval decisions | Low | Medium | Optimistic-lock (`lock_version`) on workflow transitions; stale decision rejected with CONCURRENCY_CONFLICT | Low | [x] |
| R7 | Publish of metadata-incomplete content (discoverability/safety) | Low | Medium | Publish-time metadata completeness validator (curriculum standard, subject, grade, objective) | Low | [x] |

Verified live: `demo/scripts/verify-cms.ps1` 18/18 (steps 4,7,10,12,16 exercise R1/R2/R7).
