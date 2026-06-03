# Quickstart: Learner Gamification UX

## Purpose

Validate the learner gamification loop and teacher oversight path end-to-end:

1. Learner lands on Quest Dashboard by default.
2. Learner completes daily challenge and boss battle progress.
3. Learner claims daily chest and verifies badge gallery.
4. Collaborative quest/objective progress updates across classmates.
5. Teacher moderates motivation channel content and applies override.
6. Audit trail confirms oversight visibility within 5 minutes.

## Prerequisites

- Learner app and teacher app are deployed or running locally:
  - `demo/apps/learner-web`
  - `demo/apps/teacher-console`
- PostgreSQL configured and reachable (same baseline as existing apps).
- Test users available for at least one teacher and two learners in same class/guild.
- Under-16 learner test account has valid guardian consent for API access.

## A. Start Apps (Local)

From two terminals:

```powershell
cd demo/apps/learner-web
npm start
```

```powershell
cd demo/apps/teacher-console
npm start
```

If shared changes were made first in `_shared`, run sync before start:

```powershell
pwsh demo/apps/_shared/sync.ps1
```

## B. Learner Dashboard Flow (P1)

1. Sign in as learner and verify the first post-login surface is Quest Dashboard.
2. Confirm dashboard shows all required cards:
   - Challenge du jour status
   - Season tier progress
   - Active quests/objectives summary
   - Boss battle streak progress
   - Recent reward highlights
3. Start daily challenge and submit qualifying activity until completion.
4. Verify completion feedback appears immediately and dashboard reflects new state.

## C. Boss Battle + Daily Chest + Badge Gallery

1. Start or continue boss battle.
2. Submit answers to reach 10 consecutive correct responses.
3. Confirm boss defeat event and reward notification.
4. Claim daily chest once.
5. Attempt second claim on same day and confirm request is blocked with explanatory message.
6. Open badge gallery and verify:
   - New rewards are marked `earned`
   - Locked badges remain visible with criteria summary

## D. Collaborative Motivation Flow (P1)

1. With two learners in same class/guild, complete qualifying activities from both accounts.
2. Verify collective progress updates on collaborative quest/objective cards for all participants.
3. Post motivation messages from one learner and confirm visibility to class audience.
4. Confirm learner-facing collaborative surfaces do not show harmful individual ranking.

## E. Teacher Oversight Flow (P2)

1. Sign in to teacher-console with class owner teacher account.
2. Open gamification oversight panel.
3. Pause an active collaborative quest or class objective and provide rationale.
4. Verify learner dashboard reflects paused status within expected update window.
5. Moderate a motivation message (hide or flag) with reason.
6. Resume paused quest/objective when appropriate.

## F. Audit and Compliance Verification

1. Retrieve oversight audit feed from teacher/admin audit endpoint.
2. Confirm each moderation/override action includes:
   - Actor (teacher)
   - Target entity
   - Rationale
   - Timestamp
   - Resulting state
3. Verify action appears in audit view within 5 minutes (SC-005).
4. Verify no public individual leaderboard appears on learner-facing gamification screens.

## Suggested Acceptance Test Additions

Add or extend checks in `demo/scripts/acceptance_tests.ps1` for:

- Dashboard default-route and required-card presence
- Daily chest idempotent claim behavior
- Boss battle completion only at 10 consecutive correct answers
- Teacher pause/moderate actions reflected in learner APIs
- Audit event visibility and completeness

## Mandatory Sign-Off Gate

Before moving to implementation tasks, obtain review confirmation from:

- `agents/learning-sciences-expert.chatmode.md`
- `agents/eu-ai-act-compliance-officer.chatmode.md`
- `agents/gdpr-children-data-specialist.chatmode.md`
- `agents/responsible-ai-evaluator.chatmode.md`
- `agents/cross-agent-qa-verifier.chatmode.md`