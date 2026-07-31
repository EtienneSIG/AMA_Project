# LearnEU — Compliance Dossier

> **Status:** consolidation layer. This folder assembles the **cross-cutting** compliance
> deliverables that were previously only present as **per-feature** fragments inside
> `specs/<NNN>/`. It does **not** replace them — it indexes and rolls them up.
>
> Additive only: creating this folder changes **no** application code or infrastructure.

## Contents

| Deliverable | Path | Owner | Status |
|---|---|---|---|
| DPIA per market (NL/BE/DE/PL/RO) | [dpia/](dpia/) | DPO / GDPR Children's Data Specialist | 🟡 Skeletons drafted — awaiting DPO sign-off + local-counsel review |
| AI Act Annex IV conformity dossier (consolidated) | [annex-iv/](annex-iv/) | EU AI Act Compliance Officer | 🟡 Index assembled over per-feature fragments — CE-marking package pending |
| Production hardening plan (beyond demo SKUs) | [production-hardening-plan.md](production-hardening-plan.md) | Platform / Cloud Architect | 🟡 Plan documented — not yet executed (demo runs on demo SKUs by design) |

## How this maps to the rest of the repo

- **Per-feature DPIA deltas** live in each `specs/<NNN>/plan.md` (section *DPIA delta*) and,
  where children's data is processed, in `specs/<NNN>/checklists/gdpr-art8-*.md`.
- **Per-feature Annex IV fragments** live in `specs/<NNN>/contracts/annex-iv-fragment.md`
  or `specs/<NNN>/checklists/annex-iv-fragment.md`.
- The programme-level compliance narrative is in [../plan/04-compliance-eu-ai-act-gdpr.md](../plan/04-compliance-eu-ai-act-gdpr.md).
- The seven non-negotiable principles are in [../.specify/memory/constitution.md](../.specify/memory/constitution.md).

## Sign-off gates (unchecked until the accountable role approves)

- [ ] DPO signs each per-market DPIA after local-counsel review.
- [ ] EU AI Act Compliance Officer freezes the Annex IV technical file per released AI system.
- [ ] Responsible AI Evaluator + Cross-Agent QA Verifier confirm the dossier before any production go-live.
