# Quickstart — Learner Sheet & Item Sharing

**Feature**: `013-learner-sheet-sharing` | **Date**: 2026-06-26

## 1. Share an item with a classmate
As Learner A, open a completed item → "Share" → pick classmate B (same class) → add an optional note → send.
B receives an in-app notification within ~5 s and opens a **read-only** view with "Shared by A".

## 2. Note moderation
Send a note → it is Content-Safety scanned; clean → delivered; flagged → held for teacher moderation (sender notified).

## 3. Share a sheet
Share a sheet with B and C → each gets an independent read-only practice copy; their attempts record against **their
own** accounts (A's progress unchanged).

## 4. Revoke
A selects "Unshare" → B immediately loses access; revocation recorded with timestamp.

## 5. Consent + class boundary
- Under-16 recipient without active parental consent → share blocked.
- Attempt to share outside the class / to an external address → blocked.

## 6. Teacher control
Teacher opens the per-class sharing log → sees sender/recipient/artifact/time/moderation status → disables sharing for
one learner → that learner can no longer initiate shares. Teacher approves/rejects a flagged note.

## Acceptance checklist
- [ ] Share to classmate in ≤3 interactions; notified ≤5 s (SC-001).
- [ ] 100% notes scanned; 0 policy-violating notes delivered unreviewed (SC-002).
- [ ] 0 shares outside class / to under-16 without consent (SC-003).
- [ ] Teacher can locate/act on any share in ≤30 s (SC-004).
- [ ] 100% share/unshare actions audited (SC-006).
