# Tutor Video API Contracts — AI Tutor Illustrative Video Links

**Feature**: `015-ai-tutor-video-links` | **Date**: 2026-06-26

All endpoints require an authenticated session. URLs are **never** accepted from the client/model; only a
governed `conceptId`/catalogue id is referenced. Suggestions are validated against the allow-list server-side.

## POST `/api/tutor/answer` (extended)
Tutor answer now MAY include up to 3 allow-listed video suggestions.
```json
{ "answer": "Find a common denominator ...", "tutorTurnId": "…",
  "videos": [ { "id": "…", "title": "Adding fractions", "source": "…", "durationS": 180,
               "embedUrl": "https://www.youtube-nocookie.com/embed/…", "external": true } ] }
```
- If no catalogue match → `videos: []` (text-only; never fabricated).
- Under-16 without consent/restricted mode → `videos: []` + transparency note.

## GET `/api/tutor/video/catalogue` (teacher)
List catalogue entries (filter by concept/class). Teacher-only.

## POST `/api/tutor/video/catalogue` · PATCH `/:id` · DELETE `/:id` (teacher)
Add / replace / disable a catalogue entry. Changing an entry is a governed (Art. 10) action.

## POST `/api/tutor/video/disable` (teacher)
Disable video suggestions for a learner or class.

## POST `/api/tutor/video/:id/click` (learner)
Logs a click (Art. 12) and returns the transparency "leaving site" notice. No PII to third party.

## POST `/api/tutor/video/:id/report` (learner/teacher)
Files a report → entry `suppressed` pending review.

## Contract test checklist
- [ ] Only allow-listed URLs appear; model-emitted URLs stripped (0 fabricated).
- [ ] Embed uses privacy-enhanced host; **no** learner PII/cookies to third party.
- [ ] Under-16 without consent → no videos.
- [ ] Suggestion + click both logged.
- [ ] Reported/dead video suppressed.
- [ ] No catalogue match → text-only answer.
