# Slide 39 · Appendix A18 · Scale to 4.1M students

- **Layout (template):** Content 2-col
- **Render:** statgrid
- **Image:** bg-hero-teal.png
- **Headline:** A18 · Scale plan to 4.1M learners
- **Sub-headline:** Capacity, resilience, and cost discipline in one operating model
- **CXO focus:** CEO · COO · CTO · CFO · CISO
- **Source refs:** scale-4-1m-etudiants.md · plan/03-target-architecture.md · plan/05-kpis-outcomes.md

## Body bullets (left — Capacity & performance)
- Peak design point: 120k to 220k concurrent sessions (exam windows)
- API SLO target: p95 < 300 ms reads; < 500 ms writes
- PostgreSQL tuning: logical partitioning + read replicas + async buffering
- Redis target: >80% hit ratio on hot learner and content paths

## Body bullets (right — Reliability, compliance, cost)
- Availability target: 99.95% baseline, 99.99% for critical journeys
- EU-only data residency with multi-region DR drills each quarter
- FinOps north star: cost per active learner per month, tracked bi-weekly
- Capacity reserve policy: +30% normal headroom, +100% exam headroom

## Visual
Two-column operating blueprint with KPI badges: concurrency, latency, uptime, cost/learner.

## Speaker notes
Cette annexe montre la trajectoire d'industrialisation pour 4,1 millions d'etudiants sans compromis sur la conformite ni sur l'experience. Le point cle: on dimensionne sur les pointes d'examens, pas sur la moyenne. Les garde-fous sont explicites: SLO techniques, reserve de capacite, discipline FinOps, et tests DR trimestriels. Ce cadre transforme un objectif de croissance en contrat operationnel pilotable par le board.