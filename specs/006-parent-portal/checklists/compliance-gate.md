# Compliance Gate — 006 Parent Portal

Tracks GDPR Art. 8, EU AI Act high-risk obligations, and constitution evidence
for the Parent Portal feature. Pedagogical sign-off precedes technical sign-off.

- **Feature**: 006-parent-portal
- **Risk class**: High-risk (EU AI Act) — all parent surfaces inherit the
  programme high-risk posture even though no new AI decisioning is introduced.
- **Data residency**: EU only (West/North Europe). No cross-EU transfer.
- **Consent default age**: 16 (under-16 requires guardian consent before
  adaptive/AI access).

## 1. Constitution principles

| # | Principle | Status | Evidence |
|---|-----------|--------|----------|
| I | EU data residency | ✅ | Postgres Flexible Server in West Europe; `/api/health` surfaces region; no cross-EU transfer. |
| II | GDPR Art. 8 children's data | ✅ | `parental_consents` + `consent_requests` tables; token flow (US3) with explicit checkbox, versioned disclosure, 7-day TTL, day-6 reminder, learner gating. |
| III | EU AI Act high-risk discipline | ✅ | No new AI decisioning; Content Safety scans messages pre-delivery; Art. 12 logging + Art. 14 teacher-in-the-loop preserved. |
| IV | Teacher-in-the-loop | ✅ | Parent↔teacher messages routed through moderation queue (teacher-console); no autonomous delivery of flagged content. |
| V | Pedagogical sign-off precedes technical | ✅ | Learning-sciences review of "How to help" guidance + family resources recorded in §5 (T067) before technical sign-off. |
| VI | Outcome-contract driven | ✅ | Metrics surface (`/api/parent/metrics`) tracks SC-001..SC-007. |
| VII | Spec-driven delivery | ✅ | spec.md → plan.md → tasks.md → acceptance tests in `acceptance_tests.ps1`. |

## 2. Cross-agent verification (T062)

> Accountable: cross-agent-qa-verifier. Verify spec/plan/tasks alignment and
> constitution evidence; record below.

- [x] Spec ↔ plan ↔ tasks alignment confirmed (no orphan requirements).
- [x] No prompt-injection / data-exfiltration surface in new endpoints.
- [x] Audit immutability verified (append-only `audit_event`).
- [x] Evidence log updated.

_Status_: signed off (cross-agent-qa-verifier). All Feature-006 user stories (US1–US5)
trace spec → plan → tasks → `acceptance_tests.ps1` (T016–T018, T025–T026, T035–T036,
T045–T046, T053–T054, T065). New parent endpoints are role-gated
(`isParentOrAdmin`), CSRF-protected, and emit append-only audit events
(`parent_digest_generated`, `parent_digest_engagement`); no free-form input is
reflected to other users without Content Safety scanning.

## 3. EU AI Act review (T063)

> Accountable: eu-ai-act-compliance-officer. Articles 9, 10, 12, 13, 14, 15.

| Article | Requirement | Status | Notes |
|---------|-------------|--------|-------|
| Art. 9 | Risk management | ✅ | Consent non-completion, age misclassification, revocation edge cases covered by request lifecycle + reminders + grant/withdraw tests (T016/T035/T036). |
| Art. 10 | Data governance | ✅ | Children payload restricted to approved keys (verified in T016); no new data categories beyond guardian email + consent metadata. |
| Art. 12 | Logging/traceability | ✅ | Consent, message scan, moderation, digest generate/engagement, reminder audit events (append-only). |
| Art. 13 | Transparency | ✅ | Plain-language versioned consent disclosure + rights surface; digest opt-out honoured (T045). |
| Art. 14 | Human oversight | ✅ | Teacher moderation queue gates flagged messages (T026); no autonomous learner decisions. |
| Art. 15 | Robustness/cybersecurity | ✅ | Role gate, HTTPS, CSRF, 7-day consent link TTL, rate limiting. |

_Sign-off_: signed off (eu-ai-act-compliance-officer). No new AI decisioning introduced;
high-risk posture maintained with logging, oversight, and transparency surfaces.

## 4. GDPR Art. 8 legal review (T064)

> Accountable: gdpr-children-data-specialist.

- [x] Consent language is plain, age-appropriate, versioned (`disclosure_version`).
- [x] Revocation/withdrawal path works (grant ↔ withdraw).
- [x] Retention policy aligned (consent: learner lifetime + 6y; messages: school policy).
- [x] Rights surface (access, erasure, opt-out, no-profiling) shown at consent time.
- [x] Data minimization: only guardian email + consent metadata added.

_Sign-off_: signed off (gdpr-children-data-specialist). Under-16 children are gated
behind guardian consent (verified T016: `requiresConsent=true`, no
`gdpr_art8.granted` until granted); default consent age 16; no profiling of
children introduced.

## 5. Responsible-AI & pedagogical sign-off (T067)

> Accountable: responsible-ai-evaluator (+ learning-sciences-expert).

- [x] Moderated messaging path reviewed (Content Safety verdict → teacher action).
- [x] Weekly support guidance ("How to help") sourced from approved resource set.
- [x] Family resources carry pedagogical + cultural review annotations.
- [x] No dark patterns in consent or digest opt-out.

_Sign-off_: signed off (responsible-ai-evaluator + learning-sciences-expert).
"How to help" tone (celebration/support/neutral) and guidance strings are drawn
from the approved `HOW_TO_HELP` set (verified T046); `family-resources.manifest.json`
carries per-resource pedagogical + cultural review annotations across 7 languages.
Pedagogical sign-off recorded ahead of technical sign-off (Principle V).

## 6. Success criteria evidence (SC-001 … SC-007)

| SC | Target | Evidence path |
|----|--------|---------------|
| SC-001 | Dashboard p95 ≤ 3s | Perf markers + acceptance test (T017/T023). |
| SC-002 | ≥90% consent within 7 days | Consent request lifecycle + reminders (T035/T036/T043). |
| SC-003 | ≥75% digest open/visit in 3 days | Digest engagement hooks (T052) + `/api/parent/metrics`. |
| SC-004 | ≤24h median teacher reply | Message thread timestamps (T027/T028). |
| SC-005 | 100% messages scanned | Content Safety pre-delivery scan (T029). |
| SC-006 | ≥5 languages, ≥90% coverage | translations.json + coverage test (T054). |
| SC-007 | Zero new GDPR Art. 8 non-conformities | This gate (§4) + DPIA delta. |
