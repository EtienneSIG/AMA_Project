# Feature Specification: Week-Plan Composer Agent

**Feature Branch**: `012-week-plan-composer-agent`

**Created**: 2026-05-22

**Status**: Draft (Wave 3 of `Subject/ama-rubric-remediation-plan.md` — closes the
"no runtime agentic surface in the deployed apps" gap on rubric category #9).

**Input**: User description: "Add a runtime agent loop to learner-web called the
Week-Plan Composer. Given a learner's current mastery state, draft a 5-day
study plan by chaining AI Search → Azure OpenAI → Content Safety. The proposed
plan is never auto-published; it is routed to the teacher review queue with a
diff against the previous plan. Teacher accept/edit/reject, every action
logged for AI Act Art. 12. On accept, publish to the learner's tabbed
workspace."

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Draft a week plan (Priority: P1)

The agent runs nightly (and on-demand from the teacher console) for every
opted-in learner. It chains: AI Search to retrieve ZPD-appropriate items
from the curriculum → Azure OpenAI to compose a pedagogical narrative →
Content Safety to scan the output. A *proposed* plan is persisted with
metadata: tools called, inputs (no learner PII), model version, prompt hash,
Content Safety verdict.

**Why this priority**: Without a draft there is no agentic surface. This is
the gating MVP for rubric category #9.

**Independent Test**: Trigger the agent on demand for a learner with seeded
mastery state; verify a `proposed` plan exists with all metadata fields
populated and Content Safety verdict = `accept`.

**Acceptance Scenarios**:

1. **Given** a learner with mastery records across two chapters, **When**
   the agent runs, **Then** it produces a 5-day plan with one
   ZPD-appropriate item per day and a one-paragraph rationale per day.
2. **Given** the Content Safety verdict is anything other than `accept`,
   **When** the agent finishes the chain, **Then** the plan is dropped
   (never persisted as `proposed`, never visible to teacher or learner)
   and the failure is logged for Art. 12.

---

### User Story 2 — Teacher review with diff against previous plan (Priority: P2)

The Teacher Console exposes a "Week-Plan Reviews" queue. For each proposed
plan, the teacher sees a diff against the previously accepted plan (if any)
and can accept, edit (then accept), or reject with a comment.

**Why this priority**: Mandatory human-oversight gate (AI Act Art. 14). No
plan publishes without a teacher decision.

**Independent Test**: With a `proposed` plan and a previously accepted one,
sign in as the teacher and confirm the diff renders; accept the plan and
verify the publication step is triggered.

**Acceptance Scenarios**:

1. **Given** a `proposed` plan exists for a learner with a previously
   accepted plan, **When** the teacher opens the queue, **Then** they see
   a daily-row diff (added / removed / unchanged).
2. **Given** the teacher edits a day before accepting, **When** they
   submit, **Then** the edit is recorded with author and timestamp and the
   final plan (post-edit) is what publishes.
3. **Given** the teacher rejects with a comment, **When** they submit,
   **Then** the plan moves to `rejected`, the comment is logged, and no
   plan publishes to the learner.

---

### User Story 3 — Publish to the learner's tabbed workspace (Priority: P3)

On teacher accept, the plan publishes to the learner's tabbed workspace
(spec 001). The plan card lives in the "My progress" tab and shows the
5-day plan with the teacher attribution and the accepted timestamp.

**Why this priority**: Closes the loop — the learner sees the
teacher-approved plan; the override and acceptance metrics begin to flow
into the per-cohort fairness dashboard (spec 010).

**Independent Test**: After US2 accept, open the learner web app and
verify the plan card appears under "My progress" with the teacher
attribution and timestamp.

**Acceptance Scenarios**:

1. **Given** an accepted plan, **When** the learner opens the web app,
   **Then** a "Week plan" card appears in "My progress" with day-by-day
   items, the teacher attribution, and the `accepted_at` timestamp.
2. **Given** no accepted plan, **When** the learner opens "My progress",
   **Then** the card is replaced by a neutral empty-state inviting the
   teacher to publish a plan.

### Edge Cases

- Learner consent withdrawn (spec 008) → the agent MUST NOT run for that
  learner; any previously accepted plan MUST be hidden until consent is
  re-granted.
- Override-rate gate: if the per-cohort override rate exceeds **10 %** (RAI
  release gate), the agent MUST automatically pause new proposals for the
  affected cohort and notify the Responsible AI Evaluator.
- Safety-violation gate: if the Content Safety violation rate exceeds
  **0.1 %** over the last 1 000 proposals, pause and notify.
- Cohort-disparity gate: if the per-cohort acceptance disparity exceeds
  **5 pp**, pause and notify (re-use spec 010 metric).
- Diff against the previous plan handles `no previous plan` by rendering
  every day as "added".
- The agent MUST be reproducible: same mastery state + same seed → same
  candidate items from AI Search.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The agent MUST be triggered nightly (cron) and on-demand
  from the teacher console for a specific learner.
- **FR-002**: The agent loop MUST chain: **AI Search** → **Azure OpenAI**
  → **Content Safety**, with one explicit handover per step.
- **FR-003**: Inputs to AOAI MUST NOT include raw learner PII; only
  pseudonymous learner id + mastery vector + chapter labels are allowed.
- **FR-004**: A Content Safety verdict other than `accept` MUST drop the
  plan; the failure is logged for Art. 12.
- **FR-005**: A new endpoint `POST /api/week-plan/propose` MUST refuse to
  persist any plan without `teacher_approved = true` (server-side gate);
  the agent writes via an internal *proposed* path that is queue-only.
- **FR-006**: A new table `week_plan_decisions(id, learner_id, plan_id,
  decision, edits?, comment?, decided_by, decided_at)` records every
  teacher action.
- **FR-007**: The Teacher Console MUST surface a diff view against the
  previously accepted plan.
- **FR-008**: On accept, the plan publishes to the learner web app and a
  card appears in the "My progress" tab.
- **FR-009**: Release-gate auto-pause: override > 10 %, safety > 0.1 %, or
  cohort disparity > 5 pp → agent pauses for the affected cohort and
  notifies the Responsible AI Evaluator. Resume is a manual action.
- **FR-010**: Consent withdrawal (spec 008) MUST gate the agent: no run
  and previously accepted plans are hidden until re-grant.
- **FR-011**: The agent MUST log, per run: tool sequence, model version,
  prompt hash, Content Safety verdict, learner pseudonym, cohort keys
  (for Art. 12).
- **FR-012**: A teacher MUST be able to override every decision (accept
  → unpublish, reject → revisit) within 24 hours; later actions are
  immutable for auditability.

### Key Entities

- **WeekPlan**: (`id`, `learner_id`, `created_at`, `status` ∈
  {`proposed`, `accepted`, `rejected`, `unpublished`}, `days` × 5,
  `tool_trace`, `model_version`, `prompt_hash`,
  `content_safety_verdict`).
- **WeekPlanDay**: (`day_index` 1..5, `item_id`, `rationale_text`).
- **WeekPlanDecision**: (`id`, `learner_id`, `plan_id`, `decision`,
  `edits?`, `comment?`, `decided_by`, `decided_at`).
- **ConsentEffectiveStatus**: read from spec 008 capability flag.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: **100 %** of published plans carry a teacher `accepted_at`
  timestamp (FR-005 enforcement).
- **SC-002**: **0 plans** publish without a Content Safety verdict =
  `accept` (FR-004 + FR-005 dual gate).
- **SC-003**: Override rate (per cohort) is measured continuously and
  ≤ **10 %** under steady state. *This gate directly defends the −26 %
  outcome-gap KPI: excessive teacher overrides would signal algorithmic
  bias eroding the engagement uplift target.*
- **SC-004**: Safety violation rate ≤ **0.1 %** over rolling 1 000
  proposals.
- **SC-005**: Per-cohort acceptance disparity ≤ **5 pp** (re-using the
  spec 010 disparity calculation). *This gate directly defends the −26 %
  outcome-gap KPI: unequal plan acceptance across cohorts is a proxy for
  inequitable learning outcomes.*
- **SC-006**: Plan card rendered in the learner web app within ≤ 5 s of
  teacher accept (cache invalidation propagation).
- **SC-007**: Restitution slide #9 ("Autonomy talking points") updated to
  reference this agent surface.

## Assumptions

- Spec 008 (parent portal + capability flag) is merged before this agent
  runs in production.
- Spec 010 (fairness dashboard) is merged so the cohort-disparity gate
  has a single source of truth.
- AI Search index over the curriculum already exists or will be
  initialised in Phase 2 of the tasks.
- The learner tabbed workspace (spec 001) is merged so the "Week plan"
  card has a host.

## Constitution Check

| Principle | How this spec complies |
|---|---|
| I. EU-Resident, Data-Minimised | All inference in EU North via APIM; no raw learner PII in prompts (FR-003). |
| II. GDPR Art. 8 | Consent withdrawal hard-gates the agent (FR-010). |
| III. EU AI Act high-risk | This is the new runtime high-risk surface. Annex IV fragment, Art. 9/12/14 instrumented. |
| IV. Teacher-in-the-loop | No plan publishes without teacher accept (FR-005). |
| V. Pedagogical sign-off | Rationale text reviewed by Learning Sciences for ZPD targeting at P=0.7. |
| VI. Outcome-contract driven | Per-cohort override + disparity gates enforce the outcome-gap KPI guardrails. |
| VII. Reproducible, spec-driven | Same mastery + same seed → same candidate items; tool trace logged. |
