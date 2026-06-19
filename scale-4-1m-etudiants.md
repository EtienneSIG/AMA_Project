# Plan de Scalabilité vers 4,1 millions d'etudiants

## 1. Hypotheses de base
- Population cible: 4 100 000 etudiants actifs inscrits.
- Charge journaliere active (DAU): 20% a 35% de la base.
- Concurrence de pointe: 3% a 8% de la base totale selon plage horaire.
- Pic evenementiel (examens, rentree): x2 a x4 sur certaines API.
- Objectif de disponibilite: 99,95% minimum (cible 99,99% sur services critiques).
- Temps de reponse cible p95:
  - Lecture: < 300 ms
  - Ecriture: < 500 ms
  - Actions IA sensibles: < 2 s

## 2. Objectifs de platforme
- Tenir la charge sans degradation majeure pour 4,1 M utilisateurs.
- Rester conforme EU (residence des donnees, gouvernance, auditabilite).
- Maitriser le cout unitaire par etudiant et par session.
- Permettre des campagnes massives (rentrees, evaluations) sans incident majeur.

## 3. Architecture cible (vue macro)
- Front-door global:
  - Azure Front Door Premium + WAF + CDN.
  - Routage geo vers regions UE actives.
- Compute applicatif:
  - AKS multi-zones (ou App Service Plan premium elastique selon maturite), autoscaling horizontal.
  - Microservices par domaine (auth, progression, contenu, recommandations, reporting).
- Couche donnees operationnelles:
  - PostgreSQL Flexible Server HA (zone-redondant), partition logique par domaine/tenant si necessaire.
  - Cache Redis (Azure Cache for Redis) pour sessions, lectures frequentes, anti-spike.
- Couche asynchrone:
  - Service Bus / Event Hubs pour decouplage des pics.
  - Workers de fond pour traitements non critiques en synchrone.
- Analytics & BI:
  - Mirroring vers Fabric/OneLake pour separation OLTP/analytique.
  - Semantic models et tableaux de bord en lecture analytique dediee.
- Observabilite:
  - Azure Monitor + Log Analytics + OpenTelemetry + alerting SLO.

## 4. Strategie de passage a l'echelle
### Phase A: 0,5M a 1M
- Consolidation des API critiques.
- Mise en cache agressive des lectures chaudes.
- Jobs asynchrones pour tout traitement non temps reel.
- Baseline SLO et tests de charge hebdomadaires.

### Phase B: 1M a 2,5M
- Sharding logique des domaines les plus volumineux (ex: activity, attempts, events).
- Read replicas PostgreSQL + routage lecture/ecriture.
- Partitionnement tablel + index review trimestriel.
- File de messages obligatoire pour pointes.

### Phase C: 2,5M a 4,1M
- Multi-region active-passive ou active-active selon criticite.
- Repartition par pays/academie sur certains workloads.
- Budget de capacite reserve (compute et DB) pour periodes examens.
- Plan de bascule regionale teste tous les trimestres.

## 5. Capacite cible (ordre de grandeur)
## API / Compute
- Concurrence de pointe cible de dimensionnement initial: 120 000 a 220 000 sessions simultanees.
- Politique HPA/KEDA:
  - CPU 55% cible
  - Latence p95 comme signal secondaire
  - Queue length pour consumers
- Marges:
  - 30% de reserve en regime normal
  - 100% de reserve en fenetres sensibles (examens)

## Base PostgreSQL
- Regles de design:
  - Eviter les transactions longues.
  - Index uniquement utiles (surveillez bloat et cardinalite).
  - Partitionner tables de logs/attempts/events par temps + tenant.
- Objectif pratique:
  - p95 requetes critiques < 120 ms cote SQL.
  - Ecriture stable meme sous burst (via buffering asynchrone si besoin).

## Cache
- Hit ratio cible > 80% sur endpoints lectures frequentes.
- TTL differencies par type de contenu.
- Invalidation event-driven (publish/subscribe) sur changements pedagogiques.

## 6. Donnees et modeles
- Separation stricte:
  - OLTP pour transactionnel.
  - Fabric pour BI/analytique, jamais pour transactions utilisateur.
- CDC/mirroring:
  - Suivi de latence de replication.
  - Alertes sur tables critiques non synchronisees.
- Gouvernance:
  - Dictionnaire de donnees.
  - Classification PII/educative.
  - Retention et purge automatisables.

## 7. Fiabilite (SRE)
- SLO/SLI par domaine:
  - Disponibilite API.
  - Latence p95/p99.
  - Taux d'erreur fonctionnelle.
- Error budget:
  - Decider livraisons selon budget restant.
- Resilience:
  - Circuit breakers, retries avec jitter, timeouts stricts.
  - Bulkheads pour isoler les degradations.
- Runbooks:
  - Incident DB saturation.
  - Incident queue backlog.
  - Incident identite/auth.

## 8. Securite et conformite UE
- Donnees personnelles: stockage et traitement en regions UE uniquement.
- Chiffrement au repos et en transit.
- RBAC strict, secret management via Key Vault.
- Journalisation d'audit immuable sur operations sensibles.
- Revues trimestrielles des acces et des permissions connexions.

## 9. Cout et FinOps
- KPI de cout:
  - Cout par etudiant actif mensuel.
  - Cout par 1 000 sessions.
  - Cout IA par interaction.
- Leviers:
  - Autoscaling reel (pas seulement CPU).
  - Reserved capacity sur socle stable.
  - Offloading asynchrone pour lisser les pointes.
- Gouvernance budget:
  - Seuils d'alerte a 70/85/100% du budget.
  - Revue cout/perf toutes les 2 semaines.

## 10. Tests de charge et validation
- Scenarios obligatoires:
  - Charge nominale (jour classique).
  - Pic de rentree (+200%).
  - Pic examen (+300 a +400%).
  - Degradation d'une dependance critique.
- Gate de production:
  - p95 sous objectifs.
  - Aucune erreur critique non traitee.
  - Plan de rollback teste.

## 11. Roadmap 6-12 mois
- M1-M2:
  - Instrumentation complete, SLO en place, premiers tests de charge.
- M3-M4:
  - Partitionnement donnees volumineuses, cache policy unifiee.
- M5-M6:
  - Mirroring/Fabric stabilise, supervision replication table par table.
- M7-M9:
  - Exercices DR multi-region, optimisation cout/perf.
- M10-M12:
  - Certification operationnelle de la capacite 4,1M.

## 12. Checklist de pre-go-live 4,1M
- [ ] Tests de charge validant le pic cible.
- [ ] SLO respects sur 30 jours glissants en pre-prod.
- [ ] Mirroring et dashboards BI stables.
- [ ] Runbooks incidents valides en simulation.
- [ ] Revue securite et conformite signee.
- [ ] Budget et garde-fous FinOps valides.

## 13. Recommandation pratique immediate
- Priorite 1: stabiliser la chaine mirroring -> semantic model Director.
- Priorite 2: automatiser un test de sante quotidien sur tables critiques (director_profile, reporting_scope, hierarchy_exception, learner_hierarchy_assignment).
- Priorite 3: lancer un plan de charge progressif (x1,5 puis x2) avec criteres d'arret explicites.
