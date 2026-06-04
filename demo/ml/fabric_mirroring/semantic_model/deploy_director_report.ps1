param(
    [string]$WorkspaceId     = '127a12ab-fa94-421b-bee3-4f534264d3ff',
    [string]$SemanticModelId,
    [string]$ReportName      = 'Director Governance Overview'
)

if (-not $SemanticModelId) {
    throw 'SemanticModelId is required.'
}

Write-Host "=== Deploying Director report: $ReportName ===" -ForegroundColor Cyan

$accessToken = (az account get-access-token --resource "https://analysis.windows.net/powerbi/api" --query accessToken -o tsv)
if (-not $accessToken) { throw "Failed to get access token. Run 'az login' first." }
$headers = @{ Authorization = "Bearer $accessToken"; 'Content-Type' = 'application/json' }

function New-GuidString { [guid]::NewGuid().ToString() }
function New-FromEntry([string]$alias, [string]$entity) { @{ Name = $alias; Entity = $entity; Type = 0 } }
function New-MeasureSelect([string]$alias, [string]$entity, [string]$property) {
    @{ Measure = @{ Expression = @{ SourceRef = @{ Source = $alias } }; Property = $property }; Name = "$entity.$property" }
}
function New-ColumnSelect([string]$alias, [string]$entity, [string]$property) {
    @{ Column = @{ Expression = @{ SourceRef = @{ Source = $alias } }; Property = $property }; Name = "$entity.$property" }
}
function New-CardVisual([hashtable]$pos, [string]$entity, [string]$measure, [string]$alias) {
    $guid = New-GuidString
    $config = @{
        name = $guid
        layouts = @(@{ id = 0; position = @{ x = $pos.x; y = $pos.y; z = 0; width = $pos.w; height = $pos.h; tabOrder = 0 } })
        singleVisual = @{
            visualType = 'card'
            projections = @{ Values = @(@{ queryRef = "$entity.$measure" }) }
            prototypeQuery = @{ Version = 2; From = @((New-FromEntry $alias $entity)); Select = @((New-MeasureSelect $alias $entity $measure)) }
        }
    }
    @{ x=[int]$pos.x; y=[int]$pos.y; z=0; width=[int]$pos.w; height=[int]$pos.h; config=($config|ConvertTo-Json -Depth 20 -Compress); filters='[]' }
}
function New-BarChartVisual([hashtable]$pos, [string]$catEntity, [string]$catColumn, [string]$catAlias, [string]$measEntity, [string]$measure, [string]$measAlias) {
    $guid = New-GuidString
    $fromList = @((New-FromEntry $catAlias $catEntity))
    if ($catEntity -ne $measEntity) { $fromList += (New-FromEntry $measAlias $measEntity) }
    $effectiveAlias = if ($catEntity -eq $measEntity) { $catAlias } else { $measAlias }
    $config = @{
        name = $guid
        layouts = @(@{ id = 0; position = @{ x = $pos.x; y = $pos.y; z = 0; width = $pos.w; height = $pos.h; tabOrder = 0 } })
        singleVisual = @{
            visualType = 'clusteredBarChart'
            projections = @{ Category = @(@{ queryRef = "$catEntity.$catColumn" }); Y = @(@{ queryRef = "$measEntity.$measure" }) }
            prototypeQuery = @{ Version = 2; From = $fromList; Select = @((New-ColumnSelect $catAlias $catEntity $catColumn), (New-MeasureSelect $effectiveAlias $measEntity $measure)) }
        }
    }
    @{ x=[int]$pos.x; y=[int]$pos.y; z=0; width=[int]$pos.w; height=[int]$pos.h; config=($config|ConvertTo-Json -Depth 20 -Compress); filters='[]' }
}
function New-TableVisual([hashtable]$pos, [array]$columns, [array]$measures) {
    $guid = New-GuidString
    $fromEntries = @{}
    foreach ($c in $columns) { $fromEntries[$c.alias] = $c.entity }
    foreach ($m in $measures) { $fromEntries[$m.alias] = $m.entity }
    $fromList = @()
    foreach ($key in $fromEntries.Keys) { $fromList += (New-FromEntry $key $fromEntries[$key]) }
    $valuesProjections = @(); $selectList = @()
    foreach ($c in $columns) { $valuesProjections += @{ queryRef = "$($c.entity).$($c.property)" }; $selectList += (New-ColumnSelect $c.alias $c.entity $c.property) }
    foreach ($m in $measures) { $valuesProjections += @{ queryRef = "$($m.entity).$($m.property)" }; $selectList += (New-MeasureSelect $m.alias $m.entity $m.property) }
    $config = @{
        name = $guid
        layouts = @(@{ id = 0; position = @{ x = $pos.x; y = $pos.y; z = 0; width = $pos.w; height = $pos.h; tabOrder = 0 } })
        singleVisual = @{ visualType = 'tableEx'; projections = @{ Values = $valuesProjections }; prototypeQuery = @{ Version = 2; From = $fromList; Select = $selectList } }
    }
    @{ x=[int]$pos.x; y=[int]$pos.y; z=0; width=[int]$pos.w; height=[int]$pos.h; config=($config|ConvertTo-Json -Depth 20 -Compress); filters='[]' }
}
function New-TitleVisual([hashtable]$pos, [string]$titleText) {
    $guid = New-GuidString
    $config = @{ name = $guid; layouts = @(@{id=0; position=@{x=$pos.x;y=$pos.y;z=9999;width=$pos.w;height=$pos.h;tabOrder=0}}); singleVisual = @{ visualType = 'textbox' } }
    @{ x=[int]$pos.x; y=[int]$pos.y; z=9999; width=[int]$pos.w; height=[int]$pos.h; config=($config|ConvertTo-Json -Depth 20 -Compress); filters='[]' }
}

$page1Visuals = @()
$page1Visuals += New-TitleVisual @{x=20;y=12;w=700;h=50} 'Director Governance Overview'
$page1Visuals += New-CardVisual @{x=20;y=75;w=290;h=100} 'Reporting Scope' 'Active Scope Grants' 'rs'
$page1Visuals += New-CardVisual @{x=330;y=75;w=290;h=100} 'Reporting Scope' 'Directors With Scope' 'rs'
$page1Visuals += New-CardVisual @{x=640;y=75;w=290;h=100} 'Hierarchy Assignments' 'Assigned Learners' 'ha'
$page1Visuals += New-CardVisual @{x=950;y=75;w=290;h=100} 'Hierarchy Exceptions' 'Open Hierarchy Exceptions' 'he'
$page1Visuals += New-BarChartVisual @{x=20;y=190;w=610;h=260} 'Hierarchy Assignments' 'school_id' 'ha' 'Hierarchy Assignments' 'Hierarchy Rows' 'ha'
$page1Visuals += New-BarChartVisual @{x=650;y=190;w=590;h=260} 'Hierarchy Assignments' 'region_id' 'ha' 'Hierarchy Assignments' 'Hierarchy Rows' 'ha'
$page1Visuals += New-TableVisual @{x=20;y=470;w=1220;h=250} @(
    @{entity='Reporting Scope';property='director_subject_id';alias='rs'},
    @{entity='Reporting Scope';property='school_id';alias='rs'},
    @{entity='Reporting Scope';property='region_id';alias='rs'},
    @{entity='Reporting Scope';property='status';alias='rs'}
) @()

$page2Visuals = @()
$page2Visuals += New-TitleVisual @{x=20;y=12;w=700;h=50} 'Hierarchy Exceptions and Director Coverage'
$page2Visuals += New-CardVisual @{x=20;y=75;w=390;h=100} 'Hierarchy Exceptions' 'Open Hierarchy Exceptions' 'he'
$page2Visuals += New-CardVisual @{x=430;y=75;w=390;h=100} 'Hierarchy Exceptions' 'High Severity Exceptions' 'he'
$page2Visuals += New-CardVisual @{x=840;y=75;w=400;h=100} 'Hierarchy Assignments' 'Hierarchy Exception Rate' 'ha'
$page2Visuals += New-BarChartVisual @{x=20;y=190;w=610;h=260} 'Director Profiles' 'primary_region_id' 'dp' 'Reporting Scope' 'Directors With Scope' 'rs'
$page2Visuals += New-BarChartVisual @{x=650;y=190;w=590;h=260} 'Director Profiles' 'primary_school_id' 'dp' 'Reporting Scope' 'Active Scope Grants' 'rs'
$page2Visuals += New-TableVisual @{x=20;y=470;w=1220;h=250} @(
    @{entity='Hierarchy Exceptions';property='learner_id';alias='he'},
    @{entity='Hierarchy Exceptions';property='issue_type';alias='he'},
    @{entity='Hierarchy Exceptions';property='severity';alias='he'},
    @{entity='Hierarchy Exceptions';property='status';alias='he'}
) @()

$reportJson = @{
    sections = @(
        @{ name='page1'; displayName='Director Overview'; displayOption=1; width=1280; height=720; visualContainers=$page1Visuals },
        @{ name='page2'; displayName='Coverage and Exceptions'; displayOption=1; width=1280; height=720; visualContainers=$page2Visuals }
    )
    config = (@{ version='5.53'; activeSectionIndex=0 } | ConvertTo-Json -Depth 10 -Compress)
    layoutOptimization = 0
}

$definitionPbir = @{
    version = '4.0'
    datasetReference = @{ byPath = $null; byConnection = @{ connectionString=$null; pbiServiceModelId=$null; pbiModelVirtualServerName='sobe_wowvirtualserver'; pbiModelDatabaseName=$SemanticModelId; name='EntityDataSource'; connectionType='pbiServiceXmlaStyleLive' } }
}

$reportJsonBase64 = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes(($reportJson | ConvertTo-Json -Depth 30 -Compress)))
$definitionPbirBase64 = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes(($definitionPbir | ConvertTo-Json -Depth 10 -Compress)))

$apiBody = @{
    displayName = $ReportName
    definition = @{ parts = @(
        @{ path='report.json'; payload=$reportJsonBase64; payloadType='InlineBase64' },
        @{ path='definition.pbir'; payload=$definitionPbirBase64; payloadType='InlineBase64' }
    ) }
} | ConvertTo-Json -Depth 20 -Compress

$listUri = "https://api.fabric.microsoft.com/v1/workspaces/$WorkspaceId/reports"
$existingReports = Invoke-RestMethod -Uri $listUri -Headers $headers -Method Get
$existing = $existingReports.value | Where-Object { $_.displayName -eq $ReportName }
if ($existing) {
    Invoke-RestMethod -Uri "https://api.fabric.microsoft.com/v1/workspaces/$WorkspaceId/reports/$($existing.id)" -Headers $headers -Method Delete
}

$response = Invoke-WebRequest -Uri $listUri -Headers $headers -Method Post -Body $apiBody -UseBasicParsing
if ($response.StatusCode -eq 201) {
    $result = $response.Content | ConvertFrom-Json
    Write-Host "Report created successfully: $($result.id)" -ForegroundColor Green
} elseif ($response.StatusCode -eq 202) {
    Write-Host 'Report creation accepted. Check workspace for completion.' -ForegroundColor Yellow
} else {
    throw "Unexpected status code: $($response.StatusCode)"
}