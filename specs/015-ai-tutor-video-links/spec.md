# Feature Specification: AI Tutor — Illustrative External Video Links

**Feature Branch**: `015-ai-tutor-video-links`

**Created**: 2026-06-26

**Status**: Draft

**Input**: User description: "For the AI tutor, the answer can/should include external links to YouTube videos that explain the concept, to illustrate it."

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Tutor Suggests a Vetted Explainer Video (Priority: P1)

A learner asks the AI tutor to explain a concept (e.g., "what is a fraction?"). Alongside the written explanation, the tutor offers one or more links to short external videos (e.g., YouTube) that visually explain the concept. The links come from an allow-listed, age-appropriate, curriculum-aligned catalogue, are clearly labelled as external, and open safely.

**Why this priority**: Adding an illustrative video to the tutor's answer is the core requested capability and the smallest valuable slice; multimodal explanation supports diverse learners (UDL) when sourced safely.

**Independent Test**: Ask the tutor about a concept that has catalogued videos; confirm the written answer includes 1–3 clearly-labelled external video suggestions with title, source, and duration, each from the allow-list.

**Acceptance Scenarios**:

1. **Given** a learner asks the tutor about a concept with curated videos available, **When** the tutor responds, **Then** it includes a written explanation plus up to **3** suggested videos, each showing title, source, duration, and an "opens external site" indicator.
2. **Given** the tutor proposes a video, **When** the suggestion is rendered, **Then** the video URL is verified against an allow-list of approved channels/videos before being shown; non-allow-listed links are never displayed to the learner.
3. **Given** no curated video matches the concept, **When** the tutor responds, **Then** it returns the written explanation only and does not fabricate or freely web-search a link.
4. **Given** a learner opens a suggested video, **When** they click it, **Then** they receive a transparency notice that they are leaving to an external site and the click is logged for AI Act traceability.

---

### User Story 2 — Privacy-Preserving Embedding & No Tracking (Priority: P1)

When a video is shown, it is presented in a privacy-protective way (privacy-enhanced embed or external link with no autoplay), avoiding third-party tracking cookies and sending no learner identifiers to the external platform.

**Why this priority**: Constitution principles I and II forbid leaking children's data to third parties; any embed of external media must be privacy-preserving by design.

**Independent Test**: Open a suggested video and inspect outbound requests; confirm no learner identifiers, no third-party advertising/tracking cookies, and no autoplay before consent.

**Acceptance Scenarios**:

1. **Given** a video is embedded or linked, **When** it loads, **Then** no learner PII or account identifiers are transmitted to the external platform, and tracking cookies are blocked or privacy-enhanced mode is used.
2. **Given** a learner under 16, **When** a video is suggested, **Then** playback respects parental-consent and child-safety settings (e.g., restricted mode), and no behavioural advertising context is created.

---

### User Story 3 — Teacher Curation & Override of the Video Catalogue (Priority: P1)

Teachers (and content/localisation leads) curate the allow-list catalogue: adding approved videos per concept, removing or replacing links, and flagging unsuitable suggestions. Teachers can disable video suggestions for a class or learner.

**Why this priority**: Constitution IV (teacher-in-the-loop) and V (pedagogical sign-off) require that any external content shown to children is teacher-approved, not autonomously chosen by the model.

**Independent Test**: A teacher adds a video to the catalogue for a concept and removes another; confirm the tutor only suggests catalogued videos and never the removed one.

**Acceptance Scenarios**:

1. **Given** a teacher curates the catalogue, **When** they approve a video for a concept, **Then** it becomes eligible for tutor suggestion; **When** they remove one, **Then** it is never suggested again.
2. **Given** a teacher disables video suggestions for a learner/class, **When** that learner uses the tutor, **Then** no external video links are shown.
3. **Given** a learner or teacher reports a suggested video as unsuitable, **When** the report is filed, **Then** the video is suppressed pending review and the report is logged.

### Edge Cases

- Suggested video is later removed or made private on the external platform: link validity is periodically checked; dead/changed links are hidden and flagged for re-curation.
- Model attempts to output a non-allow-listed or fabricated URL: the link is stripped and not shown; only catalogue-matched links are rendered.
- External platform is region-blocked or unavailable in a market: a fallback (alternative catalogued video or text-only) is provided.
- Video has ads or unsuitable recommendations: privacy-enhanced/restricted mode is used; only the specific video is surfaced, not a recommendation feed.
- Concept maps to many videos: the tutor surfaces at most a small, ranked, age-appropriate subset.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The AI tutor MUST be able to attach up to a small bounded number (default **3**) of illustrative external video suggestions to a written explanation.
- **FR-002**: Every suggested video URL MUST be validated against a teacher-curated allow-list before display; non-allow-listed or model-fabricated URLs MUST never be shown to learners.
- **FR-003**: Each suggestion MUST display title, source/channel, duration, and a clear "external site" transparency indicator.
- **FR-004**: Videos MUST be presented in a privacy-preserving manner (privacy-enhanced embed or plain external link, no autoplay) that transmits no learner PII/identifiers and blocks third-party tracking/advertising.
- **FR-005**: For under-16 learners, video presentation MUST respect parental consent and child-safety (restricted) settings.
- **FR-006**: Teachers and content leads MUST be able to add, remove, replace, and disable videos in the catalogue per concept, per class, and per learner.
- **FR-007**: System MUST log every video suggestion and every learner click (AI Act traceability, Art. 12) without storing third-party tracking data.
- **FR-008**: Learners/teachers MUST be able to report a suggested video as unsuitable, which suppresses it pending review.
- **FR-009**: System MUST periodically verify link health and hide dead/private/changed links pending re-curation.
- **FR-010**: When no suitable catalogued video exists, the tutor MUST return a text-only answer and MUST NOT free-web-search or invent a link.

### Key Entities

- **VideoCatalogueEntry**: An approved external video for a concept (URL, source, title, duration, age band, market/language, curator, status).
- **VideoSuggestion**: A tutor-generated suggestion event linking a learner question, the concept, and the catalogued videos shown.
- **VideoSuggestionLog**: Traceability record of suggestions and clicks for AI Act logging and data-subject rights.
- **VideoReport**: A learner/teacher report flagging a video as unsuitable, with review status.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: **100%** of displayed video links originate from the teacher-curated allow-list; **0%** are fabricated or free-web-searched (verified by audit).
- **SC-002**: **0** learner PII/identifiers are transmitted to external video platforms; tracking cookies are blocked in **100%** of video presentations.
- **SC-003**: **100%** of video suggestions and clicks are logged for AI Act traceability.
- **SC-004**: For under-16 learners, **100%** of video presentations respect parental consent and restricted-mode settings.
- **SC-005**: Reported/dead videos are suppressed within the defined review window in **100%** of cases.
- **SC-006**: Multimodal (text + video) explanations measurably help learners reach concept mastery, supporting the −26% outcome-gap KPI for visual learners.

## Assumptions

- A curated, curriculum-aligned video catalogue is maintained by teachers / content-localisation leads; this spec defines the mechanism, not the full catalogue.
- The AI tutor explanation feature already exists (or is specified elsewhere); this spec adds the *vetted video suggestion* layer to it.
- A privacy-enhanced embedding mode (or safe external-link pattern) is technically available for the chosen video platform(s).
- External video platforms remain third-party; no learner data may be shared with them.

## Constitution Check

| Principle | How this spec complies |
|---|---|
| I. EU-Resident, Data-Minimised | Privacy-preserving embeds transmit no learner PII to external platforms; only an allow-list of approved videos is referenced. |
| II. GDPR Art. 8 | Under-16 video presentation respects parental consent and restricted mode; no behavioural advertising or third-party tracking of children. |
| III. EU AI Act high-risk | Tutor suggestions are bounded to a vetted catalogue (no fabricated links), fully logged (Art. 12), with transparency notices (Art. 13) and teacher override (Art. 14). |
| IV. Teacher-in-the-loop | Teachers curate the catalogue and can disable suggestions per learner/class; nothing external is shown without prior teacher approval. |
| V. Pedagogical sign-off | Videos are curriculum-aligned and Learning-Sciences-reviewed for age-appropriateness and ZPD fit. |
| VI. Outcome-contract driven | SC-006 ties multimodal explanation to the −26% outcome-gap KPI. |
| VII. Reproducible, spec-driven | Allow-list mechanism and logging are independently testable with measurable success criteria. |
