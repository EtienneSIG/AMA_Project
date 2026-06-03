# Quickstart: Admin PostgreSQL Wake-Up Control

## Purpose

Provide a repeatable operator flow to:

1. Check PostgreSQL lifecycle state from the admin app.
2. Trigger wake-up when server is auto-stopped.
3. Verify transition to `Ready`.
4. Use a PowerShell fallback when admin UI is unavailable.

## Prerequisites

- Admin app deployed and reachable.
- Operator authenticated as admin.
- App Service managed identity has least-privilege permission to read/start PostgreSQL flexible server in target resource group.
- Azure resources remain in approved EU regions.

## A. Admin UI Flow (Primary)

1. Open admin app and sign in as admin.
2. Navigate to PostgreSQL Operations panel.
3. Select "Refresh status".
4. Confirm state and timestamp:
   - `Ready`: no wake-up required.
   - `Stopped`: wake-up button available.
   - `Starting`: wait and refresh.
5. If state is `Stopped`, select "Wake up PostgreSQL".
6. Validate acknowledgement outcome:
   - `accepted`: start submitted to ARM.
   - `in-progress`: start already underway.
   - `already-running`: idempotent no-op.
   - `failed`: follow remediation guidance.
7. Refresh every 10-15 seconds until state becomes `Ready`.

Expected recovery window: typically 3-6 minutes for auto-stopped server.
Escalate if state remains `Starting` beyond 10 minutes.

## B. API Verification (Optional)

Status:

```powershell
Invoke-RestMethod "https://app-admin-learneu-demo.azurewebsites.net/api/admin/postgres/status"
```

Wake-up:

```powershell
Invoke-RestMethod "https://app-admin-learneu-demo.azurewebsites.net/api/admin/postgres/wakeup" -Method Post
```

## C. Scripted Fallback Flow

When UI is unavailable, run:

```powershell
pwsh ./demo/scripts/postgres_wakeup.ps1 -ResourceGroup rg-learneu-demo -ServerName pg-learneu-demo
```

Fallback script behavior:

1. Reads current server state via `az postgres flexible-server show`.
2. If `Stopped`, runs `az postgres flexible-server start`.
3. Polls state until `Ready` or timeout.
4. Returns non-zero exit code on failure/timeout.

## Failure Modes & Remediation

- Authorization failure (403): verify managed identity RBAC on PostgreSQL resource.
- ARM throttling/transient error: retry status first, then bounded wake-up retry.
- ARM throttling/transient error: retry status first, then bounded wake-up retry (max 3 attempts).
- Prolonged `Starting` state: escalate with correlation id and ARM error detail to on-call engineer.

## Mandatory Sign-off Gate

Before feature release, record explicit approval from:

- `agents/responsible-ai-evaluator.chatmode.md`
- `agents/cross-agent-qa-verifier.chatmode.md`

## Audit & Compliance Checks

- Confirm each status check and wake-up attempt emits operational audit events.
- Confirm no new data class is logged; only operational metadata and correlation id.
