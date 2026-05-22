<#
.SYNOPSIS
  Feature 001 acceptance probe (T005): assert <5% of skills.chapter is NULL.

.DESCRIPTION
  Spec 001 requires every skill to belong to a chapter so the learner's
  "My progress" tab can group bars per chapter. Implementation lives in
  `demo/apps/learner-web/db/schema.sql` (line 165) + auto-seed in
  `demo/apps/learner-web/db/index.js`. This script queries the live API and
  fails (exit 1) if more than 5% of rows have a null/blank chapter.

.PARAMETER BaseUrl
  Learner web app root URL.
.PARAMETER Email / Password
  Seeded learner credentials.

.EXAMPLE
  pwsh demo/scripts/verify-chapter.ps1
#>
[CmdletBinding()]
param(
  [string] $BaseUrl  = 'https://app-learner-web-learneu-demo.azurewebsites.net',
  [string] $Email    = 'student@learneu.demo',
  [string] $Password = 'DemoPass2026!'
)

$ErrorActionPreference = 'Stop'
$ProgressPreference    = 'SilentlyContinue'

$sess = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$null = Invoke-WebRequest -Uri "$BaseUrl/api/auth/login" -Method POST `
  -Body (@{ email = $Email; password = $Password } | ConvertTo-Json) `
  -ContentType 'application/json' -WebSession $sess -UseBasicParsing

$resp = Invoke-RestMethod -Uri "$BaseUrl/api/learner/mastery" -WebSession $sess
$rows = $resp.rows
if (-not $rows -or $rows.Count -eq 0) {
  Write-Error "no mastery rows returned — cannot verify chapter coverage"
  exit 1
}

$total = $rows.Count
$blank = @($rows | Where-Object { -not $_.chapter -or [string]::IsNullOrWhiteSpace($_.chapter) }).Count
$pct   = [math]::Round(100.0 * $blank / $total, 2)

Write-Host ("Chapter coverage: {0}/{1} blank ({2}%)" -f $blank, $total, $pct)
if ($pct -ge 5.0) {
  Write-Error ("FAIL: {0}% of skills have a null/blank chapter (threshold = 5%)" -f $pct)
  exit 1
}
Write-Host "PASS: feature 001 chapter back-fill within tolerance"
exit 0
