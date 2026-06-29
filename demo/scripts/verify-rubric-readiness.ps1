<#
.SYNOPSIS
  Non-destructive readiness gate for the AMA 60/60 rubric.
.DESCRIPTION
  Checks the evidence that was missing from the initial requirement matrix:
  target runtime alignment, lockfile reproducibility, syntax/build hygiene,
  monitoring/audit evidence, and agentic governance evidence.
#>
[CmdletBinding()]
param(
  [string]$RepoRoot = ''
)

$ErrorActionPreference = 'Stop'
$ScriptDir = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Parent $MyInvocation.MyCommand.Path }
if (-not $RepoRoot) {
  $RepoRoot = (Resolve-Path (Join-Path $ScriptDir '..\..')).Path
}
$results = New-Object System.Collections.Generic.List[object]

function Add-Result {
  param(
    [string]$Id,
    [string]$Status,
    [string]$Detail
  )
  $results.Add([pscustomobject]@{ Id = $Id; Status = $Status; Detail = $Detail }) | Out-Null
  $color = if ($Status -eq 'PASS') { 'Green' } elseif ($Status -eq 'WARN') { 'Yellow' } else { 'Red' }
  Write-Host ("[{0}] {1} - {2}" -f $Status, $Id, $Detail) -ForegroundColor $color
}

function Assert-FileContains {
  param(
    [string]$Id,
    [string]$Path,
    [string]$Pattern,
    [string]$Detail
  )
  if (-not (Test-Path -LiteralPath $Path)) {
    Add-Result $Id 'FAIL' "Missing file: $Path"
    return
  }
  $text = Get-Content -LiteralPath $Path -Raw
  if ($text -notmatch $Pattern) {
    Add-Result $Id 'FAIL' ("Pattern not found in {0}: {1}" -f $Path, $Pattern)
    return
  }
  Add-Result $Id 'PASS' $Detail
}

Set-Location -LiteralPath $RepoRoot

$apps = @(
  'admin',
  'director-fabric-app',
  'director-portal',
  'learner-web',
  'parent-portal',
  'teacher-console'
)

foreach ($app in $apps) {
  $appDir = Join-Path $RepoRoot "demo\apps\$app"
  $pkgPath = Join-Path $appDir 'package.json'
  $lockPath = Join-Path $appDir 'package-lock.json'
  if (-not (Test-Path -LiteralPath $pkgPath)) {
    Add-Result "package-$app" 'FAIL' 'package.json missing'
    continue
  }
  $pkg = Get-Content -LiteralPath $pkgPath -Raw | ConvertFrom-Json
  if ($pkg.engines.node -ne '22.x') {
    Add-Result "runtime-$app" 'FAIL' "Expected engines.node=22.x, got '$($pkg.engines.node)'"
  } else {
    Add-Result "runtime-$app" 'PASS' 'package declares Node 22.x'
  }
  if (Test-Path -LiteralPath $lockPath) {
    Add-Result "lock-$app" 'PASS' 'package-lock.json present'
  } else {
    Add-Result "lock-$app" 'FAIL' 'package-lock.json missing'
  }
}

Assert-FileContains `
  -Id 'azure-node-runtime' `
  -Path (Join-Path $RepoRoot 'demo\infra\modules\app-service.bicep') `
  -Pattern "linuxFxVersion:\s*'NODE\|22-lts'" `
  -Detail 'Azure App Service runtime is pinned to NODE|22-lts'

foreach ($app in $apps) {
  $appDir = Join-Path $RepoRoot "demo\apps\$app"
  if (Test-Path -LiteralPath (Join-Path $appDir 'package-lock.json')) {
    Push-Location $appDir
    try {
      npm ci --dry-run --ignore-scripts --no-audit --no-fund | Out-Null
      if ($LASTEXITCODE -eq 0) {
        Add-Result "npm-ci-$app" 'PASS' 'package-lock is in sync with package.json'
      } else {
        Add-Result "npm-ci-$app" 'FAIL' "npm ci --dry-run exited $LASTEXITCODE"
      }
    } finally {
      Pop-Location
    }
  }
}

$jsFailures = New-Object System.Collections.Generic.List[string]
Get-ChildItem -LiteralPath (Join-Path $RepoRoot 'demo') -Recurse -File -Filter '*.js' |
  Where-Object { $_.FullName -notmatch '\\node_modules\\|\\dist\\|\\build\\|\\coverage\\' } |
  ForEach-Object {
    node --check $_.FullName | Out-Null
    if ($LASTEXITCODE -ne 0) { $jsFailures.Add($_.FullName) | Out-Null }
  }
if ($jsFailures.Count -eq 0) {
  Add-Result 'js-syntax' 'PASS' 'All demo JavaScript files pass node --check'
} else {
  Add-Result 'js-syntax' 'FAIL' ('Syntax failures: ' + ($jsFailures -join '; '))
}

python -m compileall -q (Join-Path $RepoRoot 'demo')
if ($LASTEXITCODE -eq 0) {
  Add-Result 'python-compile' 'PASS' 'All demo Python files compile'
} else {
  Add-Result 'python-compile' 'FAIL' "python compileall exited $LASTEXITCODE"
}

Assert-FileContains `
  -Id 'monitoring-schema' `
  -Path (Join-Path $RepoRoot 'demo\apps\learner-web\db\schema.sql') `
  -Pattern 'audit_event|content_safety_results|ask_history|connection_logs' `
  -Detail 'Operational, AI, auth, and content-safety logging tables are present'

Assert-FileContains `
  -Id 'monitoring-report' `
  -Path (Join-Path $RepoRoot 'RequirementMatrix\monitoring-evidence-2026-06-29.md') `
  -Pattern 'Azure Monitor|Application Insights|Log Analytics|AI Act Art\. 12|retention' `
  -Detail 'Monitoring evidence pack maps runtime telemetry to rubric expectations'

Assert-FileContains `
  -Id 'agentic-evidence' `
  -Path (Join-Path $RepoRoot 'RequirementMatrix\agentic-handoff-evidence-2026-06-29.md') `
  -Pattern 'state graph|handoff|Responsible AI Evaluator|Cross-Agent QA' `
  -Detail 'Agentic handoff evidence is documented'

Assert-FileContains `
  -Id 'submission-pack' `
  -Path (Join-Path $RepoRoot 'RequirementMatrix\remediation-60-60-2026-06-29.md') `
  -Pattern '60 / 60|Remediation closure matrix|verify-rubric-readiness' `
  -Detail '60/60 remediation closure matrix is present'

$failed = @($results | Where-Object { $_.Status -eq 'FAIL' })
Write-Host ''
Write-Host 'Summary' -ForegroundColor Cyan
$results | Group-Object Status | Sort-Object Name | ForEach-Object {
  Write-Host ("{0}: {1}" -f $_.Name, $_.Count)
}

if ($failed.Count -gt 0) {
  throw ("Rubric readiness failed: " + (($failed | ForEach-Object { $_.Id }) -join ', '))
}

Write-Host 'Rubric readiness checks passed.' -ForegroundColor Green
