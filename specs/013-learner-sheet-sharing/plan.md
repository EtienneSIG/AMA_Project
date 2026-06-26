# Implementation Plan: Learner Sheet & Item Sharing

**Branch**: `013-learner-sheet-sharing` | **Date**: 2026-06-26 | **Spec**: `/specs/013-learner-sheet-sharing/spec.md`

**Input**: Feature specification from `/specs/013-learner-sheet-sharing/spec.md`

## Summary

Let a learner share an **item** or a **sheet** (named collection of items) with **same-class** peers as **read-only** copies, with an optional note that is **Content-Safety scanned** before delivery. Recipients work shared sheets against **their own** account only (sender progress isolated). Senders can **revoke** at any time; **teachers** see a per-class sharing log and can **disable** sharing per learner/class; under-16 sharing is **gated on active parental consent** for both parties; sharing is restricted to the **EU-resident in-class roster** (no external recipients); a full **audit trail** supports data-subject rights. Extends `demo/apps/learner-web` (share/receive) + `demo/apps/teacher-console` (log/control) + `_shared/db`; reuses `contentSafety.js` + Feature 006 consent + the existing `sheets` table.

## Technical Context

**Language/Version**: Node.js 22.x; learner-web + teacher-console front-ends; `_shared/db` (PostgreSQL).

**Primary Dependencies**: `express`, `pg`, `@azure/identity`; reuse `contentSafety.js` + `logContentSafety()`, Feature 006 consent state, and the existing `sheets` table + class roster / learner-teacher mapping.

**Storage**: PostgreSQL (`_shared/db`): new `share`, `shared_artifact_snapshot`, `sharing_policy`, `moderation_verdict` (or reuse `content_safety_results`) tables. EU-resident; no new PII classes beyond an optional moderated note.

**Testing**: Extend `demo/scripts/` verification (same-class only, read-only, note moderation, revoke, teacher disable, consent gating, audit); quickstart.

**Target Platform**: Azure App Service Linux (learner-web + teacher-console); EU-resident.

**Project Type**: Web application — peer sharing within a class.

**Performance Goals**: Recipient notified within **5 s** of a share (p95); share completed in ≤3 interactions.

**Constraints**:
- Recipients drawn **only** from the sender's class roster; **no external recipients**, no email of learner content outside the platform, no cross-EU transfer.
- Shares are **read-only**; recipient attempts recorded only against the recipient.
- Notes **Content-Safety scanned**; flagged → teacher moderation.
- Under-16: active parental consent for **both** sender and recipient.
- Full audit trail (share/unshare/moderation) for data-subject rights + Art. 12.

**Scale/Scope**: In-class peer sharing (not a public social feed) — no profiles/followers/discovery.

## Constitution Check

| Principle | Status | Plan handling |
|---|---|---|
| I. EU-Resident, Data-Minimised | PASS | Shares stay inside the EU-resident roster; no external recipients; only existing pedagogical content + an optional moderated note. |
| II. GDPR Art. 8 | PASS | Under-16 sharing gated on active parental consent (both parties); full audit supports data-subject rights. |
| III. EU AI Act high-risk | PASS (N/A new AI) | No new AI decisioning; the only AI is the existing Content Safety moderation, with logging + teacher override. |
| IV. Teacher-in-the-loop | PASS | Teachers view, moderate, and disable all sharing; flagged notes require teacher approval. |
| V. Pedagogical sign-off | PASS | Peer sharing reviewed by Learning Sciences for ZPD-appropriate collaboration (in-class practice, not social media). |
| VI. Outcome-contract driven | PASS | SC-005 ties peer-supported practice to the −26% outcome-gap KPI. |
| VII. Reproducible, spec-driven | PASS | Independently testable stories + measurable criteria; quickstart included. |

**EU AI Act articles touched**: Art. 12 (share/moderation/revoke logging), Art. 14 (teacher moderation/disable). No new high-risk AI is introduced; Content Safety reused.

**DPIA delta**: **Low.** New: share records + optional moderated note + read-only snapshots, all EU-resident, in-class only. No new sensitive categories. Mitigations: same-class restriction, consent gating, content-safety on notes, full audit, revoke.

**Human oversight surface**: teacher per-class sharing log + per-learner/class disable + note moderation queue.

## Project Structure

### Documentation (this feature)
```text
specs/013-learner-sheet-sharing/
├── plan.md · research.md · data-model.md · quickstart.md · tasks.md
└── contracts/sharing-api.md
```

### Source Code
```text
demo/apps/
├── learner-web/        # EXTEND: share item/sheet to same-class peers, receive read-only, decline/block, revoke
├── teacher-console/    # EXTEND: per-class sharing log + disable per learner/class + note moderation queue
└── _shared/db/
    ├── schema.sql      # NEW: share, shared_artifact_snapshot, sharing_policy (+ reuse content_safety_results)
    └── index.js        # NEW helpers: create/revoke share, snapshot, roster check, consent gate, audit
```

**Structure Decision**: Extend learner-web with a share action that resolves eligible recipients **only** from the sender's class roster, snapshots the item/sheet as a read-only copy, scans any note via Content Safety, and notifies the recipient. Recipient work writes to their own account only. Teacher-console gains the sharing log + disable + moderation queue. Reuse `content_safety_results` for the moderation verdict and Feature 006 consent for under-16 gating.

## Complexity Tracking

> No constitution violations. Net-new: share/snapshot records + sharing policy. Reuses Content Safety, consent, roster, and the `sheets` table — no new AI, no external recipients, no new sensitive data.
