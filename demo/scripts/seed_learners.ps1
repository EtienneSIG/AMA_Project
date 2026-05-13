<#
.SYNOPSIS
  Generate synthetic learner personas for the LearnEU demo.
.DESCRIPTION
  Produces a CSV of N synthetic learners across NL + DE with grade, decile,
  SEN flag, and a stable pseudonym. NEVER use real children's data.
#>
[CmdletBinding()]
param(
    [int]$Count = 50,
    [string]$OutFile = "$PSScriptRoot/../data/synthetic_learners.csv"
)

$ErrorActionPreference = 'Stop'

$markets = @('NL','DE')
$ageGroups = @('10-12','13-15','16-18')
$genders = @('M','F','Non-binary','Prefer not to say')
$rows = 1..$Count | ForEach-Object {
    [pscustomobject]@{
        learner_id = [guid]::NewGuid()
        market     = $markets | Get-Random
        grade      = 7
        decile     = Get-Random -Minimum 1 -Maximum 11
        sen        = (Get-Random -Maximum 5) -eq 0
        age_group  = $ageGroups | Get-Random
        gender     = $genders | Get-Random
        pseudonym  = 'L-' + (Get-Random -Maximum 99999).ToString('D5')
    }
}

$dir = Split-Path -Parent $OutFile
if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
$rows | Export-Csv -NoTypeInformation -Path $OutFile

Write-Host "Wrote $Count synthetic learners to $OutFile" -ForegroundColor Green
