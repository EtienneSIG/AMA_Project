# Research Notes: Teacher Assessment and AI-Assisted Rubric Governance

## Decision 1: Enforce explicit teacher approval as a hard publication gate

- Decision: Model teacher approval as a mandatory state transition (`approved_for_assignment`) before any generated rubric/question can be linked to learner assignments.
- Rationale: This directly enforces human oversight (EU AI Act Art. 14) and the spec requirement that no AI output affects learners without teacher review.
- Alternatives considered: Soft warnings with optional approval. Rejected because optional controls are not sufficient for high-risk compliance and allow bypass risk.

## Decision 2: Apply Azure Content Safety to both generated drafts and teacher qualitative comments

- Decision: Run Content Safety scans on AI-generated rubric/question drafts and on teacher-entered qualitative comments before final submission.
- Rationale: The spec requires comment/content scanning; applying one policy boundary to both generated and human-authored learner-facing text reduces policy gaps.
- Alternatives considered: Scan generated content only. Rejected because comments also become learner-visible and may carry policy risk.

## Decision 3: Store generated artifact lineage with prompt-hash and bounded context

- Decision: Persist prompt-hash, model/deployment version, safety verdict, teacher edits delta, and approval metadata as immutable lineage records; avoid storing unnecessary raw sensitive context.
- Rationale: Balances Art. 12 traceability with minimisation requirements under GDPR and constitution principles.
- Alternatives considered: Store full raw prompts/responses for all events. Rejected due to minimisation and retention risk.

## Decision 4: Use shared template cache with governance metadata

- Decision: Introduce a template cache keyed by objective/grade/format and template version; include ownership, review date, and deprecation status for governance.
- Rationale: Improves generation consistency/performance and enables controlled shared-library template evolution.
- Alternatives considered: No cache, always generate from scratch. Rejected due to latency/cost variance and weaker pedagogical consistency.

## Decision 5: Keep shared-library copies isolated with lineage links

- Decision: Copied assessments become independent records that reference source lineage (`source_assessment_id`, `source_version`) but do not auto-sync content changes.
- Rationale: Aligns with spec behavior and avoids accidental cross-class mutation while preserving usage analytics.
- Alternatives considered: Live-linked copies auto-updating with source edits. Rejected because it can alter active classroom materials without local teacher intent.

## Decision 6: Generate remediation grouping suggestions as advisory-only

- Decision: Dashboard may suggest remediation grouping based on thresholds, but group creation and membership finalization are always teacher-initiated.
- Rationale: Preserves teacher autonomy and prevents autonomous learner-impacting decisions.
- Alternatives considered: Auto-create remediation groups at threshold breach. Rejected as non-compliant with teacher-in-the-loop principle.

## Decision 7: Use explicit prohibited-practice checks in generation request validation

- Decision: Add request-time guardrails and policy checks to reject disallowed generation intents (emotion/facial inference, manipulative profiling, autonomous grading language).
- Rationale: Makes Art. 5 controls testable and operational rather than only procedural.
- Alternatives considered: Rely on general model safety defaults. Rejected because explicit product-level controls are required for high-risk assurance.
