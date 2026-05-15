# Live demo storyboard — 7 minutes

> Runbook used during slide 17. All times are wall-clock from "demo starts now".
> Pre-flight is **outside** the 7-minute budget — do it during the previous slide.

## Pre-flight (T-2 min, before clicking on slide 17)
- Open 4 browser tabs in this order: admin · teacher · learner · parent.
- Verify each top-right pill is **green** (KV resolved · APIM reachable · region West Europe).
- Browser zoom 110 %.
- If any pill is orange/red → run a one-shot `az webapp restart -g rg-learneu-demo -n <app>` for the offender, wait 30 s, refresh.
- Have `assets/screenshots/<persona>-fallback.png` ready in case Postgres auto-stopped (PG flexible servers stop after 7 days idle).

## Stopwatch

| Time | Persona | URL | What you do | What you say (1-line) |
|---|---|---|---|---|
| 00:00 | — | — | Click slide 17, narrate the storyboard for 30 s | "On va voir un seul backend, trois publics, zéro fuite de donnée." |
| 00:30 | Teacher Mr Klein | https://app-teacher-console-learneu-demo.azurewebsites.net | Login `teacher@learneu.demo` · prompt: *"Lucas confond systématiquement 1/2 et 1/4. Donne-moi 3 activités de remédiation de 5 minutes, et l'objectif Bildungsstandards visé."* | "Article 14 EU AI Act — la machine suggère, l'enseignant décide." |
| 02:00 | Learner Lucas | https://app-learner-web-learneu-demo.azurewebsites.net | Login `student@learneu.demo` · click **Quiz Me** on equivalent fractions; show the ONNX picker selecting an item near P=0.7 | "Le picker tourne **dans le navigateur** — la donnée individuelle ne sort pas." |
| 04:00 | Parent Sophie | https://app-parent-portal-learneu-demo.azurewebsites.net | Login `parent@learneu.demo` · prompt in plain language: *"Ma fille a 12 ans, que collectez-vous, où est-ce stocké, comment je retire mon consentement ?"* | "Surface enfant ≠ surface des droits — c'est non-négociable Article 8." |
| 05:30 | Admin | https://app-admin-learneu-demo.azurewebsites.net | Login `admin@learneu.demo` · click the new **Activity** tab → show Recent connections + Recent asks; click **Safety & Quality** → show Content Safety verdicts + ONNX attempts | "Tout est versionné dans Postgres et exposé pour l'audit Article 12." |
| 07:00 | — | — | Switch back to slide 18 (Outcomes & KPIs) | — |

## Plan B if something breaks

| Symptom | Response |
|---|---|
| Orange pill on a tab | Open the panel, narrate which leg is down; switch story to Admin "Activity" tab to keep showing live data |
| Red pill (5xx) | Skip the failing persona, show its fallback screenshot in `assets/screenshots/`, recover at 05:30 with Admin |
| Postgres auto-stopped (`db.enabled=false`) | Mention "the Flexible Server auto-stops after 7 d to save cost — that's a feature, not a bug; Quiz Me runs in-browser anyway" — show the picker without saving the sheet |
| AOAI > 8 s latency | Talk APIM 50 K TPM throttling while it lands; the answer is worth the wait |
| Cost question | "B1 App Service × 4 + APIM Developer + AOAI 50 K TPM + PG B1ms ≈ €25 / day demo, €350 / month dev" |

Sources: [demo/DEMO-STORYTELLING.md](../demo/DEMO-STORYTELLING.md) · [demo/DEPLOYMENT-REPORT.md](../demo/DEPLOYMENT-REPORT.md) · [demo/WALKTHROUGH.md](../demo/WALKTHROUGH.md).
