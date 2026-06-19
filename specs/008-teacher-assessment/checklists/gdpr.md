# Checklist — GDPR (Feature 008)

- [X] Art. 5(1)(c) Data minimisation — learning objective persisted only as SHA-256 hash
      (`objective_text_hash`); no free-text objective stored.
- [X] Art. 5(1)(b) Purpose limitation — generated artifacts used only for teacher-reviewed
      assessment drafting; advisory analytics do not feed automated decisions.
- [X] Art. 5(1)(e) Storage limitation — template cache entries carry `expires_at`;
      audit events retained as accountability evidence only.
- [X] Art. 9 Children's data posture — no special-category processing; no biometric/emotion
      data; learner identifiers handled as in existing class views (pseudonymised heatmap).
- [X] Art. 25 Data protection by design — EU-region storage, role-gated access, CSRF,
      immutable audit trail.
- [X] Art. 30 Records of processing — audit_event provides the processing log.
- [X] No cross-EU transfer — all processing in Azure West Europe.
- [X] DPIA delta — recorded in `plan.md`; high-risk generation + advisory analytics added.
