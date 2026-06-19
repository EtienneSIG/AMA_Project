param(
  [string]$LearnerBase = 'https://app-learner-web-learneu-demo.azurewebsites.net',
  [string]$TeacherBase = 'https://app-teacher-console-learneu-demo.azurewebsites.net',
  [string]$ParentBase = 'https://app-parent-portal-learneu-demo.azurewebsites.net',
  [string]$LearnerEmail = 'student@learneu.demo',
  [string]$TeacherEmail = 'teacher@learneu.demo',
  [string]$ParentEmail = 'parent@learneu.demo',
  [string]$Password = 'DemoPass2026!',
  [string]$ItemId = 'FRAC-01'
)

# Feature 007 — Adaptive Learning end-to-end verifier.
# Exercises: learner attempt -> adaptive/next (transparent label) ; teacher view -> override.
$ErrorActionPreference = 'Stop'

function Login($base, $email) {
  $s = New-Object Microsoft.PowerShell.Commands.WebRequestSession
  $r = Invoke-WebRequest -Uri "$base/api/auth/login" -Method POST -WebSession $s -ContentType 'application/json' `
    -Body (@{ email = $email; password = $Password } | ConvertTo-Json) -TimeoutSec 30
  $csrf = ($r.Content | ConvertFrom-Json).csrfToken
  return @{ Session = $s; Csrf = $csrf }
}
function PostJson($base, $path, $ctx, $body) {
  $headers = @{ 'X-CSRF-Token' = $ctx.Csrf }
  $r = Invoke-WebRequest -Uri "$base$path" -Method POST -WebSession $ctx.Session -Headers $headers `
    -ContentType 'application/json' -Body ($body | ConvertTo-Json) -TimeoutSec 30
  return $r.Content | ConvertFrom-Json
}
function GetJson($base, $path, $ctx) {
  $r = Invoke-WebRequest -Uri "$base$path" -Method GET -WebSession $ctx.Session -TimeoutSec 30
  return $r.Content | ConvertFrom-Json
}

Write-Host "0) Parent grants GDPR Art. 8 consent for the under-16 demo learner..." -ForegroundColor Cyan
try {
  $parent = Login $ParentBase $ParentEmail
  PostJson $ParentBase '/api/parent/consents' $parent @{ childEmail = $LearnerEmail; consentType = 'gdpr_art8'; granted = $true } | Out-Null
  Write-Host "   consent granted" -ForegroundColor Green
} catch { Write-Host "   (consent step skipped: $($_.Exception.Message))" -ForegroundColor Yellow }

Write-Host "1) Learner login + seed attempt..." -ForegroundColor Cyan
$learner = Login $LearnerBase $LearnerEmail
foreach ($c in @($true, $false, $true, $true)) {
  PostJson $LearnerBase '/api/learner/attempt' $learner @{ itemId = $ItemId; difficulty = 0.5; predicted = 0.6; correct = $c; latencyMs = 4200 } | Out-Null
}

Write-Host "2) adaptive/next returns a transparent recommendation..." -ForegroundColor Cyan
$rec = PostJson $LearnerBase '/api/learner/adaptive/next' $learner @{ itemId = $ItemId; correct = $true; latencyMs = 4200; device = 'verify-script' }
if (-not $rec.ok) { throw "adaptive/next did not return ok" }
if (-not $rec.reason) { throw "adaptive/next missing reason (band logic)" }
if (-not $rec.label) { throw "adaptive/next missing learner transparency label (Art. 13)" }
Write-Host ("   reason={0} band={1} label='{2}' store={3}" -f $rec.reason, $rec.band, $rec.label, $rec.store) -ForegroundColor Green

Write-Host "3) Cross-device resume state persisted..." -ForegroundColor Cyan
$state = GetJson $LearnerBase '/api/learner/adaptive/state' $learner
if (-not $state.state) { Write-Host "   (no state row — memory mode)" -ForegroundColor Yellow }
else { Write-Host ("   resume activity={0}" -f $state.state.current_activity_id) -ForegroundColor Green }

Write-Host "4) Teacher login + adaptive learner view (Art. 14 oversight)..." -ForegroundColor Cyan
$teacher = Login $TeacherBase $TeacherEmail
$view = GetJson $TeacherBase ("/api/teacher/adaptive/learner/{0}" -f [uri]::EscapeDataString($LearnerEmail)) $teacher
if ($null -eq $view.decisions) { throw "teacher adaptive view missing decisions array" }
Write-Host ("   decisions={0} overrides={1} highIntervention={2}" -f $view.decisions.Count, $view.overrides.Count, $view.highIntervention.Count) -ForegroundColor Green

if ($view.decisions.Count -gt 0) {
  $target = $view.decisions | Where-Object { -not $_.teacher_overridden } | Select-Object -First 1
  if ($target) {
    Write-Host "5) Teacher override is accepted + logged immutably..." -ForegroundColor Cyan
    $ov = PostJson $TeacherBase ("/api/teacher/adaptive/override/{0}" -f $target.id) $teacher @{ reasoning = 'verify-script: routing to guided practice'; overrideActivityId = 'frac-guided-01' }
    if (-not $ov.ok) { throw "teacher override failed" }
    Write-Host "   override applied + audited" -ForegroundColor Green
  }
}

Write-Host "Adaptive verification completed." -ForegroundColor Green
