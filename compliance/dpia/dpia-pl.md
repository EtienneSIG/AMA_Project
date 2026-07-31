# DPIA — Poland (PL)

**Controller:** LearnEU PL entity · **Joint controllers:** participating schools
**Supervisory authority:** UODO (Urząd Ochrony Danych Osobowych) · **National law:** Act of 10 May 2018 on the Protection of Personal Data
**Consent age:** 16 · **Language:** pl-PL · **Residency:** EU only (`westeurope`)
**Status:** 🟡 Draft — pending DPO + local-counsel sign-off · **Version:** 0.1 · **Review cadence:** annual + on major change

> Aggregates the per-feature *DPIA deltas* (`specs/<NNN>/plan.md`) and children's-data checklists.

## 1. Systematic description of the processing (Art. 35(7)(a))

- **Purposes:** formative personalised learning, curriculum localisation (pl-PL), teacher-in-the-loop assessment, parent communication & consent, director/board aggregate reporting.
- **Data subjects:** learners (K-12), teachers, parents/guardians, school staff.
- **Personal data:** pseudonymous learner id, attempt/mastery telemetry, moderated messages, guardian-consent records, opt-in well-being self-reports. **No** special-category/biometric/emotion/facial data.
- **Recipients:** the school, own-child guardians, EU-hosted processors. **No** advertising, **no** non-EU transfer.
- **Retention:** per-feature windows; **30-day erasure SLA**.

## 2. Necessity & proportionality (Art. 35(7)(b))

- **Lawful basis:** public task / legitimate interest for pedagogy; **Art. 8 guardian consent** for under-16 (Poland sets the Art. 8 age at 16).
- **Minimisation:** pseudonymisation; aggregate-only reporting with suppression; no autonomous grading.
- **Transparency:** notices and consent flows in pl-PL, age-appropriate language.

## 3. Risks to rights and freedoms (Art. 35(7)(c))

| # | Risk | Inherent severity |
|---|---|---|
| P1 | Guardian-consent verification for under-16 | High |
| P2 | Re-identification via small-cohort reporting | High |
| P3 | Secondary use of telemetry beyond pedagogy | Medium |
| P4 | Learner-affecting decision without human oversight | High |
| P5 | Data residency breach | High |

## 4. Measures to address the risks (Art. 35(7)(d))

- **P1:** Art. 8 consent gate; verifiable guardian consent; audited consent records.
- **P2:** minimum-cohort suppression; aggregate-only director/board surfaces.
- **P3:** purpose limitation; retention windows; Records of Processing (Art. 30).
- **P4:** mandatory teacher override (AI Act Art. 14); reasoning surfaced.
- **P5:** EU-only IaC; backends private; APIM sole ingress.

## 5. Consultation & residual risk

- DPO opinion: ☐ pending. Consultation with **UODO** if residual risk stays high (Art. 36).
- Residual risk after measures: **target Low/Medium**.

## 6. Sign-off

- [ ] GDPR Children's Data Specialist — draft complete
- [ ] DPO — approved
- [ ] Local counsel (PL) — confirmed
