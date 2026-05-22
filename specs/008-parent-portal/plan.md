# Implementation Plan: Parent Portal — GDPR Art. 8 Guardian Consent

**Branch**: `008-parent-portal` | **Date**: 2026-05-22 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/008-parent-portal/spec.md`

**Note**: This is the back-port plan for `demo/apps/parent-portal/`, which
shipped without a spec set. Authored by EdTech Program Orchestrator with
GDPR Children's Data Specialist and EU AI Act CO as co-signers.

## Summary

Back-port a complete spec set for the Parent Portal so the existing
`demo/apps/parent-portal/` is governed under the constitution (Principle VII).
The portal lets a guardian sign in, view their child's unit and
AI-personalisation status, and grant or withdraw consent. The plan adds a
tamper-evident consent ledger, a teacher-notification origin
(`parent-consent-change`), and a server-side capability flag that gates AI
features for under-16 learners without active consent.

## Technical Context

**Language/Version**: Node.js 20 (Express) — same stack as `learner-web` and
`teacher-console`; shared TypeScript types in `demo/apps/_shared/`.

**Primary Dependencies**: `_shared/` middleware (auth, CSRF, rate-limit,
Content Safety stub for free-text fields), the school identity provider
adapter (`demo/apps/_shared/idp.js`), Azure SQL Database for the
`consent_ledger` table, Azure Service Bus for the teacher-notification queue.

**Storage**: Azure SQL Database (EU North). New table
`consent_ledger(id, child_id, actor_id, state, scope, created_at, prev_entry_hash)`
with `prev_entry_hash` chained to make the ledger append-only and tamper-evident.

**Testing**: Playwright smoke for the three user stories
(`demo/tests/smoke/parent-portal.spec.ts`), a contract test for the
notification emission (`demo/tests/contract/parent-consent-notification.test.ts`),
and a unit test for the under-13 server-side floor.

**Target Platform**: Parent device — desktop and mobile browsers (Chrome,
Safari, Edge stable). No native mobile app in scope.

**Project Type**: Web application — third sibling to `learner-web` and
`teacher-console`, served under the same APIM gateway.

**Performance Goals**: Consent toggle round-trip ≤ 500 ms p95; capability-flag
read by learner-web ≤ 50 ms p95 (cached in session).

**Constraints**: EU-only data path (Principle I), under-13 server-side floor
(FR-012), no learner free-text in the parent UI (FR-007), no new third-party
SDK (FR-010), localised copy in NL, DE, PL, RO, FR-BE (FR-009).

**Scale/Scope**: 1 portal × ~3 000 guardians × ~1.5 children per guardian =
~4 500 child records at GA; tens of consent state changes per day at GA.

## Constitution Check

| Principle | Gate | How this plan complies |
|-----------|------|------------------------|
| I. EU-resident, data-minimised | PASS | All storage in EU North; minimal new schema (one append-only table). |
| II. GDPR Art. 8 children | PASS | This **is** the guardian-consent surface; age-16 default and under-13 floor enforced server-side. |
| III. EU AI Act high-risk | PASS | No new inference path; the portal *controls* whether existing high-risk surfaces serve a given child. |
| IV. Teacher-in-the-loop | PASS | Every consent change emits a teacher-console notification (FR-006). |
| V. Pedagogical sign-off | N/A | No learner-facing copy. RAI sign-off on consent UX strings recorded instead. |
| VI. Outcome-contract driven | PASS | SC-001 is the auditability gate; maintains lawful AI-personalisation that drives the −26 % outcome-gap KPI. |
| VII. Reproducible, spec-driven | PASS (after this back-port merges) | Closes the missing-spec breach surfaced in `Subject/AMA_Rubric_Evaluation.md`. |

**EU AI Act articles touched**:

| Article | Surface affected | Evidence |
|---------|------------------|----------|
| Art. 9 — risk management | Net risk reduction: a withdrawn consent forces the non-AI baseline. | Risk register row 12 (parent-portal) updated. |
| Art. 10 — data governance | No training data change. New transactional table only. | `consent_ledger` schema in `demo/scripts/db-sync.ps1`. |
| Art. 12 — record-keeping | New evidence stream: every consent change logged with actor + timestamp + chained hash. | `consent_ledger` + structured logs. |
| Art. 13 — transparency | Parent sees status, unit, ledger entries; plain-language consent modal. | UI copy in `demo/apps/parent-portal/locales/`. |
| Art. 14 — human oversight | Teacher console receives a notification per consent change; teacher override still wins. | `parent-consent-change` notification origin. |

**DPIA delta**: ✅ requires an update to `demo/compliance/dpia-learnEU-v1.md`:

- New processing purpose: *guardian consent management*.
- New data category: *guardian identity + parental-responsibility claim*.
- New retention: consent ledger retained for 7 years (legal-basis evidence);
  pseudonymous child identifiers only.
- New recipient: none (the teacher console is an internal recipient via
  Service Bus inside the EU tenant).

**Human-oversight surface**: The teacher console review queue receives a
`parent-consent-change` notification within ≤ 30 s of the change. Teacher
overrides still take precedence for the duration of the override
(edge-case in spec.md). The under-13 floor is enforced server-side and
is not overridable by parent action.

## Project Structure

### Documentation (this feature)

```text
specs/008-parent-portal/
├── spec.md
├── plan.md                       # THIS FILE
├── checklists/
│   └── compliance.md
└── tasks.md
```

### Source Code (repository root)

```text
demo/
├── apps/
│   ├── parent-portal/            # Existing — back-ported under this spec
│   │   ├── public/
│   │   │   ├── index.html
│   │   │   ├── js/
│   │   │   │   ├── dashboard.js          # US1
│   │   │   │   ├── child-card.js         # US2
│   │   │   │   └── consent-toggle.js     # US3
│   │   │   └── css/
│   │   ├── routes/
│   │   │   ├── auth.js                   # parent-scoped sign-in
│   │   │   ├── children.js               # GET /parent/children
│   │   │   └── consent.js                # POST /parent/consent
│   │   ├── services/
│   │   │   ├── consent-ledger.js         # append-only writer
│   │   │   └── teacher-notify.js         # Service Bus emit
│   │   └── locales/
│   │       └── nl-NL.json  de-DE.json  pl-PL.json  ro-RO.json  fr-BE.json
│   └── _shared/                          # auth, csrf, rate-limit, idp (unchanged)
│
├── scripts/
│   ├── db-sync.ps1                       # CREATE TABLE consent_ledger
│   └── db-verify.ps1                     # assert chain integrity
│
├── compliance/
│   └── dpia-learnEU-v1.md                # delta: §"Parent Portal"
│
└── tests/
    ├── smoke/parent-portal.spec.ts
    ├── contract/parent-consent-notification.test.ts
    └── unit/parent-portal-under13-floor.test.ts
```

**Structure Decision**: Web application, third sibling under `demo/apps/`,
reusing the canonical `_shared/` middleware. One new table, one new
notification origin, zero new outbound calls.

## Complexity Tracking

> No constitutional violations to justify. The tamper-evident ledger is the
> minimum design that satisfies Art. 12 auditability and the GDPR Art. 8
> guardian-consent contract; a simpler ledger without chained hashes was
> rejected because it does not give the auditor a tamper-evidence guarantee.
