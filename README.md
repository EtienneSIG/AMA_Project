# AMA_Project — LearnEU (Case Study 33)

> Project workspace for the **AI-Driven Personalised Learning Platform for a European EdTech Group** (Case Study 33).
>
> Goal: deliver the case study's **Transformation Objective** while respecting **GDPR Article 8** + **EU AI Act (high-risk)** and meeting all **Expected Outcomes**.

Source brief: [../Subject/case-study-33-edtech-personalised-learning.md](../Subject/case-study-33-edtech-personalised-learning.md)

---

## What's in this folder

```
AMA_Project/
├── README.md                ← you are here
├── agents/                  ← 7 specialist Copilot chat modes for this case
│   ├── edtech-program-orchestrator.chatmode.md
│   ├── eu-ai-act-compliance-officer.chatmode.md
│   ├── gdpr-children-data-specialist.chatmode.md
│   ├── privacy-preserving-ml-engineer.chatmode.md
│   ├── learning-sciences-expert.chatmode.md
│   ├── content-localisation-lead.chatmode.md
│   └── responsible-ai-evaluator.chatmode.md
└── plan/                    ← end-to-end transformation plan
    ├── 00-program-charter.md
    ├── 01-phases-roadmap.md
    ├── 02-workstreams.md
    ├── 03-target-architecture.md
    ├── 04-compliance-eu-ai-act-gdpr.md
    ├── 05-kpis-outcomes.md
    ├── 06-risks-register.md
    ├── 07-governance-rai.md
    ├── 08-demo-on-azure.md   ← deployable demo on the Case Study 33 stack
    └── 09-step-by-step-tutorial.md  ← Day-0 → Day-10 hands-on build guide
```

---

## Specialist agents

Each agent is a Copilot chat mode tuned for one role. To use them, copy/symlink the files into `.github/chatmodes/` (or use them directly from this folder if your VS Code is configured to auto-discover here).

| # | Agent | Purpose | Use when |
|---|---|---|---|
| 1 | **EdTech Program Orchestrator** | Coordinates all specialists; produces synthesised, executive-ready outputs | Any cross-cutting question or weekly status |
| 2 | **EU AI Act Compliance Officer** | High-risk AI system obligations (Art. 9–15, 43, 72) | Designing/changing any AI feature; preparing CA dossier |
| 3 | **GDPR Children's Data Specialist** | Article 8, DPIA, lawful basis, parental consent | Any new processing of <16 data |
| 4 | **Privacy-Preserving ML Engineer** | Federated, DP, on-device, Confidential Compute | Designing the learner & assessment models |
| 5 | **Learning Sciences Expert** | Pedagogical validity, ZPD, formative assessment, UDL | Reviewing any AI feature touching learners |
| 6 | **Multilingual Content Localisation Lead** | 12mo→6w localisation across NL/BE/DE/PL/RO | Content pipeline design, glossary work |
| 7 | **Responsible AI Evaluator** | Owns the model release gate; fairness/safety/transparency | Every release; quarterly re-evaluation |

> 💡 The general-purpose chat modes from `AMA/.github/chatmodes/` (Solution Architect, AMA Reviewer, Security & Compliance, FinOps, CxO Challenger, Orchestrator) remain useful for non-EdTech-specific questions.

---

## How to run the program

### Day 1 — Discovery
1. Read [plan/00-program-charter.md](plan/00-program-charter.md) and confirm sponsor + scope
2. Run **`gdpr-children-data-specialist`** on each market → DPIA scope
3. Run **`eu-ai-act-compliance-officer`** on each AI feature → Annex IV file skeleton
4. Run **Azure Data & AI Solution Architect** (from `AMA/`) on [plan/03-target-architecture.md](plan/03-target-architecture.md) → diagrams (Mermaid + draw.io + Excalidraw)

### Each new feature
1. **Program Orchestrator** restates the goal & sequences specialists
2. **Learning Sciences** validates the pedagogical mechanism
3. **Privacy-Preserving ML** designs the data path
4. **GDPR** + **AI Act** validate compliance posture
5. **Localisation** plans market roll-out
6. **Responsible AI Evaluator** signs off the release gate

### Each phase gate
1. Update [plan/04-compliance-eu-ai-act-gdpr.md](plan/04-compliance-eu-ai-act-gdpr.md), [plan/05-kpis-outcomes.md](plan/05-kpis-outcomes.md), [plan/06-risks-register.md](plan/06-risks-register.md)
2. Steering Committee review
3. Decide go / no-go for next phase

---

## Outcome contract (verbatim from the case study)

| Outcome | Target |
|---|---|
| Outcome gap (high vs low schools) | **−26%** |
| Teacher administrative time | **−45%** |
| Localisation cycle | **12 months → 6 weeks** |
| GDPR Article 8 compliance | **100% maintained** |

> Every release decision is measured against this contract.

---

## Conventions
- All personal data processed in **EU regions only**
- Age default for digital consent: **16** (strictest of the 5 markets)
- All AI features for grading/content access treated as **high-risk** by default
- Teacher-in-the-loop is **non-negotiable** — no autonomous decisions affecting learners
- Pedagogical sign-off **before** technical sign-off

---

## Status
- ✅ Specialist agents drafted
- ✅ Plan documents drafted (charter → governance)
- ✅ Demo blueprint on Azure ([plan/08-demo-on-azure.md](plan/08-demo-on-azure.md)) using the Case Study 33 services (B2C, APIM, Fabric, AML, Azure OpenAI, AI Search, Content Safety, Purview, Power BI)
- ✅ Step-by-step build tutorial ([plan/09-step-by-step-tutorial.md](plan/09-step-by-step-tutorial.md)) — from empty subscription to running demo in 10 days
- ⏳ Phase 0 kickoff pending sponsor approval
- ⏳ DPIAs per market — owner: DPO
- ⏳ AI Act Annex IV file skeleton — owner: AI Act CO
- ⏳ Demo `infra/` Bicep + apps — owner: Platform team

> The plan is intentionally **opinionated** but **revisable**. Update the plan documents after each phase gate.
