# Research: Learner Gamification UX

## Decision 1: Build Quest Dashboard as a single aggregated learner snapshot endpoint

- Decision: Expose a consolidated learner endpoint for dashboard state (daily challenge, season tier, boss streak, active quests, reward highlights) instead of many independent UI fetches.
- Rationale: Reduces client orchestration complexity and inconsistent state rendering on slower school networks while keeping a clear contract for FR-001 and FR-002.
- Alternatives considered:
  - Multiple endpoint fan-out from browser: rejected due to race conditions and partial render inconsistency.
  - Server-rendered dashboard only: rejected because existing learner app already uses browser-side interaction patterns.

## Decision 2: Use class/guild contribution counters without individual public ranking

- Decision: Store per-learner contribution events for audit/internal integrity, but expose only collective totals and progress bands on learner-facing collaborative surfaces.
- Rationale: Preserves fairness and inclusion by meeting FR-011 while still enabling collaborative quest completion logic.
- Alternatives considered:
  - Public leaderboard by learner: rejected as explicitly non-compliant with FR-011 and constitutional fairness intent.
  - Anonymous-only class metrics with no contribution records: rejected because completion integrity and moderation for abuse require attributable backend events.

## Decision 3: Make daily chest and boss battle rewards idempotent by day/attempt keys

- Decision: Use unique constraints for daily chest claims (`learner_id + chest_day`) and boss battle completion rewards (`attempt_id + reward_type`) in Postgres.
- Rationale: Prevents duplicate rewards under reconnect/retry scenarios and addresses edge cases in spec (limited connectivity, repeat claims).
- Alternatives considered:
  - Client-only duplicate prevention: rejected because retries and multi-tab usage can bypass browser checks.
  - In-memory lock per instance: rejected due to multi-instance app service deployment risk.

## Decision 4: Model teacher oversight as explicit moderation/override commands in teacher-console

- Decision: Add teacher-console endpoints for pausing quests/objectives, moderating motivation messages, and overriding activity visibility with required rationale.
- Rationale: Implements FR-013 and FR-015 directly on the teacher operational surface and aligns with Constitution Principle IV.
- Alternatives considered:
  - Admin-only moderation: rejected because classroom oversight must be teacher-in-the-loop, not platform-ops-only.
  - Passive review with no action path: rejected since spec requires intervention controls.

## Decision 5: Keep schema/helper baseline in _shared and sync into app copies

- Decision: Land shared DB helper and schema evolution first in `demo/apps/_shared`, then propagate with `demo/apps/_shared/sync.ps1` into learner-web and teacher-console copies.
- Rationale: Matches current repository operating model and avoids drift between app implementations that currently share a common backbone.
- Alternatives considered:
  - Refactor to import shared npm package now: rejected because this feature is not the right point for architecture migration.
  - Duplicate edits directly in each app only: rejected due to high drift risk.

## Decision 6: Time windows and season boundaries computed in UTC with market display localization

- Decision: Compute eligibility windows and season cutovers in UTC server-side and only localize display text client-side.
- Rationale: Ensures consistent once-per-day and season transition logic across EU markets and avoids daylight-saving edge bugs.
- Alternatives considered:
  - Per-market timezone persistence rules: rejected for added complexity without current requirement.
  - Browser-local day window authority: rejected because it is manipulable and inconsistent.

## Clarifications Resolved

- Daily challenge/day-chest window behavior: resolved with UTC eligibility + localized display.
- Collaboration fairness representation: resolved with class/guild totals and progress bands only.
- Teacher oversight hooks location: resolved in `demo/apps/teacher-console` with auditable actions.
- Shared implementation path: resolved via `_shared` first, synced to app copies.
- Contract shape: resolved as one OpenAPI surface covering learner and teacher gamification routes.