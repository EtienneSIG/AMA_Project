# Builds report.json for "Director Dashboard (Fabric)" reproducing the director-portal
# dashboard against the EULearn semantic model, then creates the report in EULearn.
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
. (Join-Path $root 'FabricRest.ps1')

$reportDir = Join-Path $root 'report-director-dashboard'
$guid = 0
function NewName { $script:guid++; return "vc$($script:guid)-$([guid]::NewGuid().ToString('N').Substring(0,12))" }

function Textbox($text,$x,$y,$w,$h) {
  $cfg = [ordered]@{
    singleVisual = [ordered]@{
      objects = [ordered]@{ general = @(@{ properties = @{ paragraphs = @(@{ textRuns = @(@{ value = $text; textStyle = [ordered]@{ fontWeight='bold'; fontFamily='Poppins'; fontSize='20px'; color='#00314A' } }) }) } }) }
      visualType = 'textbox'
    }
    layouts = @(@{ id=0; position=[ordered]@{ width=$w; z=9999; height=$h; x=$x; tabOrder=0; y=$y } })
    name = (NewName)
  }
  return [ordered]@{ config = ($cfg | ConvertTo-Json -Depth 30 -Compress); filters='[]'; height=$h; width=$w; x=$x; y=$y; z=9999 }
}

function Card($table,$measure,$alias,$x,$y,$w,$h) {
  $qref = "$table.$measure"
  $cfg = [ordered]@{
    singleVisual = [ordered]@{
      prototypeQuery = [ordered]@{
        Select  = @(@{ Name=$qref; Measure=[ordered]@{ Property=$measure; Expression=@{ SourceRef=@{ Source=$alias } } } })
        Version = 2
        From    = @(@{ Entity=$table; Type=0; Name=$alias })
      }
      projections = @{ Values = @(@{ queryRef=$qref }) }
      visualType  = 'card'
    }
    layouts = @(@{ id=0; position=[ordered]@{ width=$w; z=0; height=$h; x=$x; tabOrder=0; y=$y } })
    name = (NewName)
  }
  return [ordered]@{ config = ($cfg | ConvertTo-Json -Depth 30 -Compress); filters='[]'; height=$h; width=$w; x=$x; y=$y; z=0 }
}

# category column + measure -> bar/line chart
function CatMeasureChart($visualType,$catTable,$catAlias,$catCol,$mTable,$mAlias,$measure,$x,$y,$w,$h) {
  $catRef = "$catTable.$catCol"; $mRef = "$mTable.$measure"
  $from = @()
  $from += @{ Entity=$catTable; Type=0; Name=$catAlias }
  if ($mAlias -ne $catAlias) { $from += @{ Entity=$mTable; Type=0; Name=$mAlias } }
  $cfg = [ordered]@{
    singleVisual = [ordered]@{
      prototypeQuery = [ordered]@{
        Select = @(
          @{ Column=[ordered]@{ Property=$catCol; Expression=@{ SourceRef=@{ Source=$catAlias } } }; Name=$catRef },
          @{ Name=$mRef; Measure=[ordered]@{ Property=$measure; Expression=@{ SourceRef=@{ Source=$mAlias } } } }
        )
        Version = 2
        From = $from
      }
      projections = [ordered]@{ Category=@(@{ queryRef=$catRef }); Y=@(@{ queryRef=$mRef }) }
      visualType = $visualType
    }
    layouts = @(@{ id=0; position=[ordered]@{ width=$w; z=0; height=$h; x=$x; tabOrder=0; y=$y } })
    name = (NewName)
  }
  return [ordered]@{ config = ($cfg | ConvertTo-Json -Depth 30 -Compress); filters='[]'; height=$h; width=$w; x=$x; y=$y; z=0 }
}

$vc = @()
$vc += Textbox 'Director Analytics - LearnEU (Fabric . EU . Postgres mirror)' 20 12 1200 40
# KPI row 1
$vc += Card 'Item Attempts' 'Correctness Rate' 'ia' 20 70 236 100
$vc += Card 'Item Attempts' 'National Correctness Rate' 'ia' 266 70 236 100
$vc += Card 'Item Attempts' 'Delta vs National (pts)' 'ia' 512 70 236 100
$vc += Card 'Item Attempts' 'Recent Trend (pts)' 'ia' 758 70 236 100
$vc += Card 'Hierarchy Assignments' 'Assigned Learners' 'ha' 1004 70 236 100
# KPI row 2
$vc += Card 'Item Attempts' 'Total Attempts' 'ia' 20 180 236 100
$vc += Card 'Hierarchy Assignments' 'Schools In Scope' 'ha' 266 180 236 100
$vc += Card 'Hierarchy Exceptions' 'Open Hierarchy Exceptions' 'he' 512 180 236 100
$vc += Card 'Hierarchy Assignments' 'Hierarchy Exception Rate' 'ha' 758 180 236 100
$vc += Card 'Reporting Scope' 'Active Scope Grants' 'rs' 1004 180 236 100
# Charts
$vc += Textbox 'Mastery by school (correctness rate)' 20 300 600 28
$vc += CatMeasureChart 'clusteredBarChart' 'Hierarchy Assignments' 'ha' 'school_id' 'Item Attempts' 'ia' 'Correctness Rate' 20 330 610 320
$vc += Textbox 'Mastery by region' 650 300 590 28
$vc += CatMeasureChart 'clusteredColumnChart' 'Hierarchy Assignments' 'ha' 'region_id' 'Item Attempts' 'ia' 'Correctness Rate' 650 330 590 150
$vc += Textbox 'Mastery trend (correctness rate over time)' 650 490 590 28
$vc += CatMeasureChart 'lineChart' 'Item Attempts' 'ia' 'created_at' 'Item Attempts' 'ia' 'Correctness Rate' 650 520 590 130

$pageConfig = [ordered]@{
  publicCustomVisuals = @()
  themeCollection = @{ baseTheme = [ordered]@{ reportVersionAtImport='5.53'; type=2; name='CY24SU06' } }
  defaultDrillFilterOtherVisuals = $true
  activeSectionIndex = 0
  version = '5.53'
  objects = @{ page = @(@{ properties = @{ background = @{ solid = @{ color = @{ expr = @{ Literal = @{ Value = "'#F0F4F8'" } } } } } } }) }
} | ConvertTo-Json -Depth 30 -Compress

$section = [ordered]@{
  displayName = 'Director Analytics'
  displayOption = 1
  height = 720
  name = 'page1'
  visualContainers = $vc
  width = 1280
}

$report = [ordered]@{
  config = $pageConfig
  layoutOptimization = 0
  resourcePackages = @()
  sections = @($section)
}

$json = $report | ConvertTo-Json -Depth 40
[IO.File]::WriteAllText((Join-Path $reportDir 'report.json'), $json)
Write-Output "report.json written: $($json.Length) chars, $($vc.Count) visuals"

# Validate JSON round-trips
$null = Get-Content (Join-Path $reportDir 'report.json') -Raw | ConvertFrom-Json
Write-Output "report.json valid JSON: OK"

$created = New-FabricReport -DisplayName 'Director Dashboard (Fabric)' -Dir $reportDir
Write-Output "CREATE RESULT: $($created | ConvertTo-Json -Depth 6 -Compress)"
