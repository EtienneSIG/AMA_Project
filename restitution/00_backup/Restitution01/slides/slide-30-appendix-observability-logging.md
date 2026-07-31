# Slide 30 · Appendix A09 · Observability & logging

- **Layout (template):** Content 2-col
- **Headline:** A9 · App Insights + immutable audit = AI Act Art. 12 ready
- **Sub-headline:** Every AI decision logged, queryable, defensible
- **CXO focus:** CTO · CISO · CCO
- **Source refs:** plan/03-target-architecture.md · plan/04-compliance-eu-ai-act-gdpr.md

## Body bullets (left — Telemetry)
- Application Insights per surface (Teacher · Learner · Parent · Admin)
- Custom events: ai_decision, override, content_safety_block, erasure_request
- Per-cohort fairness metrics aggregated continuously
- KQL workbooks for AI Act Art. 12 evidence on demand

## Body bullets (right — Immutable audit)
- Azure Blob WORM storage, EU regions, 6-month minimum retention
- Append-only stream of every AI decision + override
- Tamper-evident hashes; quarterly integrity check
- Surfaced to RAI Council dashboard + Steering Committee monthly

## Visual
Pipeline: app → App Insights → KQL workbook → Power BI · in parallel → WORM blob → integrity verifier.

## Speaker notes
Pour le CTO/CISO/CCO : l'observability est l'épine dorsale de la conformité, pas un confort opérationnel. App Insights pour la télémétrie applicative, plus un flux append-only en stockage WORM pour l'audit régulateur. Les workbooks KQL prêts à servir une demande d'évidence sous AI Act Art. 12. Le tout descend dans le dashboard du Conseil RAI et le pack mensuel du board.
