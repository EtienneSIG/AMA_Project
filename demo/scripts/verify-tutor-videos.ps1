# verify-tutor-videos.ps1 — Feature 015 (AI tutor illustrative external video links).
# Static guarantees (no live DB needed) + optional HTTP smoke test with -BaseUrl.
#
# Usage:
#   pwsh demo/scripts/verify-tutor-videos.ps1
#   pwsh demo/scripts/verify-tutor-videos.ps1 -BaseUrl https://app-learner-web-learneu-demo.azurewebsites.net
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

Write-Host "== Feature 015 — tutor video static checks ==" -ForegroundColor Cyan

# 1. JS syntax of edited shared files.
foreach ($f in 'server.js', 'db/index.js') {
  $p = Join-Path $shared $f
  & node --check $p 2>$null
  Check "node --check $f" ($LASTEXITCODE -eq 0)
}

$server  = Get-Content (Join-Path $shared 'server.js') -Raw
$dbidx   = Get-Content (Join-Path $shared 'db/index.js') -Raw
$schema  = Get-Content (Join-Path $shared 'db/schema.sql') -Raw
$learner = Get-Content (Join-Path $demoRoot 'apps/learner-web/public/index.html') -Raw

# 2. Allow-list only — the model never supplies URLs; only catalogue entries are returned.
Check "suggestions come from catalogue helper"      ($server -match "suggestVideosForPrompt\(")
Check "suggestions logged (Art.12 traceability)"    ($server -match "logVideoSuggestion\(")
Check "suggestVideosForPrompt queries catalogue"    ($dbidx -match "FROM video_catalogue WHERE status = 'active'")
Check "embed URL allow-list enforced on add"        ($server -match "youtube-nocookie\.com")
Check "no raw URL ever taken from model output"     (-not ($server -match "finalAnswer.*http"))

# 3. Under-16 consent gate before suggesting videos.
Check "consent gate before suggesting"              ($server -match "hasActiveConsentForLearner\(\{ childEmail: u\.email")
Check "teacher policy gate (isVideoSuggestionEnabled)" ($server -match "isVideoSuggestionEnabled\(")

# 4. Routes present + role guards.
Check "video click route present"                   ($server -match "/api/tutor/video/:id/click")
Check "video report route present"                  ($server -match "/api/tutor/video/:id/report")
Check "catalogue GET route present"                 ($server -match "app\.get\('/api/tutor/video/catalogue'")
Check "catalogue POST route present"                ($server -match "app\.post\('/api/tutor/video/catalogue'")
Check "catalogue PATCH route present"               ($server -match "app\.patch\('/api/tutor/video/catalogue/:id'")
Check "catalogue DELETE route present"              ($server -match "app\.delete\('/api/tutor/video/catalogue/:id'")
Check "video disable (policy) route present"        ($server -match "/api/tutor/video/disable")
Check "click route is student-role guarded"         ($server -match "student role required")
Check "catalogue routes are teacher/admin guarded"  ($server -match "teacher role required")

# 5. Helpers + schema.
foreach ($h in 'listVideoCatalogue','addVideoCatalogue','updateVideoCatalogue','setVideoCatalogueStatus','getVideoById','isVideoSuggestionEnabled','setVideoPolicy','suggestVideosForPrompt','logVideoSuggestion','reportVideo') {
  Check "db helper exported: $h" ($dbidx -match "(?m)^\s*$h,")
}
foreach ($t in 'video_catalogue','video_suggestion_log','video_report','video_policy') {
  Check "schema table: $t" ($schema -match "CREATE TABLE IF NOT EXISTS $t\b")
}

# 6. Learner UI renders suggestions + transparency ("external site", no data sent).
Check "learner videoSuggestions container"          ($learner -match "id=`"videoSuggestions`"")
Check "learner renderVideoSuggestions function"     ($learner -match "function renderVideoSuggestions")
Check "learner external-site transparency copy"     ($learner -match "external site")
Check "learner click logs to /click endpoint"       ($learner -match "/api/tutor/video/.+/click")

# 7. Teacher catalogue UI exists.
Check "teacher video-catalogue.html exists"         (Test-Path (Join-Path $demoRoot 'apps/teacher-console/public/video-catalogue.html'))

# 8. Optional live smoke test — endpoints must require auth.
if ($BaseUrl) {
  Write-Host "== Live smoke test against $BaseUrl ==" -ForegroundColor Cyan
  function Status($path) {
    try { (Invoke-WebRequest -Uri ($BaseUrl.TrimEnd('/') + $path) -Method Get -MaximumRedirection 0 -SkipHttpErrorCheck).StatusCode }
    catch { if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { -1 } }
  }
  $s = Status '/api/tutor/video/catalogue'
  Check "/api/tutor/video/catalogue requires auth (401/403/302)" (@(401,403,302) -contains $s)
  $h = Status '/api/health'
  Check "/api/health reachable (200)" ($h -eq 200)
}

Write-Host ""
$color = if ($fail -eq 0) { 'Green' } else { 'Red' }
Write-Host "Result: $pass passed, $fail failed" -ForegroundColor $color
if ($fail -gt 0) { exit 1 }
