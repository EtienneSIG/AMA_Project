# Mood API Contracts — Learner Mood Check-In & Well-Being Routing

**Feature**: `017-learner-mood-checkin` | **Date**: 2026-06-26

Authenticated sessions; strict role-based access. Mood is **self-reported** (no inference). Sensitive reasons are
access-controlled. No mood data is used for grading/profiling/advertising.

## POST `/api/mood/checkin` (learner)
```json
{ "mood": "sad", "reason": "course_difficulty" }   // reason optional, only when sad; or omit/skip
→ { "ok": true, "day": "2026-06-26", "supportive": "It's okay to find things hard — here's who can help." }
```
Optional + skippable; no nagging if skipped. Updates the day's entry if it exists.

## DELETE `/api/mood/checkin/:day` (learner) — erase the day's entry (data-subject rights).

## GET `/api/mood/parent` (parent, consent-gated)
Returns a supportive well-being notice for sustained low mood (only if `consent_ok`); framed as self-reported, with
"how to help" guidance. **No** raw diagnostics.

## GET `/api/mood/teacher` (teacher)
Per-learner + aggregate self-reported mood + reason categories (access-controlled). "classmate" entries appear only
in the safeguarding inbox, never in the open view.

## GET `/api/mood/teacher/recommendations` (teacher)
Pedagogically-reviewed suggestions (e.g., catch-up for course-difficulty clusters); teacher accepts/adjusts/dismisses (logged).

## GET `/api/mood/safeguarding` (authorised pastoral staff only)
Safeguarding flags ("classmate"/bullying); restricted; never peer-visible.

## Contract test checklist
- [ ] 0 inference — mood only from explicit selection.
- [ ] "classmate" routed to safeguarding only; never in open/teacher view or to peers.
- [ ] Parent notice only when consent_ok; supportive, not diagnostic.
- [ ] Teacher remains decision-maker; actions logged.
- [ ] 0 use for grading/profiling/advertising.
- [ ] Edit/erase honoured.
