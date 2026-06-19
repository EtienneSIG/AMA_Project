# Annex IV technical-documentation fragment — Feature 008 (Teacher Assessment, AI Rubric Assist & At-Risk Dashboards)

> EU AI Act Annex IV fragment for the high-risk AI components introduced by this
> feature. Read alongside `plan/04-compliance-eu-ai-act-gdpr.md` and the system-level
> Annex IV file. Scope: AI rubric/question generation, remediation suggestions, and
> advisory at-risk analytics surfaced in the Teacher Console.

## 1. General description of the AI system

- **Intended purpose**: assist a teacher in *drafting* assessment artifacts (rubrics,
  question sets, remediation suggestions) and in *seeing* advisory class analytics.
  The system is decision-support only. It does **not** grade learners autonomously,
  and performs **no** biometric, facial, or emotion recognition.
- **High-risk classification**: Annex III §3 (education and vocational training —
  systems used to evaluate learning outcomes / influence assessment).
- **Deployment**: EU region only (Azure West Europe). Generation calls are proxied
  through Azure API Management to an EU Azure OpenAI deployment.

## 2. Elements and development process

- **Foundation model access**: via APIM proxy (`/aoai/openai/deployments/{deployment}`),
  subscription-key auth, `api-version=2024-08-01-preview`. No model fine-tuning.
- **Prompt governance**: generation uses governed prompt templates
  (`template_cache_entries`, owner = learning-sciences, `review_status='approved'`).
- **Data inputs**: a teacher-entered learning objective plus a bounded context
  (grade tag, subject tag, locale). The raw objective is **never persisted** — only a
  SHA-256 hash (`objective_text_hash`) and the bounded context are stored (data minimisation).

## 3. Human oversight (Article 14)

- Every generated artifact is created with `approved_for_assignment = false` and
  `generation_status = 'safety_reviewed'`. It cannot be assigned to learners until a
  teacher records an `approve` decision (`teacher_approvals`, append-only) that sets
  `approved_for_assignment = true`.
- `isArtifactAssignable()` enforces the gate server-side; the `/assign` route returns
  HTTP 409 (`not_assignable`) when the gate is not satisfied.
- The at-risk dashboard is explicitly advisory: it never mutates a learner record and
  is labelled as decision-support in the UI and API responses.
- Teacher overrides and approvals are written to the immutable `audit_event` table.

## 4. Accuracy, robustness and cybersecurity (Article 15)

- **Fail-closed Content Safety**: all generated text and all learner-visible teacher
  feedback are scanned by Azure AI Content Safety. If Content Safety is enabled but
  cannot run, the verdict defaults to `flagged` / `requires_manual_review` (the draft
  is held, never auto-released).
- **Prohibited-practice validator (Article 5)**: objectives are screened for emotion
  recognition, facial/biometric categorisation, autonomous grading, social scoring and
  behavioural advertising. Matches produce a deterministic refusal (HTTP 422) and an
  audited `ai_generation_refused` event.
- **Transport fail-closed**: model/transport errors return HTTP 503 and never fabricate
  a draft.
- **Input bounds**: objective truncated to 4 000 chars; output token cap ≤ 1 500.
- **Authn/z**: role-gated to `teacher`/`admin`; CSRF token enforced on state changes.

## 5. Risk management (Article 9)

See `specs/008-teacher-assessment/checklists/ai-act.md` and the feature risk register.
Residual risks (over-reliance on AI drafts, false-negative safety) are mitigated by the
mandatory approval gate, immutable audit trail, and the advisory-only dashboard framing.

## 6. Transparency (Article 13)

Every AI response carries a `transparency` object (`transparencyMeta()`): AI-generated
flag, human-oversight statement, "not autonomous / no biometric" statement, EU data
residency, and the model deployment id.

## 7. Logging & record-keeping (Article 12)

Audit events emitted to the immutable `audit_event` table: `ai_generated`,
`ai_generation_refused`, `ai_generation_failed`, `ai_artifact_decision`,
`ai_artifact_assigned`, `rubric_created`, `rubric_published`, `rubric_scored`,
`assessment_published`, `assessment_copied`, `remediation_group_created`,
`remediation_progress_updated`, `at_risk_dashboard_viewed`. Each carries a correlation id.
