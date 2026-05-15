# Slide 10 · AI · Agentic Platform

- **Layout (template):** Content 2-col
- **Headline:** 9 agents, 9 boundaries, 1 orchestrator
- **Sub-headline:** Specialists invoked by an orchestrator, audited by a verifier
- **Rubric coverage:** #9
- **Source refs:** agents/edtech-program-orchestrator.chatmode.md · agents/cross-agent-qa-verifier.chatmode.md · agents/demo-deployment-agent.chatmode.md

## Body bullets (left — specialist agents)
- EU AI Act Compliance Officer
- GDPR Children's Data Specialist
- Privacy-Preserving ML Engineer
- Learning Sciences Expert
- Content Localisation Lead
- Responsible AI Evaluator

## Body bullets (right — meta agents)
- EdTech Program Orchestrator (sequencing + synthesis)
- Cross-Agent QA Verifier (independent audit)
- Demo Deployment Agent (stage-based azd planner)
- + new **Restitution Deck Builder** (this deck's autopilot)

## Visual
Grid 3x3 of agent cards (icon + name + 1-line role). Highlight orchestrator + verifier in orange.

## Speaker notes
On a poussé l'agentique au niveau de la **conception**, pas seulement du runtime. Six personas spécialistes — chacun avec ses contraintes propres, par exemple le persona Privacy-Preserving ML Engineer **interdit** que la donnée individuelle quitte l'appareil. Un orchestrateur séquence ces personas : Learning Sciences → Privacy ML → GDPR → AI Act → Localisation → RAI. Et surtout, un agent vérificateur indépendant, le Cross-Agent QA Verifier, audite chaque sortie spécialiste avant qu'elle remonte à l'orchestrateur — c'est notre check-and-balance. À côté, un Demo Deployment Agent qui pilote `azd up` en stages 0–7. Et depuis ce matin, un dixième agent autonome qui construit ce deck. Voir [agents/](../agents/).
