# 00 — Program Charter

## Program name
**LearnEU** — AI-Driven Personalised Learning Platform for a European EdTech Group (Case Study 33)

## Sponsor
Group CEO + Group CDO (Dutch HQ) · Per-country Country Managers as delegated sponsors

## Vision
Every one of our **4.1 million learners** in NL, BE, DE, PL and RO progresses on a path adapted to **their** mastery, **their** language, and **their** context — **without** their personal data ever being centralised, and with their **teacher firmly in the loop**.

## Transformation objective (verbatim from the case study)
> Build a privacy-preserving personalised learning platform that adapts content to individual learner needs, reduces administrative burden on teachers, and accelerates curriculum localisation within GDPR and EU AI Act frameworks.

## In scope
- Three AI capabilities: **adaptive learning**, **curriculum localisation**, **automated assessment**
- Five markets: **NL, BE, DE, PL, RO**
- K-12 + vocational education
- Teacher-facing tooling for oversight and feedback
- Parent/guardian transparency surface

## Out of scope (this program)
- Higher education
- Behavioural advertising or commercial profiling — explicitly forbidden
- Use of facial / emotion recognition — prohibited under EU AI Act for education
- Cross-EU data transfers outside EU regions

## Constraints (non-negotiable)
| # | Constraint | Source |
|---|---|---|
| C1 | Children's data protected per **GDPR Article 8** (consent age = 16 by default) | EU law |
| C2 | AI features classified **high-risk** under **EU AI Act Annex III §3** | EU AI Act |
| C3 | All personal data processed in **EU regions only** | GDPR + customer mandate |
| C4 | **Human oversight** required on all decisions affecting learner outcomes | AI Act Art. 14 |
| C5 | Pedagogical soundness signed off by Learning Sciences team for every AI feature | Internal governance |
| C6 | Inclusivity across socio-economic, linguistic, and SEN cohorts | Brand + ethical mandate |

## Expected outcomes (from case study)
| KPI | Baseline | Target | Owner |
|---|---|---|---|
| Outcome gap between high- and low-performing schools | 40% | **−26%** | Learning Sciences + RAI Evaluator |
| Teacher administrative time | 35% of working hours | **−45%** | Assessment AI workstream |
| Content localisation time per market entry | 8–12 months | **6 weeks** | Content Localisation Lead |
| GDPR Art. 8 compliance | n/a | **100% maintained** | DPO / GDPR Specialist |
| EU AI Act conformity | n/a | **CE-marked, conformity assessment passed before go-live** | EU AI Act Compliance Officer |

## Azure services committed
Azure Machine Learning · Microsoft Fabric · Azure Content Safety · Power BI · Azure OpenAI · Microsoft Purview · Azure API Management · Azure AD B2C

## Governance bodies
- **Steering Committee** — monthly, sponsor + country managers + DPO + Compliance + Program Lead
- **Architecture Review Board** — bi-weekly, gates all material design changes
- **Responsible AI Council** — bi-weekly, owns the model release gate (chaired by RAI Evaluator)
- **Country Working Groups** — weekly per country, Local Editorial + Customer Success + Local DPO

## Success definition (Day 365)
- Live in 3 markets (NL, DE + one of BE/PL/RO) with full conformity assessment
- ≥ 60% schools onboarded in launched markets
- All five expected outcome KPIs trending to target on monthly review
- Zero reportable GDPR or AI Act incidents
