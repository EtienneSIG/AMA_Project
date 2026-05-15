# Slide 15 · Operations · Performance & Reliability

- **Layout (template):** Content 2-col
- **Headline:** Built to scale, designed to degrade gracefully
- **Sub-headline:** Autoscale · cache · rate-limit · lazy DB
- **Rubric coverage:** #11
- **Source refs:** demo/infra/modules/app-service.bicep · demo/apps/_shared/db/index.js · demo/apps/_shared/server.js

## Body bullets (left — scale & speed)
- App Service Plan B2 today, autoscale rule 1→3 instances
- Scale-out trigger: 70 % CPU or 80 % memory (5-min window)
- Scale-in trigger: 30 % CPU (10-min window)
- Static asset cache 1 h `immutable`; HTML `no-cache`
- Health probe `/api/health` reports DB + AOAI status

## Body bullets (right — reliability)
- Lazy Postgres init + small pool + 8 s timeout
- Graceful degradation: app keeps running with `db.enabled=false`
- Non-fatal DDL: schema migration continues on partial failure
- Rate-limit + `Retry-After` headers on auth + API
- 90 s container warmup acknowledged in probes (Tip from rebuild)

## Visual
Two side-by-side area charts: left = predicted RPS vs autoscale steps; right = recovery curve when Postgres is auto-stopped.

## Speaker notes
La fiabilité ici n'est pas une vue d'esprit, elle est documentée dans des incidents qu'on a vraiment payés. Le plan a été passé en B2 ce matin pour absorber une saturation CPU sur l'admin, et la règle d'autoscale 1→3 instances avec triggers 70 % CPU / 80 % mémoire est en place. Côté résilience applicative : initialisation paresseuse de Postgres avec un pool de 4 connexions et timeout 8 s ; si Postgres est arrêté — le serveur Flexible auto-stoppe après 7 jours pour le coût — l'app reste répondante avec `db.enabled=false` et le passe au front en bandeau d'état. Le rate-limiter renvoie un `Retry-After` propre. Et on a appris à toujours sonder `/api/health` avec un timeout >60 s pendant les 90 s de warmup post-restart, voir [demo/DEPLOYMENT-REPORT.md](../demo/DEPLOYMENT-REPORT.md) §6.
