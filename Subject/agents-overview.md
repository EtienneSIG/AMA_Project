# LearnEU project agents (Case Study 33)

Overview of all agents defined in [`agents/`](../agents/).

| # | Agent | File | Domain | Role | Key deliverables / responsibilities |
|---|-------|------|--------|------|-------------------------------------|
| 1 | EdTech Program Orchestrator | [edtech-program-orchestrator.chatmode.md](../agents/edtech-program-orchestrator.chatmode.md) | Orchestration | Lead coordinator that orchestrates all specialist agents to deliver the personalised learning platform end to end. | Cross-agent coordination, deliverable sequencing, program consistency |
| 2 | EU AI Act Compliance Officer | [eu-ai-act-compliance-officer.chatmode.md](../agents/eu-ai-act-compliance-officer.chatmode.md) | Compliance | Compliance for high-risk AI systems in education (Articles 9–15). | Risk management, technical documentation (Annex IV), logging, human oversight, transparency, robustness, data governance |
| 3 | GDPR Children's Data Specialist | [gdpr-children-data-specialist.chatmode.md](../agents/gdpr-children-data-specialist.chatmode.md) | Compliance | Children's data protection (GDPR Article 8) for K-12 EdTech across the EU. | Lawful basis, parental consent for under-16s, data minimisation, DPIA, age-appropriate design |
| 4 | Responsible AI Evaluator | [responsible-ai-evaluator.chatmode.md](../agents/responsible-ai-evaluator.chatmode.md) | Compliance / Eval | Fairness, bias, robustness and transparency testing; owns the model release gate. | Fairness/bias testing across cohorts, model release gate |
| 5 | Privacy-Preserving ML Engineer | [privacy-preserving-ml-engineer.chatmode.md](../agents/privacy-preserving-ml-engineer.chatmode.md) | ML Engineering | Personalisation without storing identifiable child data. | Federated learning, differential privacy, secure aggregation, on-device inference |
| 6 | Learning Sciences & Pedagogy Expert | [learning-sciences-expert.chatmode.md](../agents/learning-sciences-expert.chatmode.md) | Pedagogy | Grounds every personalisation/assessment/feedback feature in evidence-based pedagogy. | Mastery learning, formative assessment, ZPD, teacher explainability |
| 7 | Multilingual Content Localisation Lead | [content-localisation-lead.chatmode.md](../agents/content-localisation-lead.chatmode.md) | Content | Curriculum localisation from 12 months to 6 weeks across NL/BE/DE/PL/RO. | Azure OpenAI + human-in-the-loop, quality, terminology, cultural fidelity |
| 8 | Cross-Agent QA & Verifier | [cross-agent-qa-verifier.chatmode.md](../agents/cross-agent-qa-verifier.chatmode.md) | Quality | Independent auditor of every other agent's deliverables. | Checks constraints + output contract + cross-agent consistency → pass / conditional / fail |
| 9 | AMA Rubric Evaluator | [ama-rubric-evaluator.chatmode.md](../agents/ama-rubric-evaluator.chatmode.md) | Evaluation | Scores the project against the AMA EMEA rubric with file-anchored evidence. | Examiner-facing scorecard + actionable remediation plan |
| 10 | Autonomous Demo Deployment Agent | [demo-deployment-agent.chatmode.md](../agents/demo-deployment-agent.chatmode.md) | Delivery | Provisions and deploys the full demo on the tenant. | azd / az / Bicep / Python via Azure MCP, acceptance-criteria checks, live tutorial, confirmation before destructive actions |
| 11 | Restitution Deck Builder | [restitution-deck-builder.chatmode.md](../agents/restitution-deck-builder.chatmode.md) | Delivery | Produces and maintains the final AMA restitution deck. | Slide-by-slide content in `restitution/`, coverage matrix, build .pptx from the Microsoft template |
| 12 | Scale Agent | [scale.chatmode.md](../agents/scale.chatmode.md) | Scale | `@scale` workstream: system behaviour under load. | Architecture at scale, capacity planning, performance, rollout, reliability, cost trade-offs |

## Spec Kit workflow agents

Spec-driven delivery agents defined in [`.github/agents/`](../.github/agents/), listed in workflow order.

| # | Agent | File | Workflow step | Role |
|---|-------|------|---------------|------|
| 1 | speckit.constitution | [speckit.constitution.agent.md](../.github/agents/speckit.constitution.agent.md) | Constitution | Create or update the project constitution from interactive or provided principle inputs, keeping all dependent templates in sync. |
| 2 | speckit.specify | [speckit.specify.agent.md](../.github/agents/speckit.specify.agent.md) | Specify | Create or update the feature specification from a natural-language feature description. |
| 3 | speckit.clarify | [speckit.clarify.agent.md](../.github/agents/speckit.clarify.agent.md) | Clarify | Identify underspecified areas by asking up to 5 targeted clarification questions and encode the answers back into the spec. |
| 4 | speckit.plan | [speckit.plan.agent.md](../.github/agents/speckit.plan.agent.md) | Plan | Run the implementation planning workflow using the plan template to generate design artifacts. |
| 5 | speckit.checklist | [speckit.checklist.agent.md](../.github/agents/speckit.checklist.agent.md) | Checklist | Generate a custom checklist for the current feature based on user requirements. |
| 6 | speckit.tasks | [speckit.tasks.agent.md](../.github/agents/speckit.tasks.agent.md) | Tasks | Generate an actionable, dependency-ordered `tasks.md` from the available design artifacts. |
| 7 | speckit.analyze | [speckit.analyze.agent.md](../.github/agents/speckit.analyze.agent.md) | Analyze | Non-destructive cross-artifact consistency and quality analysis across `spec.md`, `plan.md`, and `tasks.md` after task generation. |
| 8 | speckit.implement | [speckit.implement.agent.md](../.github/agents/speckit.implement.agent.md) | Implement | Execute the implementation plan by processing and running all tasks defined in `tasks.md`. |
| 9 | speckit.taskstoissues | [speckit.taskstoissues.agent.md](../.github/agents/speckit.taskstoissues.agent.md) | Tasks → Issues | Convert existing tasks into actionable, dependency-ordered GitHub issues for the feature. |
