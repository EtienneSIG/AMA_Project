param(
    [string]$WorkspaceId     = '127a12ab-fa94-421b-bee3-4f534264d3ff',
    [string]$SemanticModelId = '0e7d0cc1-cfee-47fb-8bc1-7d2a290574fd',
    [string]$ReportName      = 'EdTech Platform Analytics'
)

# ============================================================
# PBIR-Legacy Report Deployment Script for Microsoft Fabric
# ============================================================

Write-Host "=== Deploying PBIR-Legacy Report: $ReportName ===" -ForegroundColor Cyan

# --- Authentication ---
Write-Host "Authenticating..."
$accessToken = (az account get-access-token --resource "https://analysis.windows.net/powerbi/api" --query accessToken -o tsv)
if (-not $accessToken) { throw "Failed to get access token. Run 'az login' first." }
$headers = @{
    "Authorization" = "Bearer $accessToken"
    "Content-Type"  = "application/json"
}

# ============================================================
# Helper Functions
# ============================================================

function New-GuidString { [guid]::NewGuid().ToString() }

function New-FromEntry([string]$alias, [string]$entity) {
    @{ Name = $alias; Entity = $entity; Type = 0 }
}

function New-MeasureSelect([string]$alias, [string]$entity, [string]$property) {
    @{
        Measure = @{
            Expression = @{ SourceRef = @{ Source = $alias } }
            Property   = $property
        }
        Name = "$entity.$property"
    }
}

function New-ColumnSelect([string]$alias, [string]$entity, [string]$property) {
    @{
        Column = @{
            Expression = @{ SourceRef = @{ Source = $alias } }
            Property   = $property
        }
        Name = "$entity.$property"
    }
}

function New-CardVisual([hashtable]$pos, [string]$entity, [string]$measure, [string]$alias) {
    $guid = New-GuidString
    $config = @{
        name    = $guid
        layouts = @(@{ id = 0; position = @{ x = $pos.x; y = $pos.y; z = 0; width = $pos.w; height = $pos.h; tabOrder = 0 } })
        singleVisual = @{
            visualType  = "card"
            projections = @{ Values = @(@{ queryRef = "$entity.$measure" }) }
            prototypeQuery = @{
                Version = 2
                From    = @((New-FromEntry $alias $entity))
                Select  = @((New-MeasureSelect $alias $entity $measure))
            }
            objects = @{
                labels = @(@{ properties = @{ show = @{ expr = @{ Literal = @{ Value = "true" } } } } })
            }
        }
    }
    @{
        x      = [int]$pos.x
        y      = [int]$pos.y
        z      = 0
        width  = [int]$pos.w
        height = [int]$pos.h
        config  = ($config | ConvertTo-Json -Depth 20 -Compress)
        filters = "[]"
    }
}

function New-BarChartVisual([hashtable]$pos, [string]$catEntity, [string]$catColumn, [string]$catAlias,
                            [string]$measEntity, [string]$measure, [string]$measAlias) {
    $guid = New-GuidString
    $fromList = @((New-FromEntry $catAlias $catEntity))
    if ($catEntity -ne $measEntity) {
        $fromList += (New-FromEntry $measAlias $measEntity)
    }
    $effectiveAlias = if ($catEntity -eq $measEntity) { $catAlias } else { $measAlias }
    $config = @{
        name    = $guid
        layouts = @(@{ id = 0; position = @{ x = $pos.x; y = $pos.y; z = 0; width = $pos.w; height = $pos.h; tabOrder = 0 } })
        singleVisual = @{
            visualType  = "clusteredBarChart"
            projections = @{
                Category = @(@{ queryRef = "$catEntity.$catColumn" })
                Y        = @(@{ queryRef = "$measEntity.$measure" })
            }
            prototypeQuery = @{
                Version = 2
                From    = $fromList
                Select  = @(
                    (New-ColumnSelect $catAlias $catEntity $catColumn),
                    (New-MeasureSelect $effectiveAlias $measEntity $measure)
                )
            }
        }
    }
    @{
        x      = [int]$pos.x
        y      = [int]$pos.y
        z      = 0
        width  = [int]$pos.w
        height = [int]$pos.h
        config  = ($config | ConvertTo-Json -Depth 20 -Compress)
        filters = "[]"
    }
}

function New-LineChartVisual([hashtable]$pos, [string]$catEntity, [string]$catColumn, [string]$catAlias,
                             [string]$measEntity, [string]$measure, [string]$measAlias) {
    $guid = New-GuidString
    $fromList = @((New-FromEntry $catAlias $catEntity))
    if ($catEntity -ne $measEntity) {
        $fromList += (New-FromEntry $measAlias $measEntity)
    }
    $effectiveAlias = if ($catEntity -eq $measEntity) { $catAlias } else { $measAlias }
    $config = @{
        name    = $guid
        layouts = @(@{ id = 0; position = @{ x = $pos.x; y = $pos.y; z = 0; width = $pos.w; height = $pos.h; tabOrder = 0 } })
        singleVisual = @{
            visualType  = "lineChart"
            projections = @{
                Category = @(@{ queryRef = "$catEntity.$catColumn" })
                Y        = @(@{ queryRef = "$measEntity.$measure" })
            }
            prototypeQuery = @{
                Version = 2
                From    = $fromList
                Select  = @(
                    (New-ColumnSelect $catAlias $catEntity $catColumn),
                    (New-MeasureSelect $effectiveAlias $measEntity $measure)
                )
            }
        }
    }
    @{
        x      = [int]$pos.x
        y      = [int]$pos.y
        z      = 0
        width  = [int]$pos.w
        height = [int]$pos.h
        config  = ($config | ConvertTo-Json -Depth 20 -Compress)
        filters = "[]"
    }
}

function New-DonutChartVisual([hashtable]$pos, [string]$catEntity, [string]$catColumn, [string]$catAlias,
                              [string]$measEntity, [string]$measure, [string]$measAlias) {
    $guid = New-GuidString
    $fromList = @((New-FromEntry $catAlias $catEntity))
    if ($catEntity -ne $measEntity) {
        $fromList += (New-FromEntry $measAlias $measEntity)
    }
    $effectiveAlias = if ($catEntity -eq $measEntity) { $catAlias } else { $measAlias }
    $config = @{
        name    = $guid
        layouts = @(@{ id = 0; position = @{ x = $pos.x; y = $pos.y; z = 0; width = $pos.w; height = $pos.h; tabOrder = 0 } })
        singleVisual = @{
            visualType  = "donutChart"
            projections = @{
                Category = @(@{ queryRef = "$catEntity.$catColumn" })
                Y        = @(@{ queryRef = "$measEntity.$measure" })
            }
            prototypeQuery = @{
                Version = 2
                From    = $fromList
                Select  = @(
                    (New-ColumnSelect $catAlias $catEntity $catColumn),
                    (New-MeasureSelect $effectiveAlias $measEntity $measure)
                )
            }
        }
    }
    @{
        x      = [int]$pos.x
        y      = [int]$pos.y
        z      = 0
        width  = [int]$pos.w
        height = [int]$pos.h
        config  = ($config | ConvertTo-Json -Depth 20 -Compress)
        filters = "[]"
    }
}

function New-TableVisual([hashtable]$pos, [array]$columns, [array]$measures) {
    # $columns = @(@{entity="X";property="y";alias="a"}, ...)
    # $measures = @(@{entity="X";property="y";alias="a"}, ...)
    $guid = New-GuidString
    $fromEntries = @{}
    foreach ($c in $columns) { $fromEntries[$c.alias] = $c.entity }
    foreach ($m in $measures) { $fromEntries[$m.alias] = $m.entity }
    $fromList = @()
    foreach ($key in $fromEntries.Keys) {
        $fromList += (New-FromEntry $key $fromEntries[$key])
    }
    $valuesProjections = @()
    $selectList = @()
    foreach ($c in $columns) {
        $valuesProjections += @{ queryRef = "$($c.entity).$($c.property)" }
        $selectList += (New-ColumnSelect $c.alias $c.entity $c.property)
    }
    foreach ($m in $measures) {
        $valuesProjections += @{ queryRef = "$($m.entity).$($m.property)" }
        $selectList += (New-MeasureSelect $m.alias $m.entity $m.property)
    }
    $config = @{
        name    = $guid
        layouts = @(@{ id = 0; position = @{ x = $pos.x; y = $pos.y; z = 0; width = $pos.w; height = $pos.h; tabOrder = 0 } })
        singleVisual = @{
            visualType  = "tableEx"
            projections = @{ Values = $valuesProjections }
            prototypeQuery = @{
                Version = 2
                From    = $fromList
                Select  = $selectList
            }
        }
    }
    @{
        x      = [int]$pos.x
        y      = [int]$pos.y
        z      = 0
        width  = [int]$pos.w
        height = [int]$pos.h
        config  = ($config | ConvertTo-Json -Depth 20 -Compress)
        filters = "[]"
    }
}

function New-GaugeVisual([hashtable]$pos, [string]$entity, [string]$measure, [string]$alias) {
    $guid = New-GuidString
    $config = @{
        name    = $guid
        layouts = @(@{ id = 0; position = @{ x = $pos.x; y = $pos.y; z = 0; width = $pos.w; height = $pos.h; tabOrder = 0 } })
        singleVisual = @{
            visualType  = "gauge"
            projections = @{ Value = @(@{ queryRef = "$entity.$measure" }) }
            prototypeQuery = @{
                Version = 2
                From    = @((New-FromEntry $alias $entity))
                Select  = @((New-MeasureSelect $alias $entity $measure))
            }
        }
    }
    @{
        x      = [int]$pos.x
        y      = [int]$pos.y
        z      = 0
        width  = [int]$pos.w
        height = [int]$pos.h
        config  = ($config | ConvertTo-Json -Depth 20 -Compress)
        filters = "[]"
    }
}

# ============================================================
# Page 1: Adoption Overview
# ============================================================
Write-Host "Building Page 1: Adoption Overview..."

$page1Visuals = @()

# Row 1 - KPI Cards
$page1Visuals += New-CardVisual @{x=20;y=10;w=290;h=100} "Connection Logs" "DAU" "c"
$page1Visuals += New-CardVisual @{x=330;y=10;w=290;h=100} "Connection Logs" "MAU" "c"
$page1Visuals += New-CardVisual @{x=640;y=10;w=290;h=100} "Connection Logs" "Unique Users" "c"
$page1Visuals += New-CardVisual @{x=950;y=10;w=290;h=100} "Connection Logs" "Stickiness" "c"

# Row 2
$page1Visuals += New-LineChartVisual @{x=20;y=130;w=610;h=280} "Connection Logs" "created_at" "c" "Connection Logs" "Total Logins" "c"
$page1Visuals += New-BarChartVisual @{x=650;y=130;w=590;h=280} "Connection Logs" "app" "c" "Connection Logs" "Total Logins" "c"

# Row 3
$page1Visuals += New-DonutChartVisual @{x=20;y=430;w=400;h=260} "Connection Logs" "role" "c" "Connection Logs" "Unique Users" "c"
$page1Visuals += New-CardVisual @{x=440;y=430;w=200;h=260} "Connection Logs" "Login Failure Rate" "c"
$page1Visuals += New-TableVisual @{x=660;y=430;w=580;h=260} `
    @(@{entity="Connection Logs";property="app";alias="c"}, @{entity="Connection Logs";property="event";alias="c"}) `
    @(@{entity="Connection Logs";property="Total Logins";alias="c"})

# ============================================================
# Page 2: Student Demographics
# ============================================================
Write-Host "Building Page 2: Student Demographics..."

$page2Visuals = @()

# Row 1 - KPI Cards
$page2Visuals += New-CardVisual @{x=20;y=10;w=400;h=100} "Item Attempts" "Active Learners" "i"
$page2Visuals += New-CardVisual @{x=440;y=10;w=400;h=100} "Item Attempts" "Total Attempts" "i"
$page2Visuals += New-CardVisual @{x=860;y=10;w=380;h=100} "Item Attempts" "Correctness Rate" "i"

# Row 2
$page2Visuals += New-BarChartVisual @{x=20;y=130;w=610;h=280} "Learners" "market" "l" "Item Attempts" "Active Learners" "i"
$page2Visuals += New-BarChartVisual @{x=650;y=130;w=590;h=280} "Learners" "grade" "l" "Item Attempts" "Active Learners" "i"

# Row 3
$page2Visuals += New-DonutChartVisual @{x=20;y=430;w=400;h=260} "Learners" "sen" "l" "Item Attempts" "Active Learners" "i"
$page2Visuals += New-BarChartVisual @{x=440;y=430;w=400;h=260} "Learners" "decile" "l" "Item Attempts" "Correctness Rate" "i"
$page2Visuals += New-TableVisual @{x=860;y=430;w=380;h=260} `
    @(@{entity="Learners";property="market";alias="l"}, @{entity="Learners";property="grade";alias="l"}) `
    @(@{entity="Item Attempts";property="Active Learners";alias="i"}, @{entity="Item Attempts";property="Correctness Rate";alias="i"})

# ============================================================
# Page 3: Skill Mastery Progression
# ============================================================
Write-Host "Building Page 3: Skill Mastery Progression..."

$page3Visuals = @()

# Row 1 - KPI Cards
$page3Visuals += New-CardVisual @{x=20;y=10;w=290;h=100} "Skill Mastery" "Avg Mastery Level" "s"
$page3Visuals += New-CardVisual @{x=330;y=10;w=290;h=100} "Skill Mastery" "Mastered Count" "s"
$page3Visuals += New-CardVisual @{x=640;y=10;w=290;h=100} "Skill Mastery" "Struggling Count" "s"
$page3Visuals += New-CardVisual @{x=950;y=10;w=290;h=100} "Skill Mastery" "Skills Attempted" "s"

# Row 2
$page3Visuals += New-BarChartVisual @{x=20;y=130;w=610;h=280} "Skills" "domain" "k" "Skill Mastery" "Avg Mastery Level" "s"
$page3Visuals += New-LineChartVisual @{x=650;y=130;w=590;h=280} "Learner Activity" "day" "a" "Learner Activity" "Daily Attempts Total" "a"

# Row 3
$page3Visuals += New-BarChartVisual @{x=20;y=430;w=610;h=260} "Skills" "bloom" "k" "Skill Mastery" "Avg Mastery Level" "s"
$page3Visuals += New-GaugeVisual @{x=650;y=430;w=290;h=260} "Skill Mastery" "Mastery Accuracy" "s"
$page3Visuals += New-CardVisual @{x=960;y=430;w=280;h=260} "Item Attempts" "Avg Difficulty" "i"

# ============================================================
# Page 4: AI Quality & Safety
# ============================================================
Write-Host "Building Page 4: AI Quality & Safety..."

$page4Visuals = @()

# Row 1 - KPI Cards
$page4Visuals += New-CardVisual @{x=20;y=10;w=290;h=100} "Ask History" "Total Prompts" "h"
$page4Visuals += New-CardVisual @{x=330;y=10;w=290;h=100} "Ask History" "Avg Latency (s)" "h"
$page4Visuals += New-CardVisual @{x=640;y=10;w=290;h=100} "Ask History" "Error Rate" "h"
$page4Visuals += New-CardVisual @{x=950;y=10;w=290;h=100} "Ask History" "Total Tokens" "h"

# Row 2
$page4Visuals += New-BarChartVisual @{x=20;y=130;w=400;h=280} "Ask History" "model" "h" "Ask History" "Total Prompts" "h"
$page4Visuals += New-DonutChartVisual @{x=440;y=130;w=400;h=280} "Ask Feedback" "rating" "f" "Ask Feedback" "Total Feedback" "f"
$page4Visuals += New-CardVisual @{x=860;y=130;w=380;h=130} "Content Safety" "Total Safety Scans" "y"
$page4Visuals += New-CardVisual @{x=860;y=270;w=380;h=140} "Content Safety" "Safety Block Rate" "y"

# Row 3
$page4Visuals += New-CardVisual @{x=20;y=430;w=290;h=260} "Ask Feedback" "Helpful Rate" "f"
$page4Visuals += New-CardVisual @{x=330;y=430;w=290;h=260} "Ask History" "AI Prompts Per User" "h"
$page4Visuals += New-BarChartVisual @{x=640;y=430;w=600;h=260} "Content Safety" "direction" "y" "Content Safety" "Total Safety Scans" "y"

# ============================================================
# Page 5: Teacher Engagement
# ============================================================
Write-Host "Building Page 5: Teacher Engagement..."

$page5Visuals = @()

# Row 1 - KPI Cards
$page5Visuals += New-CardVisual @{x=20;y=10;w=290;h=100} "Teacher Questions" "Total Questions" "q"
$page5Visuals += New-CardVisual @{x=330;y=10;w=290;h=100} "Teacher Questions" "Questions Answered" "q"
$page5Visuals += New-CardVisual @{x=640;y=10;w=290;h=100} "Teacher Questions" "Question Answer Rate" "q"
$page5Visuals += New-CardVisual @{x=950;y=10;w=290;h=100} "Teacher Overrides" "Total Overrides" "o"

# Row 2
$page5Visuals += New-BarChartVisual @{x=20;y=130;w=610;h=280} "Teacher Questions" "subject" "q" "Teacher Questions" "Total Questions" "q"
$page5Visuals += New-BarChartVisual @{x=650;y=130;w=590;h=280} "Teacher Questions" "status" "q" "Teacher Questions" "Total Questions" "q"

# Row 3
$page5Visuals += New-CardVisual @{x=20;y=430;w=290;h=260} "Teacher Overrides" "Override Rate" "o"
$page5Visuals += New-CardVisual @{x=330;y=430;w=290;h=260} "Teacher Overrides" "AI-Human Gap" "o"
$page5Visuals += New-BarChartVisual @{x=640;y=430;w=600;h=260} "Skills" "domain" "k" "Teacher Overrides" "Total Overrides" "o"

# ============================================================
# Build report.json
# ============================================================
Write-Host "Assembling report.json..."

$reportConfig = '{"version":"5.53","themeCollection":{"baseTheme":{"name":"CY24SU06","reportVersionAtImport":"5.53","type":2}},"activeSectionIndex":0,"defaultDrillFilterOtherVisuals":true,"publicCustomVisuals":[]}'

$reportJson = @{
    resourcePackages   = @()
    sections           = @(
        @{
            name             = "page1"
            displayName      = "Adoption Overview"
            displayOption    = 1
            width            = 1280
            height           = 720
            visualContainers = $page1Visuals
        },
        @{
            name             = "page2"
            displayName      = "Student Demographics"
            displayOption    = 1
            width            = 1280
            height           = 720
            visualContainers = $page2Visuals
        },
        @{
            name             = "page3"
            displayName      = "Skill Mastery Progression"
            displayOption    = 1
            width            = 1280
            height           = 720
            visualContainers = $page3Visuals
        },
        @{
            name             = "page4"
            displayName      = "AI Quality & Safety"
            displayOption    = 1
            width            = 1280
            height           = 720
            visualContainers = $page4Visuals
        },
        @{
            name             = "page5"
            displayName      = "Teacher Engagement"
            displayOption    = 1
            width            = 1280
            height           = 720
            visualContainers = $page5Visuals
        }
    )
    config             = $reportConfig
    layoutOptimization = 0
}

# ============================================================
# Build definition.pbir
# ============================================================

$definitionPbir = @{
    version          = "4.0"
    datasetReference = @{
        byPath       = $null
        byConnection = @{
            connectionString         = $null
            pbiServiceModelId        = $null
            pbiModelVirtualServerName = "sobe_wowvirtualserver"
            pbiModelDatabaseName     = $SemanticModelId
            name                     = "EntityDataSource"
            connectionType           = "pbiServiceXmlaStyleLive"
        }
    }
}

# ============================================================
# Encode payloads
# ============================================================
Write-Host "Encoding payloads..."

$reportJsonString = $reportJson | ConvertTo-Json -Depth 30 -Compress
$definitionPbirString = $definitionPbir | ConvertTo-Json -Depth 10 -Compress

$reportJsonBase64 = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($reportJsonString))
$definitionPbirBase64 = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($definitionPbirString))

# ============================================================
# Build API payload
# ============================================================

$apiPayload = @{
    displayName = $ReportName
    definition  = @{
        parts = @(
            @{
                path        = "report.json"
                payload     = $reportJsonBase64
                payloadType = "InlineBase64"
            },
            @{
                path        = "definition.pbir"
                payload     = $definitionPbirBase64
                payloadType = "InlineBase64"
            }
        )
    }
}

$apiBody = $apiPayload | ConvertTo-Json -Depth 10 -Compress

# ============================================================
# Delete existing report if present
# ============================================================
Write-Host "Checking for existing report..."

$listUri = "https://api.fabric.microsoft.com/v1/workspaces/$WorkspaceId/reports"
try {
    $existingReports = Invoke-RestMethod -Uri $listUri -Headers $headers -Method Get
    $existing = $existingReports.value | Where-Object { $_.displayName -eq $ReportName }
    if ($existing) {
        Write-Host "Deleting existing report $($existing.id)..." -ForegroundColor Yellow
        $deleteUri = "https://api.fabric.microsoft.com/v1/workspaces/$WorkspaceId/reports/$($existing.id)"
        Invoke-RestMethod -Uri $deleteUri -Headers $headers -Method Delete
        Write-Host "Deleted." -ForegroundColor Green
        Start-Sleep -Seconds 2
    }
    else {
        Write-Host "No existing report found."
    }
}
catch {
    Write-Host "Warning: Could not list existing reports: $($_.Exception.Message)" -ForegroundColor Yellow
}

# ============================================================
# Deploy report
# ============================================================
Write-Host "Deploying report to Fabric..." -ForegroundColor Cyan

$createUri = "https://api.fabric.microsoft.com/v1/workspaces/$WorkspaceId/reports"

try {
    $response = Invoke-WebRequest -Uri $createUri -Headers $headers -Method Post -Body $apiBody -UseBasicParsing

    if ($response.StatusCode -eq 201) {
        $result = $response.Content | ConvertFrom-Json
        Write-Host "Report created successfully!" -ForegroundColor Green
        Write-Host "  Report ID: $($result.id)"
        Write-Host "  Display Name: $($result.displayName)"
    }
    elseif ($response.StatusCode -eq 202) {
        Write-Host "Report creation accepted (202). Polling for completion..." -ForegroundColor Yellow
        $locationHeader = $response.Headers["Location"]
        if ($locationHeader) {
            $pollUrl = if ($locationHeader -is [array]) { $locationHeader[0] } else { $locationHeader }
            $maxRetries = 30
            $retryCount = 0
            $completed = $false

            while (-not $completed -and $retryCount -lt $maxRetries) {
                Start-Sleep -Seconds 5
                $retryCount++
                Write-Host "  Polling attempt $retryCount..."
                try {
                    $pollResponse = Invoke-WebRequest -Uri $pollUrl -Headers $headers -Method Get -UseBasicParsing
                    if ($pollResponse.StatusCode -eq 200) {
                        $pollResult = $pollResponse.Content | ConvertFrom-Json
                        if ($pollResult.status -eq "Succeeded" -or $pollResult.status -eq "Completed") {
                            Write-Host "Report deployment completed successfully!" -ForegroundColor Green
                            if ($pollResult.id) {
                                Write-Host "  Report ID: $($pollResult.id)"
                            }
                            $completed = $true
                        }
                        elseif ($pollResult.status -eq "Failed") {
                            Write-Host "Report deployment failed!" -ForegroundColor Red
                            Write-Host "  Error: $($pollResult | ConvertTo-Json -Depth 5)"
                            exit 1
                        }
                        else {
                            Write-Host "  Status: $($pollResult.status)"
                        }
                    }
                    elseif ($pollResponse.StatusCode -eq 202) {
                        Write-Host "  Still in progress..."
                    }
                }
                catch {
                    Write-Host "  Poll error: $($_.Exception.Message)" -ForegroundColor Yellow
                }
            }

            if (-not $completed) {
                Write-Host "Timed out waiting for report creation." -ForegroundColor Red
                exit 1
            }
        }
        else {
            Write-Host "202 Accepted but no Location header. Check workspace manually." -ForegroundColor Yellow
        }
    }
    else {
        Write-Host "Unexpected status code: $($response.StatusCode)" -ForegroundColor Yellow
        Write-Host $response.Content
    }
}
catch {
    $errorMessage = $_.Exception.Message
    Write-Host "Error deploying report: $errorMessage" -ForegroundColor Red
    if ($_.Exception.Response) {
        try {
            $stream = $_.Exception.Response.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($stream)
            $responseBody = $reader.ReadToEnd()
            Write-Host "Response body: $responseBody" -ForegroundColor Red
        }
        catch {
            Write-Host "Could not read error response body." -ForegroundColor Red
        }
    }
    exit 1
}

Write-Host ""
Write-Host "=== Deployment Complete ===" -ForegroundColor Cyan
