# Implementation Plan: AI Tutor — Illustrative External Video Links

**Branch**: `015-ai-tutor-video-links` | **Date**: 2026-06-26 | **Spec**: `/specs/015-ai-tutor-video-links/spec.md`

**Input**: Feature specification from `/specs/015-ai-tutor-video-links/spec.md`

> **Shared-tutor coordination**: Features **015** (video links) and **016** (voice mode) both extend the same AI tutor surface. They MUST share one tutor data model (`TutorSession`/`TutorTurn`); 015 attaches video suggestions to a `TutorTurn`. Plan/implement them together.

## Summary

Let the AI tutor attach up to **3** illustrative external explainer videos (e.g., YouTube) to a written answer, drawn **only** from a **teacher-curated allow-list** catalogue, shown with a clear "external site" transparency indicator, presented in a **privacy-preserving** way (privacy-enhanced embed / no autoplay, **no learner PII or tracking** sent to the third party), and **restricted-mode** for under-16 learners. Teachers curate the catalogue and can disable suggestions per learner/class; every suggestion and click is **logged for AI Act traceability**; when no catalogued video matches, the tutor returns text only and never fabricates or free-web-searches a link. Extends `demo/apps/learner-web` (tutor) + `demo/apps/teacher-console` (curation) + `_shared/db` (catalogue/log tables); reuses the existing Content Safety pattern.

## Technical Context

**Language/Version**: Node.js 22.x; learner-web + teacher-console front-ends (HTML/CSS/JS); `_shared/db` (PostgreSQL).

**Primary Dependencies**: `express`, `pg`, `@azure/identity` (baseline); privacy-enhanced embed via `youtube-nocookie.com` (or equivalent) in a sandboxed iframe; reuse `contentSafety.js` + `logContentSafety()`.

**Storage**: PostgreSQL (`_shared/db/schema.sql`): new `video_catalogue`, `video_suggestion_log`, `video_report` tables. EU-resident; **no learner PII sent to the video platform**.

**Testing**: Extend `demo/scripts/` verification (allow-list enforcement, no-PII/no-tracking on embed, under-16 restricted mode, logging of suggestions/clicks, text-only fallback); quickstart walkthrough.

**Target Platform**: Azure App Service Linux (learner-web + teacher-console); EU-resident.

**Project Type**: Web application — tutor enhancement + teacher curation surface.

**Performance Goals**: Video suggestions add ≤ **300 ms** to a tutor answer; embeds lazy-load (no autoplay); dead-link checks run async.

**Constraints**:
- Only **allow-listed** URLs displayed; **0** fabricated/free-web-searched links.
- Privacy-preserving embed: **no learner PII/identifiers** to the third party; tracking/advertising cookies blocked.
- Under-16: parental consent + restricted mode honoured; no behavioural advertising context.
- Every suggestion + click logged (Art. 12); learners/teachers can report a video → suppressed pending review.

**Scale/Scope**: One tutor surface + one teacher curation surface + a curriculum-aligned catalogue (teacher-maintained).

## Constitution Check

| Principle | Status | Plan handling |
|---|---|---|
| I. EU-Resident, Data-Minimised | PASS | Privacy-enhanced embeds send **no** learner PII to the third party; only an allow-list of approved videos is referenced; catalogue/logs EU-resident. |
| II. GDPR Art. 8 | PASS | Under-16 presentation respects parental consent + restricted mode; no behavioural advertising/tracking of children. |
| III. EU AI Act high-risk | PASS (with controls) | Tutor suggestions bounded to a vetted catalogue (no fabricated links), fully logged (Art. 12), with transparency notices (Art. 13) and teacher override (Art. 14); accuracy via curation + link-health checks (Art. 15). Annex IV fragment produced. |
| IV. Teacher-in-the-loop | PASS | Teachers curate the catalogue and disable suggestions per learner/class; nothing external shown without prior teacher approval. |
| V. Pedagogical sign-off | PASS | Videos curriculum-aligned + Learning-Sciences-reviewed for age-appropriateness and ZPD fit. |
| VI. Outcome-contract driven | PASS | SC-006 ties multimodal explanation to the −26% outcome-gap KPI for visual learners. |
| VII. Reproducible, spec-driven | PASS | Allow-list + logging independently testable with measurable criteria; quickstart included. |

**EU AI Act articles touched**: Art. 9 (risk: unsafe/dead/inappropriate external content → allow-list + reporting + link-health), Art. 10 (catalogue as governed reference data), Art. 12 (suggestion/click logging), Art. 13 (external-site transparency), Art. 14 (teacher curation/disable), Art. 15 (no fabricated links; restricted mode; privacy-enhanced embed).

**DPIA delta**: **Low-moderate.** New data: catalogue entries (non-personal), suggestion/click logs (pseudonymous, EU-resident), reports. Residual risk: third-party video platform — mitigated by privacy-enhanced embed (no PII), blocked tracking, restricted mode for minors. No new sensitive categories.

**Human oversight surface**: teacher catalogue curation + per-learner/class disable; report→suppress workflow; link-health suppression.

## Project Structure

### Documentation (this feature)
```text
specs/015-ai-tutor-video-links/
├── plan.md · research.md · data-model.md · quickstart.md · tasks.md
└── contracts/tutor-video-api.md
```

### Source Code
```text
demo/apps/
├── learner-web/
│   ├── server.js                 # EXTEND: attach allow-listed video suggestions to tutor answers; log clicks
│   └── public/                   # EXTEND: render suggestions (title/source/duration + "external" badge), sandboxed embed
├── teacher-console/
│   ├── server.js                 # NEW routes: catalogue CRUD + per-learner/class disable + report review
│   └── public/                   # NEW: curation UI
└── _shared/db/
    ├── schema.sql                # NEW: video_catalogue, video_suggestion_log, video_report
    └── index.js                  # NEW helpers: allow-list lookup, log suggestion/click, report
```

**Structure Decision**: Extend the learner-web tutor to attach video suggestions **validated against the allow-list server-side** (URLs never trusted from the model), rendered in a sandboxed privacy-enhanced iframe with a transparency badge. Teacher-console owns catalogue curation + disable + report review. All catalogue/log data lives in `_shared/db`. Reuse `contentSafety.js` for any free-text around suggestions.

## Complexity Tracking

> No constitution violations. Net-new: a teacher-curated catalogue + suggestion/click logging + privacy-enhanced embed. The tutor base is shared with Feature 016 (one `TutorTurn` model) — coordinate to avoid two tutor models.
