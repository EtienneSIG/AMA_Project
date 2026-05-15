# Slide 11 · AI · Multi-Agent Coordination

- **Layout (template):** Architecture
- **Headline:** Sequenced handoffs + independent audit
- **Sub-headline:** Orchestrator → 6 specialists → QA Verifier → final synthesis
- **Rubric coverage:** #10
- **Source refs:** agents/edtech-program-orchestrator.chatmode.md · agents/cross-agent-qa-verifier.chatmode.md

## Body bullets
- Trigger: any user request mentioning the platform
- Orchestrator decides which specialists to invoke + in what order
- Each specialist returns a typed answer scoped to its domain
- QA Verifier audits every sub-output before synthesis
- Synthesis = decision · risks · trade-offs · RACI next actions
- Failed audits → orchestrator requests redo (no silent merge)

## Visual
Sequence diagram (Mermaid `sequenceDiagram`): User → Orchestrator → LearningSci → PrivacyML → GDPR → AIAct → Localisation → RAI → Verifier → Orchestrator → User. Verifier loop in red.

## Speaker notes
Comment ça marche concrètement ? L'utilisateur pose une question — par exemple « Peut-on activer la recommandation personnalisée pour les CM2 polonais ? ». L'orchestrateur restate l'objectif en termes de KPI attendus, choisit les spécialistes pertinents — ici GDPR, AI Act, Privacy ML, Learning Sciences, Localisation, RAI — et les appelle dans cet ordre. Chaque persona produit une sortie structurée. Le QA Verifier, qui est volontairement **séparé** de l'orchestrateur, audite chaque sortie : si une affirmation viole une contrainte (par exemple un profilage <16 sans consentement), il rejette et demande un redo. Seules les sorties auditées remontent à l'orchestrateur qui synthétise en : décision proposée, risques croisés, trade-offs, prochaines actions avec RACI. Voir [agents/edtech-program-orchestrator.chatmode.md](../agents/edtech-program-orchestrator.chatmode.md).
