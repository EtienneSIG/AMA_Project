<#
.SYNOPSIS
  Weekly parent digest dispatcher for the LearnEU demo (Feature 6, US4).
.DESCRIPTION
  Wakes the PostgreSQL Flexible Server if needed, then runs the Node digest
  generator (send_digests.js) which produces one digest per opted-in
  (parent, child) pair for the current ISO week. Idempotent.

  Schedule target: Sunday 18:00 UTC (e.g. Azure Scheduler / GitHub Actions cron
  '0 18 * * 0'). Opt-out is honoured server-side via parent_preferences.

  PG_HOST / PG_USER / PG_PASSWORD must be present in the environment (same app
  settings as the web apps). Use -DryRun to preview without writing.
.EXAMPLE
  pwsh demo/scripts/send_digests.ps1 -DryRun
.EXAMPLE
  pwsh demo/scripts/send_digests.ps1
#>
[CmdletBinding()]
param(
    [switch]$DryRun,
    [switch]$SkipWake,
    [string]$ResourceGroup = 'rg-learneu-demo',
    [string]$ServerName = 'pg-learneu-demo'
)

$ErrorActionPreference = 'Stop'
$scriptDir = $PSScriptRoot

if (-not $SkipWake) {
    $wake = Join-Path $scriptDir 'postgres_wakeup.ps1'
    if (Test-Path $wake) {
        Write-Host '[send_digests] Ensuring PostgreSQL is awake...' -ForegroundColor Cyan
        try { & $wake -ResourceGroup $ResourceGroup -ServerName $ServerName } catch {
            Write-Host "[send_digests] Wake step skipped/failed: $($_.Exception.Message)" -ForegroundColor Yellow
        }
    }
}

$nodeArgs = @(Join-Path $scriptDir 'send_digests.js')
if ($DryRun) { $nodeArgs += '--dry-run' }

Write-Host "[send_digests] Running digest generator (DryRun=$DryRun)..." -ForegroundColor Cyan
& node @nodeArgs
$code = $LASTEXITCODE
if ($code -eq 0) {
    Write-Host '[send_digests] Completed successfully.' -ForegroundColor Green
} elseif ($code -eq 2) {
    Write-Host '[send_digests] Database not configured; no digests generated.' -ForegroundColor Yellow
} else {
    throw "[send_digests] Digest generator exited with code $code."
}
exit $code
