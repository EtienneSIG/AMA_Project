# DPIA — Netherlands (NL)

**Controller:** LearnEU B.V. (NL operating entity) · **Joint controllers:** participating schools/boards
**Supervisory authority:** Autoriteit Persoonsgegevens (AP) · **National law:** UAVG (GDPR implementation)
**Consent age:** 16 · **Language:** nl-NL · **Residency:** EU only (`westeurope`)
**Status:** 🟡 Draft — pending DPO + local-counsel sign-off · **Version:** 0.1 · **Review cadence:** annual + on major change

> This DPIA aggregates the per-feature *DPIA deltas* in `specs/<NNN>/plan.md` and the
> children's-data checklists in `specs/<NNN>/checklists/gdpr-art8-*.md`.

## 1. Systematic description of the processing (Art. 35(7)(a))

- **Purposes:** formative personalised learning (adaptive next-best-activity), curriculum localisation, teacher-in-the-loop assessment, parent communication & consent, director/board aggregate reporting.
- **Data subjects:** learners (K-12, mostly under 16), teachers, parents/guardians, school staff.
- **Personal data:** pseudonymous learner id, attempt/mastery telemetry, moderated classroom messages, guardian-consent records, well-being self-reports (opt-in). **No** special-category, biometric, emotion or facial data.
- **Recipients:** the school, the learner's guardians (own child only), LearnEU processors (EU-hosted). **No** third-party advertising, **no** non-EU transfer.
- **Retention:** per-feature windows; **30-day erasure SLA**; audit events append-only.
- **Technology:** EU-hosted PostgreSQL; Azure OpenAI (EU) behind APIM; on-device/pseudonymous adaptive model; Content Safety on tutor I/O.

## 2. Necessity & proportionality (Art. 35(7)(b))

- **Lawful basis:** public task / legitimate interest for core pedagogy; **Art. 8 verifiable guardian consent** for under-16 processing; separate consent for optional communications and well-being features.
- **Data minimisation:** pseudonymisation by design; no direct identifiers in the model path; aggregate-only board/director reporting with server-side suppression.
- **Proportionality:** consent age set to **16** (strictest); no profiling for decisions without teacher override; no autonomous grading.

## 3. Risks to rights and freedoms (Art. 35(7)(c))

| # | Risk | Inherent severity |
|---|---|---|
| N1 | Re-identification of a pseudonymous learner via small-cohort reporting | High |
| N2 | Guardian-consent bypass for an under-16 account | High |
| N3 | Unlawful secondary use of learning telemetry | Medium |
| N4 | Learner-affecting decision without human oversight | High |
| N5 | Data residency breach (processing outside EU) | High |

## 4. Measures to address the risks (Art. 35(7)(d))

- **N1:** k-anonymity / minimum-cohort suppression in director & board reporting; aggregate-only surfaces.
- **N2:** Art. 8 consent gate blocks under-16 processing until verifiable guardian consent; consent records audited.
- **N3:** purpose-limited pipelines; retention windows; erasure SLA; Records of Processing (Art. 30).
- **N4:** mandatory teacher override on every learner-affecting AI decision; reasoning surfaced (AI Act Art. 14).
- **N5:** EU-only regions enforced in IaC; public network access disabled on backends; APIM sole ingress.

## 5. Consultation & residual risk

- DPO opinion: ☐ pending. Prior consultation with **AP** required only if residual risk remains **high** after measures (Art. 36).
- Residual risk after measures: **target Low/Medium** — to be confirmed at sign-off.

## 6. Sign-off

- [ ] GDPR Children's Data Specialist — draft complete
- [ ] DPO — approved
- [ ] Local counsel (NL/UAVG) — confirmed
