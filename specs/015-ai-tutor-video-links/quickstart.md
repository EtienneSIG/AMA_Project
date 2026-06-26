# Quickstart — AI Tutor Illustrative Video Links

**Feature**: `015-ai-tutor-video-links` | **Date**: 2026-06-26

## 1. Teacher curates the catalogue
In teacher-console, add an approved video for a concept (e.g., "adding fractions") with title/source/duration/age band.

## 2. Tutor suggests a vetted video
As a learner, ask the tutor about that concept → the answer includes up to 3 suggestions, each with title, source,
duration, and an **"external site"** badge. Confirm every URL is from the catalogue.

## 3. Privacy check
Open a suggested video and inspect network traffic → **no** learner identifiers/cookies sent to the third party;
no autoplay; no related-video feed.

## 4. Under-16 gating
As an under-16 learner without parental consent → **no** videos shown (text-only) with a transparency note.

## 5. No-match fallback
Ask about a concept with no catalogued video → text-only answer; **no** fabricated/searched link.

## 6. Curation & reporting
- Teacher disables suggestions for a class → no videos for that class.
- Report a video → it is suppressed pending review.
- Simulate a dead link → hidden by the link-health check.

## Acceptance checklist
- [ ] 100% displayed links from the allow-list; 0 fabricated (SC-001).
- [ ] 0 learner PII to third parties; tracking blocked (SC-002).
- [ ] 100% suggestions + clicks logged (SC-003).
- [ ] Under-16 presentation respects consent/restricted mode (SC-004).
- [ ] Reported/dead videos suppressed (SC-005).
