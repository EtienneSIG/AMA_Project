# Builds the "Board FinOps & Governance" board report for the EULearn workspace and
# deploys it as NEW Fabric items (a dedicated board semantic model + a board report).
# Additive only: it never touches existing items (director model 5f98fc5b / AppBackend f51f6c63).
#
# Usage:  & .\work\fabric\deploy-board-finops.ps1            # build + deploy
#         & .\work\fabric\deploy-board-finops.ps1 -BuildOnly # only regenerate report.json
param([switch]$BuildOnly)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
. (Join-Path $root 'FabricRest.ps1')

$base       = Join-Path $root 'board-finops'
$modelDir   = Join-Path $base 'semanticmodel'
$reportDir  = Join-Path $base 'report'
$pbirPath   = Join-Path $reportDir 'definition.pbir'
$reportJson = Join-Path $reportDir 'report.json'

$MODEL_NAME  = 'LearnEU - Board FinOps & Governance'
$REPORT_NAME = 'Board FinOps & Governance'

# ---- report.json visual builders (aligned with deploy-director-dashboard.ps1) ----
$guid = 0
function NewName { $script:guid++; return "vc$($script:guid)-$([guid]::NewGuid().ToString('N').Substring(0,12))" }

function Textbox($text,$x,$y,$w,$h,$size) {
  if (-not $size) { $size = '20px' }
  $cfg = [ordered]@{
    singleVisual = [ordered]@{
      objects = [ordered]@{ general = @(@{ properties = @{ paragraphs = @(@{ textRuns = @(@{ value = $text; textStyle = [ordered]@{ fontWeight='bold'; fontFamily='Poppins'; fontSize=$size; color='#00314A' } }) }) } }) }
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
$vc += Textbox 'Board FinOps & Governance - LearnEU (EU . Fabric . aggregated, non-personal)' 20 12 1240 40
# KPI row 1 - FinOps unit economics + governance headline
$vc += Card 'Monthly FinOps'      'Latest Cost per Active User (EUR)' 'mf' 20   70 236 100
$vc += Card 'Monthly FinOps'      'Latest Monthly Cost (EUR)'         'mf' 266  70 236 100
$vc += Card 'Monthly FinOps'      'Latest Active Users'               'mf' 512  70 236 100
$vc += Card 'Governance Register' 'Overdue Reviews'                   'gr' 758  70 236 100
$vc += Card 'Governance Register' 'Days Since Review'                 'gr' 1004 70 236 100
# KPI row 2 - value + model spend
$vc += Card 'Teacher Time'        'Latest Teacher Hours Saved'        'tt' 20   180 236 100
$vc += Card 'Teacher Time'        'Avg Response Hours'                'tt' 266  180 236 100
$vc += Card 'Localisation'        'Latest Localisation Velocity'      'lo' 512  180 236 100
$vc += Card 'Model Routing'       'Model Cost (EUR)'                  'mr' 758  180 236 100
$vc += Card 'Governance Register' 'Registered Artefacts'              'gr' 1004 180 236 100
# Charts row A
$vc += Textbox 'Cost per active user (EUR / month)' 20 300 610 26 '14px'
$vc += CatMeasureChart 'lineChart' 'Monthly FinOps' 'mf' 'Month' 'Monthly FinOps' 'mf' 'Cost per Active User (EUR)' 20 330 610 230
$vc += Textbox 'Recurring FinOps - monthly platform cost' 650 300 610 26 '14px'
$vc += CatMeasureChart 'columnChart' 'Monthly FinOps' 'mf' 'Month' 'Monthly FinOps' 'mf' 'Total Cost (EUR)' 650 330 610 230
# Charts row B
$vc += Textbox 'Model routing - cost by model' 20 580 610 26 '14px'
$vc += CatMeasureChart 'clusteredBarChart' 'Model Routing' 'mr' 'Model' 'Model Routing' 'mr' 'Model Cost (EUR)' 20 610 610 230
$vc += Textbox 'Localisation velocity - terms / month' 650 580 610 26 '14px'
$vc += CatMeasureChart 'clusteredColumnChart' 'Localisation' 'lo' 'Month' 'Localisation' 'lo' 'Terms Localised' 650 610 610 230
# Charts row C
$vc += Textbox 'Governance & DPIA freshness - days since last review' 20 860 610 26 '14px'
$vc += CatMeasureChart 'clusteredBarChart' 'Governance Register' 'gr' 'Artefact' 'Governance Register' 'gr' 'Days Since Review' 20 890 610 250
$vc += Textbox 'Teacher hours saved / month' 650 860 610 26 '14px'
$vc += CatMeasureChart 'lineChart' 'Teacher Time' 'tt' 'Month' 'Teacher Time' 'tt' 'Teacher Hours Saved' 650 890 610 250

$pageConfig = [ordered]@{
  publicCustomVisuals = @()
  themeCollection = @{ baseTheme = [ordered]@{ reportVersionAtImport='5.53'; type=2; name='CY24SU06' } }
  defaultDrillFilterOtherVisuals = $true
  activeSectionIndex = 0
  version = '5.53'
  objects = @{ page = @(@{ properties = @{ background = @{ solid = @{ color = @{ expr = @{ Literal = @{ Value = "'#F0F4F8'" } } } } } } }) }
} | ConvertTo-Json -Depth 30 -Compress

$section = [ordered]@{
  displayName = 'Board FinOps & Governance'
  displayOption = 1
  height = 1180
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
[IO.File]::WriteAllText($reportJson, $json)
Write-Output "report.json written: $($json.Length) chars, $($vc.Count) visuals"
$null = Get-Content $reportJson -Raw | ConvertFrom-Json
Write-Output "report.json valid JSON: OK"

if ($BuildOnly) { Write-Output 'BuildOnly - skipping deploy.'; return }

# ---- Deploy: create the board semantic model (NEW item), then the report bound to it ----
Write-Output "Creating semantic model '$MODEL_NAME' ..."
$model = New-FabricSemanticModel -DisplayName $MODEL_NAME -Dir $modelDir
$modelId = $model.id
if (-not $modelId) { $modelId = $model.objectId }
Write-Output "Semantic model id: $modelId"

# Point the report's byConnection at the new model id.
$pbir = Get-Content $pbirPath -Raw
$pbir = $pbir -replace 'semanticmodelid=[^"\\]*', "semanticmodelid=$modelId"
[IO.File]::WriteAllText($pbirPath, $pbir)
Write-Output "definition.pbir bound to model $modelId"

# Import-mode inline tables are empty until first refresh; trigger + poll one.
Write-Output "Refreshing semantic model (loads inline board fixtures) ..."
$pbiTok = az account get-access-token --resource "https://analysis.windows.net/powerbi/api" --query accessToken -o tsv
$pbiHdr = @{ Authorization = "Bearer $pbiTok" }
Invoke-RestMethod -Uri "https://api.powerbi.com/v1.0/myorg/datasets/$modelId/refreshes" -Method Post -Headers $pbiHdr -ContentType 'application/json' -Body '{"notifyOption":"NoNotification"}' | Out-Null
for ($i = 0; $i -lt 30; $i++) {
  Start-Sleep -Seconds 4
  $st = (Invoke-RestMethod -Uri "https://api.powerbi.com/v1.0/myorg/datasets/$modelId/refreshes?`$top=1" -Headers $pbiHdr).value[0].status
  if ($st -eq 'Completed') { Write-Output 'Refresh: Completed'; break }
  if ($st -eq 'Failed')    { throw 'Semantic model refresh failed.' }
}

Write-Output "Creating report '$REPORT_NAME' ..."
$created = New-FabricReport -DisplayName $REPORT_NAME -Dir $reportDir
Write-Output "REPORT CREATE RESULT: $($created | ConvertTo-Json -Depth 6 -Compress)"
Write-Output 'DONE.'
