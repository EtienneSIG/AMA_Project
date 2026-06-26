# Data Model — Learner Sheet & Item Sharing

**Feature**: `013-learner-sheet-sharing` | **Date**: 2026-06-26

EU-resident PostgreSQL (`_shared/db`). In-class only; reuses `content_safety_results` + Feature 006 consent + `sheets`.

## share

| Field | Type | Notes |
|---|---|---|
| `id` | uuid pk | |
| `sender_ref` / `recipient_ref` | text | Both in the **same class** (enforced). |
| `class_id` | text | Scope. |
| `artifact_type` | enum `item` \| `sheet` | |
| `snapshot_id` | uuid fk | Read-only copy (below). |
| `note` | text | Optional; Content-Safety scanned. |
| `cs_result_id` | bigint | FK to `content_safety_results`. |
| `status` | enum `active` \| `revoked` \| `flagged` | |
| `created_at` / `revoked_at` | timestamptz | |

## shared_artifact_snapshot

| Field | Type | Notes |
|---|---|---|
| `id` | uuid pk | |
| `artifact_type` | enum `item` \| `sheet` | |
| `payload` | jsonb | Immutable copy at share time. |
| `created_at` | timestamptz | Stable even if original changes/deleted. |

## sharing_policy (teacher-set)

| Field | Type | Notes |
|---|---|---|
| `scope` | enum `learner` \| `class` | |
| `scope_id` | text | |
| `sharing_enabled` | bool | |
| `set_by` / `set_at` | text/timestamptz | |

## recipient_block (learner agency)

| Field | Type | Notes |
|---|---|---|
| `recipient_ref` / `blocked_sender_ref` | text | Future shares suppressed. |
| `created_at` | timestamptz | |

**Invariants**: recipient ∈ sender's class; shares read-only (recipient attempts → recipient account only); notes scanned before delivery; under-16 requires active consent (both parties); every share/unshare/moderation audited.
