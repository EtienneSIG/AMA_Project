# Sync canonical shared files into each app folder.
# Usage: pwsh ./sync.ps1
$ErrorActionPreference = 'Stop'
$here = $PSScriptRoot
$apps = 'learner-web','parent-portal','teacher-console'
foreach ($a in $apps) {
    $appDir = Join-Path (Split-Path $here -Parent) $a
    if (-not (Test-Path $appDir)) { Write-Host "skip $a (not found)" -ForegroundColor Yellow; continue }
    Copy-Item -Force -Path (Join-Path $here 'auth.js')    -Destination (Join-Path $appDir 'auth.js')
    Copy-Item -Force -Path (Join-Path $here 'server.js')  -Destination (Join-Path $appDir 'server.js')
    $publicDir = Join-Path $appDir 'public'
    if (-not (Test-Path $publicDir)) { New-Item -ItemType Directory -Force -Path $publicDir | Out-Null }
    Copy-Item -Force -Path (Join-Path $here 'login.html') -Destination (Join-Path $publicDir 'login.html')
    Write-Host "synced -> $a" -ForegroundColor Green
}
