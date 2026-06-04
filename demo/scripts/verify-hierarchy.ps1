param(
  [string]$BaseUrl = 'https://app-director-portal-learneu-demo.azurewebsites.net',
  [string]$LearnerEmail = 'student@learneu.demo',
  [string]$DirectorEmail = 'director@learneu.demo'
)

$ErrorActionPreference = 'Stop'

function Invoke-JsonGet($uri, $session = $null) {
  for ($attempt = 1; $attempt -le 2; $attempt++) {
    try {
      if ($session) {
        return Invoke-WebRequest -Uri $uri -Method GET -WebSession $session -TimeoutSec 20 | ForEach-Object { $_.Content | ConvertFrom-Json }
      }
      return Invoke-WebRequest -Uri $uri -Method GET -TimeoutSec 20 | ForEach-Object { $_.Content | ConvertFrom-Json }
    } catch {
      $msg = $_.Exception.Message
      $status = $null
      try {
        if ($_.Exception.Response -and $_.Exception.Response.StatusCode) {
          $status = [int]$_.Exception.Response.StatusCode
        }
      } catch {}

      $isTransient = ($msg -match 'Timeout|timed out') -or ($status -eq 499)
      if ($isTransient -and $attempt -lt 2) {
        continue
      }
      if ($isTransient) {
        throw "Hierarchy endpoint unavailable (timeout/499). Verify app-to-Postgres network integration for the target app."
      }
      throw
    }
  }
}

Write-Host "Checking hierarchy summary endpoint..." -ForegroundColor Cyan
Write-Host "Authenticating director session..." -ForegroundColor Cyan
$login = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$auth = Invoke-WebRequest -Uri "$BaseUrl/api/auth/login" -Method POST -WebSession $login -ContentType 'application/json' -Body (@{ email = $DirectorEmail; password = 'DemoPass2026!' } | ConvertTo-Json)
$csrf = ($auth.Content | ConvertFrom-Json).csrfToken

$summary = Invoke-JsonGet "$BaseUrl/api/data/hierarchy?asOf=2026-06-01" $login
if (-not $summary.enabled) { throw "Hierarchy endpoint disabled" }
if (-not $summary.hierarchy) { throw "Hierarchy payload missing" }

if (($summary.hierarchy.class | Measure-Object).Count -lt 1) { throw "Class rollup missing" }
if (($summary.hierarchy.school | Measure-Object).Count -lt 1) { throw "School rollup missing" }
if (($summary.hierarchy.region | Measure-Object).Count -lt 1) { throw "Region rollup missing" }
if (($summary.hierarchy.openExceptions | Measure-Object).Count -lt 1) { throw "Expected at least one open hierarchy exception for demo coverage" }

Write-Host "Checking director access state..." -ForegroundColor Cyan
$meta = Invoke-WebRequest -Uri "$BaseUrl/api/reporting/metadata" -Method GET -WebSession $login
$metaJson = $meta.Content | ConvertFrom-Json
if ($metaJson.status -eq 'ready' -and ($metaJson.reports | Measure-Object).Count -gt 0) {
  Write-Host "Director portal reporting metadata available." -ForegroundColor Green
} else {
  Write-Host "Director portal reporting remains fail-closed until approved Fabric metadata is supplied." -ForegroundColor Yellow
}

Write-Host "Hierarchy verification completed." -ForegroundColor Green