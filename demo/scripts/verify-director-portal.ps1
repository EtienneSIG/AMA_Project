param(
  [string]$BaseUrl = 'https://app-director-portal-learneu-demo.azurewebsites.net'
)

$ErrorActionPreference = 'Stop'

function Login-Director([string]$email) {
  $session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
  $login = Invoke-WebRequest -Uri "$BaseUrl/api/auth/login" -Method POST -WebSession $session -ContentType 'application/json' -Body (@{ email = $email; password = 'DemoPass2026!' } | ConvertTo-Json)
  $json = $login.Content | ConvertFrom-Json
  return [pscustomobject]@{ Session = $session; Csrf = $json.csrfToken }
}

Write-Host "[1/3] Checking approved director access..." -ForegroundColor Cyan
$approved = Login-Director -email 'director@learneu.demo'
$meta = Invoke-WebRequest -Uri "$BaseUrl/api/reporting/metadata" -Method GET -WebSession $approved.Session
if ($meta.StatusCode -ne 200) { throw "Expected 200 for approved director, got $($meta.StatusCode)" }
$metaJson = $meta.Content | ConvertFrom-Json
if (-not $metaJson.scope.granted) { throw 'Approved director should have granted scope' }

Write-Host "[2/3] Checking no-scope director is blocked..." -ForegroundColor Cyan
$noScope = Login-Director -email 'director.noscope@learneu.demo'
try {
  Invoke-WebRequest -Uri "$BaseUrl/api/reporting/metadata" -Method GET -WebSession $noScope.Session -ErrorAction Stop | Out-Null
  throw 'Expected blocked metadata access for no-scope director'
} catch {
  $resp = $_.Exception.Response
  if (-not $resp) { throw }
  if ([int]$resp.StatusCode -ne 403) { throw "Expected 403 for no-scope director, got $([int]$resp.StatusCode)" }
}

Write-Host "[3/3] Checking no-access page availability..." -ForegroundColor Cyan
$noAccess = Invoke-WebRequest -Uri "$BaseUrl/no-access.html" -Method GET
if ($noAccess.StatusCode -ne 200) { throw "Expected 200 for no-access page, got $($noAccess.StatusCode)" }

Write-Host "[4/6] Checking Fabric reporting backend + EU residency..." -ForegroundColor Cyan
if ($metaJson.backend -ne 'fabric-app' -and $metaJson.backend -ne 'powerbi-embedded') { throw "Unexpected backend: $($metaJson.backend)" }
if ($metaJson.backend -eq 'fabric-app') {
  if (-not $metaJson.residency.euResident) { throw 'fabric-app backend must be EU-resident (fail-closed)' }
  if (-not $metaJson.scopeContext) { throw 'fabric-app metadata must mint a portal-signed ScopeContext' }
  if (-not $metaJson.rayfinApp.url) { throw 'fabric-app metadata must expose the embedded Rayfin app URL' }
}

Write-Host "[5/6] Checking reporting health endpoint..." -ForegroundColor Cyan
$health = (Invoke-WebRequest -Uri "$BaseUrl/api/reporting/health" -Method GET -WebSession $approved.Session).Content | ConvertFrom-Json
if (-not $health.fallbackAvailable -and $health.backend -ne 'fabric-app') { throw 'No backend available and no Power BI fallback' }

Write-Host "[6/6] Asserting no learner-level cohort field leaks..." -ForegroundColor Cyan
if (($meta.Content -match 'cohortSize')) { throw 'cohortSize must never appear in reporting payloads' }

Write-Host "Director portal smoke checks passed." -ForegroundColor Green
