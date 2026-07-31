# Slide 22 · Appendix A01 · Detailed target architecture

- **Layout (template):** Content 2-col
- **Headline:** A1 · Target architecture, layered view
- **Sub-headline:** Sources → Ingestion → Storage → Processing → Serving → Governance
- **CXO focus:** CIO · CTO · CDO
- **Source refs:** plan/03-target-architecture.md

## Body bullets (left — Data plane)
- Sources: SIS (pseudonymised), teacher content, national curricula, devices
- Ingestion: APIM (front door) + Event Hubs + ADF (batch)
- Storage: Fabric OneLake (Bronze/Silver/Gold) + Feature Store + immutable audit
- Keys: Azure Key Vault Managed HSM (CMK on all stores)

## Body bullets (right — AI + serving)
- Training: Azure ML (federated runtime + DP) + Confidential Computing
- Generation: Azure OpenAI + AI Search (RAG) + Content Safety gate
- Serving: ONNX on-device (default) + AML Online Endpoints (fallback)
- Surfaces: Teacher Console · Learner Web · Parent Portal · Power BI in Fabric

## Visual
Full 6-layer architecture diagram (Mermaid export). EU flag on each region. Diagram source: `plan/03-target-architecture.md`.

## Speaker notes
La vue détaillée de l'architecture, on-demand pour le CIO/CTO/CDO. Six couches : sources, ingestion, stockage, traitement, serving, gouvernance. Le détail texte est dans plan/03-target-architecture.md ; la régénération des diagrammes (Mermaid + draw.io + Excalidraw) se fait via l'agent "Azure Data & AI Solution Architect".
