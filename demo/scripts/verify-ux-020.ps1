# verify-ux-020.ps1 — Feature 020 (remove Editorial toggle + left-align primary menu).
# Static guarantees (no live server needed) + optional HTTP smoke test with -BaseUrl.
#
# Usage:
#   pwsh demo/scripts/verify-ux-020.ps1
#   pwsh demo/scripts/verify-ux-020.ps1 -BaseUrl https://app-learner-web-learneu-demo.azurewebsites.net
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

Write-Host "== Feature 020 — UX fixes static checks ==" -ForegroundColor Cyan

# 1. JS syntax of the rewritten toggle script.
$toggle = Join-Path $shared 'public/theme-toggle.js'
& node --check $toggle 2>$null
Check "node --check theme-toggle.js" ($LASTEXITCODE -eq 0)

$toggleSrc = Get-Content $toggle -Raw
$login = Get-Content (Join-Path $shared 'login.html') -Raw

# 2. US1 — toggle removed / default theme enforced.
Check "toggle no longer injects a dongle"        (-not ($toggleSrc -match "appendChild" ) -and -not ($toggleSrc -match "theme-dongle__switch"))
Check "toggle actively clears theme-gic"         ($toggleSrc -match "classList\.remove\('theme-gic'\)")
Check "toggle removes any existing dongle"       ($toggleSrc -match "querySelectorAll\('\.theme-dongle'\)")
Check "toggle clears stored preference"          ($toggleSrc -match "removeItem\(KEY\)")
Check "login.html has no inline dongle markup"   (-not ($login -match "class=`"theme-dongle`""))
Check "login.html has no toggleTheme handler"    (-not ($login -match "function toggleTheme"))
Check "login.html never applies theme-gic"       (-not ($login -match "classList\.toggle\('theme-gic'"))

# 3. US2 — primary menu left-aligned (tabbar matches the 1100px content column).
foreach ($app in 'learner-web','parent-portal','teacher-console') {
  $html = Get-Content (Join-Path $demoRoot "apps/$app/public/index.html") -Raw
  Check "$app tabbar max-width:1100px"           ($html -match "\.tabbar\s*\{\s*max-width:1100px")
  Check "$app tabbar no longer 1320px"           (-not ($html -match "\.tabbar\s*\{\s*max-width:1320px"))
}
# admin is internally consistent at 1200px — must remain unchanged.
$admin = Get-Content (Join-Path $demoRoot 'apps/admin/public/index.html') -Raw
Check "admin tabbar unchanged (1200px)"          ($admin -match "\.tabbar\s*\{\s*max-width:1200px")

# 4. Optional live smoke test — served HTML must not contain the dongle.
if ($BaseUrl) {
  Write-Host "== Live smoke test against $BaseUrl ==" -ForegroundColor Cyan
  function Body($path) {
    try { (Invoke-WebRequest -Uri ($BaseUrl.TrimEnd('/') + $path) -Method Get -MaximumRedirection 2 -SkipHttpErrorCheck).Content }
    catch { '' }
  }
  $loginHtml = Body '/login.html'
  Check "served login.html has no inline dongle"  (-not ($loginHtml -match "class=`"theme-dongle`""))
  $toggleJs = Body '/theme-toggle.js'
  Check "served theme-toggle.js is the cleanup version" ($toggleJs -match "theme-gic")
  Check "served theme-toggle.js does not inject"  (-not ($toggleJs -match "theme-dongle__switch"))
}

Write-Host ""
$color = if ($fail -eq 0) { 'Green' } else { 'Red' }
Write-Host "Result: $pass passed, $fail failed" -ForegroundColor $color
if ($fail -gt 0) { exit 1 }
