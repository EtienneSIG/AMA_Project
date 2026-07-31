# Slide 31 · Appendix A10 · Performance & reliability

- **Layout (template):** Content 2-col
- **Headline:** A10 · SLOs designed for school-day peaks
- **Sub-headline:** Latency, availability, scale — all measured on the wire
- **CXO focus:** CTO · COO
- **Source refs:** plan/03-target-architecture.md · demo/ARCHITECTURE.md

## Body bullets (left — SLOs)
- API availability: 99.9% (excl. planned maintenance windows out of school hours)
- Adaptive picker p95 latency: ≤ 200 ms (on-device); ≤ 800 ms (fallback)
- Assessment grading p95: ≤ 3 s
- Localisation batch: 6-week SLA per market

## Body bullets (right — Resilience)
- Multi-region within EU (West Europe ↔ North Europe; DE primary in Germany)
- DR drill quarterly; RPO ≤ 15 min, RTO ≤ 2 h
- APIM rate-limit per school to prevent noisy-neighbour
- Kill-switch wired per AI feature (sub-5-minute disable)

## Visual
Heat-map of SLOs vs school-day peaks; DR diagram with RPO/RTO badges.

## Speaker notes
Pour le CTO et le COO : les SLO sont alignés sur la fenêtre d'usage scolaire. On vise 99,9 % de disponibilité avec maintenance hors heures de classe, p95 d'inférence sous 200 ms en local, sous 800 ms en fallback cloud. Multi-région EU pour la DR ; drill trimestriel pour s'assurer que RPO 15 minutes et RTO 2 heures tiennent vraiment. Kill-switch par feature en moins de 5 minutes — c'est l'exigence article 14 (oversight).
