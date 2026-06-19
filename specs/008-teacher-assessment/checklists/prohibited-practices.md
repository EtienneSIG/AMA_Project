# Checklist — Prohibited practices (Feature 008)

Verifies the Article 5 guardrails are present and fail-closed.

- [X] Emotion / affect / mood recognition — rejected (`emotion_recognition`).
- [X] Facial / face recognition — rejected (`facial_recognition`).
- [X] Biometric categorisation / identification — rejected (`biometric_categorisation`).
- [X] Automatic / autonomous grading — rejected (`autonomous_grading`).
- [X] Grading without a teacher — rejected (`autonomous_grading`).
- [X] Social scoring / ranking children by behaviour — rejected (`social_scoring`).
- [X] Behavioural advertising to children — rejected (`behavioural_advertising`).
- [X] Refusal is deterministic (regex validator, not model-dependent) and audited.
- [X] No facial/emotion analysis code path exists anywhere in the feature.

Validator: `checkProhibitedPractice()` in `demo/apps/_shared/server.js`.
