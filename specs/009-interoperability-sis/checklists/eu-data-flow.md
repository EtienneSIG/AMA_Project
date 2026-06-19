# Checklist — EU-only data flow & processor DPA evidence

Feature: 009 — Interoperability
Status: PASS.

## EU residency

- [X] All connector endpoints validated against an EU TLD/region allowlist; non-EU rejected fail-closed at onboarding and runtime — `demo/apps/_shared/integrations/eu-endpoint.js`.
- [X] SSO issuer and JWKS URIs must resolve to EU hosts — `sso-federation.validateMetadata`.
- [X] Integration config defaults `region = 'westeurope'` — `db.upsertIntegrationConfig`.
- [X] Apps and PostgreSQL Flexible Server hosted in West Europe (unchanged from prior features).

## No cross-EU-border transfer

- [X] xAPI delivery target is the configured EU LRS only; payloads pseudonymised before transit.
- [X] GDPR export package stored under the EU-resident demo storage namespace; secure link served from the EU admin app.
- [X] No personal data sent to non-EU SaaS in any connector path (demo runs in-process simulations with the same EU guards).

## Processor / DPA controls

- [X] Connector secrets are Key Vault references resolved via managed identity — never plaintext in DB or source — `security/secret-provider.js`.
- [X] Every processor interaction is logged immutably with correlation id for DPA audit — `external_api_audit`.
- [X] Redaction prevents secret/PII leakage into logs — `audit-redaction.redact` (`«redacted»` for secret-like keys).
