# Slide 28 · Appendix A07 · Model selection & evaluation

- **Layout (template):** Content 2-col
- **Headline:** A7 · Right-sized model per task, gated release
- **Sub-headline:** Frontier where it matters; small + fine-tuned everywhere else
- **CXO focus:** CAIO · CTO
- **Source refs:** plan/07-governance-rai.md · agents/responsible-ai-evaluator.chatmode.md

## Body bullets (left — Selection)
- Adaptive learner: custom small model trained on synthetic + federated data
- Assessment: fine-tuned Phi-class for structured grading
- Localisation: Azure OpenAI GPT-class with RAG + glossary grounding
- Routing: small-first, escalate only when confidence < threshold

## Body bullets (right — Evaluation gates)
- Fairness: per-cohort disparity ≤ 5 pp (gating)
- Calibration: ECE ≤ 0.05
- Safety: 0 critical Content Safety failures in eval suite
- Transparency: every decision must produce a teacher-readable explanation
- Re-evaluated quarterly; rollback playbook same-day

## Visual
Decision tree: task → model size → fallback path. Eval gates as a horizontal pipeline.

## Speaker notes
Pour le CAIO et le CTO : le choix de modèle est *par tâche*, pas global. On part petit, on escalade vers du frontier seulement si la confidence est insuffisante. Quatre critères de gate pour chaque release : fairness par cohorte, calibration (ECE ≤ 0,05), safety (zéro critique sur l'eval suite), et transparence. Le RAI Evaluator en est responsable. Re-évaluation trimestrielle plus rollback prêt en quelques heures.
