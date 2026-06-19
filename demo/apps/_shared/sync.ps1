# Sync canonical shared files into each app folder.
# Usage: pwsh ./sync.ps1
$ErrorActionPreference = 'Stop'
$here = $PSScriptRoot
$apps = 'learner-web','parent-portal','teacher-console','admin','director-portal'
foreach ($a in $apps) {
    $appDir = Join-Path (Split-Path $here -Parent) $a
    if (-not (Test-Path $appDir)) { Write-Host "skip $a (not found)" -ForegroundColor Yellow; continue }
    Copy-Item -Force -Path (Join-Path $here 'auth.js')    -Destination (Join-Path $appDir 'auth.js')
    # admin/server.js (ARM endpoints) and director-portal/server.js (reporting / Power BI embed)
    # are bespoke — do not overwrite them from _shared/server.js.
    if ($a -ne 'admin' -and $a -ne 'director-portal') {
        Copy-Item -Force -Path (Join-Path $here 'server.js')  -Destination (Join-Path $appDir 'server.js')
        # Feature 007 — Adaptive Learning router + engine modules (required by the shared server.js).
        Copy-Item -Force -Path (Join-Path $here 'server-adaptive.js') -Destination (Join-Path $appDir 'server-adaptive.js')
        $adaptiveSrc = Join-Path $here 'adaptive'
        if (Test-Path $adaptiveSrc) {
            $adaptiveDest = Join-Path $appDir 'adaptive'
            if (-not (Test-Path $adaptiveDest)) { New-Item -ItemType Directory -Force -Path $adaptiveDest | Out-Null }
            Get-ChildItem $adaptiveSrc -File | ForEach-Object { Copy-Item -Force $_.FullName (Join-Path $adaptiveDest $_.Name) }
        }
        # Feature 009 — Interoperability router (required by the shared server.js).
        Copy-Item -Force -Path (Join-Path $here 'server-interop.js') -Destination (Join-Path $appDir 'server-interop.js')
        # Feature 010 — CMS transparency router (required by the shared server.js).
        Copy-Item -Force -Path (Join-Path $here 'server-cms.js') -Destination (Join-Path $appDir 'server-cms.js')
    }
    # Feature 011 — Multi-school hierarchy router. Copied to ALL apps because the
    # bespoke admin/server.js and director-portal/server.js require it directly.
    Copy-Item -Force -Path (Join-Path $here 'server-hierarchy.js') -Destination (Join-Path $appDir 'server-hierarchy.js')
    # Feature 012 — A/B testing framework router. Copied to ALL apps because the
    # bespoke admin/server.js and director-portal/server.js require it directly.
    Copy-Item -Force -Path (Join-Path $here 'server-experiments.js') -Destination (Join-Path $appDir 'server-experiments.js')
    # Feature 009 — integration adapters + security provider. Copied to ALL apps because the
    # bespoke admin/server.js also requires these modules (connector onboarding console).
    foreach ($mod in 'integrations','security') {
        $modSrc = Join-Path $here $mod
        if (Test-Path $modSrc) {
            $modDest = Join-Path $appDir $mod
            if (-not (Test-Path $modDest)) { New-Item -ItemType Directory -Force -Path $modDest | Out-Null }
            Get-ChildItem $modSrc -File | ForEach-Object { Copy-Item -Force $_.FullName (Join-Path $modDest $_.Name) }
        }
    }
    # Feature 010 — CMS service engine, shared validation, and governance role constants.
    # Copied to ALL apps because the bespoke admin/server.js requires services/cms + auth/roles.
    foreach ($mod in 'services/cms','validation','auth') {
        $modSrc = Join-Path $here $mod
        if (Test-Path $modSrc) {
            $modDest = Join-Path $appDir $mod
            if (-not (Test-Path $modDest)) { New-Item -ItemType Directory -Force -Path $modDest | Out-Null }
            Get-ChildItem $modSrc -File | ForEach-Object { Copy-Item -Force $_.FullName (Join-Path $modDest $_.Name) }
        }
    }
    # Feature 011 — Hierarchy governance service engine. Copied to ALL apps because the
    # bespoke admin/server.js and director-portal/server.js require services/hierarchy.
    foreach ($mod in 'services/hierarchy') {
        $modSrc = Join-Path $here $mod
        if (Test-Path $modSrc) {
            $modDest = Join-Path $appDir $mod
            if (-not (Test-Path $modDest)) { New-Item -ItemType Directory -Force -Path $modDest | Out-Null }
            Get-ChildItem $modSrc -File | ForEach-Object { Copy-Item -Force $_.FullName (Join-Path $modDest $_.Name) }
        }
    }
    # Feature 012 — A/B testing service modules + config. Copied to ALL apps because
    # the bespoke admin/server.js and director-portal/server.js require ./experimentation.
    foreach ($mod in 'experimentation','config') {
        $modSrc = Join-Path $here $mod
        if (Test-Path $modSrc) {
            $modDest = Join-Path $appDir $mod
            if (-not (Test-Path $modDest)) { New-Item -ItemType Directory -Force -Path $modDest | Out-Null }
            Get-ChildItem $modSrc -File | ForEach-Object { Copy-Item -Force $_.FullName (Join-Path $modDest $_.Name) }
        }
    }
    $publicDir = Join-Path $appDir 'public'
    if (-not (Test-Path $publicDir)) { New-Item -ItemType Directory -Force -Path $publicDir | Out-Null }
    Copy-Item -Force -Path (Join-Path $here 'login.html') -Destination (Join-Path $publicDir 'login.html')
    $sharedPublic = Join-Path $here 'public'
    if (Test-Path $sharedPublic) {
        Get-ChildItem $sharedPublic -Recurse -File | ForEach-Object {
            $relative = $_.FullName.Substring($sharedPublic.Length + 1)
            $destination = Join-Path $publicDir $relative
            $destinationDir = Split-Path $destination -Parent
            if (-not (Test-Path $destinationDir)) { New-Item -ItemType Directory -Force -Path $destinationDir | Out-Null }
            Copy-Item -Force -Path $_.FullName -Destination $destination
        }
    }
    # CSRF helper — intercepts fetch() to inject X-CSRF-Token header
    $csrfSrc = Join-Path $here 'public/csrf.js'
    if (Test-Path $csrfSrc) { Copy-Item -Force -Path $csrfSrc -Destination (Join-Path $publicDir 'csrf.js') }
    # Consent-pending page (GDPR Art. 8 — learner gate)
    $consentSrc = Join-Path $here 'public/consent-pending.html'
    if (Test-Path $consentSrc) { Copy-Item -Force -Path $consentSrc -Destination (Join-Path $publicDir 'consent-pending.html') }
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
    foreach ($csv in 'skills.csv','items_to_skills.csv','skill_competency_map.csv') {
        $src = Join-Path $here ('data/' + $csv)
        if (Test-Path $src) { Copy-Item -Force -Path $src -Destination (Join-Path $dataDest $csv) }
    }
    Write-Host "synced -> $a" -ForegroundColor Green
}
