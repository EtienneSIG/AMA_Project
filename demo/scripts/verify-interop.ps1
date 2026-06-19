param(
  [string]$AdminBase = 'https://app-admin-learneu-demo.azurewebsites.net',
  [string]$LearnerBase = 'https://app-learner-web-learneu-demo.azurewebsites.net',
  [string]$TeacherBase = 'https://app-teacher-console-learneu-demo.azurewebsites.net',
  [string]$ParentBase = 'https://app-parent-portal-learneu-demo.azurewebsites.net',
  [string]$AdminEmail = 'admin@learneu.demo',
  [string]$LearnerEmail = 'student@learneu.demo',
  [string]$TeacherEmail = 'teacher@learneu.demo',
  [string]$ParentEmail = 'parent@learneu.demo',
  [string]$Password = 'DemoPass2026!'
)

# Feature 009 — Interoperability end-to-end verifier.
# Exercises: connector onboarding (EU guard + secret reference), SCORM onboarding +
# learner launch/commit, xAPI delivery insights, SIS sync + conflict queue, GDPR export,
# and the immutable external-API audit trail.
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
    -ContentType 'application/json' -Body ($body | ConvertTo-Json -Depth 8) -TimeoutSec 30
  return $r.Content | ConvertFrom-Json
}
function GetJson($base, $path, $ctx) {
  $r = Invoke-WebRequest -Uri "$base$path" -Method GET -WebSession $ctx.Session -TimeoutSec 30
  return $r.Content | ConvertFrom-Json
}
function ExpectFail($scriptblock, $label) {
  try { & $scriptblock; throw "EXPECTED FAILURE but call succeeded: $label" }
  catch { if ($_.Exception.Message -like '*EXPECTED FAILURE*') { throw } Write-Host "   rejected as expected: $label" -ForegroundColor Green }
}

Write-Host "0) Parent grants GDPR Art. 8 consent for the under-16 demo learner..." -ForegroundColor Cyan
try {
  $parent = Login $ParentBase $ParentEmail
  PostJson $ParentBase '/api/parent/consents' $parent @{ childEmail = $LearnerEmail; consentType = 'gdpr_art8'; granted = $true } | Out-Null
  Write-Host "   consent granted" -ForegroundColor Green
} catch { Write-Host "   (consent step skipped: $($_.Exception.Message))" -ForegroundColor Yellow }

Write-Host "1) Admin login..." -ForegroundColor Cyan
$admin = Login $AdminBase $AdminEmail

Write-Host "2) Non-EU endpoint is rejected (fail closed)..." -ForegroundColor Cyan
ExpectFail { PostJson $AdminBase '/api/admin/integrations' $admin @{ connectorType = 'xapi'; name = 'bad-us-lrs'; endpoint = 'https://lrs.example.com'; secretRef = '@KeyVault(name=kv;secret=x)'; enabled = $true } } 'non-EU endpoint'

Write-Host "3) Plaintext secret is rejected..." -ForegroundColor Cyan
ExpectFail { PostJson $AdminBase '/api/admin/integrations' $admin @{ connectorType = 'xapi'; name = 'bad-secret'; endpoint = 'https://lrs.example.eu'; secretRef = 'super-secret-token'; enabled = $true } } 'plaintext secret'

Write-Host "4) Valid EU connector onboards..." -ForegroundColor Cyan
$cfg = PostJson $AdminBase '/api/admin/integrations' $admin @{ connectorType = 'xapi'; name = 'prod-lrs'; endpoint = 'https://lrs.learneu.eu/xapi'; secretRef = '@KeyVault(name=kv-learneu;secret=lrs-token)'; enabled = $true }
if (-not $cfg.ok) { throw 'connector onboarding failed' }
Write-Host "   connector saved" -ForegroundColor Green

Write-Host "5) Health probe reports connector status..." -ForegroundColor Cyan
$health = GetJson $AdminBase '/api/admin/integrations/health' $admin
Write-Host ("   probes={0}" -f $health.probes.Count) -ForegroundColor Green

Write-Host "6) Admin onboards a SCORM package..." -ForegroundColor Cyan
$pkg = PostJson $AdminBase '/api/admin/scorm/packages' $admin @{ manifest = @{ identifier = 'FRAC-SCORM-01'; title = 'Fractions Explorer'; schemaversion = '1.2'; href = 'index_lms.html'; masteryScore = 70 } }
if (-not $pkg.ok) { throw 'scorm onboarding failed' }
Write-Host ("   package={0} version={1}" -f $pkg.packageId, $pkg.scormVersion) -ForegroundColor Green

Write-Host "7) Learner launches + commits the SCORM activity..." -ForegroundColor Cyan
$learner = Login $LearnerBase $LearnerEmail
$launch = PostJson $LearnerBase ("/api/learner/scorm/{0}/launch" -f $pkg.packageId) $learner @{}
if (-not $launch.ok) { throw 'scorm launch failed' }
$commit = PostJson $LearnerBase ("/api/learner/scorm/{0}/commit" -f $pkg.packageId) $learner @{ lessonStatus = 'completed'; scoreRaw = 88; sessionTime = '00:06:30' }
if (-not $commit.ok) { throw 'scorm commit failed' }
Write-Host ("   committed status={0} score={1}" -f $commit.lessonStatus, $commit.scoreRaw) -ForegroundColor Green

Write-Host "8) Teacher sees xAPI delivery insights + drains queue..." -ForegroundColor Cyan
$teacher = Login $TeacherBase $TeacherEmail
$insights = GetJson $TeacherBase '/api/teacher/xapi/insights' $teacher
Write-Host ("   delivery pending={0} delivered={1} dead_letter={2}" -f $insights.delivery.pending, $insights.delivery.delivered, $insights.delivery.dead_letter) -ForegroundColor Green
$drain = PostJson $TeacherBase '/api/teacher/xapi/drain' $teacher @{ simulateOutage = $false }
Write-Host ("   drained processed={0}" -f $drain.processed) -ForegroundColor Green

Write-Host "9) SIS sync upserts + queues an identity conflict..." -ForegroundColor Cyan
$roster = @(
  @{ email = 'student@learneu.demo'; externalId = 'SIS-1001'; name = 'Student Demo'; classId = '6A' },
  @{ email = 'student@learneu.demo'; externalId = 'SIS-9999'; name = 'Collision'; classId = '6B' },
  @{ email = 'newpupil@learneu.demo'; externalId = 'SIS-1002'; name = 'New Pupil'; classId = '6A' }
)
$sync = PostJson $AdminBase '/api/admin/sis/sync' $admin @{ mode = 'delta'; roster = $roster }
if (-not $sync.ok) { throw 'sis sync failed' }
Write-Host ("   job={0} upserts={1} conflicts={2}" -f $sync.jobId, $sync.upserts, $sync.conflicts) -ForegroundColor Green
$status = GetJson $AdminBase ("/api/admin/sis/sync/{0}" -f $sync.jobId) $admin
if ($status.job.status -ne 'completed') { throw 'sis job not completed' }

Write-Host "10) GDPR Art. 15 export produces an encrypted package + expiring link..." -ForegroundColor Cyan
$export = PostJson $AdminBase '/api/admin/exports' $admin @{ subjectEmail = $LearnerEmail }
if (-not $export.ok) { throw 'export failed' }
if (-not $export.link.expiresAt) { throw 'export missing expiring link' }
Write-Host ("   request={0} status={1} files={2}" -f $export.requestId, $export.status, ($export.manifest.files.Count)) -ForegroundColor Green

Write-Host "11) Immutable external API audit trail is populated..." -ForegroundColor Cyan
$audit = GetJson $AdminBase '/api/admin/integrations/audit' $admin
if ($audit.events.Count -lt 1) { throw 'no external API audit events recorded' }
Write-Host ("   audit events={0}" -f $audit.events.Count) -ForegroundColor Green

Write-Host "Interoperability verification completed." -ForegroundColor Green
