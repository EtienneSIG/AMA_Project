<#
.SYNOPSIS
  Stage curricula + glossaries for the LearnEU demo.
.DESCRIPTION
  Validates that the canonical Math unit, NL kerndoelen, and DE Bildungsstandards
  files exist and emits a manifest. Indexing into Azure AI Search happens later
  via pipelines/localisation/index_curricula.py once `azd up` is done.
#>
[CmdletBinding()]
param(
    [string]$DataDir = "$PSScriptRoot/../data"
)

$ErrorActionPreference = 'Stop'

$expected = @(
    'math_unit_fractions.md'
    'curricula/nl-kerndoelen-math-y7.json'
    'curricula/de-bildungsstandards-math-y7.json'
    'glossaries/math-nl-NL.csv'
    'glossaries/math-de-DE.csv'
)

$missing = @()
foreach ($rel in $expected) {
    $p = Join-Path $DataDir $rel
    if (-not (Test-Path $p)) { $missing += $rel }
}

if ($missing.Count -gt 0) {
    Write-Error "Missing curricula files:`n  - $($missing -join "`n  - ")"
}

$manifest = [pscustomobject]@{
    generated_utc = (Get-Date).ToUniversalTime().ToString('o')
    files         = $expected
}
$manifestPath = Join-Path $DataDir 'curricula.manifest.json'
$manifest | ConvertTo-Json -Depth 4 | Set-Content -Path $manifestPath -Encoding UTF8

Write-Host "Curricula manifest written to $manifestPath" -ForegroundColor Green
