# Checklist — EU AI Act (Art. 12 & Art. 15) interoperability evidence

Feature: 009 — Interoperability (SCORM, xAPI, SIS, SSO, Calendar, GDPR export)
Status: PASS — verified live via `demo/scripts/verify-interop.ps1` (11/11 steps green).

## Art. 12 — Record-keeping / logging

- [X] Every external API call writes an immutable audit row (`external_api_audit`) with a correlation id — `demo/apps/_shared/db/index.js` `logExternalApiAudit`.
- [X] Audit table is append-only (BEFORE UPDATE/DELETE trigger `prevent_external_api_audit_mutation`) — `demo/apps/_shared/db/schema.sql`.
- [X] Outbound payloads are never stored raw — only a sha256 `payload_hash` + redacted, length-bounded summary — `demo/apps/_shared/integrations/audit-redaction.js`.
- [X] Event catalogue covered: `scorm_package_uploaded`, `scorm_launch`, `scorm_commit`, `scorm_parse_failed`, `xapi_statement_built`, `xapi_delivery_attempted`, `xapi_dead_lettered`, `sis_sync_started/completed`, `sis_conflict_opened`, `sso_link_created`, `calendar_sync_ingested`, `due_date_override_confirmed`, `gdpr_export_requested/packaged/expired`.
- [X] Audit trail is surfaced read-only to admins — `GET /api/admin/integrations/audit`.

## Art. 15 — Accuracy, robustness & cybersecurity

- [X] Non-EU endpoints fail closed at onboarding and runtime — `demo/apps/_shared/integrations/eu-endpoint.js`; verifier steps 2.
- [X] Secrets stored as Key Vault references only; plaintext rejected — `demo/apps/_shared/security/secret-provider.js`; verifier step 3.
- [X] Retry with exponential backoff + dead-letter for partner calls — `demo/apps/_shared/integrations/retry-policy.js`, `xapi-worker.js`.
- [X] Connector outage never blocks learner core flow (SCORM fallback message; xAPI async) — `scorm-adapter.fallbackMessage`, async xAPI queue.
- [X] Deterministic SIS diff via roster checksum; idempotent upserts — `sis-adapter.js`.
- [X] Health probe reports degraded/disabled connectors — `GET /api/admin/integrations/health`.

## Human oversight (Art. 14)

- [X] Long school-closure due-date shifts require teacher confirmation rather than auto-apply — `calendar-adapter.adjustDueDate` (`pending_confirm`) + `POST /api/teacher/due-dates/:id/confirm`.
- [X] SIS identity collisions are queued for manual review, never auto-merged — `sis-adapter.planSync` + conflict queue.
