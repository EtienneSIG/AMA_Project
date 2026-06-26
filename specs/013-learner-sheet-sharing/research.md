# Phase 0 Research — Learner Sheet & Item Sharing

**Feature**: `013-learner-sheet-sharing` | **Date**: 2026-06-26

## R1 — Same-class recipients only

- **Decision**: Eligible recipients are resolved **server-side** from the sender's class roster; external recipients are impossible. Class change after sharing → share auto-revoked / blocked.
- **Rationale**: Principle I (no exfiltration) + safeguarding; in-class peer support, not social media.

## R2 — Read-only snapshot (snapshot vs reference)

- **Decision**: Capture an **immutable snapshot** of the item/sheet at share time (resolves analysis A3). The recipient's view is stable even if the sender later edits/deletes the original. Recipient attempts write **only** to the recipient's account.
- **Rationale**: Predictable recipient experience + sender progress isolation; deletion of the original doesn't break the share.

## R3 — Note moderation

- **Decision**: Any free-text note is scanned by **Content Safety** before delivery; flagged → held in a teacher moderation queue; reuse `content_safety_results` for the verdict.
- **Rationale**: Child safety; reuse existing control (no duplication).

## R4 — Consent gating

- **Decision**: For under-16, both sender and recipient must have **active parental consent** (Feature 006) before a share is created/delivered.
- **Rationale**: GDPR Art. 8.

## R5 — Teacher control + revoke + block

- **Decision**: Senders can revoke (immediate access removal, audited); recipients can decline/block a sender; teachers see a per-class log and can disable sharing per learner/class.
- **Rationale**: Art. 14 oversight + learner agency.

## R6 — Retention

- **Decision**: Snapshots + share records retained per program policy; revocation recorded; full audit for data-subject requests.
- **Rationale**: GDPR + Art. 12.

### Open follow-ups (for /speckit.tasks)

- Confirm snapshot storage shape vs the existing `sheets` table.
- Confirm class-roster / learner-teacher mapping source for recipient resolution.
