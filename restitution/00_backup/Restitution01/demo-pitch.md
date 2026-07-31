# LearnEU — Pitch Démo · 7 minutes chrono

> Storyboard de la démo live (slide 17 du deck). Durée : **7 min pile**.
> Pre-flight hors budget (T-2 min, pendant la slide précédente).
> Sources cohérentes : `restitution/demo-storyboard.md` ·
> `demo/DEMO-STORYTELLING.md` · slide-17-demo.md.

---

## Personas à l'écran (annoncer en intro)

| Rôle | Persona | Login | App |
|---|---|---|---|
| 🧒 Élève | **Lucas Janssen**, 12 ans (DE, Year-7) | `student@learneu.demo` | Learner Web |
| 👨‍🏫 Enseignant | **Mr Klein** (DE) | `teacher@learneu.demo` | Teacher Console |
| 👩 Parent | **Sophie De Vries**, mère de Lucas (NL) | `parent@learneu.demo` | Parent Portal |
| 🛠️ Admin | Opérateur LearnEU | `admin@learneu.demo` | Admin Console |

> Mot de passe commun démo : `DemoPass2026!`
> Backend unique : APIM → Azure OpenAI **West Europe** (`gpt-5.4-nano`).

---

## Pre-flight (T-2 min, hors chrono)

- Ouvrir 4 onglets dans l'ordre : **learner · parent · teacher · admin**.
- Vérifier que chaque pastille en haut à droite est **verte** (KV resolved · APIM reachable · Region: West Europe · Model: gpt-5.4-nano).
- Zoom navigateur 110 % — la pastille doit être lisible du fond de salle.
- ⚠️ **OBLIGATOIRE — retirer le consentement de Lucas avant la démo** :
  - Aller sur le Parent Portal (`parent@learneu.demo`) → sélectionner **Lucas Janssen** → cliquer **Withdraw Consent** → confirmer. La bannière passe au rouge.
  - Vérifier que le Learner Web (`student@learneu.demo`) affiche bien la page **"Waiting for Parental Consent"**.
- Si une pastille est orange/rouge : `az webapp restart -g rg-learneu-demo -n <app>`, attendre 30 s, refresh.
- Si Postgres auto-stopped : `az postgres flexible-server start -g rg-learneu-demo -n pg-learneu-demo`, attendre 2 min, restart les 4 apps.
- Screenshots fallback prêts dans `restitution/assets/screenshots/<persona>-fallback.png`.

---

## Stopwatch — 7 minutes

| Temps | Persona | Action | Phrase clé |
|---|---|---|---|
| **00:00 → 00:30** | — | Intro storyboard 30 s | *« Un seul backend, trois publics, zéro fuite de donnée — en sept minutes. »* |
| **00:30 → 01:30** | 🧒 Lucas | Learner Web **bloqué** | *« Sans consentement de Sophie, Lucas ne voit pas la plateforme. C'est le mur GDPR Art. 8. »* |
| **01:30 → 03:30** | 👩 Sophie | Parent Portal → consent + Q&A | *« Sophie déverrouille. La surface des droits **n'est pas** la surface de l'IA. »* |
| **03:30 → 05:00** | 🧒 Lucas | Learner Web **débloqué** → Quiz Me | *« Le picker ONNX tourne dans le navigateur — la donnée individuelle ne sort pas. »* |
| **05:00 → 06:15** | 👨‍🏫 Mr Klein | Teacher Console → remédiation | *« Article 14 EU AI Act — la machine suggère, l'enseignant décide. »* |
| **06:15 → 07:00** | 🛠️ Admin | Admin Console → Activity + Safety | *« Tout est versionné dans Postgres pour l'audit Article 12. »* |
| **07:00** | — | Retour à la slide suivante | — |

---

## Acte 1 — Intro (00:00 → 00:30)

**Ce que vous dites** (30 s, pas plus) :

> *« Vous allez voir trois UIs distinctes — enseignant, élève, parent — plus une console admin pour la preuve. Toutes pointent vers un seul backend régulé : APIM en mode interne, qui appelle Azure OpenAI en West Europe sur un endpoint privé. Aucune des trois apps ne connaît la clé du modèle : chacune la lit dans Key Vault via son managed identity. Et tout est tracé dans Application Insights — c'est la fondation de l'Article 12 de l'AI Act. »*

> ✋ Ne pas dévier. La pastille verte est la preuve visuelle — laissez-la parler.

---

## Acte 2 — Lucas bloqué (00:30 → 01:30)

**URL :** `https://app-learner-web-learneu-demo.azurewebsites.net`
**Login :** `student@learneu.demo`

### Ce que vous faites

1. **Se connecter** en tant que Lucas → la plateforme affiche la page **"Waiting for Parental Consent"**, pas de quiz, pas d'IA, rien.
2. **Pointer l'écran** : *« Lucas a 12 ans — il est sous le seuil GDPR Article 8. Sa mère Sophie n'a pas encore donné son consentement. Résultat : zéro donnée, zéro IA, zéro accès. »*

### Le punch — le mur GDPR

> *« Ce n'est pas une page d'erreur. C'est une **garantie contractuelle**. Tant que Sophie ne consent pas, la plateforme refuse de traiter la moindre donnée de Lucas. Ce gate est appliqué côté serveur — il est impossible à contourner côté client. »*

---

## Acte 3 — Sophie donne le consentement (01:30 → 03:30)

**URL :** `https://app-parent-portal-learneu-demo.azurewebsites.net`
**Login :** `parent@learneu.demo`

### Ce que vous faites

1. **Hero en GDPR Art. 8** — laisser l'audience le lire 2 secondes.
2. **Sélectionner Lucas Janssen** dans le dropdown « Child » — bannière en rouge (consent retiré).
3. **Cliquer "Grant Consent"** → lire la modal GDPR Art. 8 à voix haute : quelle donnée, pourquoi, implication IA, hébergement EU, droit de retrait.
4. Cocher la case, confirmer → bannière passe au vert.
5. **Coller le prompt** (allemand — Lucas est en Year-7 DE) :
   > `Mein Sohn ist 12 Jahre alt und möchte LearnEU nutzen. Welche Daten erheben Sie, wo werden sie gespeichert, und wie widerrufe ich meine Einwilligung?`
6. **Réponse** en allemand, en langage clair. Pointer : *« la réponse ne ré-invente pas la localisation — elle dit West Europe parce que le system prompt le lui impose. »*

### Le punch — Article 8

> *« Sophie ne partage pas l'app de son fils. Elle a **son propre portail**. La surface qui exerce les droits **n'est pas** la surface qui consomme l'IA — c'est non-négociable. Inférence en West Europe, aucune PII enfant dans le prompt, et un bouton "Effacer mes données" (Stage 9) qui déclenche une cascade SQL + AML + AI Search. »*

---

## Acte 4 — Lucas débloqué (03:30 → 05:00)

**URL :** `https://app-learner-web-learneu-demo.azurewebsites.net`
**Login :** `student@learneu.demo`

### Ce que vous faites

1. **Basculer sur l'onglet Lucas** → **rafraîchir** la page. La page "Waiting for Parental Consent" a disparu, le Quiz Me s'affiche.
2. **Click "Quiz Me"** sur les fractions équivalentes. (Si besoin d'un prompt libre : `Explain equivalent fractions with two concrete examples, then give me a short quiz.`)
3. **Pointer la sélection d'item** : le picker ONNX choisit l'exercice dont la probabilité de réussite estimée est la plus proche de **0,7** (zone de progression maximale).
4. **Lucas répond** → feedback formatif immédiat, jamais punitif.

### Le punch — Edge inference

> *« Le picker tourne **dans le navigateur de Lucas**, en ONNX Runtime. Sa donnée d'interaction individuelle ne quitte pas l'appareil. Seuls les gradients agrégés, protégés par differential privacy, remontent périodiquement pour réentraîner le modèle. C'est ce qui rend la conformité GDPR Article 8 tenable à 4,1 millions d'apprenants. »*

> ⏱️ Si la réponse traîne (> 8 s) : parler du throttling APIM 50K TPM GlobalStandard pendant l'attente.

---

## Acte 5 — Mr Klein, l'enseignant (05:00 → 06:15)

**URL :** `https://app-teacher-console-learneu-demo.azurewebsites.net`
**Login :** `teacher@learneu.demo`

### Ce que vous faites

1. **Pointer la pastille verte** : *« Même contrat technique : KV résolu, APIM joignable, West Europe, gpt-5.4-nano. »*
2. **Coller le prompt** :
   > `Lucas systematically confuses 1/2 and 1/4. Give me 3 five-minute remediation activities, plus the Bildungsstandards objective they target.`
3. **Click Ask** → liste numérotée s'affiche, ancrée aux standards allemands de Year-7.

### Le punch — Article 14

> *« On est en plein Article 14 de l'AI Act : human-in-the-loop. La machine **propose**. L'enseignant **décide**. Dans la version production, à côté de chaque suggestion, un bouton "override" loggue le timestamp, l'OID utilisateur, et le motif. C'est exactement la trace que le superviseur AI Act demandera. »*

> 💡 Si on demande pourquoi le bouton override n'est pas visible : *« Stage 8 de la roadmap PROGRESS — la plomberie audit est déjà câblée dans App Insights custom events. »*

---

## Acte 6 — Admin, la preuve (06:15 → 07:00)

**URL :** `https://app-admin-learneu-demo.azurewebsites.net`
**Login :** `admin@learneu.demo`

### Ce que vous faites

1. **Onglet "Activity"** → afficher **Recent connections** (Lucas x2 — blocked puis débloqué —, Sophie, Mr Klein) + **Recent asks**.
2. **Onglet "Safety & Quality"** → afficher les **verdicts Content Safety** + les **tentatives ONNX** côté Lucas.
3. Pointer la **colonne timestamp + user OID + modèle + tokens**.

### Le punch — Article 12

> *« Tout ce qu'on vient de jouer — le blocage de Lucas, le consentement de Sophie, le prompt de Mr Klein, le quiz ONNX — est versionné dans Postgres et exposé pour l'audit. C'est le socle de l'Article 12 de l'AI Act. Et c'est ce qui permet à Sophie de vérifier, à tout moment, que ce qu'on lui a promis est tenu. »*

---

## Acte 7 — Sortie (07:00)

> *« Sept minutes : le mur GDPR, le consentement parental, l'apprentissage adaptatif, la supervision enseignante, la preuve auditée. Un seul backend, zéro donnée hors UE. Personnalisé. Privé. Européen. »*

→ Click pour passer à la **slide suivante**.

---

## Plan B si quelque chose casse

| Symptôme | Réponse |
|---|---|
| **Lucas ne voit pas la page "Waiting"** au démarrage | Vérifier que le consent a bien été retiré en pre-flight (Parent Portal → Withdraw Consent). |
| **Lucas n'est pas débloqué** après le consent de Sophie | Forcer un refresh de l'onglet Learner Web (Ctrl+F5). |
| **Pastille orange** sur un onglet | Ouvrir le panel, narrer quelle jambe est tombée. Bascule sur Admin "Activity" pour continuer à montrer du live. |
| **Pastille rouge** (5xx) | Skip le persona qui tombe, montrer le screenshot fallback dans `assets/screenshots/`, recover avec Admin. |
| **Postgres auto-stopped** (après 7 j d'idle) | `az postgres flexible-server start -g rg-learneu-demo -n pg-learneu-demo`, restart les 4 apps. *« C'est une feature cost-saving — pas un bug. »* |
| **AOAI > 8 s** | Parler du throttling APIM 50K TPM GlobalStandard pendant l'attente. |
| **Question coût** | *« B1 App Service × 4 + APIM Developer + AOAI 50K TPM + PG B1ms ≈ €25/jour démo, €350/mois en dev. Prod scale via Premium V3 + APIM Standard ≈ €1,8k avant volume modèle. »* |

---

## Cheat-sheet

| Temps | Onglet | URL | Login |
|---|---|---|---|
| 00:30 | 1 | `…learner-web…` | `student@learneu.demo` |
| 01:30 | 2 | `…parent-portal…` | `parent@learneu.demo` |
| 03:30 | 1 | `…learner-web…` (refresh) | `student@learneu.demo` |
| 05:00 | 3 | `…teacher-console…` | `teacher@learneu.demo` |
| 06:15 | 4 | `…admin…` | `admin@learneu.demo` |

**Phrase de clôture :** *« Le mur, le consentement, l'apprentissage, la supervision, la preuve. Personnalisé. Privé. Européen. »*
