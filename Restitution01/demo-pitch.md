# LearnEU — Pitch Démo · 7 minutes chrono

> Storyboard de la démo live (slide 17 du deck). Durée : **7 min pile**.
> Pre-flight hors budget (T-2 min, pendant la slide précédente).
> Sources cohérentes : `restitution/demo-storyboard.md` ·
> `demo/DEMO-STORYTELLING.md` · slide-17-demo.md.

---

## Personas à l'écran (annoncer en intro)

| Rôle | Persona | Login | App |
|---|---|---|---|
| 🧒 Élève | **Lucas**, 12 ans (DE, Year-7) | `student@learneu.demo` | Learner Web |
| 👨‍🏫 Enseignant | **Mr Klein** (DE) | `teacher@learneu.demo` | Teacher Console |
| 👩 Parent | **Sophie**, mère de Lucas (NL) | `parent@learneu.demo` | Parent Portal |
| 🛠️ Admin | Opérateur LearnEU | `admin@learneu.demo` | Admin Console |

> Mot de passe commun démo : `DemoPass2026!`
> Backend unique : APIM → Azure OpenAI **West Europe** (`gpt-5.4-nano`).

---

## Pre-flight (T-2 min, hors chrono)

- Ouvrir 4 onglets dans l'ordre : **teacher · learner · parent · admin**.
- Vérifier que chaque pastille en haut à droite est **verte** (KV resolved · APIM reachable · Region: West Europe · Model: gpt-5.4-nano).
- Zoom navigateur 110 % — la pastille doit être lisible du fond de salle.
- Effacer le prompt par défaut sur `learner-web` (sinon l'audience le lit pendant le pitch).
- Si une pastille est orange/rouge : `az webapp restart -g rg-learneu-demo -n <app>`, attendre 30 s, refresh.
- Screenshots fallback prêts dans `restitution/assets/screenshots/<persona>-fallback.png`.

---

## Stopwatch — 7 minutes

| Temps | Persona | Action | Phrase clé |
|---|---|---|---|
| **00:00 → 00:30** | — | Intro storyboard 30 s | *« Un seul backend, trois publics, zéro fuite de donnée — en sept minutes. »* |
| **00:30 → 02:00** | 👨‍🏫 Mr Klein | Teacher Console | *« Article 14 EU AI Act — la machine suggère, l'enseignant décide. »* (prompt EN) |
| **02:00 → 04:00** | 🧒 Lucas | Learner Web | *« Le picker ONNX tourne **dans le navigateur** — la donnée individuelle ne sort pas. »* (prompt EN) |
| **04:00 → 05:30** | 👩 Sophie | Parent Portal | *« Surface enfant ≠ surface des droits — non-négociable Article 8. »* (prompt EN) |
| **05:30 → 07:00** | 🛠️ Admin | Admin Console | *« Tout est versionné dans Postgres et exposé pour l'audit Article 12. »* |
| **07:00** | — | Retour à la slide suivante | — |

---

## Acte 1 — Intro (00:00 → 00:30)

**Ce que vous dites** (30 s, pas plus) :

> *« Vous allez voir trois UIs distinctes — enseignant, élève, parent — plus une console admin pour la preuve. Toutes pointent vers un seul backend régulé : APIM en mode interne, qui appelle Azure OpenAI en West Europe sur un endpoint privé. Aucune des trois apps ne connaît la clé du modèle : chacune la lit dans Key Vault via son managed identity. Et tout est tracé dans Application Insights — c'est la fondation de l'Article 12 de l'AI Act. »*

> ✋ Ne pas dévier. La pastille verte est la preuve visuelle — laissez-la parler.

---

## Acte 2 — Mr Klein, l'enseignant (00:30 → 02:00)

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

## Acte 3 — Lucas, l'élève (02:00 → 04:00)

**URL :** `https://app-learner-web-learneu-demo.azurewebsites.net`
**Login :** `student@learneu.demo`

### Ce que vous faites

1. **Click "Quiz Me"** sur les fractions équivalentes. (Si besoin d'un prompt libre : `Explain equivalent fractions with two concrete examples, then give me a short quiz.`)
2. **Pointer la sélection d'item** : le picker ONNX choisit l'exercice dont la probabilité de réussite estimée est la plus proche de **0,7** (zone de progression maximale).
3. **Lucas répond** → feedback formatif immédiat, jamais punitif.

### Le punch — Edge inference

> *« Ce picker tourne **dans le navigateur de Lucas**, en ONNX Runtime. Sa donnée d'interaction individuelle ne quitte pas l'appareil. Seuls les gradients agrégés, protégés par differential privacy, remontent périodiquement pour réentraîner le modèle. C'est ce qui rend la conformité GDPR Article 8 tenable à 4,1 millions d'apprenants. »*

> ⏱️ Si la réponse traîne (> 8 s) : parler du throttling APIM 50K TPM GlobalStandard pendant l'attente.

---

## Acte 4 — Sophie, la mère (04:00 → 05:30)

**URL :** `https://app-parent-portal-learneu-demo.azurewebsites.net`
**Login :** `parent@learneu.demo`

### Ce que vous faites

1. **Hero en GDPR Art. 8** — laissez l'audience le lire 2 secondes.
2. **Bannière de consentement** en haut : *« Le fils de Sophie a encore besoin du consentement. »*
3. **Coller le prompt** (allemand — Lucas est en Year-7 DE ; le portail répond dans la langue du parent) :
   > `Mein Sohn ist 12 Jahre alt und möchte LearnEU nutzen. Welche Daten erheben Sie, wo werden sie gespeichert, und wie widerrufe ich meine Einwilligung?`
4. **Réponse** en allemand, en langage clair. Pointer : *« la réponse ne ré-invente pas la localisation — elle dit West Europe parce que le system prompt le lui impose. »*
5. **Optionnel — Withdraw Consent** → click, confirme, bannière passe au rouge.

### Le punch — Article 8

> *« Sophie ne partage pas l'app de son fils. Elle a **son propre portail**. C'est non-négociable pour la donnée enfant : la surface qui exerce les droits **n'est pas** la surface qui consomme l'IA. Trois bullets que je laisse au parent : inférence en West Europe — ce qu'ils tapent ne quitte pas l'UE. Aucune PII enfant dans le prompt. Et un bouton "Effacer mes données" — Stage 9 — qui déclenche une cascade SQL + AML + AI Search. »*

---

## Acte 5 — Admin, la preuve (05:30 → 07:00)

**URL :** `https://app-admin-learneu-demo.azurewebsites.net`
**Login :** `admin@learneu.demo`

### Ce que vous faites

1. **Onglet "Activity"** → afficher **Recent connections** (Mr Klein, Lucas, Sophie) + **Recent asks** (les 3 prompts qu'on vient de jouer).
2. **Onglet "Safety & Quality"** → afficher les **verdicts Content Safety** sur chaque génération + les **tentatives ONNX** côté Lucas.
3. Pointer la **colonne timestamp + user OID + modèle + tokens**.

### Le punch — Article 12

> *« Tout ce qu'on vient de jouer — connexion, prompt, réponse, verdict Content Safety, sélection ONNX — est versionné dans Postgres et exposé en lecture pour l'audit. C'est le socle de l'Article 12 de l'AI Act sur la traçabilité, et c'est aussi ce qui prouve à un parent qu'on tient parole sur l'effacement. »*

---

## Acte 6 — Sortie (07:00)

> *« Sept minutes, trois personas, un backend, zéro donnée hors UE. La suite — override audit, ONNX client-side complet, cascade d'effacement — c'est Stage 8 et 9 de la roadmap. Le socle est ce que vous venez de voir, en live, sur Azure West Europe. »*

→ Click pour passer à la **slide suivante**.

---

## Plan B si quelque chose casse

| Symptôme | Réponse |
|---|---|
| **Pastille orange** sur un onglet | Ouvrir le panel, narrer quelle jambe est tombée. Bascule sur Admin "Activity" pour continuer à montrer du live. |
| **Pastille rouge** (5xx) | Skip le persona qui tombe, montrer le screenshot fallback dans `assets/screenshots/`, recover à 05:30 avec Admin. |
| **Postgres auto-stopped** (après 7 j d'idle) | *« Le Flexible Server auto-stop après 7 jours pour économiser — feature, pas bug ; Quiz Me tourne dans le navigateur de toute façon. »* |
| **AOAI > 8 s** | Parler du throttling APIM 50K TPM GlobalStandard pendant l'attente. La réponse vaut l'attente. |
| **Question coût** | *« B1 App Service × 4 + APIM Developer + AOAI 50K TPM + PG B1ms ≈ €25/jour démo, €350/mois en dev. Prod scale via Premium V3 + APIM Standard ≈ €1,8k avant volume modèle. »* |

---

## Cheat-sheet

| Temps | Onglet | URL | Login |
|---|---|---|---|
| 00:30 | 1 | `…teacher-console…` | `teacher@learneu.demo` |
| 02:00 | 2 | `…learner-web…` | `student@learneu.demo` |
| 04:00 | 3 | `…parent-portal…` | `parent@learneu.demo` |
| 05:30 | 4 | `…admin…` | `admin@learneu.demo` |

**Phrase de clôture :** *« Un seul backend, trois publics, zéro fuite. Personnalisé. Privé. Européen. »*
