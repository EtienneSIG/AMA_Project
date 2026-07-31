# DPIA — Belgium (BE)

**Controller:** LearnEU BE entity · **Joint controllers:** participating schools (Flemish/French communities)
**Supervisory authority:** Gegevensbeschermingsautoriteit / Autorité de protection des données (GBA/APD)
**Consent age:** national statutory age is **13**; the programme applies **16** (strictest across markets)
**Language:** nl-BE, fr-BE · **Residency:** EU only (`westeurope`)
**Status:** 🟡 Draft — pending DPO + local-counsel sign-off · **Version:** 0.1 · **Review cadence:** annual + on major change

> Aggregates the per-feature *DPIA deltas* (`specs/<NNN>/plan.md`) and children's-data checklists.

## 1. Systematic description of the processing (Art. 35(7)(a))

- **Purposes:** formative personalised learning, curriculum localisation (NL/FR), teacher-in-the-loop assessment, parent communication & consent, director/board aggregate reporting.
- **Data subjects:** learners (K-12), teachers, parents/guardians, school staff — across **two language communities**.
- **Personal data:** pseudonymous learner id, attempt/mastery telemetry, moderated messages, guardian-consent records, opt-in well-being self-reports. **No** special-category/biometric/emotion/facial data.
- **Recipients:** the school, own-child guardians, EU-hosted processors. **No** advertising, **no** non-EU transfer.
- **Retention:** per-feature windows; **30-day erasure SLA**.

## 2. Necessity & proportionality (Art. 35(7)(b))

- **Lawful basis:** public task / legitimate interest for pedagogy; **Art. 8 guardian consent** for under-16; the programme voluntarily raises the consent floor to **16** even though BE statute allows 13.
- **Bilingual duty:** transparency notices and consent flows provided in **both** nl-BE and fr-BE.
- **Minimisation:** pseudonymisation; aggregate-only reporting with suppression; no autonomous grading.

## 3. Risks to rights and freedoms (Art. 35(7)(c))

| # | Risk | Inherent severity |
|---|---|---|
| B1 | Inconsistent consent handling across the two communities | High |
| B2 | Re-identification via small-cohort reporting | High |
| B3 | Language-mismatch in transparency/consent (comprehension risk for minors) | Medium |
| B4 | Learner-affecting decision without human oversight | High |
| B5 | Data residency breach | High |

## 4. Measures to address the risks (Art. 35(7)(d))

- **B1:** single consent engine, age floor 16 enforced uniformly; per-community counsel review.
- **B2:** minimum-cohort suppression; aggregate-only director/board surfaces.
- **B3:** localisation pipeline with human editorial + pedagogical sign-off for nl-BE/fr-BE consent copy.
- **B4:** mandatory teacher override (AI Act Art. 14); reasoning surfaced.
- **B5:** EU-only IaC; backends private; APIM sole ingress.

## 5. Consultation & residual risk

- DPO opinion: ☐ pending. Prior consultation with **GBA/APD** if residual risk stays high (Art. 36).
- Residual risk after measures: **target Low/Medium**.

## 6. Sign-off

- [ ] GDPR Children's Data Specialist — draft complete
- [ ] DPO — approved
- [ ] Local counsel (BE, both communities) — confirmed
