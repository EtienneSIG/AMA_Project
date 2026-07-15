# LearnEU project agents (Case Study 33)

Overview of all agents defined in [`agents/`](../agents/).

| #  | Agent                                  | Domain            | Role                                                                                                               | Key deliverables / responsibilities                                                                                         |
| -- | -------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| 1  | EdTech Program Orchestrator            | Orchestration     | Lead coordinator that orchestrates all specialist agents to deliver the personalised learning platform end to end. | Cross-agent coordination, deliverable sequencing, program consistency                                                       |
| 2  | EU AI Act Compliance Officer           | Compliance        | Compliance for high-risk AI systems in education (Articles 9–15).                                                  | Risk management, technical documentation (Annex IV), logging, human oversight, transparency, robustness, data governance    |
| 3  | GDPR Children's Data Specialist        | Compliance        | Children's data protection (GDPR Article 8) for K-12 EdTech across the EU.                                         | Lawful basis, parental consent for under-16s, data minimisation, DPIA, age-appropriate design                               |
| 4  | Responsible AI Evaluator               | Compliance / Eval | Fairness, bias, robustness and transparency testing; owns the model release gate.                                  | Fairness/bias testing across cohorts, model release gate                                                                    |
| 5  | Privacy-Preserving ML Engineer         | ML Engineering    | Personalisation without storing identifiable child data.                                                           | Federated learning, differential privacy, secure aggregation, on-device inference                                           |
| 6  | Learning Sciences & Pedagogy Expert    | Pedagogy          | Grounds every personalisation/assessment/feedback feature in evidence-based pedagogy.                              | Mastery learning, formative assessment, ZPD, teacher explainability                                                         |
| 7  | Multilingual Content Localisation Lead | Content           | Curriculum localisation from 12 months to 6 weeks across NL/BE/DE/PL/RO.                                           | Azure OpenAI + human-in-the-loop, quality, terminology, cultural fidelity                                                   |
| 8  | Cross-Agent QA & Verifier              | Quality           | Independent auditor of every other agent's deliverables.                                                           | Checks constraints + output contract + cross-agent consistency → pass / conditional / fail                                  |
| 9  | AMA Rubric Evaluator                   | Evaluation        | Scores the project against the AMA EMEA rubric with file-anchored evidence.                                        | Examiner-facing scorecard + actionable remediation plan                                                                     |
| 10 | Autonomous Demo Deployment Agent       | Delivery          | Provisions and deploys the full demo on the tenant.                                                                | azd / az / Bicep / Python via Azure MCP, acceptance-criteria checks, live tutorial, confirmation before destructive actions |
| 11 | Restitution Deck Builder               | Delivery          | Produces and maintains the final AMA restitution deck.                                                             | Slide-by-slide content in `restitution/`, coverage matrix, build .pptx from the Microsoft template                          |
| 12 | Scale Agent                            | Scale             | `@scale` workstream: system behaviour under load.                                                                  | Architecture at scale, capacity planning, performance, rollout, reliability, cost trade-offs                                |

## Spec Kit workflow agents

Spec-driven delivery agents defined in [`.github/agents/`](../.github/agents/), listed in workflow order.

| # | Agent                 | Workflow step  | Role                                                                                                                               |
| - | --------------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| 1 | speckit.constitution  | Constitution   | Create or update the project constitution from interactive or provided principle inputs, keeping all dependent templates in sync.  |
| 2 | speckit.specify       | Specify        | Create or update the feature specification from a natural-language feature description.                                            |
| 3 | speckit.clarify       | Clarify        | Identify underspecified areas by asking up to 5 targeted clarification questions and encode the answers back into the spec.        |
| 4 | speckit.plan          | Plan           | Run the implementation planning workflow using the plan template to generate design artifacts.                                     |
| 5 | speckit.checklist     | Checklist      | Generate a custom checklist for the current feature based on user requirements.                                                    |
| 6 | speckit.tasks         | Tasks          | Generate an actionable, dependency-ordered `tasks.md` from the available design artifacts.                                         |
| 7 | speckit.analyze       | Analyze        | Non-destructive cross-artifact consistency and quality analysis across `spec.md`, `plan.md`, and `tasks.md` after task generation. |
| 8 | speckit.implement     | Implement      | Execute the implementation plan by processing and running all tasks defined in `tasks.md`.                                         |
| 9 | speckit.taskstoissues | Tasks → Issues | Convert existing tasks into actionable, dependency-ordered GitHub issues for the feature.                                          |
