# Sync canonical shared files into each app folder.
# Usage: pwsh ./sync.ps1
$ErrorActionPreference = 'Stop'
$here = $PSScriptRoot
$apps = 'learner-web','parent-portal','teacher-console','admin'
foreach ($a in $apps) {
    $appDir = Join-Path (Split-Path $here -Parent) $a
    if (-not (Test-Path $appDir)) { Write-Host "skip $a (not found)" -ForegroundColor Yellow; continue }
    Copy-Item -Force -Path (Join-Path $here 'auth.js')    -Destination (Join-Path $appDir 'auth.js')
    # admin/server.js is bespoke (ARM endpoints) — do not overwrite from _shared
    if ($a -ne 'admin') {
        Copy-Item -Force -Path (Join-Path $here 'server.js')  -Destination (Join-Path $appDir 'server.js')
    }
    $publicDir = Join-Path $appDir 'public'
    if (-not (Test-Path $publicDir)) { New-Item -ItemType Directory -Force -Path $publicDir | Out-Null }
    Copy-Item -Force -Path (Join-Path $here 'login.html') -Destination (Join-Path $publicDir 'login.html')
    # Sync the shared db client (Postgres helpers + schema.sql)
    $dbDest = Join-Path $appDir 'db'
    if (-not (Test-Path $dbDest)) { New-Item -ItemType Directory -Force -Path $dbDest | Out-Null }
    Copy-Item -Force -Path (Join-Path $here 'db/index.js')   -Destination (Join-Path $dbDest 'index.js')
    Copy-Item -Force -Path (Join-Path $here 'db/schema.sql') -Destination (Join-Path $dbDest 'schema.sql')
    # Content Safety client (used by both shared server and admin server)
    Copy-Item -Force -Path (Join-Path $here 'contentSafety.js') -Destination (Join-Path $appDir 'contentSafety.js')
    # Reference data (curricula JSON, glossary CSV, synthetic learners) — required for db.init seed
    $dataDest = Join-Path $appDir 'data'
    if (-not (Test-Path $dataDest)) { New-Item -ItemType Directory -Force -Path $dataDest | Out-Null }
    foreach ($sub in 'curricula','glossaries') {
        $sd = Join-Path $dataDest $sub
        if (-not (Test-Path $sd)) { New-Item -ItemType Directory -Force -Path $sd | Out-Null }
        Get-ChildItem (Join-Path $here ('data/' + $sub)) -File | ForEach-Object { Copy-Item -Force $_.FullName (Join-Path $sd $_.Name) }
    }
    Copy-Item -Force -Path (Join-Path $here 'data/synthetic_learners.csv') -Destination (Join-Path $dataDest 'synthetic_learners.csv')
    Write-Host "synced -> $a" -ForegroundColor Green
}
