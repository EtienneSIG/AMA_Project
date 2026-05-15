<#
.SYNOPSIS
  Deploy the LearnEU Power BI report to Microsoft Fabric.
.DESCRIPTION
  Creates a Power BI report with 5 pages (Adoption Overview, Student Demographics,
  Skill Mastery Progression, AI Quality & Safety, Teacher Engagement) bound to the
  LearnEU semantic model via Fabric REST API using PBIR format.
.PARAMETER WorkspaceId
  The Fabric workspace ID (EUlearn workspace).
.PARAMETER SemanticModelId
  The semantic model ID to bind the report to.
.PARAMETER ReportName
  Name for the report. Default: "LearnEU - Adoption & Student Level Report".
.EXAMPLE
  .\deploy_report.ps1
  .\deploy_report.ps1 -SemanticModelId "80a0d835-88b8-474d-a5ba-e8d420bd782e"
#>
[CmdletBinding()]
param(
  [string]$WorkspaceId     = '127a12ab-fa94-421b-bee3-4f534264d3ff',
  [string]$SemanticModelId = '80a0d835-88b8-474d-a5ba-e8d420bd782e',
  [string]$ReportName      = 'LearnEU - Adoption & Student Level Report'
)

$ErrorActionPreference = 'Stop'

# ---------------------------------------------------------------------------
# 1. Authenticate
# ---------------------------------------------------------------------------
Write-Host "==> Authenticating to Fabric..." -ForegroundColor Cyan
$token = (az account get-access-token --resource "https://analysis.windows.net/powerbi/api" --query accessToken -o tsv)
if (-not $token) { throw "Failed to get access token. Run 'az login' first." }
$headers = @{
  'Authorization' = "Bearer $token"
  'Content-Type'  = 'application/json'
}

# ---------------------------------------------------------------------------
# 2. Helper: encode JSON to base64
# ---------------------------------------------------------------------------
function ToBase64([string]$json) {
  [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($json))
}

# Helper: create a measure field reference
function MeasureField([string]$entity, [string]$property) {
  @{
    Measure = @{
      Expression = @{ SourceRef = @{ Entity = $entity } }
      Property = $property
    }
  }
}

# Helper: create a column field reference
function ColumnField([string]$entity, [string]$property) {
  @{
    Column = @{
      Expression = @{ SourceRef = @{ Entity = $entity } }
      Property = $property
    }
  }
}

# Helper: create a visual JSON
function New-Visual {
  param(
    [string]$Id,
    [double]$X, [double]$Y, [double]$W, [double]$H,
    [int]$Z,
    [string]$VisualType,
    [hashtable]$QueryState,
    [string]$Title = $null
  )
  $visual = @{
    '$schema' = "https://developer.microsoft.com/json-schemas/fabric/item/report/definition/visualContainer/2.5.0/schema.json"
    name = $Id
    position = @{ x = $X; y = $Y; z = $Z; height = $H; width = $W; tabOrder = $Z }
    visual = @{
      visualType = $VisualType
      query = @{ queryState = $QueryState }
      drillFilterOtherVisuals = $true
    }
  }
  return $visual
}

# ---------------------------------------------------------------------------
# 3. Build definition.pbir
# ---------------------------------------------------------------------------
Write-Host "==> Building report definition (PBIR format)..." -ForegroundColor Cyan

$definitionPbir = @{
  '$schema' = "https://developer.microsoft.com/json-schemas/fabric/item/report/definitionProperties/2.0.0/schema.json"
  version = "4.0"
  datasetReference = @{
    byConnection = @{
      connectionString = "semanticmodelid=$SemanticModelId"
    }
  }
} | ConvertTo-Json -Depth 5

# ---------------------------------------------------------------------------
# 4. Build report.json (report-level settings)
# ---------------------------------------------------------------------------
$reportJson = @{
  '$schema' = "https://developer.microsoft.com/json-schemas/fabric/item/report/definition/report/3.1.0/schema.json"
  themeCollection = @{
    baseTheme = @{
      name = "CY25SU12"
      reportVersionAtImport = @{ visual = "2.5.0"; report = "3.1.0"; page = "2.3.0" }
      type = "SharedResources"
    }
  }
  resourcePackages = @(
    @{
      name = "SharedResources"
      type = "SharedResources"
      items = @(
        @{ name = "CY25SU12"; path = "BaseThemes/CY25SU12.json"; type = "BaseTheme" }
      )
    }
  )
  settings = @{
    useStylableVisualContainerHeader = $true
    defaultFilterActionIsDataFilter = $true
    defaultDrillFilterOtherVisuals = $true
    allowChangeFilterTypes = $true
    allowInlineExploration = $true
    useEnhancedTooltips = $true
  }
} | ConvertTo-Json -Depth 10

# ---------------------------------------------------------------------------
# 5. Build version.json
# ---------------------------------------------------------------------------
$versionJson = @{
  '$schema' = "https://developer.microsoft.com/json-schemas/fabric/item/report/definition/versionMetadata/1.0.0/schema.json"
  version = "1.0.0"
} | ConvertTo-Json

# ---------------------------------------------------------------------------
# 6. Build pages
# ---------------------------------------------------------------------------
$pageIds = @("page01adopt", "page02demog", "page03skill", "page04aiqual", "page05teach")
$pageNames = @(
  "Adoption Overview",
  "Student Demographics",
  "Skill Mastery Progression",
  "AI Quality & Safety",
  "Teacher Engagement"
)

$pagesJson = @{
  '$schema' = "https://developer.microsoft.com/json-schemas/fabric/item/report/definition/pagesMetadata/1.0.0/schema.json"
  pageOrder = $pageIds
} | ConvertTo-Json -Depth 3

# --- Page 1: Adoption Overview ---
$page1Json = @{
  '$schema' = "https://developer.microsoft.com/json-schemas/fabric/item/report/definition/page/2.0.0/schema.json"
  name = "page01adopt"
  displayName = "Adoption Overview"
  displayOption = "FitToPage"
  height = 720.0
  width = 1280.0
} | ConvertTo-Json -Depth 3

# Page 1 visuals
$v1_dau = New-Visual -Id "v1dau0001" -X 20 -Y 20 -W 200 -H 120 -Z 1000 -VisualType "card" -Title "DAU" -QueryState @{
  Values = @{ projections = @( @{ field = (MeasureField "Connection Logs" "DAU"); queryRef = "Connection Logs.DAU"; active = $true } ) }
}
$v1_mau = New-Visual -Id "v1mau0002" -X 240 -Y 20 -W 200 -H 120 -Z 1001 -VisualType "card" -Title "MAU" -QueryState @{
  Values = @{ projections = @( @{ field = (MeasureField "Connection Logs" "MAU"); queryRef = "Connection Logs.MAU"; active = $true } ) }
}
$v1_sticky = New-Visual -Id "v1stk0003" -X 460 -Y 20 -W 200 -H 120 -Z 1002 -VisualType "card" -Title "Stickiness" -QueryState @{
  Values = @{ projections = @( @{ field = (MeasureField "Connection Logs" "Stickiness"); queryRef = "Connection Logs.Stickiness"; active = $true } ) }
}
$v1_unique = New-Visual -Id "v1unq0004" -X 680 -Y 20 -W 200 -H 120 -Z 1003 -VisualType "card" -Title "Unique Users" -QueryState @{
  Values = @{ projections = @( @{ field = (MeasureField "Connection Logs" "Unique Users"); queryRef = "Connection Logs.Unique Users"; active = $true } ) }
}
$v1_failrate = New-Visual -Id "v1frt0005" -X 900 -Y 20 -W 200 -H 120 -Z 1004 -VisualType "card" -Title "Login Failure Rate" -QueryState @{
  Values = @{ projections = @( @{ field = (MeasureField "Connection Logs" "Login Failure Rate"); queryRef = "Connection Logs.Login Failure Rate"; active = $true } ) }
}
# Logins by app (bar chart)
$v1_byapp = New-Visual -Id "v1app0006" -X 20 -Y 160 -W 400 -H 280 -Z 1005 -VisualType "barChart" -Title "Logins by Application" -QueryState @{
  Category = @{ projections = @( @{ field = (ColumnField "Connection Logs" "app_name"); queryRef = "Connection Logs.app_name"; active = $true } ) }
  Y = @{ projections = @( @{ field = (MeasureField "Connection Logs" "Unique Users"); queryRef = "Connection Logs.Unique Users"; active = $true } ) }
}
# Logins by role (bar chart)
$v1_byrole = New-Visual -Id "v1rol0007" -X 440 -Y 160 -W 400 -H 280 -Z 1006 -VisualType "barChart" -Title "Logins by Role" -QueryState @{
  Category = @{ projections = @( @{ field = (ColumnField "Connection Logs" "role"); queryRef = "Connection Logs.role"; active = $true } ) }
  Y = @{ projections = @( @{ field = (MeasureField "Connection Logs" "Unique Users"); queryRef = "Connection Logs.Unique Users"; active = $true } ) }
}
# Logins trend (line chart)
$v1_trend = New-Visual -Id "v1trd0008" -X 20 -Y 460 -W 820 -H 240 -Z 1007 -VisualType "lineChart" -Title "Login Trend (Daily)" -QueryState @{
  Category = @{ projections = @( @{ field = (ColumnField "Connection Logs" "logged_at"); queryRef = "Connection Logs.logged_at"; active = $true } ) }
  Y = @{ projections = @( @{ field = (MeasureField "Connection Logs" "DAU"); queryRef = "Connection Logs.DAU"; active = $true } ) }
}
# Market slicer
$v1_slicer = New-Visual -Id "v1slc0009" -X 860 -Y 160 -W 400 -H 280 -Z 1008 -VisualType "slicer" -Title "Market" -QueryState @{
  Values = @{ projections = @( @{ field = (ColumnField "Learners" "market"); queryRef = "Learners.market"; active = $true } ) }
}

# --- Page 2: Student Demographics ---
$page2Json = @{
  '$schema' = "https://developer.microsoft.com/json-schemas/fabric/item/report/definition/page/2.0.0/schema.json"
  name = "page02demog"
  displayName = "Student Demographics"
  displayOption = "FitToPage"
  height = 720.0
  width = 1280.0
} | ConvertTo-Json -Depth 3

$v2_bymarket = New-Visual -Id "v2mkt0001" -X 20 -Y 20 -W 380 -H 320 -Z 1000 -VisualType "barChart" -Title "Students by Market" -QueryState @{
  Category = @{ projections = @( @{ field = (ColumnField "Learners" "market"); queryRef = "Learners.market"; active = $true } ) }
  Y = @{ projections = @( @{ field = (MeasureField "Learner Activity" "Active Learners"); queryRef = "Learner Activity.Active Learners"; active = $true } ) }
}
$v2_bygrade = New-Visual -Id "v2grd0002" -X 420 -Y 20 -W 380 -H 320 -Z 1001 -VisualType "barChart" -Title "Students by Grade" -QueryState @{
  Category = @{ projections = @( @{ field = (ColumnField "Learners" "grade"); queryRef = "Learners.grade"; active = $true } ) }
  Y = @{ projections = @( @{ field = (MeasureField "Learner Activity" "Active Learners"); queryRef = "Learner Activity.Active Learners"; active = $true } ) }
}
$v2_bydecile = New-Visual -Id "v2dcl0003" -X 820 -Y 20 -W 440 -H 320 -Z 1002 -VisualType "barChart" -Title "Students by Decile" -QueryState @{
  Category = @{ projections = @( @{ field = (ColumnField "Learners" "decile"); queryRef = "Learners.decile"; active = $true } ) }
  Y = @{ projections = @( @{ field = (MeasureField "Learner Activity" "Active Learners"); queryRef = "Learner Activity.Active Learners"; active = $true } ) }
}
$v2_sen = New-Visual -Id "v2sen0004" -X 20 -Y 360 -W 300 -H 320 -Z 1003 -VisualType "donutChart" -Title "SEN Distribution" -QueryState @{
  Category = @{ projections = @( @{ field = (ColumnField "Learners" "sen"); queryRef = "Learners.sen"; active = $true } ) }
  Y = @{ projections = @( @{ field = (MeasureField "Learner Activity" "Active Learners"); queryRef = "Learner Activity.Active Learners"; active = $true } ) }
}
$v2_mastery_mkt = New-Visual -Id "v2mst0005" -X 340 -Y 360 -W 480 -H 320 -Z 1004 -VisualType "clusteredBarChart" -Title "Avg Mastery Level by Market" -QueryState @{
  Category = @{ projections = @( @{ field = (ColumnField "Learners" "market"); queryRef = "Learners.market"; active = $true } ) }
  Y = @{ projections = @( @{ field = (MeasureField "Skill Mastery" "Avg Mastery Level"); queryRef = "Skill Mastery.Avg Mastery Level"; active = $true } ) }
}
$v2_table = New-Visual -Id "v2tbl0006" -X 840 -Y 360 -W 420 -H 320 -Z 1005 -VisualType "tableEx" -Title "Learner Summary" -QueryState @{
  Values = @{ projections = @(
    @{ field = (ColumnField "Learners" "market"); queryRef = "Learners.market"; active = $true }
    @{ field = (ColumnField "Learners" "grade"); queryRef = "Learners.grade"; active = $true }
    @{ field = (MeasureField "Learner Activity" "Active Learners"); queryRef = "Learner Activity.Active Learners"; active = $true }
    @{ field = (MeasureField "Skill Mastery" "Avg Mastery Level"); queryRef = "Skill Mastery.Avg Mastery Level"; active = $true }
  ) }
}

# --- Page 3: Skill Mastery Progression ---
$page3Json = @{
  '$schema' = "https://developer.microsoft.com/json-schemas/fabric/item/report/definition/page/2.0.0/schema.json"
  name = "page03skill"
  displayName = "Skill Mastery Progression"
  displayOption = "FitToPage"
  height = 720.0
  width = 1280.0
} | ConvertTo-Json -Depth 3

$v3_mastered = New-Visual -Id "v3mas0001" -X 20 -Y 20 -W 200 -H 120 -Z 1000 -VisualType "card" -Title "Mastered Skills" -QueryState @{
  Values = @{ projections = @( @{ field = (MeasureField "Skill Mastery" "Mastered Count"); queryRef = "Skill Mastery.Mastered Count"; active = $true } ) }
}
$v3_struggling = New-Visual -Id "v3str0002" -X 240 -Y 20 -W 200 -H 120 -Z 1001 -VisualType "card" -Title "Struggling Count" -QueryState @{
  Values = @{ projections = @( @{ field = (MeasureField "Skill Mastery" "Struggling Count"); queryRef = "Skill Mastery.Struggling Count"; active = $true } ) }
}
$v3_accuracy = New-Visual -Id "v3acc0003" -X 460 -Y 20 -W 200 -H 120 -Z 1002 -VisualType "card" -Title "Accuracy %" -QueryState @{
  Values = @{ projections = @( @{ field = (MeasureField "Item Attempts" "Correctness Rate"); queryRef = "Item Attempts.Correctness Rate"; active = $true } ) }
}
$v3_attempts = New-Visual -Id "v3att0004" -X 680 -Y 20 -W 200 -H 120 -Z 1003 -VisualType "card" -Title "Total Attempts" -QueryState @{
  Values = @{ projections = @( @{ field = (MeasureField "Item Attempts" "Total Attempts"); queryRef = "Item Attempts.Total Attempts"; active = $true } ) }
}
# By domain
$v3_bydomain = New-Visual -Id "v3dom0005" -X 20 -Y 160 -W 600 -H 280 -Z 1004 -VisualType "barChart" -Title "Mastery Level by Domain" -QueryState @{
  Category = @{ projections = @( @{ field = (ColumnField "Skills" "domain"); queryRef = "Skills.domain"; active = $true } ) }
  Y = @{ projections = @( @{ field = (MeasureField "Skill Mastery" "Avg Mastery Level"); queryRef = "Skill Mastery.Avg Mastery Level"; active = $true } ) }
}
# By chapter
$v3_bychapter = New-Visual -Id "v3chp0006" -X 640 -Y 160 -W 620 -H 280 -Z 1005 -VisualType "barChart" -Title "Mastery Level by Chapter" -QueryState @{
  Category = @{ projections = @( @{ field = (ColumnField "Skills" "chapter"); queryRef = "Skills.chapter"; active = $true } ) }
  Y = @{ projections = @( @{ field = (MeasureField "Skill Mastery" "Avg Mastery Level"); queryRef = "Skill Mastery.Avg Mastery Level"; active = $true } ) }
}
# Correctness by difficulty
$v3_diff = New-Visual -Id "v3dif0007" -X 20 -Y 460 -W 600 -H 240 -Z 1006 -VisualType "clusteredBarChart" -Title "Correctness by Difficulty" -QueryState @{
  Category = @{ projections = @( @{ field = (ColumnField "Skills" "difficulty"); queryRef = "Skills.difficulty"; active = $true } ) }
  Y = @{ projections = @( @{ field = (MeasureField "Item Attempts" "Correctness Rate"); queryRef = "Item Attempts.Correctness Rate"; active = $true } ) }
}
# Skill table
$v3_table = New-Visual -Id "v3tbl0008" -X 640 -Y 460 -W 620 -H 240 -Z 1007 -VisualType "tableEx" -Title "Skills Detail" -QueryState @{
  Values = @{ projections = @(
    @{ field = (ColumnField "Skills" "domain"); queryRef = "Skills.domain"; active = $true }
    @{ field = (ColumnField "Skills" "chapter"); queryRef = "Skills.chapter"; active = $true }
    @{ field = (MeasureField "Skill Mastery" "Mastered Count"); queryRef = "Skill Mastery.Mastered Count"; active = $true }
    @{ field = (MeasureField "Skill Mastery" "Struggling Count"); queryRef = "Skill Mastery.Struggling Count"; active = $true }
    @{ field = (MeasureField "Item Attempts" "Correctness Rate"); queryRef = "Item Attempts.Correctness Rate"; active = $true }
  ) }
}

# --- Page 4: AI Quality & Safety ---
$page4Json = @{
  '$schema' = "https://developer.microsoft.com/json-schemas/fabric/item/report/definition/page/2.0.0/schema.json"
  name = "page04aiqual"
  displayName = "AI Quality & Safety"
  displayOption = "FitToPage"
  height = 720.0
  width = 1280.0
} | ConvertTo-Json -Depth 3

$v4_prompts = New-Visual -Id "v4prm0001" -X 20 -Y 20 -W 200 -H 120 -Z 1000 -VisualType "card" -Title "Total Prompts" -QueryState @{
  Values = @{ projections = @( @{ field = (MeasureField "Ask History" "Total Prompts"); queryRef = "Ask History.Total Prompts"; active = $true } ) }
}
$v4_latency = New-Visual -Id "v4lat0002" -X 240 -Y 20 -W 200 -H 120 -Z 1001 -VisualType "card" -Title "Avg Latency" -QueryState @{
  Values = @{ projections = @( @{ field = (MeasureField "Ask History" "Avg Latency (s)"); queryRef = "Ask History.Avg Latency (s)"; active = $true } ) }
}
$v4_p95 = New-Visual -Id "v4p950003" -X 460 -Y 20 -W 200 -H 120 -Z 1002 -VisualType "card" -Title "P95 Latency" -QueryState @{
  Values = @{ projections = @( @{ field = (MeasureField "Ask History" "P95 Latency (s)"); queryRef = "Ask History.P95 Latency (s)"; active = $true } ) }
}
$v4_errrate = New-Visual -Id "v4err0004" -X 680 -Y 20 -W 200 -H 120 -Z 1003 -VisualType "card" -Title "Error Rate" -QueryState @{
  Values = @{ projections = @( @{ field = (MeasureField "Ask History" "Error Rate"); queryRef = "Ask History.Error Rate"; active = $true } ) }
}
$v4_safety = New-Visual -Id "v4saf0005" -X 900 -Y 20 -W 200 -H 120 -Z 1004 -VisualType "card" -Title "Safety Block Rate" -QueryState @{
  Values = @{ projections = @( @{ field = (MeasureField "Content Safety" "Safety Block Rate"); queryRef = "Content Safety.Safety Block Rate"; active = $true } ) }
}
# Feedback positive rate
$v4_feedback = New-Visual -Id "v4fbk0006" -X 20 -Y 160 -W 400 -H 280 -Z 1005 -VisualType "gauge" -Title "Positive Feedback Rate" -QueryState @{
  Values = @{ projections = @( @{ field = (MeasureField "Ask Feedback" "Positive Feedback Rate"); queryRef = "Ask Feedback.Positive Feedback Rate"; active = $true } ) }
}
# Token usage by model
$v4_tokens = New-Visual -Id "v4tok0007" -X 440 -Y 160 -W 400 -H 280 -Z 1006 -VisualType "barChart" -Title "Tokens by Model" -QueryState @{
  Category = @{ projections = @( @{ field = (ColumnField "Ask History" "model"); queryRef = "Ask History.model"; active = $true } ) }
  Y = @{ projections = @( @{ field = (MeasureField "Ask History" "Total Tokens"); queryRef = "Ask History.Total Tokens"; active = $true } ) }
}
# Latency trend
$v4_trend = New-Visual -Id "v4trd0008" -X 20 -Y 460 -W 820 -H 240 -Z 1007 -VisualType "lineChart" -Title "Latency Trend" -QueryState @{
  Category = @{ projections = @( @{ field = (ColumnField "Ask History" "asked_at"); queryRef = "Ask History.asked_at"; active = $true } ) }
  Y = @{ projections = @( @{ field = (MeasureField "Ask History" "Avg Latency (s)"); queryRef = "Ask History.Avg Latency (s)"; active = $true } ) }
}
# Safety detail table
$v4_table = New-Visual -Id "v4tbl0009" -X 860 -Y 160 -W 400 -H 540 -Z 1008 -VisualType "tableEx" -Title "Safety Events" -QueryState @{
  Values = @{ projections = @(
    @{ field = (ColumnField "Content Safety" "category"); queryRef = "Content Safety.category"; active = $true }
    @{ field = (ColumnField "Content Safety" "action_taken"); queryRef = "Content Safety.action_taken"; active = $true }
    @{ field = (MeasureField "Content Safety" "Safety Block Rate"); queryRef = "Content Safety.Safety Block Rate"; active = $true }
  ) }
}

# --- Page 5: Teacher Engagement ---
$page5Json = @{
  '$schema' = "https://developer.microsoft.com/json-schemas/fabric/item/report/definition/page/2.0.0/schema.json"
  name = "page05teach"
  displayName = "Teacher Engagement"
  displayOption = "FitToPage"
  height = 720.0
  width = 1280.0
} | ConvertTo-Json -Depth 3

$v5_overrides = New-Visual -Id "v5ovr0001" -X 20 -Y 20 -W 200 -H 120 -Z 1000 -VisualType "card" -Title "Override Rate" -QueryState @{
  Values = @{ projections = @( @{ field = (MeasureField "Teacher Overrides" "Override Rate"); queryRef = "Teacher Overrides.Override Rate"; active = $true } ) }
}
$v5_gap = New-Visual -Id "v5gap0002" -X 240 -Y 20 -W 200 -H 120 -Z 1001 -VisualType "card" -Title "AI-Human Gap" -QueryState @{
  Values = @{ projections = @( @{ field = (MeasureField "Teacher Overrides" "AI-Human Gap"); queryRef = "Teacher Overrides.AI-Human Gap"; active = $true } ) }
}
$v5_qrate = New-Visual -Id "v5qrt0003" -X 460 -Y 20 -W 200 -H 120 -Z 1002 -VisualType "card" -Title "Question Answer Rate" -QueryState @{
  Values = @{ projections = @( @{ field = (MeasureField "Teacher Questions" "Question Answer Rate"); queryRef = "Teacher Questions.Question Answer Rate"; active = $true } ) }
}
# Overrides by skill domain
$v5_bydomain = New-Visual -Id "v5dom0004" -X 20 -Y 160 -W 600 -H 280 -Z 1003 -VisualType "barChart" -Title "Overrides by Skill Domain" -QueryState @{
  Category = @{ projections = @( @{ field = (ColumnField "Skills" "domain"); queryRef = "Skills.domain"; active = $true } ) }
  Y = @{ projections = @( @{ field = (MeasureField "Teacher Overrides" "Override Rate"); queryRef = "Teacher Overrides.Override Rate"; active = $true } ) }
}
# Teacher questions table
$v5_table = New-Visual -Id "v5tbl0005" -X 640 -Y 160 -W 620 -H 280 -Z 1004 -VisualType "tableEx" -Title "Recent Teacher Questions" -QueryState @{
  Values = @{ projections = @(
    @{ field = (ColumnField "Teacher Questions" "question_text"); queryRef = "Teacher Questions.question_text"; active = $true }
    @{ field = (ColumnField "Teacher Questions" "answer_text"); queryRef = "Teacher Questions.answer_text"; active = $true }
    @{ field = (ColumnField "Teacher Questions" "asked_at"); queryRef = "Teacher Questions.asked_at"; active = $true }
  ) }
}
# AI vs Teacher mastery comparison
$v5_compare = New-Visual -Id "v5cmp0006" -X 20 -Y 460 -W 1240 -H 240 -Z 1005 -VisualType "clusteredBarChart" -Title "AI vs Teacher Mastery Assessment (by Skill)" -QueryState @{
  Category = @{ projections = @( @{ field = (ColumnField "Skills" "domain"); queryRef = "Skills.domain"; active = $true } ) }
  Y = @{ projections = @(
    @{ field = (MeasureField "Teacher Overrides" "AI-Human Gap"); queryRef = "Teacher Overrides.AI-Human Gap"; active = $true }
    @{ field = (MeasureField "Teacher Overrides" "Override Rate"); queryRef = "Teacher Overrides.Override Rate"; active = $true }
  ) }
}

# ---------------------------------------------------------------------------
# 7. Assemble all parts
# ---------------------------------------------------------------------------
Write-Host "==> Assembling report parts..." -ForegroundColor Cyan

$parts = @(
  @{ path = "definition.pbir"; payload = (ToBase64 $definitionPbir); payloadType = "InlineBase64" }
  @{ path = "definition/report.json"; payload = (ToBase64 $reportJson); payloadType = "InlineBase64" }
  @{ path = "definition/version.json"; payload = (ToBase64 $versionJson); payloadType = "InlineBase64" }
  @{ path = "definition/pages/pages.json"; payload = (ToBase64 $pagesJson); payloadType = "InlineBase64" }
  # Page 1 - Adoption Overview
  @{ path = "definition/pages/page01adopt/page.json"; payload = (ToBase64 $page1Json); payloadType = "InlineBase64" }
  @{ path = "definition/pages/page01adopt/visuals/v1dau0001/visual.json"; payload = (ToBase64 ($v1_dau | ConvertTo-Json -Depth 15)); payloadType = "InlineBase64" }
  @{ path = "definition/pages/page01adopt/visuals/v1mau0002/visual.json"; payload = (ToBase64 ($v1_mau | ConvertTo-Json -Depth 15)); payloadType = "InlineBase64" }
  @{ path = "definition/pages/page01adopt/visuals/v1stk0003/visual.json"; payload = (ToBase64 ($v1_sticky | ConvertTo-Json -Depth 15)); payloadType = "InlineBase64" }
  @{ path = "definition/pages/page01adopt/visuals/v1unq0004/visual.json"; payload = (ToBase64 ($v1_unique | ConvertTo-Json -Depth 15)); payloadType = "InlineBase64" }
  @{ path = "definition/pages/page01adopt/visuals/v1frt0005/visual.json"; payload = (ToBase64 ($v1_failrate | ConvertTo-Json -Depth 15)); payloadType = "InlineBase64" }
  @{ path = "definition/pages/page01adopt/visuals/v1app0006/visual.json"; payload = (ToBase64 ($v1_byapp | ConvertTo-Json -Depth 15)); payloadType = "InlineBase64" }
  @{ path = "definition/pages/page01adopt/visuals/v1rol0007/visual.json"; payload = (ToBase64 ($v1_byrole | ConvertTo-Json -Depth 15)); payloadType = "InlineBase64" }
  @{ path = "definition/pages/page01adopt/visuals/v1trd0008/visual.json"; payload = (ToBase64 ($v1_trend | ConvertTo-Json -Depth 15)); payloadType = "InlineBase64" }
  @{ path = "definition/pages/page01adopt/visuals/v1slc0009/visual.json"; payload = (ToBase64 ($v1_slicer | ConvertTo-Json -Depth 15)); payloadType = "InlineBase64" }
  # Page 2 - Student Demographics
  @{ path = "definition/pages/page02demog/page.json"; payload = (ToBase64 $page2Json); payloadType = "InlineBase64" }
  @{ path = "definition/pages/page02demog/visuals/v2mkt0001/visual.json"; payload = (ToBase64 ($v2_bymarket | ConvertTo-Json -Depth 15)); payloadType = "InlineBase64" }
  @{ path = "definition/pages/page02demog/visuals/v2grd0002/visual.json"; payload = (ToBase64 ($v2_bygrade | ConvertTo-Json -Depth 15)); payloadType = "InlineBase64" }
  @{ path = "definition/pages/page02demog/visuals/v2dcl0003/visual.json"; payload = (ToBase64 ($v2_bydecile | ConvertTo-Json -Depth 15)); payloadType = "InlineBase64" }
  @{ path = "definition/pages/page02demog/visuals/v2sen0004/visual.json"; payload = (ToBase64 ($v2_sen | ConvertTo-Json -Depth 15)); payloadType = "InlineBase64" }
  @{ path = "definition/pages/page02demog/visuals/v2mst0005/visual.json"; payload = (ToBase64 ($v2_mastery_mkt | ConvertTo-Json -Depth 15)); payloadType = "InlineBase64" }
  @{ path = "definition/pages/page02demog/visuals/v2tbl0006/visual.json"; payload = (ToBase64 ($v2_table | ConvertTo-Json -Depth 15)); payloadType = "InlineBase64" }
  # Page 3 - Skill Mastery Progression
  @{ path = "definition/pages/page03skill/page.json"; payload = (ToBase64 $page3Json); payloadType = "InlineBase64" }
  @{ path = "definition/pages/page03skill/visuals/v3mas0001/visual.json"; payload = (ToBase64 ($v3_mastered | ConvertTo-Json -Depth 15)); payloadType = "InlineBase64" }
  @{ path = "definition/pages/page03skill/visuals/v3str0002/visual.json"; payload = (ToBase64 ($v3_struggling | ConvertTo-Json -Depth 15)); payloadType = "InlineBase64" }
  @{ path = "definition/pages/page03skill/visuals/v3acc0003/visual.json"; payload = (ToBase64 ($v3_accuracy | ConvertTo-Json -Depth 15)); payloadType = "InlineBase64" }
  @{ path = "definition/pages/page03skill/visuals/v3att0004/visual.json"; payload = (ToBase64 ($v3_attempts | ConvertTo-Json -Depth 15)); payloadType = "InlineBase64" }
  @{ path = "definition/pages/page03skill/visuals/v3dom0005/visual.json"; payload = (ToBase64 ($v3_bydomain | ConvertTo-Json -Depth 15)); payloadType = "InlineBase64" }
  @{ path = "definition/pages/page03skill/visuals/v3chp0006/visual.json"; payload = (ToBase64 ($v3_bychapter | ConvertTo-Json -Depth 15)); payloadType = "InlineBase64" }
  @{ path = "definition/pages/page03skill/visuals/v3dif0007/visual.json"; payload = (ToBase64 ($v3_diff | ConvertTo-Json -Depth 15)); payloadType = "InlineBase64" }
  @{ path = "definition/pages/page03skill/visuals/v3tbl0008/visual.json"; payload = (ToBase64 ($v3_table | ConvertTo-Json -Depth 15)); payloadType = "InlineBase64" }
  # Page 4 - AI Quality & Safety
  @{ path = "definition/pages/page04aiqual/page.json"; payload = (ToBase64 $page4Json); payloadType = "InlineBase64" }
  @{ path = "definition/pages/page04aiqual/visuals/v4prm0001/visual.json"; payload = (ToBase64 ($v4_prompts | ConvertTo-Json -Depth 15)); payloadType = "InlineBase64" }
  @{ path = "definition/pages/page04aiqual/visuals/v4lat0002/visual.json"; payload = (ToBase64 ($v4_latency | ConvertTo-Json -Depth 15)); payloadType = "InlineBase64" }
  @{ path = "definition/pages/page04aiqual/visuals/v4p950003/visual.json"; payload = (ToBase64 ($v4_p95 | ConvertTo-Json -Depth 15)); payloadType = "InlineBase64" }
  @{ path = "definition/pages/page04aiqual/visuals/v4err0004/visual.json"; payload = (ToBase64 ($v4_errrate | ConvertTo-Json -Depth 15)); payloadType = "InlineBase64" }
  @{ path = "definition/pages/page04aiqual/visuals/v4saf0005/visual.json"; payload = (ToBase64 ($v4_safety | ConvertTo-Json -Depth 15)); payloadType = "InlineBase64" }
  @{ path = "definition/pages/page04aiqual/visuals/v4fbk0006/visual.json"; payload = (ToBase64 ($v4_feedback | ConvertTo-Json -Depth 15)); payloadType = "InlineBase64" }
  @{ path = "definition/pages/page04aiqual/visuals/v4tok0007/visual.json"; payload = (ToBase64 ($v4_tokens | ConvertTo-Json -Depth 15)); payloadType = "InlineBase64" }
  @{ path = "definition/pages/page04aiqual/visuals/v4trd0008/visual.json"; payload = (ToBase64 ($v4_trend | ConvertTo-Json -Depth 15)); payloadType = "InlineBase64" }
  @{ path = "definition/pages/page04aiqual/visuals/v4tbl0009/visual.json"; payload = (ToBase64 ($v4_table | ConvertTo-Json -Depth 15)); payloadType = "InlineBase64" }
  # Page 5 - Teacher Engagement
  @{ path = "definition/pages/page05teach/page.json"; payload = (ToBase64 $page5Json); payloadType = "InlineBase64" }
  @{ path = "definition/pages/page05teach/visuals/v5ovr0001/visual.json"; payload = (ToBase64 ($v5_overrides | ConvertTo-Json -Depth 15)); payloadType = "InlineBase64" }
  @{ path = "definition/pages/page05teach/visuals/v5gap0002/visual.json"; payload = (ToBase64 ($v5_gap | ConvertTo-Json -Depth 15)); payloadType = "InlineBase64" }
  @{ path = "definition/pages/page05teach/visuals/v5qrt0003/visual.json"; payload = (ToBase64 ($v5_qrate | ConvertTo-Json -Depth 15)); payloadType = "InlineBase64" }
  @{ path = "definition/pages/page05teach/visuals/v5dom0004/visual.json"; payload = (ToBase64 ($v5_bydomain | ConvertTo-Json -Depth 15)); payloadType = "InlineBase64" }
  @{ path = "definition/pages/page05teach/visuals/v5tbl0005/visual.json"; payload = (ToBase64 ($v5_table | ConvertTo-Json -Depth 15)); payloadType = "InlineBase64" }
  @{ path = "definition/pages/page05teach/visuals/v5cmp0006/visual.json"; payload = (ToBase64 ($v5_compare | ConvertTo-Json -Depth 15)); payloadType = "InlineBase64" }
)

# ---------------------------------------------------------------------------
# 8. Deploy report via Fabric REST API
# ---------------------------------------------------------------------------
Write-Host "==> Creating report '$ReportName' in workspace $WorkspaceId..." -ForegroundColor Cyan

$body = @{
  displayName = $ReportName
  description = "LearnEU adoption tracking and student level analytics report. 5 pages: Adoption Overview, Student Demographics, Skill Mastery Progression, AI Quality & Safety, Teacher Engagement."
  definition = @{ parts = $parts }
} | ConvertTo-Json -Depth 20 -Compress

$createUrl = "https://api.fabric.microsoft.com/v1/workspaces/$WorkspaceId/reports"
try {
  $response = Invoke-RestMethod -Uri $createUrl -Headers $headers -Method Post -Body $body -StatusCodeVariable 'statusCode' -ResponseHeadersVariable 'respHeaders'

  if ($statusCode -eq 202) {
    Write-Host "  Accepted (LRO). Polling for completion..." -ForegroundColor Yellow
    $opUrl = if ($respHeaders -and $respHeaders['Location']) { $respHeaders['Location'][0] }
             elseif ($respHeaders -and $respHeaders['x-ms-operation-id']) { "https://api.fabric.microsoft.com/v1/operations/$($respHeaders['x-ms-operation-id'][0])" }
             else { $null }
    if ($opUrl) {
      $maxWait = 120; $waited = 0
      do {
        Start-Sleep -Seconds 5; $waited += 5
        $opStatus = Invoke-RestMethod -Uri $opUrl -Headers $headers -Method Get
        $st = if ($opStatus.status) { $opStatus.status } else { "unknown" }
        Write-Host "  Status: $st ($waited`s)" -ForegroundColor DarkGray
      } while ($st -notin @('Succeeded','Failed','Cancelled') -and $waited -lt $maxWait)
      if ($st -eq 'Failed') {
        Write-Host "==> Operation failed:" -ForegroundColor Red
        Write-Host ($opStatus | ConvertTo-Json -Depth 5)
        throw "Report creation failed."
      }
    }
  }

  Write-Host ""
  Write-Host "==> SUCCESS! Report created." -ForegroundColor Green
  Write-Host "  Report ID:   $($response.id)"
  Write-Host "  Name:        $ReportName"
  Write-Host "  URL:         https://app.powerbi.com/groups/$WorkspaceId/reports/$($response.id)"
} catch {
  if ($_.ErrorDetails.Message) {
    Write-Host "==> ERROR creating report:" -ForegroundColor Red
    Write-Host $_.ErrorDetails.Message
  } else {
    Write-Host "==> ERROR: $_" -ForegroundColor Red
  }
  throw
}

Write-Host ""
Write-Host "==> Report pages:" -ForegroundColor Cyan
Write-Host "  1. Adoption Overview     - DAU/MAU cards, login trends, by app/role"
Write-Host "  2. Student Demographics  - By market/grade/decile/SEN, mastery comparison"
Write-Host "  3. Skill Mastery         - Mastered/struggling, by domain/chapter/difficulty"
Write-Host "  4. AI Quality & Safety   - Latency, tokens, errors, feedback, safety blocks"
Write-Host "  5. Teacher Engagement    - Override rate, AI-human gap, questions"
