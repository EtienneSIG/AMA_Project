# EU AI Act Controls — Feature 010 CMS Versioning & Approval

Status: **PASS** — verified live via `demo/scripts/verify-cms.ps1` (18/18).

| Article | Control | Evidence | Status |
|---------|---------|----------|--------|
| Art. 9 Risk management | Content-lifecycle risk register (unauthorized/accidental publish, rollback to non-compliant version, merge of unreviewed localized content, loss of approval provenance, reviewer-identity exposure) with mitigations + residual-risk acceptance | `contracts/risk-register.md`; fail-closed publish/rollback guards | [x] |
| Art. 10 Data governance | Approved data classes (content versions, approval-trace, metadata, pseudonymous operator identity, role claims) — no learner/child categories introduced | `data-model.md`; `policyRepository.js` | [x] |
| Art. 12 Logging/traceability | Immutable `content_audit_event` (BEFORE UPDATE/DELETE trigger raises) records create/submit/approve/publish/rollback/deprecate/archive/merge_choice | verifier step 17: 16 events, 8 distinct types | [x] |
| Art. 13 Transparency | Version provenance + approval rationale exposed to teachers; lineage walk endpoint | `/api/teacher/content/:id/provenance`; verifier step 18 | [x] |
| Art. 14 Human oversight | Mandatory pedagogy + compliance gates (localization-lead first for branches); no autonomous publish/rollback/deprecate; every override captures rationale | `workflowStateMachine.js`; verifier steps 4,7,8,9,12,16 | [x] |
| Art. 15 Robustness | Fail-closed publish (requires approved workflow + complete metadata); rollback creates a new promoted snapshot; optimistic-lock transitions; server-side state validation; EU-resident storage | verifier steps 4,7,10,12 | [x] |

**Annex IV fragment**: `contracts/annex-iv-fragment.md` (intended purpose, non-autonomous governance, lifecycle + gate design, Art. 9/10/12/13/14/15 controls).
