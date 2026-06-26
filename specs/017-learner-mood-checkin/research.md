# Phase 0 Research — Learner Mood Check-In & Well-Being Routing

**Feature**: `017-learner-mood-checkin` | **Date**: 2026-06-26

## R1 — Self-report only (no inference)

- **Decision**: Mood is captured **only** via explicit learner button selection (happy/medium/sad). **No** facial/voice/typing/behavioural inference anywhere.
- **Rationale**: EU AI Act Art. 5; constitution. This is the defining safeguard.

## R2 — Sad-reason follow-up

- **Decision**: On "sad", show exactly three supportive options (personal / course difficulty / a classmate) + skip. Store the reason category with the entry.
- **Rationale**: Routes the right support (well-being / pedagogy / safeguarding) per spec.

## R3 — Parent surfacing (consent-gated, supportive)

- **Decision**: Sustained low mood surfaces a gentle, supportive well-being notice in the parent portal **only** for parents with active consent; framed as self-reported well-being, **not a diagnosis**; thresholds escalate prominence without alarm fatigue.
- **Rationale**: Constitution IV + GDPR Art. 8.

## R4 — Teacher recommendations + safeguarding

- **Decision**: Teachers see per-learner + aggregate self-reported mood and reason categories (access-controlled). Course-difficulty patterns yield a **pedagogically-reviewed** recommendation (reuse 007/008) that the teacher may accept/adjust/dismiss (logged). "Classmate"/bullying routes to a **safeguarding** flag for authorised pastoral staff only — never peer-visible.
- **Rationale**: Art. 14 human-only action; child safeguarding.

## R5 — Data-subject rights & no secondary use

- **Decision**: Learners can update/delete today's entry; erasure honoured. Mood data is **never** used for grading/profiling/advertising/automated decisions.
- **Rationale**: GDPR; constitution.

## R6 — Thresholds

- **Decision**: Document + tune escalation thresholds (e.g., repeated sad days) to balance timely care vs. alarm fatigue; owned by Learning Sciences + safeguarding leads.
- **Rationale**: Avoids both under-care and over-alerting.

### Open follow-ups (for /speckit.tasks)

- Confirm safeguarding/pastoral roles + escalation procedure at the school.
- Confirm consent-gating default for under-16 parent surfacing with the DPO.
- Confirm threshold values with Learning Sciences.
