# LearnEU — Pitch CXO · Fil narratif slide par slide

> Ce document résume le **storytelling** de la restitution en 21 slides.
> Utilisez-le comme cheat-sheet pour comprendre l'arc narratif avant de
> présenter.

---

## Arc narratif en 4 actes

| Acte | Slides | Message clé |
|---|---|---|
| **I — Pourquoi maintenant** | 01 → 04 | Le gap est un problème de delivery, pas de contenu. La conformité est notre avantage concurrentiel. |
| **II — Ce qu'on signe** | 05 → 07 | Quatre chiffres contractuels. Trois personas, trois gains chiffrés. |
| **III — Comment on y arrive** | 08 → 18 | Une plateforme, trois IA, zéro donnée hors UE. Confiance, adoption, delivery. |
| **IV — Ce qu'on demande** | 19 → 21 | Six risques maîtrisés, un dashboard board, trois décisions aujourd'hui. |

---

## Slide par slide

### Acte I — Pourquoi maintenant

**Slide 01 · Titre — « 4,1 millions d'enfants. Une promesse. »**
Ouverture émotionnelle. On pose le cadre : personnaliser, protéger la vie privée des mineurs, rester européen. Pas un slideware — une slice réellement déployée sur Azure West Europe.

**Slide 02 · Executive Summary — « Ce qu'on signe »**
Quatre chiffres, un contrat, zéro excuse :
- **4,1 M** apprenants UE (NL · BE · DE · PL · RO)
- **−26 pp** d'écart de résultats fermés en 12 mois
- **−45 %** de temps admin enseignant rendu
- **100 %** conformité GDPR Art. 8 + AI Act CE

> *Si vous ne retenez qu'une slide, c'est celle-ci.*

**Slide 03 · Le gap — « Même contenu. Enfants différents. 40 points d'écart. »**
Constat factuel : 40 points d'écart entre les meilleures et les moins bonnes écoles sur le même contenu. Ce n'est pas un problème de qualité du contenu — c'est un problème de **livraison**. La personnalisation refuse cette fatalité.

**Slide 04 · Thèse stratégique — « La conformité, c'est le fossé. »**
> *« Compliance is not a tax on the product. It is the product. »*

À partir de 2027, les ministères européens n'achèteront que de l'IA éducative résidente UE et conforme AI Act. Personne ne coche les deux cases aujourd'hui. Fenêtre : 18–24 mois.

---

### Acte II — Ce qu'on signe

**Slide 05 · Contrat d'outcomes — « −26 % · −45 % · 12 mois → 6 semaines · 100 % GDPR »**
Quatre chiffres tirés mot pour mot du case study. Chaque mois, on rapporte la trajectoire au board — pas seulement en fin de programme.

**Slide 06 · Valeur en jeu — « €55 M de valeur annuelle au régime de croisière »**
Décomposition : €28 M productivité enseignante + €18 M ARR marché + €9 M rétention. Investissement €18–22 M → payback ≤ 24 mois sur 3 marchés live.

**Slide 07 · Trois personas — « Lucas, Mr Klein, Sophie »**
- **Lucas** (élève 12 ans, DE) : contenu calibré sur sa zone de progression (P-correct ≈ 0,7), feedback formatif, jamais de note punitive.
- **Mr Klein** (enseignant) : 45 % admin en moins, chaque suggestion IA explicable et révocable en un clic.
- **Sophie** (mère) : portail dans sa langue, contrôles GDPR Art. 8 en hero, l'enseignant humain décide — par contrat.

---

### Acte III — Comment on y arrive

**Slide 08 · Solution on a page — « Une plateforme. Trois IA. Zéro donnée hors UE. »**
Trois capacités IA (adaptative, localisation, assessment) sur 8 services Azure, tous en région EU. Point clé : la donnée mineur ne quitte **pas** l'appareil par défaut (ONNX on-device, federated learning, differential privacy, Confidential Computing).

**Slide 09 · Posture conformité — « La conformité est un release gate. »**
Pas un livrable de fin de programme. GDPR : pays le plus strict (NL — 16 ans), DPIA par marché en Phase 0, minimisation par construction. AI Act : tout en haut-risque par défaut, dossier Annex IV feature par feature, CE-marking avant Phase 3.

**Slide 10 · Responsible AI — « Aucune décision autonome n'atteint un mineur. Jamais. »**
Le modèle propose, l'enseignant valide ou outrepasse en un clic. Override tracé dans App Insights. Taux d'override = KPI (cible ≤ 10 %). Gate RAI à chaque release : fairness, calibration, safety, transparency. Disparité par cohorte = bloquante.

**Slide 11 · Data strategy — « Moins de données. Mieux gouvernées. Jamais ré-identifiables. »**
Zéro PII dans les agrégats Gold. Effacement en 30 jours (SLA automatisé). 100 % clés client (CMK). 3 régions EU. Microsoft Purview porte le catalogue avec un label « Child Personal Data — Restricted ». Azure Policy bloque toute ressource hors EU ou sans CMK.

**Slide 12 · Sécurité & résidence EU — « EU only. By design. By contract. »**
Zero-trust de bout en bout. Private Endpoints partout. CMK sur tout le stockage et les services IA. Confidential Computing pour les workloads ré-identifiables. 3 régions EU + DR. Vérification trimestrielle des sub-processors. Logs immuables WORM = preuve Art. 12 AI Act.

**Slide 13 · Expérience enseignant — « Les enseignants sont l'équipe produit. »**
20 écoles pilotes NL en co-design dès Phase 0 (pas en validation finale). Le Teacher Council a un droit de veto pédagogique sur chaque release. Taux d'override suivi comme signal de confiance. 90 min d'onboarding, CSM par marché, crédits CPD.

**Slide 14 · Marché & localisation — « 5 marchés. Un pipeline. 6 semaines chacun. »**
NL (M5, 20 écoles) → DE (M8, 50+ écoles, CE-marked) → BE/PL/RO (M10, choix sur traction ministérielle). Pipeline : glossaires P0 → génération Azure OpenAI + AI Search sur curriculum national → reviewer humain obligatoire. Cible : 80 % d'acceptation premier passage.

**Slide 15 · Modèle opérationnel — « Deux conseils. Neuf agents. Une chaîne. »**
Comité de pilotage mensuel (KPI/risque/budget). Conseil RAI bi-mensuel (release gates). ARB pour l'architecture. Teacher Council pour la pédagogie. 9 agents spécialistes avec accountability nommée. Le QA cross-agent = auditeur interne.

**Slide 16 · Roadmap — « 5 phases. 12 mois. Chaque gate est un hard stop. »**
P0–P1 (M0–M5) : fondations + MVP + DPIA + landing zone. P2 (M5–M8) : pilote NL 20 écoles. P3 (M8–M10) : CE-marked + lancement DE. P4 (M10–M12) : 3e marché + DR drill. Aucun marché supplémentaire avant que le précédent ne soit en trajectoire KPI.

**Slide 17 · Démo live — « 7 minutes. Trois personas. Un backend. West Europe. »**
Pre-flight : 3 pastilles vertes. Teacher Console (Mr Klein, plan de remédiation pour Lucas). Learner Web (picker ONNX, P-correct ≈ 0,7). Parent Portal (GDPR Art. 8 en hero, réponse en allemand). Admin Console (Activity + Safety panels, audit trail live). Si une pastille tombe, on narre — pas de mode dégradé caché.

**Slide 18 · Investissement & FinOps — « Prévisible. Optimisé. Durable. »**
€18–22 M de build sur 12 mois (45 % plateforme, 30 % AI, 25 % compliance/UX). €6 M/an en run (55 % Azure, 35 % people, 10 % sub-proc). Payback ≤ 24 mois. €2 M de contingence sur R8 (coût OpenAI). Coût/apprenant/mois = KPI board.

---

### Acte IV — Ce qu'on demande

**Slide 19 · Risques — « Top 6 risques. Possédés. Mitigés. Contingentés. »**
R1 : DPA bloque DPIA → engagement dès M0. R3 : federated learning ne converge pas → fallback central DP. R4 : dérive qualité localisation → reviewer jamais optionnel. R6 : disparité bias > 5pp → gate release bloquant + rollback. R8 : coût OpenAI → PTUs + cache + €2 M réserve.

**Slide 20 · Dashboard board — « Ce que le board voit. Chaque mois. »**
5 KPI sortie (K1–K5) + adoption. Posture conformité (DPIA, erasure, Annex IV, overrides, incidents). Heat-map des 6 risques majeurs. Coût/apprenant/mois + proxy carbone. Si une tuile passe au rouge, le board le voit avant le programme.

**Slide 21 · The Ask — « Trois décisions. Aujourd'hui. »**
1. **Mandater les DPIA** dans les 5 pays → débloque Phase 0.
2. **Libérer €3,5 M** pour Phase 0 (landing zone, DPIAs, Annex IV skeleton).
3. **Nommer le président du Conseil RAI** au prochain comité.
4. Endosser le contrat d'outcomes comme KPIs board.
5. Confirmer le séquencement NL → DE ; marchés 3–5 au gate M10.

---

## Phrase de clôture

> **« Personnalisé. Privé. Européen. »**
