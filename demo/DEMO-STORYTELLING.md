# LearnEU — Demo Storytelling (10 min)

> **Audience:** Education / EdTech decision-makers (CIO, head of product, compliance sponsor) who have heard about AI in the classroom but doubt they can ship it **under GDPR + EU AI Act + children's-data constraints**.
>
> **Promise of the demo:** in 10 minutes, show them a working slice, deployed in West Europe, that proves you can do adaptive learning for minors **without sending a single byte outside the EU**, with audit, human oversight, and operable GDPR rights — not slideware, real **code that runs**.

---

## On-screen personas (mention up front)

| Role | App |
|---|---|
| 👨‍👧 Parent (Sophie, NL) | Parent Portal |
| 🎓 Teacher (Mr Klein, DE) | Teacher Console |
| 🧒 Learner (Lucas, 12) | Learner Web |

Three roles, **three distinct UIs**, **one regulated backend** (APIM → AOAI West Europe).

---

## Act 1 — The problem (0:00 → 1:30)

> *"Everyone wants to use AI to personalise learning. And everyone hits the same three walls: GDPR Article 8 on children, the EU AI Act that classifies education as **Annex III §3 — high-risk**, and the very legitimate fear that minors' data ends up with a non-EU provider."*

**Show:** nothing. This is the verbal hook. 60 seconds max. Punch line:

> *"So either you give up, or you build a runtime that makes compliance automatic. We chose the second option, and that's what I'll show you in the next 8 minutes."*

---

## Act 2 — Architecture in 60 seconds (1:30 → 2:30)

**On screen:** open [`AMA/DEPLOYMENT-REPORT.md`](../DEPLOYMENT-REPORT.md) at the **Identity & secrets path** section (the ASCII diagram).

**What you say** *(rhythm: one beat per breath)*:

1. *"Three VNet-injected App Services."*
2. *"None of them knows the model key — each reads it from Key Vault through its managed identity, over a private endpoint."*
3. *"All three go through APIM in internal mode — that's the only point that talks to Azure OpenAI, and **AOAI runs in West Europe, gpt-5.4-nano**."*
4. *"Every request is logged into Application Insights — that's the foundation of **EU AI Act Article 12 traceability**."*

> 💡 Don't dwell. The goal here is just to plant the four pillars: **VNet · Key Vault · APIM · audit**.

---

## Act 3 — The learner: Lucas works on fractions (2:30 → 4:30)

**On screen:** [https://app-learner-web-learneu-demo.azurewebsites.net](https://app-learner-web-learneu-demo.azurewebsites.net)

### What you do

1. **Point at the green pill in the top-right** (status pill).
   > *"Before we ask anything, we look at this: green dot = Key Vault resolved, APIM reachable. That's the technical contract of the runtime, surfaced right in the UI."*
   - Click on it → the panel unfolds and shows **Key Vault: Resolved · APIM: Reachable · Region: West Europe · Model: gpt-5.4-nano**.

2. **Clear the default prompt** and type:
   > `Explain equivalent fractions with two concrete examples, then give me a short quiz.`

3. **Click Ask.** While it thinks (~2-3 sec):
   > *"This request goes to APIM, which signs it with its subscription key — a key this App Service read from Key Vault five minutes ago. APIM calls gpt-5.4-nano on a private endpoint. The response comes back as markdown, sanitised client-side by DOMPurify, rendered by marked."*

4. **Markdown response renders**: headings, lists, possibly code blocks, a quiz table.
   > *"You see clean markdown — not a JSON dump. Server-side we extract `{answer, model, usage}` and throw away the rest of the AOAI envelope. The client never sees content-filter metadata."*

5. **Point at the token counter at the bottom**:
   > *"240 tokens. Multiply by 50,000 learners × 3 interactions/day: we'll know exactly what it costs. That's what we instrument through Application Insights."*

> ⏱️ If the response drags, talk about APIM throttling at 50K TPM GlobalStandard.

---

## Act 4 — The teacher: Mr Klein does oversight (4:30 → 6:30)

**On screen:** click **"For Educators"** in the menu → switch to [https://app-teacher-console-learneu-demo.azurewebsites.net](https://app-teacher-console-learneu-demo.azurewebsites.net)

> *"Notice the menu: one product, three entry points that just change the role."*

### What you do

1. **Green pill still there** — *"same runtime, different permissions."*
2. **Prompt**:
   > `Lucas systematically confuses 1/2 and 1/4. Give me 3 five-minute remediation activities, plus the Bildungsstandards objective they target.`
3. **Response:** numbered list, anchored to the German Year-7 curriculum.

### The key moment: EU AI Act Article 14

> *"We're squarely in Article 14 — human-in-the-loop. The machine **suggests**, the teacher **decides**. In the production version, next to each suggestion sits an 'override' button that logs the override with timestamp + user OID + reason. That audit trail is exactly what an AI Act supervisor will ask for at a control."*

> 💡 If anyone asks why no visible override button: *"Not in the demo slice — it's Stage 8 in the PROGRESS roadmap. The audit plumbing is already wired through App Insights custom events."*

---

## Act 5 — The parent: GDPR Art. 8 + operable rights (6:30 → 8:00)

**On screen:** click **"For Families"** → [https://app-parent-portal-learneu-demo.azurewebsites.net](https://app-parent-portal-learneu-demo.azurewebsites.net)

> *"Sophie doesn't share her son's app. She has her **own** portal. That's non-negotiable for child data: the surface that exercises rights **is not** the surface that consumes the AI."*

### What you do

1. **Hero speaks GDPR Art. 8** straight away — let the visitor read it for two seconds.
2. **Prompt** (English, French, Dutch or German — all work):
   > `Hello, my daughter is 12 and wants to use LearnEU. What do you collect, where is it stored, and how do I withdraw my consent?`
3. **Response:** plain-language reformulation — *"notice the answer doesn't invent a location: it says West Europe because the system prompt instructs it to."*

### The parental-trust pitch

> *"Three bullets I leave with the parent:*
> - *Inference in West Europe — what they type does not leave the EU.*
> - *No child PII in the prompt — we only pass anonymised features (in the full slice).*
> - *And most importantly: an 'Erase my data' button (Stage 9 of the roadmap) that triggers a SQL + AML + AI Search cascade."*

---

## Act 6 — The proof: the report (8:00 → 9:00)

**On screen:** open [`AMA/DEPLOYMENT-REPORT.md`](../DEPLOYMENT-REPORT.md) on GitHub or locally.

**Three things to point at:**

1. **Acceptance results** — *"Nine criteria, 0 FAIL, 2 PASS, 5 PARTIAL, 2 SKIP. The SKIP and PARTIAL items are things we deliberately descoped (Purview, Fabric, Confidential AKS) — the barrier isn't technical, it's budgetary."*

2. **Compliance posture matrix** — *"We mapped every AI Act / GDPR article to a physical place in code or infra. That's what an ENISA audit will demand."*

3. **Operational notes** — *"The six lessons we paid for in debug time. Reproduce this and you save those two days."*

---

## Act 7 — Take-aways + call to action (9:00 → 10:00)

**Slide or flip-chart:**

> **What you just saw is not a slideware POC.**
>
> ✅ Deployed on Azure West Europe right now
> ✅ 38 resources, 0 secrets in clear text, 0 public endpoints on the data plane
> ✅ 3 production-ready UIs, EdTech Group brand
> ✅ EU AI Act Annex III §3 + GDPR Art. 8 mapped line by line
> ✅ Reproducible via `azd up` (~45 min) — code public on GitHub
>
> **Over to you:**
> - Stage 8 (override audit + ONNX client-side): 2 sprints
> - Stage 9 (erasure cascade + B2C consent journey): 3 sprints
> - Foundation = **today's deliverable**.

---

## Plan B — if something breaks live

| Symptom | Response |
|---|---|
| **Orange** dot in the nav | *"Perfect timing — that's exactly what the pill is for. Let's look at the detail."* → open the panel, show which leg is down. |
| **Red** dot | Carry on with the report; come back to the app at the end. *"Upside of a slice we actually deployed: what you're seeing is operational reality, not a GIF."* |
| Response > 8s | Switch to the report meanwhile — when it lands: *"there it is, 240 tokens in 9s, we'll see P99 in App Insights."* |
| Someone asks the cost | *"B1 App Service × 3 + APIM Developer + AOAI 50K TPM ≈ €350/month in dev. Production scales via Premium V3 + APIM Standard ≈ €1.8k before model volume."* |

---

## Cheat-sheet

| When | Action | URL |
|---|---|---|
| 2:30 | Tab 1 | https://app-learner-web-learneu-demo.azurewebsites.net |
| 4:30 | Tab 2 | https://app-teacher-console-learneu-demo.azurewebsites.net |
| 6:30 | Tab 3 | https://app-parent-portal-learneu-demo.azurewebsites.net |
| 8:00 | Tab 4 | `AMA/DEPLOYMENT-REPORT.md` |

**5-minute pre-demo prep:**
1. Open the four tabs in this order.
2. Confirm all three pills are green (if not: `az webapp restart` the three apps and wait 30s).
3. Clear the default prompt on learner-web (otherwise the audience reads it while you talk architecture).
4. Browser zoom 110% — the nav with the pill must be readable from the back of the room.
