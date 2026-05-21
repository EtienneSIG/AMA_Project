# Slide 9 · Trust · Compliance posture

- **Layout (template):** Content 2-col
- **Headline:** GDPR Art. 8 + EU AI Act high-risk: addressed from day zero
- **Sub-headline:** Built into the SDLC, not bolted on at audit
- **CXO focus:** CRO · CCO · CLO · CISO
- **Source refs:** plan/04-compliance-eu-ai-act-gdpr.md · plan/07-governance-rai.md

## Body bullets (left — GDPR posture)
- Article 8 — default consent age 16 (strictest of 5 markets)
- DPIA per market in Phase 0, refreshed annually
- Data minimisation: on-device first, federated second, central last
- Erasure SLA: 30 days, automated via Purview lineage

## Body bullets (right — EU AI Act posture)
- Every feature classified high-risk by default (Annex III §3)
- Annex IV technical file built feature-by-feature from M0
- Conformity assessment (Art. 43) — CE marking before phase-3 exit
- Post-market monitoring (Art. 72) live from first pilot

## Visual
Two columns of green check-boxes, each labelled with the article number it satisfies. CE-marking badge bottom-right.

## Speaker notes
Pour le CRO, le CCO, le CLO et le CISO : la conformité n'est pas un livrable de fin de programme, c'est un *gate* de chaque release. Côté GDPR, on aligne sur le pays le plus strict (Pays-Bas — 16 ans), on fait un DPIA par marché en Phase 0, et on minimise la donnée par construction. Côté AI Act, on traite tout en haut-risque par défaut — pas de débat de classification — on construit le dossier Annex IV feature par feature, et on vise la CE-marking avant la sortie de Phase 3. La conformité produit-elle un asset de vente vers les ministères ? Oui — voir slide 4.
