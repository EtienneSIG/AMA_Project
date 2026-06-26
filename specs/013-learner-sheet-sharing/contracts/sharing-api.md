# Sharing API Contracts — Learner Sheet & Item Sharing

**Feature**: `013-learner-sheet-sharing` | **Date**: 2026-06-26

Authenticated learner/teacher sessions. Recipients resolved **server-side** from the sender's class roster only.
Notes are Content-Safety scanned. Under-16 gated on parental consent (both parties).

## GET `/api/share/recipients` (learner)
Returns eligible recipients = the sender's **same-class** peers (consent-active). No external addresses.

## POST `/api/share` (learner)
```json
{ "artifactType": "sheet", "artifactId": "…", "recipientRefs": ["…"], "note": "try these!" }
→ { "shareIds": ["…"], "noteState": "delivered" | "held_for_moderation" }
```
- Recipient not in class / under-16 without consent → rejected.
- Note flagged by Content Safety → `held_for_moderation` (teacher queue).

## POST `/api/share/:id/revoke` (sender) — immediate access removal + audit.

## GET `/api/share/received` (learner) — read-only shared items/sheets; recipient attempts write to own account only.

## POST `/api/share/block` (recipient) — block future shares from a sender.

## GET `/api/share/teacher/log` (teacher) — per-class sharing log (sender, recipient, artifact, time, moderation status).
## POST `/api/share/teacher/disable` (teacher) — disable sharing per learner/class.
## POST `/api/share/teacher/moderate/:id` (teacher) — approve/reject a flagged note.

## Contract test checklist
- [ ] 0 shares to non-class or under-16-without-consent recipients.
- [ ] Shared artifacts read-only; recipient attempts isolated to recipient.
- [ ] 100% notes scanned; flagged held for teacher.
- [ ] Revoke removes access immediately + audited.
- [ ] Teacher log + disable + moderation work.
