# Checklist — GDPR (Art. 8 children's data & Art. 15 portability)

Feature: 009 — Interoperability
Status: PASS — verified live via `demo/scripts/verify-interop.ps1`.

## Art. 8 — Children's data / consent

- [X] Under-16 consent gate remains enforced on all learner `/api/*` routes incl. new SCORM/due-date endpoints (shared consent middleware in `demo/apps/_shared/server.js`). Verifier step 0 grants consent before learner calls.
- [X] SSO login linkage does not bypass the consent gate — claim mapping is metadata-only; access still flows through the existing gate — `sso-federation.js`.
- [X] No new personal data category introduced for under-16s beyond roster minimum (id, name, class, optional age).

## Art. 5 — Data minimisation

- [X] xAPI actors are pseudonymised (sha256 account) before any statement leaves the platform — `xapi-adapter.buildStatement` + `audit-redaction.pseudonymise`; validator rejects any statement containing a raw email.
- [X] SIS sync processes only id/name/class/age — `sis-adapter.planSync`.
- [X] Teacher LRS insights are aggregate-only (counts), never per-learner PII — `GET /api/teacher/xapi/insights`.
- [X] Export subject email is hashed in admin listings — `GET /api/admin/exports`.

## Art. 15 — Right of access / portability

- [X] Export produces a structured package manifest (README, profile CSV, learning-records CSV, transparency PDF) — `gdpr-export.buildManifest`; verifier step 10 (files=4).
- [X] Package is encrypted (AES-256-GCM envelope; key held as Key Vault reference) — `gdpr-export.encryptionEnvelope`.
- [X] Secure link expires after 7 days; expiry is detected and audited — `gdpr-export.secureLink` + `GET /api/admin/exports/:requestId` (`gdpr_export_expired`).
- [X] 30-day SLA tracked per request — `gdpr-export.slaDueAt` + `data_export_request.sla_due_at`.
- [X] Large exports (>5000 records) defer via `queued_large` fallback status — admin export route.
