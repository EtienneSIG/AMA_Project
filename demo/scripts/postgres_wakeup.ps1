<#
.SYNOPSIS
  Wake up the LearnEU PostgreSQL Flexible Server when auto-stopped.
.DESCRIPTION
  Checks server lifecycle state, starts the server only when needed,
  then polls until Ready or timeout.
#>
[CmdletBinding()]
param(
    [string]$ResourceGroup = 'rg-learneu-demo',
    [string]$ServerName = 'pg-learneu-demo',
    [int]$TimeoutSeconds = 420,
    [int]$PollIntervalSeconds = 15,
    [switch]$NoStart
)

$ErrorActionPreference = 'Stop'

function Get-State {
    param([string]$Rg, [string]$Name)
    az postgres flexible-server show -g $Rg -n $Name --query state -o tsv 2>$null
}

Write-Host "[postgres-wakeup] Checking server state for $ServerName in $ResourceGroup..." -ForegroundColor Cyan
$state = Get-State -Rg $ResourceGroup -Name $ServerName
if (-not $state) {
    throw "Unable to read PostgreSQL state. Verify az login, subscription context, and server name."
}

Write-Host "[postgres-wakeup] Current state: $state"

if ($state -eq 'Ready') {
    Write-Host "[postgres-wakeup] Server is already Ready. No action required." -ForegroundColor Green
    exit 0
}

if ($state -eq 'Starting') {
    Write-Host "[postgres-wakeup] Server is already Starting. Polling until Ready..." -ForegroundColor Yellow
} elseif ($state -eq 'Stopped') {
    if ($NoStart) {
        Write-Host "[postgres-wakeup] NoStart set; skipping start request." -ForegroundColor Yellow
        exit 2
    }
    Write-Host "[postgres-wakeup] Sending start request..." -ForegroundColor Cyan
    az postgres flexible-server start -g $ResourceGroup -n $ServerName | Out-Null
    Write-Host "[postgres-wakeup] Start request accepted." -ForegroundColor Green
} else {
    Write-Host "[postgres-wakeup] Unexpected state '$state'. Continuing with readiness polling." -ForegroundColor Yellow
}

$deadline = (Get-Date).AddSeconds($TimeoutSeconds)
while ((Get-Date) -lt $deadline) {
    Start-Sleep -Seconds $PollIntervalSeconds
    $state = Get-State -Rg $ResourceGroup -Name $ServerName
    if (-not $state) {
        Write-Host "[postgres-wakeup] Could not refresh state (transient ARM/CLI issue). Retrying..." -ForegroundColor Yellow
        continue
    }
    Write-Host "[postgres-wakeup] State: $state"
    if ($state -eq 'Ready') {
        Write-Host "[postgres-wakeup] PostgreSQL is Ready." -ForegroundColor Green
        exit 0
    }
}

Write-Host "[postgres-wakeup] Timed out after $TimeoutSeconds seconds waiting for Ready." -ForegroundColor Red
exit 1
