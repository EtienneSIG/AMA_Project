# CMS Domain Module (Feature 010)

Governed content lifecycle: versioning, approvals, localization branching,
metadata discovery, deprecation/archive, and Art. 12/13 transparency.

## Modules

| File | Responsibility |
|------|----------------|
| `index.js` | `makeCmsService(db)` orchestrator — high-level operations used by routes. |
| `workflowStateMachine.js` | Pure approval state machine (`planDecision`, `canPublish`). |
| `policyRepository.js` | Resolves the ordered reviewer-role sequence; enforces mandatory gates. |

Shared helpers used by this module:

- `../../auth/roles.js` — governance role constants + capability resolution.
- `../../validation/cmsValidation.js` — semver / locale / metadata validators.
- `../../db/index.js` — CMS persistence helpers (`content_*`, `approval_*`, `localization_branch`, `deprecation_record`, `content_audit_event`).

## Guarantees

- **Immutable snapshots** — published payloads are never mutated; corrections create new versions.
- **Mandatory gates (Art. 14)** — pedagogy + compliance leads always; localization lead for branches; no publish without a fully approved workflow.
- **Fail-closed publish/rollback (Art. 15)** — publish requires approval + complete metadata; rollback creates a new promoted snapshot referencing the target.
- **Immutable audit (Art. 12)** — every transition appends a `content_audit_event`; the table rejects UPDATE/DELETE.
- **Branch independence** — localization branches snapshot their own payload (copy-on-write).

## Routes

- Admin governance console: `demo/apps/admin/server.js` (bespoke) + `public/index.html` Content Governance tab.
- Teacher transparency: `demo/apps/_shared/server-cms.js` (mounted in shared `server.js`) + teacher-console provenance view.

## Verification

`demo/scripts/verify-cms.ps1` runs the live end-to-end governance walkthrough.
