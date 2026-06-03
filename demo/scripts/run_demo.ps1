<#
.SYNOPSIS
  Walk through the LearnEU demo acceptance criteria.
.DESCRIPTION
  Reads .env.local, queries the deployed environment, and prints a status
  table for each of the 9 acceptance criteria from plan/08-demo-on-azure.md.
  This script does NOT deploy anything. It only verifies state.
#>
[CmdletBinding()]
param(
  [string]$EnvFile = "$PSScriptRoot/../.env.local",
  [switch]$WakePostgresIfStopped
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path $EnvFile)) {
    Write-Error ".env.local not found at $EnvFile. Copy .env.template and fill in values."
}

# Load .env.local into the process env (key=value, ignore comments + blanks).
Get-Content $EnvFile | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith('#')) { return }
    $kv = $line -split '=', 2
    if ($kv.Count -eq 2) { Set-Item -Path "Env:$($kv[0].Trim())" -Value $kv[1].Trim() }
}

$rg = "rg-$($env:AZURE_ENV_NAME)"
Write-Host "Verifying demo in resource group $rg..." -ForegroundColor Cyan

if ($WakePostgresIfStopped) {
  $serverName = if ($env:PG_HOST) { ($env:PG_HOST -split '\.')[0] } else { "pg-$($env:AZURE_ENV_NAME)" }
  $wakeScript = Join-Path $PSScriptRoot 'postgres_wakeup.ps1'
  if (Test-Path $wakeScript) {
    Write-Host "Precheck: ensuring PostgreSQL is Ready via $wakeScript..." -ForegroundColor Cyan
    & $wakeScript -ResourceGroup $rg -ServerName $serverName
  } else {
    Write-Warning "Wake-up script not found at $wakeScript"
  }
}

# Acceptance criteria — each function returns Pass/Fail/Skip + evidence.
$results = @()

function Add-Result($name, $status, $evidence) {
    $script:results += [pscustomobject]@{ Criterion = $name; Status = $status; Evidence = $evidence }
}

# 1. azd up completed
$exists = az group exists --name $rg 2>$null
Add-Result '1. RG exists' ($exists -eq 'true' ? 'PASS' : 'FAIL') $rg

# 2-9: stubs for now. Fill in as each stage of the tutorial is completed.
Add-Result '2. Parent consent flow' 'TODO' 'Day 2 — manual verify in External ID'
Add-Result '3. Localisation NL->DE' 'TODO' 'Day 4 — run pipelines/localisation/localise.py'
Add-Result '4. Client-side ONNX inference' 'TODO' 'Day 5 — open learner-web in browser, check DevTools'
Add-Result '5. Federated round + AML registry' 'TODO' 'Day 6 — check AML model registry for learner-model:v2'
Add-Result '6. Teacher Console grade + override' 'TODO' 'Day 7-8'
Add-Result '7. Power BI fairness dashboard' 'TODO' 'Day 8 — Fabric workspace'
Add-Result '8. Purview lineage + AI Act log' 'TODO' 'Day 10 — Purview portal + Azure Monitor workbook'
Add-Result '9. Erasure cascade < 5 min' 'TODO' 'Day 9 — run scripts/run_erasure.ps1 (TBD)'

$results | Format-Table -AutoSize
