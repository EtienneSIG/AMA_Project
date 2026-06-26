# verify-mood-checkin.ps1 — Feature 017 (Learner Mood Check-In & Well-Being Routing).
# Static guarantees (no live DB needed) + optional HTTP smoke test with -BaseUrl.
#
# Usage:
#   pwsh demo/scripts/verify-mood-checkin.ps1
#   pwsh demo/scripts/verify-mood-checkin.ps1 -BaseUrl https://app-learner-web-learneu-demo.azurewebsites.net
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

Write-Host "== Feature 017 — mood check-in static checks ==" -ForegroundColor Cyan

# 1. JS syntax of edited shared files.
foreach ($f in 'server.js', 'db/index.js') {
  $p = Join-Path $shared $f
  & node --check $p 2>$null
  Check "node --check $f" ($LASTEXITCODE -eq 0)
}

$server  = Get-Content (Join-Path $shared 'server.js') -Raw
$dbidx   = Get-Content (Join-Path $shared 'db/index.js') -Raw
$schema  = Get-Content (Join-Path $shared 'db/schema.sql') -Raw
# Strip SQL comment lines so prose like "no biometric inference" never trips field checks.
$schemaNoComments = ((Get-Content (Join-Path $shared 'db/schema.sql')) | Where-Object { $_ -notmatch '^\s*--' }) -join "`n"
$learner = Get-Content (Join-Path $demoRoot 'apps/learner-web/public/index.html') -Raw
$parent  = Get-Content (Join-Path $demoRoot 'apps/parent-portal/public/index.html') -Raw

# 2. Self-report only — no inference anywhere (no biometric/emotion/sentiment fields).
Check "no emotion/biometric inference in helpers"   (-not ($dbidx -match "(?i)sentiment|emotion_detect|facial|biometric|infer_mood"))
Check "mood recorded from explicit selection only"  ($dbidx -match "recordMood\(\{ learnerEmail")
Check "schema has no biometric/behavioural fields"  (-not ($schemaNoComments -match "(?i)biometric|facial|voice_|sentiment"))

# 3. Routes present + role guards.
Check "POST /api/mood/checkin present"              ($server -match "app\.post\('/api/mood/checkin'")
Check "DELETE /api/mood/checkin/:day (erase)"       ($server -match "app\.delete\('/api/mood/checkin/:day'")
Check "GET /api/mood/parent present"                ($server -match "app\.get\('/api/mood/parent'")
Check "GET /api/mood/teacher present"               ($server -match "app\.get\('/api/mood/teacher'")
Check "GET /api/mood/safeguarding present"          ($server -match "app\.get\('/api/mood/safeguarding'")
Check "checkin is student-role guarded"             ($server -match "student role required")
Check "teacher view is teacher/admin guarded"       ($server -match "teacher role required")
Check "safeguarding is authorised-staff guarded"    ($server -match "authorised staff only")

# 4. Compliance invariants.
Check "parent notice consent-gated"                 ($server -match "hasActiveConsentForLearner\(\{ childEmail")
Check "classmate routed to safeguarding only"       ($dbidx -match "INSERT INTO safeguarding_flag")
Check "classmate hidden from teacher open view"     ($dbidx -match "WHEN m\.reason = 'classmate' THEN NULL")
Check "teacher remains decision-maker (logged)"     ($dbidx -match "decideRecommendation")
Check "parent notice framed as non-diagnostic"      ($server -match "not a diagnosis")

# 5. Helpers + schema.
foreach ($h in 'recordMood','eraseMood','getMoodForDay','getLowMoodWindow','listMoodForTeacher','aggregateMood','createRecommendation','listRecommendations','decideRecommendation','listSafeguardingFlags','updateSafeguardingFlag') {
  Check "db helper exported: $h" ($dbidx -match "(?m)^\s*$h,")
}
foreach ($t in 'mood_entry','wellbeing_alert','teacher_recommendation','safeguarding_flag') {
  Check "schema table: $t" ($schema -match "CREATE TABLE IF NOT EXISTS $t\b")
}

# 6. Learner UI — optional/skippable self-report check-in.
Check "learner mood card present"                   ($learner -match "id=`"moodCard`"")
Check "learner mood is skippable"                   ($learner -match "id=`"moodSkipBtn`"")
Check "learner posts to /api/mood/checkin"          ($learner -match "/api/mood/checkin")
Check "learner never nags (checks today first)"     ($learner -match "/api/mood/today")

# 7. Parent + teacher UI exist / wired.
Check "parent well-being notice container"          ($parent -match "id=`"wellbeingNotices`"")
Check "parent fetches /api/mood/parent"             ($parent -match "/api/mood/parent")
Check "teacher wellbeing.html exists"               (Test-Path (Join-Path $demoRoot 'apps/teacher-console/public/wellbeing.html'))

# 8. Optional live smoke test — endpoints must require auth.
if ($BaseUrl) {
  Write-Host "== Live smoke test against $BaseUrl ==" -ForegroundColor Cyan
  function Status($path) {
    try { (Invoke-WebRequest -Uri ($BaseUrl.TrimEnd('/') + $path) -Method Get -MaximumRedirection 0 -SkipHttpErrorCheck).StatusCode }
    catch { if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { -1 } }
  }
  $s = Status '/api/mood/today'
  Check "/api/mood/today requires auth (401/403/302)" (@(401,403,302) -contains $s)
  $h = Status '/api/health'
  Check "/api/health reachable (200)" ($h -eq 200)
}

Write-Host ""
$color = if ($fail -eq 0) { 'Green' } else { 'Red' }
Write-Host "Result: $pass passed, $fail failed" -ForegroundColor $color
if ($fail -gt 0) { exit 1 }
