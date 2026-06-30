param([Parameter(Mandatory)][string]$AppDir, [Parameter(Mandatory)][string]$OutZip)
# Build a deployment zip with forward-slash entry paths (Linux App Service requirement).
# Excludes node_modules / .git / *.zip.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
if (Test-Path $OutZip) { Remove-Item $OutZip -Force }
$root = (Resolve-Path $AppDir).Path.TrimEnd('\','/')
$rootLen = $root.Length + 1
$files = Get-ChildItem -Path $root -Recurse -File -Force | Where-Object {
    $rel = $_.FullName.Substring($rootLen)
    -not ($rel -match '^(node_modules|\.git|\.deploy)(\\|/)' -or $rel -match '\.zip$')
}
$fs = [System.IO.File]::Open($OutZip, [System.IO.FileMode]::Create)
$zip = New-Object System.IO.Compression.ZipArchive($fs, [System.IO.Compression.ZipArchiveMode]::Create)
try {
    foreach ($f in $files) {
        $entryName = $f.FullName.Substring($rootLen).Replace('\','/')
        $entry = $zip.CreateEntry($entryName, [System.IO.Compression.CompressionLevel]::Optimal)
        $es = $entry.Open()
        try {
            # Open with ReadWrite share + retry: tolerates transient AV/indexer locks so a
            # single briefly-locked file cannot abort the whole archive (and silently ship
            # an incomplete zip). Throws only after exhausting retries.
            $bs = $null
            for ($try = 1; $try -le 8; $try++) {
                try { $bs = [System.IO.File]::Open($f.FullName, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Read, [System.IO.FileShare]::ReadWrite); break }
                catch { if ($try -eq 8) { throw }; Start-Sleep -Milliseconds 400 }
            }
            try { $bs.CopyTo($es) } finally { $bs.Dispose() }
        }
        finally { $es.Dispose() }
    }
} finally { $zip.Dispose(); $fs.Dispose() }
Write-Host "Built $OutZip ($([Math]::Round((Get-Item $OutZip).Length/1KB,1)) KB, $($files.Count) files)" -ForegroundColor Green
