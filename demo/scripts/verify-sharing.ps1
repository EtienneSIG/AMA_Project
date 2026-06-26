# verify-sharing.ps1 — Feature 013 (Learner Sheet & Item Sharing) checks.
# Static guarantees (no live DB needed) + optional HTTP smoke test with -BaseUrl.
#
# Usage:
#   pwsh demo/scripts/verify-sharing.ps1
#   pwsh demo/scripts/verify-sharing.ps1 -BaseUrl https://app-learner-web-learneu-demo.azurewebsites.net
[CmdletBinding()]
param([string]$BaseUrl)

$ErrorActionPreference = 'Stop'
$demoRoot = Split-Path -Parent $PSScriptRoot
$shared = Join-Path $demoRoot 'apps/_shared'
$pass = 0; $fail = 0
function Check($name, [bool]$ok) {
  if ($ok) { Write-Host "  PASS  $name" -ForegroundColor Green; $script:pass++ }
  else     { Write-Host "  FAIL  $name" -ForegroundColor Red;   $script:fail++ }
}

Write-Host "== Feature 013 — sharing static checks ==" -ForegroundColor Cyan

# 1. JS syntax of edited shared files.
foreach ($f in 'server.js', 'db/index.js', 'auth.js') {
  $p = Join-Path $shared $f
  & node --check $p 2>$null
  Check "node --check $f" ($LASTEXITCODE -eq 0)
}

$server = Get-Content (Join-Path $shared 'server.js') -Raw
$dbidx  = Get-Content (Join-Path $shared 'db/index.js') -Raw
$schema = Get-Content (Join-Path $shared 'db/schema.sql') -Raw

# 2. Server-authoritative roster check (recipients never trusted from client).
Check "POST /api/share resolves classmates server-side" ($server -match "listClassmateEmails\(\{\s*learnerEmail")
Check "recipient_not_in_class guard present"            ($server -match "recipient_not_in_class")
# 3. Under-16 consent gate (both sender and recipient).
Check "sender consent gate (consent_required)"          ($server -match "consent_required")
Check "recipient consent re-check at send"              ($server -match "hasActiveConsentForLearner\(\{ childEmail: recipient")
# 4. Content-Safety scan on the note + held-for-moderation.
Check "note Content-Safety scan"                        ($server -match "cs\.analyze\(cleanNote\)")
Check "flagged note held_for_moderation"                ($server -match "held_for_moderation")
# 5. Read-only + revoke + block + teacher controls.
Check "revoke route present"                            ($server -match "/api/share/:id/revoke")
Check "received route (read-only) present"              ($server -match "/api/share/received")
Check "block route present"                             ($server -match "/api/share/block")
Check "teacher log route present"                       ($server -match "/api/share/teacher/log")
Check "teacher disable route present"                   ($server -match "/api/share/teacher/disable")
Check "teacher moderate route present"                  ($server -match "/api/share/teacher/moderate")
Check "share routes are student-role guarded"           ($server -match "student role required")
Check "teacher routes are teacher/admin guarded"        ($server -match "teacher role required")

# 6. Helpers + schema.
foreach ($h in 'listClassmateEmails','isSharingEnabled','setSharingPolicy','isSenderBlocked','blockSender','createShareSnapshot','createShare','revokeShare','listSharesReceived','listSharesForClass','moderateShare') {
  Check "db helper exported: $h" ($dbidx -match "(?m)^\s*$h,")
}
foreach ($t in 'shared_artifact_snapshot','share','sharing_policy','recipient_block') {
  Check "schema table: $t" ($schema -match "CREATE TABLE IF NOT EXISTS $t\b")
}

# 7. UI pages exist.
Check "learner sharing.html exists"      (Test-Path (Join-Path $demoRoot 'apps/learner-web/public/sharing.html'))
Check "teacher sharing-log.html exists"  (Test-Path (Join-Path $demoRoot 'apps/teacher-console/public/sharing-log.html'))

# 8. Optional live smoke test — endpoints must require auth (no anonymous access to learner content).
if ($BaseUrl) {
  Write-Host "== Live smoke test against $BaseUrl ==" -ForegroundColor Cyan
  function Status($path) {
    try { (Invoke-WebRequest -Uri ($BaseUrl.TrimEnd('/') + $path) -Method Get -MaximumRedirection 0 -SkipHttpErrorCheck).StatusCode }
    catch { if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { -1 } }
  }
  $s = Status '/api/share/received'
  Check "/api/share/received requires auth (401/403/302)" (@(401,403,302) -contains $s)
  $h = Status '/api/health'
  Check "/api/health reachable (200)" ($h -eq 200)
}

Write-Host ""
$color = if ($fail -eq 0) { 'Green' } else { 'Red' }
Write-Host "Result: $pass passed, $fail failed" -ForegroundColor $color
if ($fail -gt 0) { exit 1 }
