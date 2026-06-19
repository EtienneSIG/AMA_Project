# Annex IV Technical Documentation Fragment — Adaptive Learning (007)

*(EU AI Act Annex IV — fragment for the adaptive next-best-activity subsystem.)*

1. **General description.** A deterministic, rule-based recommender that proposes
   the next pedagogical activity (catch-up / peer-practice / challenge / stretch)
   after a learner attempt, with a plain-language rationale. Intended users:
   learners (under teacher supervision) and teachers. Intended purpose: formative
   personalisation, not assessment or certification.

2. **System elements.**
   - Engine: [_shared/adaptive/engine.js](../../../demo/apps/_shared/adaptive/engine.js) (`adaptive-v1`).
   - Helpers/thresholds: [_shared/adaptive/helpers.js](../../../demo/apps/_shared/adaptive/helpers.js).
   - Transparency copy: [_shared/adaptive/transparency-labels.js](../../../demo/apps/_shared/adaptive/transparency-labels.js) (`transparency-v1`).
   - Audit: [_shared/adaptive/audit.js](../../../demo/apps/_shared/adaptive/audit.js) + append-only tables.
   - Routes: [_shared/server-adaptive.js](../../../demo/apps/_shared/server-adaptive.js).

3. **Logic & assumptions.** Mastery bands (0–50 / 50–80 / 80+ / sustained-80+),
   reliability threshold ≥ 3 attempts. No machine learning at decision time;
   identical inputs yield identical outputs.

4. **Oversight.** Mandatory teacher override (Art. 14); reasoning surfaced;
   automated path paused on override; high-intervention alert at 3+ overrides/topic.

5. **Accuracy & robustness (Art. 15).** Deterministic and unit/smoke tested.
   Non-adaptive fallback when evidence is unreliable. Module load is guarded so the
   host app degrades to non-adaptive mode rather than failing.

6. **Record-keeping (Art. 12).** Immutable `adaptive_audit` + `adaptive_teacher_override`
   with DB-trigger enforcement; latency captured per decision.

7. **Data.** EU-hosted Postgres; pseudonymous learner id; no special-category data;
   processing gated by GDPR Art. 8 consent.

8. **Known limitations.** Anomaly flags are heuristic and advisory only; bands are
   coarse by design for explainability; activity catalogue is keyed by skill id
   convention (`<skill>::<phase>`).
