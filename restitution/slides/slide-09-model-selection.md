# Slide 9 · AI · Model Selection & Deployment

- **Layout (template):** Content 1-col
- **Headline:** Why these models, deployed this way
- **Sub-headline:** Reasoning model in EU + on-device picker = privacy by construction
- **Rubric coverage:** #8
- **Source refs:** demo/DEPLOYMENT-REPORT.md · demo/ml/adaptive_model/ · plan/03-target-architecture.md

## Body bullets
- AOAI `gpt-5.4-nano @ 2026-03-17` — reasoning, 400 K context, **no payload retention**
- GlobalStandard 50 K TPM (Plan B — no PTU in West Europe at deploy time)
- Deployed via APIM internal product `learneu-demo` + KV-stored subscription key
- ONNX picker exported by `demo/ml/adaptive_model/build_onnx_simple.py` — served auth-gated at `/models/learner.onnx`
- Federated learning + DP roadmap documented (criterion #5 partial)
- Content Safety: same MI auth, same private endpoint, threshold 4

## Visual
Decision table: Capability → Model → Where it runs → Why this choice. 5 rows.

## Speaker notes
Pour chaque modèle on s'est posé trois questions : où il tourne, qui voit la donnée, et qu'est-ce qui se passe en cas de défaillance. AOAI : `gpt-5.4-nano`, 400 K de contexte, raisonnement, déployé en West Europe sans rétention de payload — c'est confirmé dans la docs Azure. Pas de PTU disponible dans la région à la date du déploiement, donc on est passés en Plan B GlobalStandard 50 K TPM. Le picker adaptatif est entraîné dans AML (`train_central.py`), exporté en ONNX via `build_onnx_simple.py`, et servi **derrière la session cookie** : l'IP modèle est protégé. Le federated learning et la differential privacy sont préparés en plan — voir critère #5 PARTIAL dans le rapport — mais pas activés sur cette slice budget.
