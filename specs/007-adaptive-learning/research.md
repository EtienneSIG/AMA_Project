# Research — Adaptive Learning (007)

**Accountable:** Privacy-Preserving ML Engineer · **Reviewers:** Learning Sciences Expert, EU AI Act CO

## Decision: deterministic, rule-based engine (no opaque ML at decision time)

The next-best-activity decision is produced by a **pure, deterministic function**
([engine.js](../../demo/apps/_shared/adaptive/engine.js)) over observed mastery
evidence. No black-box model selects the pedagogical path. Rationale:

- **AI Act Art. 15 (accuracy/robustness):** deterministic mapping is fully
  reproducible and testable; identical inputs always yield identical outputs.
- **AI Act Art. 13 (transparency):** every branch maps to a plain-language label
  the learner and teacher can read.
- **Art. 14 (human oversight):** reasoning is explicit, so a teacher can judge
  and override it.

The existing client-side ONNX item picker (ZPD P≈0.7) is **complementary** — it
selects *practice items* within a skill; the new server engine selects the
*next pedagogical activity/path* after an attempt and explains why.

## Mastery bands (verified in smoke + live test)

| Band | Mastery | Reason | Activity suffix |
|------|---------|--------|-----------------|
| 0–50% | < 0.50 | `catch_up` | `::intro` → scaffolded sequence |
| 50–80% | 0.50–0.80 | `peer_practice` | `::peer-practice` |
| 80%+ | ≥ 0.80 | `challenge` | `::challenge` |
| 80%+ sustained | ≥ 0.85 and 3+ consecutive correct | `stretch` | `::stretch` |
| unknown | < 3 attempts (unreliable) | `non_adaptive` | none — teacher decides |

## Non-adaptive fallback

When evidence is insufficient/unreliable (`MIN_RELIABLE_ATTEMPTS = 3`) the engine
emits `non_adaptive`, returns no automated activity, and logs a
`non_adaptive_fallback` audit event. The learner sees "your teacher decides what
comes next". This is the spec's safety default (no opaque guessing).

## Anomaly detection

Heuristic flags only (advisory, never punitive): `suspected_cheating`
(correct with latency < 1500 ms), `inconsistent_performance` (mastery drop ≥ 0.5).
Flags are surfaced to teachers via the immutable audit trail.

## Transparency copy

Versioned (`transparency-v1`) and localised fr/en in
[transparency-labels.js](../../demo/apps/_shared/adaptive/transparency-labels.js).
Learner-facing wording validated for age-appropriate, encouraging tone (no
deficit framing). Reviewed by Learning Sciences Expert.

## Latency

Decision latency captured per call (`latency_ms`) and persisted on the
`adaptive_decision`/`adaptive_audit` rows for SC-001/SC-005 evidence.
