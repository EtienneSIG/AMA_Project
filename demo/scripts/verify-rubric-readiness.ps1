# verify-rubric-readiness.ps1 - non-destructive AMA 60/60 readiness gate.
[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$demoRoot = Split-Path -Parent $PSScriptRoot
$repoRoot = Split-Path -Parent $demoRoot
$matrixRoot = Join-Path $repoRoot 'RequirementMatrix'
$pass = 0
$fail = 0

function Check($Name, [bool]$Ok, [string]$Detail = '') {
  if ($Ok) {
    Write-Host "PASS $Name" -ForegroundColor Green
    $script:pass++
  } else {
    if ($Detail) { Write-Host "FAIL $Name - $Detail" -ForegroundColor Red }
    else { Write-Host "FAIL $Name" -ForegroundColor Red }
    $script:fail++
  }
}

function Require-File($Path, $Name) {
  Check $Name (Test-Path -LiteralPath $Path -PathType Leaf) $Path
}

$apps = @(
  'learner-web',
  'parent-portal',
  'teacher-console',
  'admin',
  'director-portal',
  'director-fabric-app'
)

Write-Host '== LearnEU AMA rubric readiness gate ==' -ForegroundColor Cyan

$bicep = Join-Path $demoRoot 'infra\modules\app-service.bicep'
Require-File $bicep 'app-service.bicep exists'
if (Test-Path -LiteralPath $bicep) {
  $bicepText = Get-Content -LiteralPath $bicep -Raw
  Check 'App Service targets NODE|22-lts' ($bicepText -match "linuxFxVersion:\s*'NODE\|22-lts'")
}

foreach ($app in $apps) {
  $appRoot = Join-Path $demoRoot "apps\$app"
  $packageJson = Join-Path $appRoot 'package.json'
  $packageLock = Join-Path $appRoot 'package-lock.json'
  Require-File $packageJson "$app package.json exists"
  if (Test-Path -LiteralPath $packageJson) {
    $pkg = Get-Content -LiteralPath $packageJson -Raw | ConvertFrom-Json
    Check "$app engines.node is 22.x" ($pkg.engines.node -eq '22.x')
  }
  Require-File $packageLock "$app package-lock.json exists"
  if (Test-Path -LiteralPath $packageLock) {
    Push-Location $appRoot
    try {
      & npm ci --dry-run --ignore-scripts --loglevel=error 2>&1 | Out-Null
      Check "$app npm ci --dry-run" ($LASTEXITCODE -eq 0)
    } finally {
      Pop-Location
    }
  }
}

$jsFiles = Get-ChildItem -LiteralPath $demoRoot -Recurse -Filter '*.js' -File |
  Where-Object { $_.FullName -notmatch '\\node_modules\\' }
foreach ($file in $jsFiles) {
  & node --check $file.FullName 2>&1 | Out-Null
  Check "node --check $($file.FullName.Substring($demoRoot.Length + 1))" ($LASTEXITCODE -eq 0)
}

& python -m compileall -q $demoRoot
Check 'python -m compileall -q demo' ($LASTEXITCODE -eq 0)

Require-File (Join-Path $matrixRoot 'AMA_Rubric_EMEA.extracted.md') 'AMA rubric extraction evidence'
Require-File (Join-Path $matrixRoot 'requirement-analysis-2026-06-30.md') 'daily requirement analysis'
Require-File (Join-Path $matrixRoot 'remediation-60-60-2026-06-30.md') '60/60 remediation closure matrix'
Require-File (Join-Path $matrixRoot 'monitoring-evidence-2026-06-30.md') 'monitoring evidence'
Require-File (Join-Path $matrixRoot 'agentic-handoff-evidence-2026-06-30.md') 'agentic handoff evidence'

Write-Host ''
Write-Host "Result: $pass passed, $fail failed"
if ($fail -gt 0) { exit 1 }
