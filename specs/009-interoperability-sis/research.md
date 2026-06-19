# Research Notes: Interoperability - SCORM, xAPI, SIS Integration

## Decision 1: Use adapter modules per integration type

- Decision: Implement dedicated adapters for SCORM, xAPI, SIS, SSO, calendar, and GDPR export under shared integration modules.
- Rationale: This isolates provider-specific behavior, simplifies testing, and makes fallback handling explicit.
- Alternatives considered: One monolithic interoperability service. Rejected due to tighter coupling and slower change cadence.

## Decision 2: SCORM execution through a controlled player shell

- Decision: Parse uploaded SCORM manifests once, store package metadata, and launch content only through a LearnEU player shell that captures runtime API events.
- Rationale: Centralized launch and callback handling is required for consistent completion tracking and security controls.
- Alternatives considered: Direct iframe launch without a wrapper. Rejected due to weak telemetry capture and poor policy enforcement.

## Decision 3: xAPI statements sent asynchronously with retry and dead-letter path

- Decision: Build xAPI statements in-app, enqueue for async send, retry transient failures with bounded backoff, and dead-letter persistent failures for operator review.
- Rationale: Improves delivery reliability while preventing learner flow blocking.
- Alternatives considered: Inline synchronous POST on learner request path. Rejected due to latency and outage coupling.

## Decision 4: SIS sync as idempotent daily delta with manual conflict queue

- Decision: Run scheduled SIS sync jobs that upsert by source IDs and place identity/class conflicts in a review queue.
- Rationale: Idempotency avoids duplicate rows and manual queueing prevents unsafe auto-merges.
- Alternatives considered: Full overwrite import each run. Rejected due to regression risk and poor traceability.

## Decision 5: Support OIDC/ADFS federation profile with explicit claim mapping

- Decision: Model SSO connectors as OIDC-compatible metadata plus configurable claim mapping for learner identity linking.
- Rationale: Covers Azure AD B2C federation and school IdP diversity while keeping mapping auditable.
- Alternatives considered: Hardcoded claim map. Rejected because district IdPs vary significantly.

## Decision 6: Calendar normalization with teacher-confirmable overrides

- Decision: Normalize provider calendar events into school-day rules and auto-shift due dates only when policy allows; expose teacher confirmation path for ambiguous days.
- Rationale: Avoids incorrect deadline shifts and preserves teacher control.
- Alternatives considered: Always auto-shift to next working day. Rejected because manual pedagogical exceptions exist.

## Decision 7: GDPR export package with encrypted ZIP and expiring link

- Decision: Generate export bundles in CSV/PDF with a README, encrypt ZIP artifacts, and deliver via expiring secure links.
- Rationale: Meets portability requirements while reducing exposure window.
- Alternatives considered: Unencrypted file attachment email. Rejected as non-compliant for sensitive student data.

## Decision 8: Key Vault-backed secrets and immutable external API audit logs

- Decision: Store only Key Vault references in configuration and resolve secrets at runtime via managed identity; persist immutable audit events for every outbound API attempt.
- Rationale: Prevents secret leakage and supports Art. 12 traceability obligations.
- Alternatives considered: Store encrypted secrets in app database with app-managed key. Rejected due to higher key-management risk and weaker operational controls.
