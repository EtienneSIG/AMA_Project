# Semantic Model — LearnEU Adoption & Student Level

## Overview

A **Direct Lake** semantic model deployed to the **EUlearn** Fabric workspace, built on top of the PostgreSQL-mirrored lakehouse. It powers Power BI reports for:

1. **Platform Adoption** — DAU, MAU, login trends, AI feature usage, retention
2. **Student Level & Classification** — skill mastery by demographics (age group, gender, market, grade, deprivation decile, SEN status)
3. **AI Quality** — latency, error rates, content safety, learner feedback
4. **Teacher Engagement** — override rates, question response times, human-in-the-loop compliance

## Star Schema

```
┌─────────────┐    ┌──────────────────┐    ┌───────────┐
│  Learners   │◄───│ Connection Logs   │    │  Skills   │
│ (dimension) │◄───│ Ask History       │    │(dimension)│
│             │◄───│ Item Attempts     │───►│           │
│ • market    │◄───│ Skill Mastery     │───►│ • domain  │
│ • grade     │◄───│ Learner Activity  │    │ • chapter │
│ • age_group │◄───│ Ask Feedback      │    │ • bloom   │
│ • gender    │    │ Content Safety    │    └───────────┘
│ • decile    │    │ Teacher Overrides │         │
│ • sen       │    │ Teacher Questions │    ┌────┴──────┐
└─────────────┘    └──────────────────┘    │ Curricula │
                                           │(dimension)│
                   ┌──────────────────┐    │ • country │
                   │  Item Skills     │    │ • subject │
                   │ (bridge)         │    └───────────┘
                   │  Skill Comp Map  │
                   │ (bridge)         │
                   └──────────────────┘
```

## Hierarchies

| Hierarchy | Levels |
|---|---|
| Demographics | Market → Age Group → Gender |
| Socio-Economic | Market → Decile → SEN |
| Skill Taxonomy | Domain → Chapter → Skill |

## Key Measures

### Adoption
- DAU, MAU, Unique Users
- Login Failure Rate
- AI Prompts Per Active User
- Total Tokens Used

### Student Level
- Avg Mastery Level
- Mastered Skills (>80%)
- Struggling Skills (<30%)
- Correctness Rate
- Attempts Per Learner

### Quality
- Helpful Rate, Confusing Rate
- P95 Latency
- AI Error Rate
- Content Safety Block Rate

### Teacher Oversight
- Override Rate
- AI vs Human Level Gap
- Question Answer Rate

## Deployment

```powershell
# Prerequisites: az login + access to EUlearn workspace

# 1. Apply demographic columns to Postgres (if not already done)
psql -f ../add_demographics.sql

# 2. Deploy the semantic model
pwsh deploy_semantic_model.ps1

# 3. Deploy the Power BI report (5 pages)
pwsh deploy_report.ps1
```

### Deployed Assets

| Asset | ID |
|---|---|
| Semantic Model | `80a0d835-88b8-474d-a5ba-e8d420bd782e` |
| Report | `8676c657-c973-4d62-bda3-d0268c879602` |
| Workspace | `127a12ab-fa94-421b-bee3-4f534264d3ff` |

### Report Pages

1. **Adoption Overview** — DAU/MAU/Stickiness cards, login trend, logins by app & role, market slicer
2. **Student Demographics** — Students by market/grade/decile, SEN donut, mastery by market, learner table
3. **Skill Mastery Progression** — Mastered/struggling cards, by domain/chapter, correctness by difficulty
4. **AI Quality & Safety** — Prompts, latency (avg/P95), error rate, feedback gauge, tokens by model, safety table
5. **Teacher Engagement** — Override rate, AI-human gap, questions table, comparison chart

## Privacy Notes

- Raw `email` columns are **hidden** in the model (used for relationships only)
- Free-text fields (`prompt`, `answer`, `note`, `raw`) are **excluded**
- Small-group slicing (e.g., SEN + gender in a single market) should use RLS rules
- No real PII — all learner data is synthetic/pseudonymous
