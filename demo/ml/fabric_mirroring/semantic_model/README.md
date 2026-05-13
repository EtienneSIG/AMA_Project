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
```

## Privacy Notes

- Raw `email` columns are **hidden** in the model (used for relationships only)
- Free-text fields (`prompt`, `answer`, `note`, `raw`) are **excluded**
- Small-group slicing (e.g., SEN + gender in a single market) should use RLS rules
- No real PII — all learner data is synthetic/pseudonymous
