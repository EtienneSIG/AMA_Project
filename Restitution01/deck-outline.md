# LearnEU — CXO Restitution Deck Outline

> 20 main slides + 1 demo + 17 appendix slides. Template:
> `Subject/Azure Master Architect_Prezo_Template_v01.pptx`. Audience: full
> C-suite.

## Design principles

1. **Outcomes first.** Every main slide opens with the business outcome and
   names the CXO(s) it speaks to.
2. **No architecture in the main deck.** Diagrams live in the appendix and are
   pulled up only when a CIO/CTO/CDO/CISO question demands it.
3. **One quantified claim per slide minimum** (€, %, days, learners, schools).
4. **No more than 5 bullets per body card.** CXO attention is finite.
5. **Every claim is sourced** to a `plan/`, `demo/` or `Subject/` document so
   the team can defend it.

## Main deck (20 slides — excludes the demo)

| # | Slug | CXO focus | Section |
|---|---|---|---|
| 01 | title | All | Opening |
| 02 | exec-summary | CEO · CFO · CRO | Opening |
| 03 | problem-business-case | CEO · COO · CMO | Why |
| 04 | strategic-thesis | CEO · CSO · CAIO | Why |
| 05 | outcome-contract | CEO · CFO · COO | Outcomes |
| 06 | value-at-stake | CFO · CEO | Outcomes |
| 07 | what-changes-for-whom | CXO · CMO · CHRO | Outcomes |
| 08 | solution-on-a-page | CIO · CTO · CEO | Solution |
| 09 | trust-compliance-posture | CRO · CCO · CLO · CISO | Trust |
| 10 | responsible-ai-by-design | CAIO · CRO · CLO | Trust |
| 11 | data-strategy-governance | CDO · CISO · CCO | Trust |
| 12 | security-eu-residency | CISO · CRO · CLO | Trust |
| 13 | teacher-experience-change | CHRO · COO · CXO | Adoption |
| 14 | market-localisation | CMO · CEO · COO | Adoption |
| 15 | operating-model-raci | COO · CEO · CHRO | Delivery |
| 16 | roadmap-phase-gates | CEO · COO · CRO | Delivery |
| 17 | investment-finops | CFO · CIO · CSO | Delivery |
| 18 | risks-mitigations | CRO · CCO · CISO | Delivery |
| 19 | scorecard-board-dashboard | CEO · CFO · all | Wrap |
| 20 | ask-of-the-board | CEO · CFO | Wrap |

## Demo (not counted)

| # | Slug | CXO focus | Section |
|---|---|---|---|
| D | demo-storyboard | CXO · CMO · CEO · COO | Demo |

## Appendices (deep-dive, on-demand Q&A)

| # | Slug | Likely caller |
|---|---|---|
| A01 | appendix-architecture-detailed | CIO · CTO · CDO |
| A02 | appendix-azure-services-map | CIO · CTO |
| A03 | appendix-data-flows | CDO · CISO · CTO |
| A04 | appendix-gdpr-article-8 | CLO · CCO · CRO · DPO |
| A05 | appendix-eu-ai-act-obligations | CLO · CCO · CAIO |
| A06 | appendix-privacy-preserving-ml | CAIO · CDO · CISO |
| A07 | appendix-model-selection-evaluation | CAIO · CTO |
| A08 | appendix-agentic-multiagent | CAIO · CTO |
| A09 | appendix-observability-logging | CTO · CISO · CCO |
| A10 | appendix-performance-reliability | CTO · COO |
| A11 | appendix-cost-model-tco | CFO · CIO · CSO |
| A12 | appendix-risk-register-full | CRO · CCO · CISO |
| A13 | appendix-kpi-leading-indicators | CEO · COO · CFO |
| A14 | appendix-governance-rai-council | CEO · CRO · CAIO |
| A15 | appendix-incident-response | CISO · CRO · CLO |
| A16 | appendix-sustainability-esg | CSO · CFO |
| A17 | appendix-glossary-references | All |

## CXO-coverage matrix

| CXO | Main slides | Appendices |
|---|---|---|
| CEO | 02, 03, 04, 05, 06, 08, 14, 16, 19, 20 | A13, A14 |
| CFO | 02, 05, 06, 17, 19, 20 | A11, A13, A16 |
| COO | 03, 05, 07, 13, 15, 16, 18 | A10, A13 |
| CIO | 08, 17 | A01, A02, A09, A11 |
| CTO | 08, 12, 18 | A01, A02, A03, A07, A08, A09, A10 |
| CMO | 03, 07, 14 | — |
| CHRO | 07, 13, 15 | — |
| CDO | 11 | A01, A03, A06 |
| CISO | 09, 11, 12, 18 | A03, A06, A09, A15 |
| CRO | 02, 09, 10, 16, 18, 19 | A04, A05, A12, A14, A15 |
| CCO | 09, 10, 11, 18 | A04, A05, A09, A12 |
| CLO | 09, 10, 12 | A04, A05, A15 |
| CSO | 04, 17 | A11, A16 |
| CAIO | 04, 10 | A05, A06, A07, A08, A14 |
| CXO  | 07, 13 | — |

## Sources

- `Subject/case-study-33-edtech-personalised-learning.md`
- `Subject/AMA_Rubric_Evaluation.md`
- `plan/00-program-charter.md` · `plan/01-phases-roadmap.md` · `plan/02-workstreams.md`
- `plan/03-target-architecture.md` · `plan/04-compliance-eu-ai-act-gdpr.md`
- `plan/05-kpis-outcomes.md` · `plan/06-risks-register.md` · `plan/07-governance-rai.md`
- `demo/ARCHITECTURE.md` · `demo/DEPLOYMENT-REPORT.md` · `demo/DEMO-STORYTELLING.md`
- `restitution/deck-outline.md` (technical sibling deck — same project, different audience)
