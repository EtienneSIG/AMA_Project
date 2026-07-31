# DPIA per Market — LearnEU

Data Protection Impact Assessments (GDPR **Art. 35**) for each of the five launch markets.
The platform processes **children's** personal data (K-12), so a DPIA is **mandatory**
(Art. 35(3)(a)–(b): systematic evaluation + large-scale processing of a vulnerable group).

## Programme-wide baseline (applies to every market)

- **Controller:** LearnEU EdTech Group (Dutch parent) + each national operating entity as joint/independent controller per market.
- **Consent age:** **16** everywhere — the strictest of the five markets (NL). Under-16 requires **verifiable guardian consent** (GDPR Art. 8).
- **Residency:** EU regions only (`westeurope` for the demo). **No** transfer of personal data outside the EU.
- **Data classes:** pseudonymous learner id, attempt/mastery telemetry, moderated classroom communications, guardian-consent records. **No** biometric / emotion / facial data. **No** behavioural advertising. **No** autonomous grading.
- **Lawful basis:** public task / legitimate interest for pedagogy + **Art. 8 guardian consent** for under-16 processing; consent for optional comms.
- **Retention & erasure:** per-feature retention windows; **30-day erasure SLA**; rectification paths documented.
- **Feature-level DPIA deltas:** every feature records its delta in `specs/<NNN>/plan.md` → *DPIA delta*, and children's-data features add `specs/<NNN>/checklists/gdpr-art8-*.md`. These per-market DPIAs **aggregate** those deltas.

## Per-market DPIAs

| Market | Supervisory authority (DPA) | Statutory consent age | Primary language(s) | DPIA |
|---|---|---|---|---|
| 🇳🇱 Netherlands | Autoriteit Persoonsgegevens (AP) | 16 | nl-NL | [dpia-nl.md](dpia-nl.md) |
| 🇧🇪 Belgium | Gegevensbeschermingsautoriteit / APD (GBA) | 13 (programme applies 16) | nl-BE, fr-BE | [dpia-be.md](dpia-be.md) |
| 🇩🇪 Germany | BfDI + Länder DPAs | 16 | de-DE | [dpia-de.md](dpia-de.md) |
| 🇵🇱 Poland | UODO | 16 | pl-PL | [dpia-pl.md](dpia-pl.md) |
| 🇷🇴 Romania | ANSPDCP | 16 | ro-RO | [dpia-ro.md](dpia-ro.md) |

> **Rollout note (charter):** DPIA sign-off in all five markets is the Phase-0 gate.
> Sequencing is **NL → DE** first, then BE/PL/RO. See [../../plan/01-phases-roadmap.md](../../plan/01-phases-roadmap.md).

## Status

🟡 **Skeletons drafted.** Each DPIA follows the Art. 35(7) structure. They require:
1. DPO review + **local counsel** confirmation of national derogations (esp. consent age, school-context lawful basis).
2. Consultation with the national DPA where residual risk stays **high** (Art. 36).
3. Annual refresh + refresh on any major change (per constitution principle II).
