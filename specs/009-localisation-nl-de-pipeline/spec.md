# Feature Specification: Localisation NL→DE Pipeline (E2E)

**Feature Branch**: `009-localisation-nl-de-pipeline`

**Created**: 2026-05-22

**Status**: Draft (Wave 2 of `Subject/ama-rubric-remediation-plan.md` — closes the
"localisation pipeline not E2E" gap on rubric category #5).

**Input**: User description: "Deliver an end-to-end NL→DE localisation pipeline
for one curriculum unit. Ingest source → AOAI translation with the LearnEU
glossary → human reviewer queue in the Teacher Console → publish validated DE
version with provenance, never sending learner PII into prompts."

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Ingest a NL source unit (Priority: P1)

The Content Localisation Lead uploads `demo/data/math_unit_fractions.md` to
the pipeline. The system records the source unit, computes a content hash and
queues it for translation. No PII ever enters the pipeline (curriculum content
only).

**Why this priority**: Without ingestion there is no pipeline. This is the
gating MVP for the rubric category #5 score.

**Independent Test**: Run `demo/pipelines/localisation/localise.ps1 -SourceUnit demo/data/math_unit_fractions.md -TargetLocale de-DE`
and verify a row appears in the `localisation_jobs` table with `status =
"queued"`, `source_hash` populated and `target_locale = "de-DE"`.

**Acceptance Scenarios**:

1. **Given** a NL source unit file, **When** the Lead runs the ingest
   command, **Then** the pipeline creates a job, computes the source hash
   and stores the file under `demo/pipelines/localisation/runs/<job_id>/source.md`.
2. **Given** the source contains a glossary-protected term (e.g. *"breuk"*),
   **When** the ingest validator runs, **Then** the term is flagged for
   strict pass-through in the translation step.

---

### User Story 2 — AOAI translation with the LearnEU glossary (Priority: P2)

The pipeline submits the source content to Azure OpenAI through APIM, with
the LearnEU glossary attached as a system prompt fragment. The output is
scanned by Content Safety; the response is stored alongside the job for
reviewer inspection.

**Why this priority**: This is the inference step. Without it, no DE artefact
exists.

**Independent Test**: After ingest, run the translation step; verify a
`translation.md` file exists under the job folder, the prompt hash is logged
in `localisation_jobs.translation_prompt_hash`, the model version is recorded,
and the Content Safety verdict is `accept`.

**Acceptance Scenarios**:

1. **Given** an ingested job, **When** the translation step runs, **Then**
   the AOAI call uses the LearnEU glossary system prompt, no learner PII is
   present in the payload (audited via prompt-hash sample), and the response
   is stored.
2. **Given** the Content Safety verdict is `reject`, **When** the pipeline
   processes the response, **Then** the job moves to status
   `safety_rejected` and is **not** offered to the reviewer queue.

---

### User Story 3 — Teacher reviewer queue and accept / reject (Priority: P3)

The Teacher Console exposes a "Localisation review" queue. The reviewer can
read source and translation side-by-side, accept or reject with a comment, and
the decision is logged. Accept publishes the DE version with provenance.

**Why this priority**: The teacher-in-the-loop gate (AI Act Art. 14) is a
hard requirement for any AI-generated curriculum artefact to ship.

**Independent Test**: With a `translated` job, sign in as a reviewer, open
the queue item, click **Accept**; verify the DE JSON appears at
`demo/apps/learner-web/data/curricula/de-bildungsstandards-math-y7.json`
with provenance metadata (source unit id, model version, reviewer id,
timestamp).

**Acceptance Scenarios**:

1. **Given** a `translated` job, **When** a reviewer accepts, **Then** the
   pipeline writes the DE JSON to the learner-web curricula folder with
   `provenance = { source_unit_id, source_hash, translator_model_version,
   reviewer_id, accepted_at }`.
2. **Given** the reviewer rejects with a comment, **When** the rejection is
   submitted, **Then** the job moves to `rejected`, the comment is logged
   and no DE artefact is published.
3. **Given** an accepted job, **When** another reviewer opens the queue,
   **Then** the item no longer appears (idempotent publication).

### Edge Cases

- A glossary-term violation in the translation (e.g. *"Bruch"* missing where
  expected) MUST be highlighted in the diff view shown to the reviewer.
- A reviewer who is also the requester is rejected (separation of duties).
- A re-translation request creates a new job with `parent_job_id` set; the
  reviewer can compare against the previously accepted version.
- Pipeline retries on transient APIM failure; permanent failure moves the
  job to `failed` and emits a notification to the Localisation Lead.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The pipeline MUST be invokable from a single PowerShell entry
  point under `demo/pipelines/localisation/localise.ps1`.
- **FR-002**: Ingest MUST record `source_unit_id`, `source_hash`,
  `target_locale`, `created_by`, and the raw source file under the job folder.
- **FR-003**: Translation MUST go through APIM to Azure OpenAI in EU North;
  the request MUST attach the LearnEU glossary as a system-prompt fragment.
- **FR-004**: The pipeline MUST NEVER include learner PII in any prompt
  (curriculum content only); a contract test MUST enforce this.
- **FR-005**: Every translation response MUST be scanned by Content Safety;
  a `reject` verdict gates the job out of the reviewer queue.
- **FR-006**: The Teacher Console MUST expose a "Localisation review" queue
  showing source and translation side-by-side with a glossary-term diff
  highlight.
- **FR-007**: A reviewer MUST be able to accept or reject with a comment;
  the decision MUST be logged with reviewer id and timestamp.
- **FR-008**: On accept, the pipeline MUST publish the DE artefact under
  `demo/apps/learner-web/data/curricula/<target-locale>-…json` with full
  provenance metadata (source unit id, source hash, model version, reviewer
  id, accepted_at).
- **FR-009**: The pipeline MUST record a run report under
  `demo/pipelines/localisation/runs/<job_id>/RUN.md` with timings, prompt
  hash, model version, safety verdict and reviewer decision.
- **FR-010**: Separation of duties: the reviewer MUST NOT be the requester.
- **FR-011**: The pipeline MUST be idempotent on accept (a second accept on
  the same job is a no-op).

### Key Entities

- **LocalisationJob**: (`id`, `source_unit_id`, `source_hash`,
  `target_locale`, `status` ∈ {`queued`,`translated`,`safety_rejected`,
  `accepted`,`rejected`,`failed`}, `parent_job_id?`, `created_by`,
  `created_at`).
- **TranslationArtifact**: (`job_id`, `model_version`, `prompt_hash`,
  `content_safety_verdict`, `content_path`).
- **ReviewerDecision**: (`job_id`, `reviewer_id`, `decision` ∈
  {`accepted`,`rejected`}, `comment`, `decided_at`).
- **PublishedCurriculum**: existing artefact, new `provenance` metadata
  block added.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: One complete unit reaches the DE shelf in **≤ 6 weeks** elapsed
  in production (proxy: **≤ 6 minutes pipeline time** for the demo run).
- **SC-002**: Reviewer overhead ≤ **30 minutes per unit** measured on the
  demo unit (`demo/data/math_unit_fractions.md`).
- **SC-003**: **Zero glossary-term violations** in the published artefact
  (validated by the post-publish linter).
- **SC-004**: **Zero learner PII** present in any AI prompt for the run
  (audited by prompt-hash sampling on every translation call).
- **SC-005**: **100 %** of accepted jobs carry full provenance metadata.
- **SC-006**: `demo/DEPLOYMENT-REPORT.md` localisation row moves
  **PARTIAL → PASS** within the same release cycle.

## Assumptions

- The Teacher Console already supports queue surfaces (reused from existing
  features 002/005).
- APIM exposes the AOAI EU North deployment used by `learner-web`.
- The LearnEU glossary exists as `demo/data/glossaries/learnEU-nl-de.json`
  or will be created in Phase 2 of the tasks.
- `restitution/slides/slide-14-market-localisation.md` exists and can be
  amended with a link to the run report.

## Constitution Check

| Principle | How this spec complies |
|---|---|
| I. EU-Resident, Data-Minimised | All processing in EU North; curriculum content only, no PII. |
| II. GDPR Art. 8 | No personal data is processed by the pipeline. |
| III. EU AI Act high-risk | Reviewer queue is the human-oversight gate; provenance for Annex IV. |
| IV. Teacher-in-the-loop | Mandatory reviewer accept/reject before publication; separation of duties. |
| V. Pedagogical sign-off | Reviewer is a Learning Sciences-trained teacher; glossary review by Localisation Lead. |
| VI. Outcome-contract driven | SC-001 ≤ 6 weeks drives the market-readiness KPI; defends the −26 % outcome-gap target by enabling DE markets. |
| VII. Reproducible, spec-driven | Spec ships before pipeline code; runs are reproducible via RUN report. |
