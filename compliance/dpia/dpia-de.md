# DPIA — Germany (DE)

**Controller:** LearnEU DE entity · **Joint controllers:** schools under the relevant **Land** school ministry
**Supervisory authority:** BfDI (federal) + the competent **Länder** DPA(s) per school location
**Consent age:** 16 · **Language:** de-DE · **Residency:** EU only (`westeurope`)
**Status:** 🟡 Draft — pending DPO + local-counsel sign-off · **Version:** 0.1 · **Review cadence:** annual + on major change

> Aggregates the per-feature *DPIA deltas* (`specs/<NNN>/plan.md`) and children's-data checklists.

## 1. Systematic description of the processing (Art. 35(7)(a))

- **Purposes:** formative personalised learning, curriculum localisation to the Land curriculum, teacher-in-the-loop assessment, parent communication & consent, director/board aggregate reporting.
- **Data subjects:** learners (K-12), teachers, parents/guardians, school staff.
- **Personal data:** pseudonymous learner id, attempt/mastery telemetry, moderated messages, guardian-consent records, opt-in well-being self-reports. **No** special-category/biometric/emotion/facial data.
- **Recipients:** the school, own-child guardians, EU-hosted processors. **No** advertising, **no** non-EU transfer.
- **Retention:** per-feature windows; **30-day erasure SLA**.

## 2. Necessity & proportionality (Art. 35(7)(b))

- **Federal complexity:** each **Land** has its own school data-protection regime (Schulgesetze / Landesdatenschutzgesetze). Lawful basis is typically the school's **public task**; LearnEU acts as **processor** for the school where required. A per-Land addendum records the competent authority and the exact basis.
- **Consent age:** 16 (aligned with GDPR Art. 8 default, which Germany applies).
- **Minimisation:** pseudonymisation; aggregate-only reporting with suppression; no autonomous grading.

## 3. Risks to rights and freedoms (Art. 35(7)(c))

| # | Risk | Inherent severity |
|---|---|---|
| D1 | Divergent Land-level requirements → inconsistent lawful basis | High |
| D2 | Re-identification via small-cohort reporting | High |
| D3 | Processor/controller boundary unclear vs the school | Medium |
| D4 | Learner-affecting decision without human oversight | High |
| D5 | Data residency breach | High |

## 4. Measures to address the risks (Art. 35(7)(d))

- **D1:** per-Land addendum + lead-authority mapping; local counsel per Land before go-live.
- **D2:** minimum-cohort suppression; aggregate-only director/board surfaces.
- **D3:** written processing agreement (AVV/DPA) with each school defining roles.
- **D4:** mandatory teacher override (AI Act Art. 14); reasoning surfaced.
- **D5:** EU-only IaC; backends private; APIM sole ingress.

## 5. Consultation & residual risk

- DPO opinion: ☐ pending. Consultation with the competent **Land** DPA if residual risk stays high (Art. 36).
- Residual risk after measures: **target Low/Medium**.

## 6. Sign-off

- [ ] GDPR Children's Data Specialist — draft complete
- [ ] DPO — approved
- [ ] Local counsel (per Land) — confirmed
