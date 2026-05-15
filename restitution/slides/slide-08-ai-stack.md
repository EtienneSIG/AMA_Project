# Slide 8 · AI · The AI Stack

- **Layout (template):** Content 2-col
- **Headline:** Five AI capabilities, one privacy story
- **Sub-headline:** AOAI · AI Search · Content Safety · ONNX · AML
- **Rubric coverage:** #7
- **Source refs:** demo/DEPLOYMENT-REPORT.md · demo/ml/adaptive_model/ · demo/apps/_shared/contentSafety.js

## Body bullets (left — services)
- Azure OpenAI `gpt-5.4-nano` (reasoning, 400 K ctx)
- AI Search `srch-learneu-demo` — RAG over curricula
- Content Safety MI-auth, threshold 4 (in + out)
- ONNX adaptive item picker — runs in the browser
- Azure ML workspace (HBI) — training pipeline

## Body bullets (right — purpose)
- AOAI: explanations, quizzes, teacher remediation plans
- Search: ground answers in NL/DE Year-7 curricula
- CS: gatekeeper on every prompt + every answer
- ONNX: pick item closest to P(correct)=0.7, **on device**
- AML: train, export ONNX, register model versions

## Visual
Two columns of 5 service tiles each, lines linking each tile in column 1 to its purpose tile in column 2.

## Speaker notes
Cinq capacités d'IA, chacune avec un rôle clair. Azure OpenAI sert tout le langage naturel : explications adaptées à l'âge, quiz, plans de remédiation pour l'enseignant. AI Search ancre les réponses dans les curricula nationaux NL et DE Year-7, ce qui résout le problème de l'hallucination pédagogique. Content Safety est en **gatekeeper non-optionnel** : il scanne le prompt entrant **et** la réponse sortante avec un seuil 4. Le picker adaptatif ONNX, point central : il choisit l'item dont la probabilité de réussite prédite est la plus proche de 0,7 — la zone de Vygotski — et il tourne **côté navigateur**, donc aucune donnée individuelle ne quitte l'appareil. Enfin AML héberge l'entraînement, l'export ONNX et la registry de versions. Voir `demo/DEPLOYMENT-REPORT.md` §2.
