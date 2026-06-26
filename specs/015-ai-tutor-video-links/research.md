# Phase 0 Research — AI Tutor Illustrative Video Links

**Feature**: `015-ai-tutor-video-links` | **Date**: 2026-06-26

## R1 — Allow-list enforcement (no fabricated links)

- **Decision**: The tutor proposes a concept; the server selects up to 3 videos **only** from the teacher-curated `video_catalogue` matched to that concept. Any model-emitted URL is **stripped**; only catalogue rows are rendered.
- **Rationale**: Constitution III/Art. 15 — bound model output; prevents fabricated/free-web-searched or unsafe links.
- **Alternatives rejected**: letting the model return URLs (hallucination/safety risk); live web search (uncurated).

## R2 — Privacy-preserving embed

- **Decision**: Render via `youtube-nocookie.com` (privacy-enhanced) in a **sandboxed iframe**, no autoplay, no related-video feed; send **no** learner identifiers/cookies. Prefer an external link with transparency notice where embedding adds risk.
- **Rationale**: Principle I/II — no learner PII to third parties; no tracking/advertising for children.

## R3 — Under-16 handling

- **Decision**: For under-16 learners, gate on parental consent and apply restricted mode; no behavioural advertising context.
- **Rationale**: GDPR Art. 8; reuse the existing consent state (Feature 006).

## R4 — Logging & traceability

- **Decision**: Log every suggestion (concept, videos shown) and every click (which video) to `video_suggestion_log` — pseudonymous, EU-resident, **no third-party tracking data**.
- **Rationale**: Art. 12 traceability + data-subject rights.

## R5 — Curation, reporting, link health

- **Decision**: Teachers add/remove/replace/disable catalogue entries per concept/class/learner; learners/teachers report a video → suppressed pending review; a periodic link-health check hides dead/private/changed links.
- **Rationale**: Art. 14 human oversight + Art. 9 risk management.

## R6 — Shared tutor model with Feature 016

- **Decision**: Attach a `VideoSuggestion` to a shared `TutorTurn` (defined once across 015/016), not a separate tutor pipeline.
- **Rationale**: Avoids two competing tutor models (analysis finding D2).

### Open follow-ups (for /speckit.tasks)

- Confirm the privacy-enhanced embed/CSP/sandbox attributes and per-market availability fallback.
- Confirm catalogue seeding (initial curriculum-aligned videos) ownership with Localisation + Learning Sciences.
