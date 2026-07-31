# CXO Question Bank — anticipated questions per role

> Every question below maps to a slide (main deck) or appendix (Axx) that
> already has the answer. The **Answer** column gives the ready-to-speak
> response. Use this as the speaker cheat-sheet during Q&A.

---

## CEO — Chief Executive Officer

### Q1 : What's the headline outcome and the deadline?
**Slides :** 02, 05, 16
**Réponse :** Nous signons sur quatre outcomes contractuels : −26 pp d'écart de résultats, −45 % de temps admin enseignant, localisation en 6 semaines au lieu de 12 mois, et 100 % de conformité GDPR Art. 8 + AI Act CE-marking. Le programme court sur 12 mois : pilote NL live à M5, 2e marché (DE) à M8 avec CE-marking, 3e marché à M10. Le board voit la trajectoire chaque mois, pas seulement en fin de programme.

### Q2 : Why now? What's the competitive window?
**Slides :** 04, 14
**Réponse :** À partir de 2027, les ministères européens n'achèteront que de l'IA éducative résidente UE et conforme AI Act. Aujourd'hui, aucun acteur ne coche les deux cases. Notre fenêtre d'avantage est de 18 à 24 mois. En industrialisant la localisation curriculaire (de 12 mois à 6 semaines par marché), on entre sur les marchés avant que la barrière réglementaire ne devienne un commodity. La conformité n'est pas un coût : c'est notre moat commercial.

### Q3 : What do you need from me today?
**Slides :** 21
**Réponse :** Trois décisions. Un — mandater les DPIA dans les cinq pays (NL, BE, DE, PL, RO), ce qui débloque la Phase 0. Deux — libérer 3,5 M€ pour Phase 0 (landing zone Azure, DPIAs, skeleton Annex IV). Trois — nommer le président du Conseil Responsible AI au prochain comité de pilotage. En bonus : endosser le contrat d'outcomes comme KPIs board et confirmer le séquencement NL → DE.

### Q4 : How do I see this going off the rails?
**Slides :** 19, 20, A12
**Réponse :** Six risques sont au-dessus du seuil board. Le plus critique est R1 : une DPA nationale bloque le DPIA — asymétrique car un seul « non » coûte un marché entier. On le mitige en engageant les DPA dès M0, pas en leur présentant un fait accompli. Les autres (R3 federated learning, R4 qualité localisation, R6 bias, R8 coût OpenAI) ont chacun un plan B documenté avec contingence financière (€2 M de réserve sur R8). Le dashboard mensuel Power BI montre les 6 risques en RAG heat-map — si une tuile passe au rouge, le board le voit avant moi.

---

## CFO — Chief Financial Officer

### Q1 : Total cost and payback period?
**Slides :** 06, 18
**Réponse :** Investissement de €18–22 M sur 12 mois de build (45 % plateforme, 30 % AI, 25 % compliance/UX). Run en régime de croisière : €6 M/an (55 % Azure, 35 % people, 10 % sub-processeurs). Valeur annuelle au régime de croisière : €55 M (€28 M productivité enseignante, €18 M ARR marché, €9 M rétention). Payback ≤ 24 mois avec 3 marchés live.

### Q2 : Cost per learner per month?
**Slides :** 18, A11
**Réponse :** Le coût par apprenant par mois est lui-même un KPI board, suivi mensuellement dans le dashboard Power BI. On l'optimise via des PTU (Provisioned Throughput Units) pour la charge prévisible, du cache sur les contenus répétés de localisation, et des modèles fine-tunés plus petits pour la correction de routine. Le proxy carbone associé est en annexe A16.

### Q3 : What's the biggest cost risk and how is it hedged?
**Slides :** 18, 19, A11, A12
**Réponse :** Le risque n°1 côté coût est R8 : la facture Azure OpenAI sur la localisation à grande échelle. Mitigation : PTU sur la charge prévisible au lieu de PAYG, cache des localisations répétées, et modèles fine-tunés plus petits pour le routine. On garde €2 M de contingence dédiée à ce risque. En cas de dépassement, on throttle la génération et on bascule 100 % PTU.

### Q4 : When do we see the first euro of value?
**Slides :** 06, 16
**Réponse :** La première valeur tangible arrive au pilote NL (M5) : les 20 écoles pilotes mesurent déjà la réduction de temps admin enseignant (cible intermédiaire −20 pp au gate P2). La valeur marché (ARR) commence avec le lancement DE à M8. Le payback complet sur 3 marchés est atteint à ≤ 24 mois.

---

## COO — Chief Operating Officer

### Q1 : How do schools onboard at scale?
**Slides :** 13, 14
**Réponse :** Onboarding en 3 étapes : 90 minutes de formation enseignant (obligatoire), playbook d'onboarding standardisé par marché, et un CSM dédié par pays. Les 20 écoles pilotes NL sont en co-design dès Phase 0 — pas en validation finale. Pour le scale-out : le pipeline de localisation (6 semaines par marché) inclut la localisation des contenus de formation eux-mêmes. Objectif : ≥ 60 % des écoles onboardées dans les marchés lancés à J+365.

### Q2 : What are the production SLOs?
**Slides :** A10
**Réponse :** Les SLO sont définis en annexe A10 : disponibilité, latence P95, et résilience avec multi-region failover drill exécuté en Phase 4. Le DR repose sur West Europe + North Europe (NL/BE/RO), Germany West Central + West Europe (DE), Poland Central + West Europe (PL). Un drill de basculement est réalisé avant le gate P4.

### Q3 : Operating model and accountability chain?
**Slides :** 15, A14
**Réponse :** Quatre instances de gouvernance : comité de pilotage mensuel (CEO/CFO/COO/CRO), Conseil RAI bi-mensuel (release gates), ARB bi-mensuel (architecture), Teacher Council par release (pédagogie). Neuf agents spécialistes avec accountability nommée. Le QA cross-agent est l'auditeur interne. Le signe-off pédagogique précède le signe-off technique — par charte.

### Q4 : What happens at month 8 if NL pilot underperforms?
**Slides :** 16, 19
**Réponse :** Chaque gate est un hard stop. Si le pilote NL n'atteint pas les seuils intermédiaires (≥ −10 pp outcome gap, ≥ −20 pp admin time, disparité fairness ≤ 5 pp), le programme ne passe pas à P3. On n'ajoute aucun marché tant que le précédent n'est pas en trajectoire KPI. C'est l'inverse d'un plan ambitieux : c'est un plan défendable.

---

## CIO — Chief Information Officer

### Q1 : What Azure services and how are they wired?
**Slides :** 08, A01, A02
**Réponse :** 8 services Azure : Azure Machine Learning (modèle adaptatif, federated DP), Microsoft Fabric / OneLake (lakehouse Bronze/Silver/Gold), Azure OpenAI / AI Foundry (localisation, feedback), Azure AI Search (RAG sur curriculum), Azure Content Safety (gate sur tout output génératif), Azure API Management (entrée unique + OAuth), Azure AD B2C (identité parents/apprenants), Power BI (dashboards enseignants/écoles). Tout déployé en régions EU uniquement. Le détail du wiring est en annexe A01 et A02.

### Q2 : Integration with existing SIS estate?
**Slides :** A01, A03
**Réponse :** Les School Information Systems alimentent la plateforme via APIM avec OAuth 2.0 + validation JWT AAD B2C. Flux pseudonymisé à l'ingestion — aucun nom d'élève brut dans le pipeline ML. Pour les SIS ne supportant pas le push fédéré, Azure Data Factory assure les extractions batch. Le tout transite par Private Endpoints, pas d'exposition publique.

### Q3 : Operating cost trajectory?
**Slides :** 18, A11
**Réponse :** Phase de build (M0–M12) : €18–22 M. Régime de croisière : €6 M/an, dont 55 % Azure, 35 % people, 10 % sub-processeurs. L'optimisation FinOps repose sur des PTU pour la charge prévisible (localisation, assessment), du cache pour les contenus répétés, et des modèles fine-tunés plus petits pour le routine. Le coût par apprenant par mois est un KPI board.

### Q4 : Disaster recovery posture?
**Slides :** 12, A10
**Réponse :** Chaque pays a une région primaire et une région DR : NL/BE/RO (West Europe + North Europe), DE (Germany West Central + West Europe), PL (Poland Central + West Europe). Multi-region failover drill exécuté en Phase 4 avant le gate final. Logs immuables (WORM) sur Azure Blob Storage pour la continuité d'audit même en cas de bascule.

---

## CTO — Chief Technology Officer

### Q1 : Model selection rationale?
**Slides :** A07
**Réponse :** Trois modèles pour trois capacités. Le modèle adaptatif utilise ONNX Runtime on-device (navigateur/mobile) pour l'inférence, avec un entraînement fédéré + differential privacy — le choix est dicté par la contrainte de ne pas stocker de données identifiables d'enfants. L'assessment AI utilise Azure ML avec des online endpoints sans rétention de payload. La localisation utilise Azure OpenAI avec ancrage RAG sur AI Search. Le détail de l'évaluation des alternatives (Databricks, centralised training) est en annexe A07.

### Q2 : Multi-agent architecture rationale?
**Slides :** A08
**Réponse :** L'architecture agentic repose sur 9 agents spécialisés, chacun avec une accountability nommée et un périmètre de livrables. L'orchestrateur programme coordonne le flux spec-driven (Spec Kit). Chaque agent a accès aux outils pertinents et ne peut agir que dans son périmètre. Le QA cross-agent audite les livrables des autres avant chaque gate. Détail en annexe A08.

### Q3 : Observability stack?
**Slides :** A09
**Réponse :** Azure Monitor + Application Insights pour la télémétrie applicative. Logs immuables sur Azure Blob Storage (WORM) pour la preuve AI Act Art. 12. KQL workbooks pour le requêtage des logs de décision IA (inputs, outputs, version modèle, overrides). Microsoft Defender for Cloud + Defender for Endpoint pour la posture sécurité et la détection de menaces. Le tout alimente le dashboard RAI bi-mensuel.

### Q4 : Performance and resilience targets?
**Slides :** A10
**Réponse :** SLO définis par persona : latence P95 pour l'inférence on-device (ONNX, quasi-instantanée), latence P95 pour l'assessment AI via online endpoint, disponibilité cible pour les Teacher Console et Parent Portal derrière Front Door + WAF. Multi-region DR drill en Phase 4. Détail en annexe A10.

### Q5 : How do you handle data flows end-to-end?
**Slides :** A03
**Réponse :** Quatre flux principaux. (1) Personnalisation : interaction learner → inférence ONNX on-device → next content. Fédéré : gradients DP envoyés → agrégation sécurisée → modèle republié. (2) Assessment : soumission → APIM → endpoint ML (sans rétention) → rubrique + confiance → teacher console pour review/override. (3) Localisation : contenu auteur → AI Search (curriculum) → Azure OpenAI (draft) → Content Safety → reviewer humain → publication OneLake. (4) Dashboard enseignant : données agrégées (pas de PII individuelle) → Power BI → vue enseignant avec drill-down limité au scope légitime.

---

## CMO — Chief Marketing Officer

### Q1 : What's the brand promise and proof point?
**Slides :** 04, 07
**Réponse :** La promesse : « Personnalisé. Privé. Européen. » Le proof point : trois personas chiffrées — Lucas reçoit du contenu à son niveau, Mr Klein récupère 45 % de son temps, Sophie a un portail dans sa langue avec les contrôles GDPR en hero. La thèse stratégique : la conformité est notre fossé commercial, pas un coût.

### Q2 : Market entry sequence and timing?
**Slides :** 14, 16
**Réponse :** NL d'abord (pilote 20 écoles à M5), DE ensuite (50+ écoles à M8, CE-marked), puis 2 marchés parmi BE/PL/RO à M10, choisis sur la traction ministérielle — pas par engagement anticipé. Le pipeline de localisation industrialisé (glossaires P0 → Azure OpenAI + AI Search → reviewer humain) ramène chaque entrée marché à 6 semaines au lieu de 12 mois. Cible : 80 % d'acceptation au premier passage.

### Q3 : Parent and teacher trust narrative?
**Slides :** 07, 13
**Réponse :** Pour les enseignants : ils sont l'équipe produit, pas la cohorte test. Co-design dès Phase 0, droit de veto pédagogique, chaque suggestion IA explicable et révocable, crédits CPD. Pour les parents : portail dans leur langue, contrôles GDPR Art. 8 en hero, transparence sur le fait que l'enseignant humain décide — par contrat. Le taux de confiance est mesuré trimestriellement par NPS enseignant et usage actif du portail parent.

---

## CHRO — Chief Human Resources Officer

### Q1 : What changes for teachers day-to-day?
**Slides :** 07, 13
**Réponse :** Mr Klein (persona enseignant) récupère 45 % de son temps administratif : l'assessment AI note les devoirs structurés, le modèle adaptatif propose les parcours. Mais chaque suggestion est explicable et révocable en un clic. L'enseignant ne perd aucune prérogative — il en gagne : un dashboard de progression par élève, des alertes de disparité, et un temps libéré pour la pédagogie individuelle.

### Q2 : Change management plan and training?
**Slides :** 13, 15
**Réponse :** 90 minutes d'onboarding par enseignant (obligatoire). Un CSM par marché pour l'accompagnement continu. Les 20 écoles pilotes NL participent en co-design dès Phase 0. Le Teacher Council (12–20 enseignants, rotation) a un droit de veto sur les flux UX qui échouent au test d'acceptation enseignant. Crédits CPD (développement professionnel continu) pour la participation aux pilotes.

### Q3 : Risk of teacher attrition or backlash?
**Slides :** 13, 19
**Réponse :** C'est le risque R5 du registre : le taux d'override explose (signe de faible confiance). Mitigation : co-design avec les enseignants dès P0–P1, explicabilité dans la console, programme CPD. Le taux d'override est un KPI suivi en continu (cible ≤ 10 % en régime stable). Trop haut = on a perdu la confiance ; trop bas = ils ne regardent plus. Contingence : pause du feature, retrain, redesign UX.

---

## CDO — Chief Data Officer

### Q1 : Data architecture and lineage model?
**Slides :** 11, A01, A03
**Réponse :** Microsoft Fabric / OneLake comme lac logique unique : Bronze (événements pseudonymisés bruts, rétention courte), Silver (modélisé, dédupliqué, conformé), Gold (marts analytiques, zéro donnée au niveau apprenant). Microsoft Purview porte le catalogue, les sensitivity labels (dont « Child Personal Data — Restricted »), et la lignée de données qui rend l'effacement vérifiable. Azure ML Feature Store pour les features ML, sans PII, avec lignée row-level dans Purview.

### Q2 : How is PII handled across the lakehouse?
**Slides :** 11, A03, A06
**Réponse :** La donnée mineur entre pseudonymisée à l'ingestion — aucun nom brut dans le pipeline ML. Les clés de pseudonymisation sont dans Azure Key Vault Managed HSM, customer-managed. La couche Gold ne contient jamais de donnée ré-identifiable. Azure Policy bloque par construction toute ressource déployée sans CMK ou hors région EU. L'effacement est automatisé avec un SLA de 30 jours, cascade sur OneLake / Feature Store / Logs (les logs conservent des références hashées pour la conformité AI Act Art. 12).

### Q3 : Privacy-preserving ML stack?
**Slides :** A06
**Réponse :** Trois couches de protection. (1) On-device : inférence ONNX dans le navigateur — la donnée d'interaction ne quitte pas l'appareil par défaut. (2) Federated learning : les gradients envoyés au serveur sont protégés par differential privacy — on ne peut pas remonter à un apprenant individuel. (3) Confidential Computing : quand un workload central nécessite des signaux ré-identifiables (rare), il tourne sur Azure Confidential VMs/AKS — l'opérateur Azure lui-même ne voit pas la mémoire.

---

## CISO — Chief Information Security Officer

### Q1 : Zero-trust posture and key management?
**Slides :** 12, A03
**Réponse :** Zero-trust de bout en bout. Toutes les ressources PaaS derrière Private Endpoints — seuls l'APIM et les web apps sont exposés publiquement, derrière Front Door + WAF. Customer-managed keys (CMK) sur tout le stockage et tous les services IA, via Azure Key Vault Managed HSM. Azure Policy enforce le CMK et le region-pinning EU. Egress contrôlé via Azure Firewall + DNS Private Resolver. Isolation logique par pays via des workspaces Azure ML + Fabric tagués par marché.

### Q2 : EU residency proof per service?
**Slides :** 12, A02
**Réponse :** Trois régions EU primaires : West Europe (NL/BE/RO), Germany West Central (DE), Poland Central (PL). DR dans la paire EU correspondante. Azure OpenAI / Foundry sous EU Data Boundary. Vérification trimestrielle des sub-processors Microsoft par le DPO + Architecture. Azure Policy bloque toute ressource déployée hors région EU. Le proof est auditable : chaque service est mappé à sa région dans l'annexe A02.

### Q3 : Incident response capability?
**Slides :** A15
**Réponse :** Runbook IR lié à Microsoft Sentinel + escalation DPO. Pour un incident IA sérieux (AI Act Art. 73) : notification dans les fenêtres statutaires. Pour une brèche GDPR (Art. 33/34) : notification DPA ≤ 72h + notification aux personnes concernées si risque élevé. Kill switch disponible pour tout feature IA. Drills IR exécutés et documentés. Microsoft Defender for Cloud + Defender for Endpoint pour la détection proactive.

### Q4 : Threat detection and SOC coverage?
**Slides :** 12, A09, A15
**Réponse :** Microsoft Defender for Cloud pour la posture sécurité cloud. Defender for Endpoint / Cloud Apps pour la détection de menaces. Azure Monitor + Application Insights pour la télémétrie. Logs immuables WORM pour la preuve AI Act. Le SOC est alimenté par Sentinel. Les alertes de sécurité sur les données enfants bénéficient du label « Child Personal Data — Restricted » de Purview qui trigger des politiques DLP spécifiques.

---

## CRO — Chief Risk Officer

### Q1 : Top risks and severity?
**Slides :** 19, A12
**Réponse :** Six risques au-dessus du seuil board. R1 (sev. 15) : DPA bloque DPIA → engagement dès M0. R4 (sev. 16) : dérive qualité localisation → reviewer humain jamais optionnel. R6 (sev. 15) : disparité bias > 5 pp → gate release bloquant + rollback en heures. R3 (sev. 12) : federated learning ne converge pas → fallback central DP sur cohorte opt-in. R8 (sev. 12) : coût OpenAI → PTU + cache + €2 M réserve. R5 (sev. 12) : override rate explose → co-design + pause + retrain. Le registre complet (12 risques) est en annexe A12.

### Q2 : Regulatory exposure (GDPR + AI Act)?
**Slides :** 09, A04, A05
**Réponse :** Côté GDPR : on aligne sur le pays le plus strict (NL/DE/PL/RO — 16 ans). DPIA par marché dès Phase 0, effacement automatisé ≤ 30 jours, zéro transfert hors EU. Côté AI Act : tout traité en haut-risque par défaut (pas de débat de classification). Dossier Annex IV construit feature par feature dès M0. CE-marking visé avant la sortie de Phase 3. Conformité = release gate, pas audit deliverable. Quatre interdictions explicites : pas d'emotion recognition, pas de social scoring, pas de manipulation comportementale, pas de catégorisation biométrique de mineurs.

### Q3 : Escalation thresholds and cadence?
**Slides :** 15, A12, A14
**Réponse :** Risques de sévérité ≥ 12 escaladés au comité de pilotage mensuel. Sévérité ≥ 20 : comité de pilotage d'urgence sous 5 jours ouvrés. Nouveaux risques logués sous 48h. Tous les risques R-class revus à chaque phase gate. Le Conseil RAI peut pauser un feature en production de manière unilatérale (RAI Lead, DPO ou Country Manager). Le QA cross-agent audite les livrables des autres agents avant chaque gate.

---

## CCO — Chief Compliance Officer

### Q1 : GDPR Article 8 specifics per market?
**Slides :** A04
**Réponse :** Âges de consentement digital : NL 16 · BE 13 · DE 16 · PL 16 · RO 16. On design pour 16 par défaut. Base légale : Art. 6(1)(e) intérêt public pour les écoles publiques (NL/DE/PL), Art. 6(1)(b) contrat pour les écoles professionnelles privées, Art. 6(1)(a) consentement avec consentement parental vérifiable pour < 16 sur les features optionnelles. Pour les catégories spéciales (SEN) : Art. 9(2)(g) intérêt public substantiel avec base légale nationale à vérifier par pays. Art. 22 : droit à l'intervention humaine garanti par le design teacher-in-the-loop.

### Q2 : EU AI Act article-by-article coverage?
**Slides :** A05
**Réponse :** Couverture complète article par article : Art. 9 (risk management — registre par feature, revu à chaque gate), Art. 10 (data governance — sampling par cohorte, audits fairness), Art. 11 (Annex IV file par feature), Art. 12 (logging — App Insights + stockage immuable WORM), Art. 13 (transparence — notices in-product + model cards), Art. 14 (human oversight — teacher override sur chaque décision), Art. 15 (accuracy/robustness — seuils de release gate + tests adversariaux en CI), Art. 43 (conformity assessment — contrôle interne Art. 43 §2), Art. 47 (déclaration de conformité — signée par le Group CEO avant Phase 3), Art. 49 (CE marking), Art. 72 (post-market monitoring — pipeline d'évaluation continue + rapport trimestriel), Art. 73 (serious incidents — runbook IR).

### Q3 : Audit evidence for Art. 12 logging?
**Slides :** A09
**Réponse :** Les logs de décision IA (inputs, outputs, version modèle, overrides enseignant) sont stockés sur Azure Blob Storage en mode immuable (WORM — Write Once Read Many). La rétention est alignée sur les obligations statutaires. KQL workbooks permettent le requêtage ad-hoc pour les audits. Le tout est indépendant de l'application : même si l'app est redéployée, les logs sont préservés et vérifiables.

### Q4 : Sub-processor change-control?
**Slides :** 12, A04
**Réponse :** Vérification trimestrielle des sub-processors Microsoft par le DPO + Architecture. EU Data Boundary activé pour tous les services in-scope. Si un changement de sub-processor menace la résidence EU : switch de service ou serious-incident report (AI Act Art. 73 si applicable). Azure Policy bloque par construction tout déploiement hors région EU. Le risque R7 (sev. 10) couvre ce scénario spécifiquement.

---

## CLO — Chief Legal Officer

### Q1 : Conformity assessment route and timing?
**Slides :** 09, A05, 16
**Réponse :** Route par défaut : contrôle interne (AI Act Art. 43 §2), puisque le système est couvert par Annex III §3 et suivra les normes harmonisées une fois publiées. Si une condition sous §1 s'applique, passage par organisme notifié. Déclencheurs de réévaluation : modification substantielle (Art. 43 §4) — nouveau marché, nouvelle modalité, changement d'architecture modèle. Timing : dossier Annex IV construit dès M0, mock CA en Phase 2, CE-marking obtenu avant la sortie de Phase 3 (M10). Déclaration de conformité signée par le Group CEO.

### Q2 : Liability around autonomous AI decisions?
**Slides :** 10, A05
**Réponse :** Aucune décision autonome n'atteint un mineur. Le modèle adaptatif *propose* la prochaine activité ; l'assessment AI *propose* une note. Dans les deux cas, l'enseignant voit l'explication, valide ou outrepasse en un clic. C'est tracé dans App Insights. Le design teacher-in-the-loop élimine le scénario de responsabilité pour décision autonome au sens de l'Art. 22 GDPR et de l'Art. 14 AI Act.

### Q3 : Statutory reporting windows (breach, serious incident)?
**Slides :** A15
**Réponse :** GDPR Art. 33 : notification DPA ≤ 72h après prise de connaissance. Art. 34 : notification aux personnes concernées sans délai si risque élevé. AI Act Art. 73 : reporting d'incident sérieux dans les fenêtres statutaires définies par le règlement. Le runbook IR est lié à Microsoft Sentinel + escalation DPO. Les drills sont documentés. Le kill switch sur chaque feature IA permet l'arrêt immédiat.

---

## CSO — Chief Sustainability Officer

### Q1 : Carbon footprint per learner?
**Slides :** 18, A16
**Réponse :** Le coût par apprenant par mois est suivi avec un proxy carbone associé, visible dans le dashboard board. L'inférence on-device (ONNX) est quasi-nulle en empreinte serveur. Le federated learning réduit les transferts de données (gradients agrégés au lieu de datasets complets). L'optimisation FinOps (PTU, cache, modèles plus petits) réduit aussi l'empreinte carbone proportionnellement. Détail en annexe A16.

### Q2 : Reduction levers and ESG reporting?
**Slides :** A16
**Réponse :** Trois leviers de réduction : (1) inférence edge/on-device élimine la charge serveur pour la personnalisation, (2) cache des localisations répétées évite la régénération, (3) modèles fine-tunés plus petits pour la correction de routine consomment moins que les LLM full-size. L'ESG reporting est alimenté par le proxy carbone du dashboard board, alignable sur les cadres de reporting ESG standards. Détail en annexe A16.

---

## CAIO — Chief AI Officer

### Q1 : Responsible AI release gates?
**Slides :** 10, A07, A14
**Réponse :** Un gate RAI à chaque mise en production, avec quatre critères : fairness (disparité ≤ 5 pp par cohorte — **bloquant**), calibration (ECE ≤ 0,05), safety (Content Safety + tests adversariaux), transparency (model cards + notices in-product). Le Conseil RAI (bi-mensuel) valide les release gates — le board délègue. Composition du Conseil : RAI Lead, Learning Sciences, AI Act CO, GDPR Specialist, Privacy ML Lead, Editorial Director, un Teacher Advocate (rotatif).

### Q2 : Privacy-preserving ML rationale?
**Slides :** A06
**Réponse :** Le case study impose de ne pas stocker de données identifiables d'enfants. On répond par trois couches : (1) inférence ONNX on-device — la donnée ne quitte pas l'appareil, (2) federated learning avec differential privacy — les gradients agrégés ne permettent pas de remonter à un individu, (3) Confidential Computing pour les rares workloads centraux nécessitant des signaux ré-identifiables. L'alternative centralised training a été rejetée pour le modèle adaptatif ; elle reste en fallback pour l'assessment AI sur des échantillons consentis uniquement.

### Q3 : Agentic / multi-agent strategy?
**Slides :** A08
**Réponse :** 9 agents spécialisés : Program Orchestrator, EU AI Act CO, GDPR Children's Data Specialist, Privacy-Preserving ML Engineer, Learning Sciences Expert, Content Localisation Lead, Responsible AI Evaluator, Cross-Agent QA Verifier, Demo Deployment Agent. Chaque agent a une accountability nommée et un périmètre de livrables. Le flux est spec-driven (Spec Kit). Le QA cross-agent audite les livrables des autres avant chaque gate — c'est l'auditeur interne.

### Q4 : Re-evaluation cadence and rollback playbook?
**Slides :** 10, A07, A14
**Réponse :** Évaluation continue via Azure ML monitoring en production. Rapport RAI trimestriel. Post-market monitoring annuel (AI Act Art. 72). Si la disparité fairness dépasse 5 pp sur un marché live : gate bloquant immédiat, rollback à la version précédente du modèle en quelques heures, rééquilibrage ciblé du dataset. Si un incident sérieux : runbook IR, notification Art. 73, kill switch disponible.

---

## CXO — Chief Experience Officer (Customer/Learner)

### Q1 : What does a learner / parent / teacher actually experience?
**Slides :** 07, 17
**Réponse :** **Lucas** (12 ans, DE) : contenu calibré sur sa zone de progression maximale (P-correct ≈ 0,7), feedback formatif immédiat, jamais de note punitive. **Mr Klein** (enseignant) : console avec plan de remédiation explicable, 45 % d'admin en moins, override en un clic à tout moment. **Sophie** (mère) : portail séparé dans sa langue, GDPR Art. 8 en hero, réponse IA en allemand. La démo live montre les trois en 7 minutes sur un backend unique West Europe.

### Q2 : How is teacher trust earned and measured?
**Slides :** 13
**Réponse :** La confiance est gagnée par le co-design (20 écoles pilotes NL dès Phase 0), le droit de veto pédagogique (Teacher Council), l'explicabilité de chaque suggestion, et l'override en un clic. Elle est mesurée par : le taux d'override (cible ≤ 10 % en régime stable — trop haut = confiance perdue, trop bas = désengagement), le NPS enseignant trimestriel, et l'usage actif des features IA dans la console.

### Q3 : What does the parent portal communicate?
**Slides :** 07, A04
**Réponse :** Le Parent Portal est une interface séparée, dans la langue du parent. En hero : les contrôles GDPR Art. 8 (consentement, droits d'accès, effacement, restriction, objection, portabilité). Transparence : le parent sait qu'une IA interagit avec son enfant, que l'enseignant humain décide — par contrat — et peut consulter les notices de transparence adaptées à l'âge. Self-service pour exercer les droits data subject (Art. 15, 17, etc.).
