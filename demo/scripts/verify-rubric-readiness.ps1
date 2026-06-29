param()

$ErrorActionPreference = 'Continue'
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..\..')
$failures = New-Object System.Collections.Generic.List[string]

function Pass($message) {
  Write-Host "PASS $message" -ForegroundColor Green
}

function Fail($message) {
  Write-Host "FAIL $message" -ForegroundColor Red
  $script:failures.Add($message) | Out-Null
}

function Test-FilePresent($path, $label) {
  if ((Test-Path $path) -and ((Get-Item $path).Length -gt 0)) {
    Pass "$label present"
  } else {
    Fail "$label missing or empty: $path"
  }
}

Push-Location $repoRoot
try {
  $bicepPath = Join-Path $repoRoot 'demo\infra\modules\app-service.bicep'
  if ((Test-Path $bicepPath) -and ((Get-Content $bicepPath -Raw) -match "linuxFxVersion:\s*'NODE\|22-lts'")) {
    Pass 'App Service bicep targets NODE|22-lts'
  } else {
    Fail 'App Service bicep must target NODE|22-lts'
  }

  $packageFiles = Get-ChildItem -Path (Join-Path $repoRoot 'demo\apps') -Filter package.json -Recurse |
    Where-Object { $_.FullName -notmatch '\\node_modules\\' }

  foreach ($packageFile in $packageFiles) {
    $relativePackage = Resolve-Path $packageFile.FullName -Relative
    try {
      $package = Get-Content $packageFile.FullName -Raw | ConvertFrom-Json
      if ($package.engines.node -eq '22.x') {
        Pass "$relativePackage declares engines.node 22.x"
      } else {
        Fail "$relativePackage must declare engines.node 22.x"
      }
    } catch {
      Fail "$relativePackage is not valid JSON: $($_.Exception.Message)"
    }

    $appDir = Split-Path $packageFile.FullName -Parent
    $lockPath = Join-Path $appDir 'package-lock.json'
    if (Test-Path $lockPath) {
      Pass "$relativePackage has package-lock.json"
      Push-Location $appDir
      try {
        & npm ci --dry-run --ignore-scripts --no-audit --fund=false --progress=false --loglevel=error | Out-Null
        if ($LASTEXITCODE -eq 0) {
          Pass "$relativePackage npm ci --dry-run"
        } else {
          Fail "$relativePackage npm ci --dry-run failed"
        }
      } finally {
        Pop-Location
      }
    } else {
      Fail "$relativePackage missing package-lock.json"
    }
  }

  $jsFiles = Get-ChildItem -Path (Join-Path $repoRoot 'demo') -Filter *.js -Recurse |
    Where-Object { $_.FullName -notmatch '\\node_modules\\' }

  foreach ($jsFile in $jsFiles) {
    $nodeOutput = & node --check $jsFile.FullName 2>&1
    if ($LASTEXITCODE -eq 0) {
      Pass "node --check $(Resolve-Path $jsFile.FullName -Relative)"
    } else {
      Fail "node --check failed for $(Resolve-Path $jsFile.FullName -Relative): $($nodeOutput -join ' ')"
    }
  }

  $pythonOutput = & python -m compileall -q (Join-Path $repoRoot 'demo') 2>&1
  if ($LASTEXITCODE -eq 0) {
    Pass 'python -m compileall -q demo'
  } else {
    Fail "python compileall failed: $($pythonOutput -join ' ')"
  }

  $matrixDir = Join-Path $repoRoot 'RequirementMatrix'
  Test-FilePresent (Join-Path $matrixDir 'AMA_Rubric_EMEA.extracted.md') 'AMA rubric extraction'
  Test-FilePresent (Join-Path $matrixDir 'requirement-analysis-2026-06-29.md') 'Daily requirement analysis'
  Test-FilePresent (Join-Path $matrixDir 'remediation-60-60-2026-06-29.md') '60/60 remediation closure'
  Test-FilePresent (Join-Path $matrixDir 'monitoring-evidence-2026-06-29.md') 'Monitoring evidence'
  Test-FilePresent (Join-Path $matrixDir 'agentic-handoff-evidence-2026-06-29.md') 'Agentic handoff evidence'

  $remediationText = Get-Content (Join-Path $matrixDir 'remediation-60-60-2026-06-29.md') -Raw -ErrorAction SilentlyContinue
  if ($remediationText -match 'Initial Score' -and $remediationText -match 'Remediated Score') {
    Pass 'Remediation report distinguishes initial and remediated score'
  } else {
    Fail 'Remediation report must distinguish initial and remediated score'
  }

  if ($failures.Count -gt 0) {
    Write-Host ""
    Write-Host "Readiness gate failed with $($failures.Count) FAIL item(s)." -ForegroundColor Red
    exit 1
  }

  Write-Host ""
  Write-Host 'Readiness gate PASS: AMA remediated score is claimable as 60/60.' -ForegroundColor Green
  exit 0
} finally {
  Pop-Location
}
