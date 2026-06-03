# Data Model: Learner Gamification UX

## 1. QuestDashboardSnapshot

Aggregated learner-facing overview returned by learner dashboard API.

| Field | Type | Required | Notes |
|---|---|---|---|
| `learnerId` | string | Yes | Pseudonymous learner identifier |
| `snapshotAt` | ISO-8601 datetime | Yes | UTC generation time |
| `dailyChallenge` | object | Yes | Current `DailyChallengeRun` summary |
| `season` | object | Yes | Current `SeasonTierProgress` |
| `activeQuests` | array | Yes | Active collaborative and personal quests |
| `bossBattle` | object | Yes | Current streak and completion state |
| `rewardHighlights` | array | Yes | Recent badge/chest rewards |
| `fairnessNotice` | string | Yes | Explicit no-ranking fairness text |

Validation rules:
- Must never include classmate rank positions.
- Snapshot must only include learner-authorized class/guild context.

## 2. DailyChallengeRun

Represents a learner's daily challenge lifecycle.

| Field | Type | Required | Notes |
|---|---|---|---|
| `challengeId` | string | Yes | Configured daily challenge id |
| `learnerId` | string | Yes | Pseudonymous learner id |
| `dayKey` | string | Yes | UTC date key (`YYYY-MM-DD`) |
| `status` | enum | Yes | `available`, `started`, `completed`, `expired` |
| `startedAt` | ISO-8601 datetime | No | Set when learner starts challenge |
| `completedAt` | ISO-8601 datetime | No | Set on completion |
| `rewardBadgeIds` | string[] | No | Reward mapping for completed run |

Validation rules:
- Unique by (`learnerId`, `dayKey`, `challengeId`).
- Transition `completed` allowed only from `started`.

State transitions:
- `available` -> `started` -> `completed`
- `available`/`started` -> `expired` at day-window close

## 3. ClassObjective

Shared class/guild target with aggregate progress only.

| Field | Type | Required | Notes |
|---|---|---|---|
| `objectiveId` | string | Yes | Class/guild objective id |
| `classId` | string | Yes | Class scope |
| `guildId` | string | No | Optional guild scope |
| `title` | string | Yes | Learner-visible title |
| `status` | enum | Yes | `active`, `paused`, `completed`, `archived` |
| `targetValue` | integer | Yes | Completion threshold |
| `progressValue` | integer | Yes | Aggregate completed contributions |
| `visibleBand` | enum | Yes | `starting`, `on-track`, `almost-there`, `complete` |
| `updatedAt` | ISO-8601 datetime | Yes | Last progression update |

Validation rules:
- `progressValue` must be clamped to `[0, targetValue]` for learner display.
- No learner-level rank or score ordering exposed in learner payloads.

## 4. CollaborativeQuest

Multi-learner quest requiring collective contribution.

| Field | Type | Required | Notes |
|---|---|---|---|
| `questId` | string | Yes | Collaborative quest id |
| `classId` | string | Yes | Class scope |
| `title` | string | Yes | Quest title |
| `description` | string | Yes | Quest guidance |
| `status` | enum | Yes | `scheduled`, `active`, `paused`, `completed`, `cancelled` |
| `goalType` | enum | Yes | `count`, `streak`, `mixed` |
| `goalValue` | integer | Yes | Numeric target |
| `progressValue` | integer | Yes | Aggregate progress |
| `startsAt` | ISO-8601 datetime | Yes | Activation time |
| `endsAt` | ISO-8601 datetime | No | Optional end time |

Validation rules:
- `endsAt` must be after `startsAt` when present.
- Contributions are accepted only while `status=active`.

## 5. MotivationChannelMessage

Class/guild-scoped motivational message with moderation status.

| Field | Type | Required | Notes |
|---|---|---|---|
| `messageId` | string | Yes | Unique message id |
| `classId` | string | Yes | Audience scope |
| `authorRole` | enum | Yes | `student` or `teacher` |
| `authorId` | string | Yes | Pseudonymous actor id |
| `content` | string | Yes | Sanitized message text |
| `status` | enum | Yes | `visible`, `hidden`, `flagged` |
| `createdAt` | ISO-8601 datetime | Yes | Creation time |
| `moderatedAt` | ISO-8601 datetime | No | Set when moderation occurs |
| `moderationReason` | string | No | Required on hide/flag override |

Validation rules:
- Content Safety check enforced before persistence.
- `moderationReason` required when status changes away from `visible`.

## 6. SeasonTierProgress

Learner progression state for current season.

| Field | Type | Required | Notes |
|---|---|---|---|
| `seasonId` | string | Yes | Active season identifier |
| `learnerId` | string | Yes | Pseudonymous learner id |
| `tierId` | string | Yes | Current tier id |
| `xpCurrent` | integer | Yes | Current XP in tier |
| `xpTarget` | integer | Yes | XP needed for next tier |
| `milestonesEarned` | string[] | Yes | Tier milestone ids already earned |
| `advancedAt` | ISO-8601 datetime | No | Last tier advancement timestamp |

Validation rules:
- `xpCurrent` must be non-negative.
- Tier advancement occurs only when `xpCurrent >= xpTarget`.

## 7. DailyChestClaim

Once-per-day chest eligibility and claim status.

| Field | Type | Required | Notes |
|---|---|---|---|
| `claimId` | string | Yes | Unique claim id |
| `learnerId` | string | Yes | Pseudonymous learner id |
| `dayKey` | string | Yes | UTC date key |
| `eligibilityState` | enum | Yes | `eligible`, `not-eligible`, `claimed` |
| `claimedAt` | ISO-8601 datetime | No | Claim timestamp |
| `badgeRewardIds` | string[] | No | Awarded badge ids |

Validation rules:
- Unique claim constraint on (`learnerId`, `dayKey`).
- Claim allowed only when `eligibilityState=eligible`.

## 8. BossBattleAttempt

Tracks streak-based boss battle progress requiring 10 consecutive correct answers.

| Field | Type | Required | Notes |
|---|---|---|---|
| `attemptId` | string | Yes | Unique attempt id |
| `learnerId` | string | Yes | Pseudonymous learner id |
| `status` | enum | Yes | `active`, `failed`, `defeated` |
| `consecutiveCorrect` | integer | Yes | Current streak count |
| `targetConsecutive` | integer | Yes | Fixed to `10` |
| `lastAnsweredAt` | ISO-8601 datetime | No | Last answer timestamp |
| `defeatedAt` | ISO-8601 datetime | No | Set when boss defeated |

Validation rules:
- `targetConsecutive` is immutable and must equal 10.
- Wrong answer resets streak to 0 and keeps/sets `status=active` unless attempt timeout policy marks failure.

State transitions:
- `active` -> `defeated` when streak hits 10
- `active` -> `failed` for explicit fail/timeout policy
- `failed` -> `active` only by new attempt creation

## 9. BadgeAward

Tracks earned and locked badges for gallery display.

| Field | Type | Required | Notes |
|---|---|---|---|
| `badgeId` | string | Yes | Badge definition id |
| `learnerId` | string | Yes | Pseudonymous learner id |
| `state` | enum | Yes | `earned` or `locked` |
| `criteriaSummary` | string | Yes | Learner-readable criteria text |
| `earnedAt` | ISO-8601 datetime | No | Set when earned |
| `sourceType` | enum | No | `daily_chest`, `quest`, `boss_battle`, `season` |

Validation rules:
- `earnedAt` required when `state=earned`.

## 10. TeacherOversightAction

Auditable teacher action for moderation or override.

| Field | Type | Required | Notes |
|---|---|---|---|
| `actionId` | string | Yes | Unique action id |
| `teacherId` | string | Yes | Teacher identifier |
| `classId` | string | Yes | Class scope |
| `actionType` | enum | Yes | `pause_objective`, `resume_objective`, `pause_quest`, `resume_quest`, `moderate_message`, `override_reward` |
| `targetId` | string | Yes | Entity being acted on |
| `rationale` | string | Yes | Human-readable reason |
| `createdAt` | ISO-8601 datetime | Yes | Action timestamp |
| `resultState` | string | Yes | Final applied state |

Validation rules:
- `rationale` is mandatory for all oversight actions.
- Action must be visible in audit APIs within 5 minutes (SC-005).

## Relationships

- `QuestDashboardSnapshot` aggregates `DailyChallengeRun`, `SeasonTierProgress`, `CollaborativeQuest`, `BossBattleAttempt`, and recent `BadgeAward`.
- `ClassObjective` and `CollaborativeQuest` are scoped by `classId` and optionally `guildId`.
- `MotivationChannelMessage` belongs to class/guild and may produce `TeacherOversightAction` records.
- `DailyChestClaim`, `BossBattleAttempt`, and `BadgeAward` all map to a single learner and feed badge gallery presentation.

## Data Governance Notes

- Personal data class remains pseudonymous educational interaction data; no biometric/emotion/facial data.
- Learner-facing payloads exclude public rank ordering and avoid stigmatizing comparisons.
- Oversight actions are audit-persisted for transparency and compliance review.