# Slide 8 · Solution · On a page

- **Layout (template):** Content 2-col
- **Headline:** One platform, three AI capabilities, zero data leaving the EU
- **Sub-headline:** Built on Azure EU regions — 8 services, all in scope
- **CXO focus:** CIO · CTO · CEO
- **Source refs:** plan/03-target-architecture.md · demo/ARCHITECTURE.md

## Body bullets (left — Three AI capabilities)
- Adaptive learner model — on-device ONNX, federated training, DP
- Curriculum localisation AI — Azure OpenAI + AI Search + glossaries
- Automated assessment AI — structured grading + formative feedback

## Body bullets (right — Eight Azure services, EU-only)
- Identity: Azure AD B2C (per country) + Entra ID (staff)
- Data: Microsoft Fabric (OneLake) + Purview + Key Vault HSM
- AI: Azure ML + Azure OpenAI + AI Content Safety
- Edge: API Management (front door) + ONNX Runtime (on-device)

## Visual
Single horizontal swimlane: Devices → APIM → Fabric / Azure ML / OpenAI → ONNX & Web apps. EU flag stamp on the lane. "Full diagram → Appendix A1".

## Speaker notes
La solution en une slide pour le board. Trois capacités IA assises sur huit services Azure, tous déployés en région EU. Le détail architectural est en annexe A1, A2, A3 — je le déplie sur demande. Le point clé pour le CIO et le CTO : la donnée mineur ne quitte par défaut **pas** l'appareil. L'inférence du modèle adaptatif tourne en ONNX dans le navigateur ; l'entraînement se fait en fédéré, avec différentielle privacy, et l'agrégation utilise du Confidential Computing. C'est ce qui rend la conformité GDPR Article 8 tenable à grande échelle.
