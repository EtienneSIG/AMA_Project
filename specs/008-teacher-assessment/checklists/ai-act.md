# Checklist — EU AI Act (Feature 008)

High-risk AI obligations for the Teacher Assessment / AI Rubric Assist surface.
All items verified against the implementation in `demo/apps/_shared/`.

- [X] Art. 5 — Prohibited-practice validator rejects emotion/facial/biometric,
      autonomous grading, social scoring, behavioural advertising (`checkProhibitedPractice`,
      deterministic HTTP 422 refusal, audited `ai_generation_refused`).
- [X] Art. 9 — Risk management: residual risks mitigated by approval gate + immutable
      audit + advisory-only dashboard (see annex-iv-fragment §5).
- [X] Art. 10 — Data governance / minimisation: objective stored only as SHA-256 hash;
      bounded prompt context (grade/subject/locale) only.
- [X] Art. 12 — Logging: thirteen audit event types written to immutable `audit_event`,
      each with a correlation id.
- [X] Art. 13 — Transparency: `transparencyMeta()` attached to every AI response;
      UI banner marks drafts UNAPPROVED and AI-generated.
- [X] Art. 14 — Human oversight: mandatory teacher-approval gate; `approved_for_assignment`
      defaults false; `/assign` returns 409 until approved; `isArtifactAssignable()` enforced.
- [X] Art. 15 — Robustness: fail-closed Content Safety (held for review when CS cannot run);
      transport errors return 503 without fabricating; input/output bounds enforced.
- [X] EU residency — generation via APIM proxy to EU Azure OpenAI; storage in EU Postgres.
- [X] No autonomous grading — system drafts only; teachers score via rubric_scores.
