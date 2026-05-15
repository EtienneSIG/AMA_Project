<#
.SYNOPSIS
  Deploy the LearnEU Adoption & Student Level semantic model to Microsoft Fabric.
.DESCRIPTION
  Creates a Direct Lake semantic model in the EUlearn workspace via Fabric REST API.
  The model sits on top of the PostgreSQL-mirrored lakehouse tables and provides:
    - Platform adoption KPIs (DAU, MAU, retention, feature usage)
    - Student level classification (by age_group, gender, market, grade, decile, SEN)
    - Skill mastery progression and teacher engagement metrics
.PARAMETER WorkspaceId
  The Fabric workspace ID (EUlearn workspace).
.PARAMETER LakehouseId
  The lakehouse containing mirrored Postgres tables.
.PARAMETER ModelName
  Name for the semantic model. Default: "LearnEU - Adoption & Student Level".
.EXAMPLE
  .\deploy_semantic_model.ps1
  .\deploy_semantic_model.ps1 -ModelName "LearnEU Analytics"
#>
[CmdletBinding()]
param(
  [string]$WorkspaceId  = '127a12ab-fa94-421b-bee3-4f534264d3ff',
  [string]$LakehouseId  = 'a4e67934-17d0-43ea-b522-f4e11885d7a5',
  [string]$MirroredDbId = '3e34ce1e-a283-4a58-bc04-425e4654c571',
  [string]$ModelName    = 'LearnEU - Adoption & Student Level'
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
# 2. Get the SQL endpoint connection string for the mirrored database
# ---------------------------------------------------------------------------
Write-Host "==> Resolving mirrored database SQL endpoint..." -ForegroundColor Cyan
$mirrorUrl = "https://api.fabric.microsoft.com/v1/workspaces/$WorkspaceId/mirroredDatabases/$MirroredDbId"
$mirror = Invoke-RestMethod -Uri $mirrorUrl -Headers $headers -Method Get
$sqlEndpoint = $mirror.properties.sqlEndpointProperties.connectionString
$dbName = $mirror.displayName
Write-Host "  SQL Endpoint: $sqlEndpoint"
Write-Host "  Database:     $dbName"
Write-Host "  Schema:       _public (Postgres public -> Fabric _public)"

# ---------------------------------------------------------------------------
# 3. Build the model.bim (bare Database object — NOT a TMSL command envelope)
#    Direct Lake mode: partitions use type="entity" + expressionSource reference
# ---------------------------------------------------------------------------
Write-Host "==> Building semantic model definition (Direct Lake)..." -ForegroundColor Cyan

# Helper to build a Direct Lake partition source
function New-DLPartition([string]$Name, [string]$EntityName) {
  @{
    name   = $Name
    mode   = "directLake"
    source = @{
      type             = "entity"
      entityName       = $EntityName
      schemaName       = "_public"
      expressionSource = "DatabaseQuery"
    }
  }
}

# Helper to build a column definition with sourceLineageTag
function New-Col {
  param(
    [string]$Name,
    [string]$DataType = "string",
    [string]$SummarizeBy = "none",
    [bool]$IsHidden = $false,
    [bool]$IsKey = $false
  )
  $col = @{
    name             = $Name
    dataType         = $DataType
    sourceColumn     = $Name
    sourceLineageTag = $Name
    summarizeBy      = $SummarizeBy
  }
  if ($IsHidden) { $col.isHidden = $true }
  if ($IsKey)    { $col.isKey = $true }
  $col
}

$modelBim = @{
  compatibilityLevel = 1604
  model = @{
    culture = "en-US"
    defaultPowerBIDataSourceVersion = "powerBI_V3"

    # --- SHARED EXPRESSION (data source for Direct Lake) ---
    expressions = @(
      @{
        name       = "DatabaseQuery"
        kind       = "m"
        expression = @(
          "let"
          "    database = Sql.Database(""$sqlEndpoint"", ""$dbName"")"
          "in"
          "    database"
        )
      }
    )

    # --- TABLES ---
    tables = @(
      # ===================== DIMENSION: Learners =====================
      # NOTE: age_group, gender, email columns will be available after applying
      # add_demographics.sql to Postgres. Until then, only base columns are used.
      @{
        name             = "Learners"
        sourceLineageTag = "[_public].[learners]"
        columns = @(
          (New-Col -Name "learner_id" -IsKey $true)
          (New-Col -Name "pseudonym")
          (New-Col -Name "market")
          (New-Col -Name "grade" -DataType "int64")
          (New-Col -Name "decile" -DataType "int64")
          (New-Col -Name "sen" -DataType "boolean")
        )
        partitions = @( (New-DLPartition -Name "learners-partition" -EntityName "learners") )
        hierarchies = @(
          @{
            name = "Socio-Economic"
            levels = @(
              @{ name = "Market"; ordinal = 0; column = "market" }
              @{ name = "Decile"; ordinal = 1; column = "decile" }
              @{ name = "SEN"; ordinal = 2; column = "sen" }
            )
          }
        )
      }

      # ===================== DIMENSION: Skills =====================
      @{
        name             = "Skills"
        sourceLineageTag = "[_public].[skills]"
        columns = @(
          (New-Col -Name "id" -IsKey $true)
          (New-Col -Name "label")
          (New-Col -Name "domain")
          (New-Col -Name "chapter")
          (New-Col -Name "difficulty" -DataType "double" -SummarizeBy "average")
          (New-Col -Name "bloom")
        )
        partitions = @( (New-DLPartition -Name "skills-partition" -EntityName "skills") )
        hierarchies = @(
          @{
            name = "Skill Taxonomy"
            levels = @(
              @{ name = "Domain"; ordinal = 0; column = "domain" }
              @{ name = "Chapter"; ordinal = 1; column = "chapter" }
              @{ name = "Skill"; ordinal = 2; column = "label" }
            )
          }
        )
      }

      # ===================== DIMENSION: Curricula =====================
      @{
        name             = "Curricula"
        sourceLineageTag = "[_public].[curricula]"
        columns = @(
          (New-Col -Name "id" -IsKey $true)
          (New-Col -Name "country")
          (New-Col -Name "framework")
          (New-Col -Name "grade" -DataType "int64")
          (New-Col -Name "subject")
          (New-Col -Name "title")
        )
        partitions = @( (New-DLPartition -Name "curricula-partition" -EntityName "curricula") )
      }

      # ===================== FACT: Connection Logs (Adoption) =====================
      @{
        name             = "Connection Logs"
        sourceLineageTag = "[_public].[connection_logs]"
        columns = @(
          (New-Col -Name "id" -DataType "int64" -IsKey $true)
          (New-Col -Name "email" -IsHidden $true)
          (New-Col -Name "role")
          (New-Col -Name "app")
          (New-Col -Name "event")
          (New-Col -Name "created_at" -DataType "dateTime")
        )
        partitions = @( (New-DLPartition -Name "connection-logs-partition" -EntityName "connection_logs") )
        measures = @(
          @{ name = "Total Logins"; expression = 'COUNTROWS(FILTER(''Connection Logs'', ''Connection Logs''[event] = "login"))' }
          @{ name = "Unique Users (Login)"; expression = 'DISTINCTCOUNT(''Connection Logs''[email])' }
          @{ name = "Login Failure Rate"; expression = 'DIVIDE(COUNTROWS(FILTER(''Connection Logs'', ''Connection Logs''[event] = "login_failed")), COUNTROWS(''Connection Logs''), 0)'; formatString = "0.00%" }
          @{ name = "DAU"; expression = 'CALCULATE(DISTINCTCOUNT(''Connection Logs''[email]), ''Connection Logs''[event] = "login", FILTER(ALL(''Connection Logs''[created_at]), ''Connection Logs''[created_at] >= TODAY()))' }
          @{ name = "MAU"; expression = 'CALCULATE(DISTINCTCOUNT(''Connection Logs''[email]), ''Connection Logs''[event] = "login", FILTER(ALL(''Connection Logs''[created_at]), ''Connection Logs''[created_at] >= EDATE(TODAY(), -1)))' }
          @{ name = "Stickiness (DAU/MAU)"; expression = "DIVIDE([DAU], [MAU], 0)"; formatString = "0.0%" }
        )
      }

      # ===================== FACT: Ask History (AI Usage) =====================
      @{
        name             = "Ask History"
        sourceLineageTag = "[_public].[ask_history]"
        columns = @(
          (New-Col -Name "id" -DataType "int64" -IsKey $true)
          (New-Col -Name "email" -IsHidden $true)
          (New-Col -Name "role")
          (New-Col -Name "app")
          (New-Col -Name "model")
          (New-Col -Name "prompt_tokens" -DataType "int64" -SummarizeBy "sum")
          (New-Col -Name "completion_tokens" -DataType "int64" -SummarizeBy "sum")
          (New-Col -Name "total_tokens" -DataType "int64" -SummarizeBy "sum")
          (New-Col -Name "latency_ms" -DataType "int64" -SummarizeBy "average")
          (New-Col -Name "status" -DataType "int64")
          (New-Col -Name "created_at" -DataType "dateTime")
        )
        partitions = @( (New-DLPartition -Name "ask-history-partition" -EntityName "ask_history") )
        measures = @(
          @{ name = "Total AI Prompts"; expression = "COUNTROWS('Ask History')" }
          @{ name = "AI Active Users"; expression = "DISTINCTCOUNT('Ask History'[email])" }
          @{ name = "Avg Latency (ms)"; expression = "AVERAGE('Ask History'[latency_ms])"; formatString = "#,##0" }
          @{ name = "P95 Latency (ms)"; expression = "PERCENTILE.INC('Ask History'[latency_ms], 0.95)"; formatString = "#,##0" }
          @{ name = "AI Error Rate"; expression = 'DIVIDE(COUNTROWS(FILTER(''Ask History'', ''Ask History''[status] >= 400)), COUNTROWS(''Ask History''), 0)'; formatString = "0.00%" }
          @{ name = "Total Tokens Used"; expression = "SUM('Ask History'[total_tokens])"; formatString = "#,##0" }
          @{ name = "Prompts Per Active User"; expression = "DIVIDE([Total AI Prompts], [AI Active Users], 0)"; formatString = "#,##0.0" }
        )
      }

      # ===================== FACT: Item Attempts (Learning) =====================
      @{
        name             = "Item Attempts"
        sourceLineageTag = "[_public].[item_attempts]"
        columns = @(
          (New-Col -Name "id" -DataType "int64" -IsKey $true)
          (New-Col -Name "email" -IsHidden $true)
          (New-Col -Name "pseudonym")
          (New-Col -Name "item_id")
          (New-Col -Name "difficulty" -DataType "double" -SummarizeBy "average")
          (New-Col -Name "predicted" -DataType "double" -SummarizeBy "average")
          (New-Col -Name "correct" -DataType "boolean")
          (New-Col -Name "latency_ms" -DataType "int64" -SummarizeBy "average")
          (New-Col -Name "created_at" -DataType "dateTime")
        )
        partitions = @( (New-DLPartition -Name "item-attempts-partition" -EntityName "item_attempts") )
        measures = @(
          @{ name = "Total Attempts"; expression = "COUNTROWS('Item Attempts')" }
          @{ name = "Correct Attempts"; expression = "COUNTROWS(FILTER('Item Attempts', 'Item Attempts'[correct] = TRUE()))" }
          @{ name = "Correctness Rate"; expression = "DIVIDE([Correct Attempts], [Total Attempts], 0)"; formatString = "0.0%" }
          @{ name = "Active Learners"; expression = "DISTINCTCOUNT('Item Attempts'[email])" }
          @{ name = "Avg Item Difficulty"; expression = "AVERAGE('Item Attempts'[difficulty])"; formatString = "0.00" }
          @{ name = "Attempts Per Learner"; expression = "DIVIDE([Total Attempts], [Active Learners], 0)"; formatString = "#,##0.0" }
        )
      }

      # ===================== FACT: Skill Mastery (Level Snapshot) =====================
      @{
        name             = "Skill Mastery"
        sourceLineageTag = "[_public].[skill_mastery]"
        columns = @(
          (New-Col -Name "email" -IsHidden $true)
          (New-Col -Name "skill_id")
          (New-Col -Name "attempts" -DataType "int64" -SummarizeBy "sum")
          (New-Col -Name "correct" -DataType "int64" -SummarizeBy "sum")
          (New-Col -Name "level" -DataType "double" -SummarizeBy "average")
          (New-Col -Name "last_seen" -DataType "dateTime")
          (New-Col -Name "updated_at" -DataType "dateTime")
        )
        partitions = @( (New-DLPartition -Name "skill-mastery-partition" -EntityName "skill_mastery") )
        measures = @(
          @{ name = "Avg Mastery Level"; expression = "AVERAGE('Skill Mastery'[level])"; formatString = "0.0%" }
          @{ name = "Mastered Skills (>80%)"; expression = "COUNTROWS(FILTER('Skill Mastery', 'Skill Mastery'[level] >= 0.8))" }
          @{ name = "Struggling Skills (<30%)"; expression = "COUNTROWS(FILTER('Skill Mastery', 'Skill Mastery'[level] < 0.3))" }
          @{ name = "Skills Attempted"; expression = "COUNTROWS('Skill Mastery')" }
          @{ name = "Skill Accuracy Rate"; expression = "DIVIDE(SUM('Skill Mastery'[correct]), SUM('Skill Mastery'[attempts]), 0)"; formatString = "0.0%" }
        )
      }

      # ===================== FACT: Learner Activity (Daily Rollup) =====================
      @{
        name             = "Learner Activity"
        sourceLineageTag = "[_public].[learner_activity]"
        columns = @(
          (New-Col -Name "email" -IsHidden $true)
          (New-Col -Name "day" -DataType "dateTime")
          (New-Col -Name "attempts" -DataType "int64" -SummarizeBy "sum")
          (New-Col -Name "correct" -DataType "int64" -SummarizeBy "sum")
        )
        partitions = @( (New-DLPartition -Name "learner-activity-partition" -EntityName "learner_activity") )
        measures = @(
          @{ name = "Daily Active Learners"; expression = "DISTINCTCOUNT('Learner Activity'[email])" }
          @{ name = "Daily Attempts Total"; expression = "SUM('Learner Activity'[attempts])" }
          @{ name = "Daily Correctness"; expression = "DIVIDE(SUM('Learner Activity'[correct]), SUM('Learner Activity'[attempts]), 0)"; formatString = "0.0%" }
          @{ name = "Avg Attempts Per Day"; expression = "AVERAGE('Learner Activity'[attempts])"; formatString = "#,##0.0" }
        )
      }

      # ===================== FACT: Ask Feedback =====================
      @{
        name             = "Ask Feedback"
        sourceLineageTag = "[_public].[ask_feedback]"
        columns = @(
          (New-Col -Name "id" -DataType "int64" -IsKey $true)
          (New-Col -Name "ask_id" -DataType "int64")
          (New-Col -Name "email" -IsHidden $true)
          (New-Col -Name "rating")
          (New-Col -Name "created_at" -DataType "dateTime")
        )
        partitions = @( (New-DLPartition -Name "ask-feedback-partition" -EntityName "ask_feedback") )
        measures = @(
          @{ name = "Total Feedback"; expression = "COUNTROWS('Ask Feedback')" }
          @{ name = "Helpful Rate"; expression = 'DIVIDE(COUNTROWS(FILTER(''Ask Feedback'', ''Ask Feedback''[rating] = "helpful")), COUNTROWS(''Ask Feedback''), 0)'; formatString = "0.0%" }
          @{ name = "Confusing Rate"; expression = 'DIVIDE(COUNTROWS(FILTER(''Ask Feedback'', ''Ask Feedback''[rating] = "confusing")), COUNTROWS(''Ask Feedback''), 0)'; formatString = "0.0%" }
        )
      }

      # ===================== FACT: Content Safety =====================
      @{
        name             = "Content Safety"
        sourceLineageTag = "[_public].[content_safety_results]"
        columns = @(
          (New-Col -Name "id" -DataType "int64" -IsKey $true)
          (New-Col -Name "email" -IsHidden $true)
          (New-Col -Name "app")
          (New-Col -Name "direction")
          (New-Col -Name "blocked" -DataType "boolean")
          (New-Col -Name "hate" -DataType "int64" -SummarizeBy "average")
          (New-Col -Name "self_harm" -DataType "int64" -SummarizeBy "average")
          (New-Col -Name "sexual" -DataType "int64" -SummarizeBy "average")
          (New-Col -Name "violence" -DataType "int64" -SummarizeBy "average")
          (New-Col -Name "created_at" -DataType "dateTime")
        )
        partitions = @( (New-DLPartition -Name "content-safety-partition" -EntityName "content_safety_results") )
        measures = @(
          @{ name = "Total Safety Scans"; expression = "COUNTROWS('Content Safety')" }
          @{ name = "Block Rate"; expression = "DIVIDE(COUNTROWS(FILTER('Content Safety', 'Content Safety'[blocked] = TRUE())), COUNTROWS('Content Safety'), 0)"; formatString = "0.0%" }
        )
      }

      # ===================== FACT: Teacher Overrides (AI Act Art.14) =====================
      @{
        name             = "Teacher Overrides"
        sourceLineageTag = "[_public].[teacher_overrides]"
        columns = @(
          (New-Col -Name "id" -DataType "int64" -IsKey $true)
          (New-Col -Name "teacher_email" -IsHidden $true)
          (New-Col -Name "learner_email" -IsHidden $true)
          (New-Col -Name "skill_id")
          (New-Col -Name "ai_level" -DataType "double" -SummarizeBy "average")
          (New-Col -Name "human_level" -DataType "double" -SummarizeBy "average")
          (New-Col -Name "created_at" -DataType "dateTime")
        )
        partitions = @( (New-DLPartition -Name "teacher-overrides-partition" -EntityName "teacher_overrides") )
        measures = @(
          @{ name = "Total Overrides"; expression = "COUNTROWS('Teacher Overrides')" }
          @{ name = "Override Rate"; expression = "DIVIDE(COUNTROWS('Teacher Overrides'), COUNTROWS('Skill Mastery'), 0)"; formatString = "0.0%" }
          @{ name = "Avg AI vs Human Gap"; expression = "AVERAGE('Teacher Overrides'[human_level]) - AVERAGE('Teacher Overrides'[ai_level])"; formatString = "0.00" }
        )
      }

      # ===================== FACT: Teacher Questions =====================
      @{
        name             = "Teacher Questions"
        sourceLineageTag = "[_public].[teacher_questions]"
        columns = @(
          (New-Col -Name "id" -IsKey $true)
          (New-Col -Name "learner_email" -IsHidden $true)
          (New-Col -Name "subject")
          (New-Col -Name "status")
          (New-Col -Name "teacher_email" -IsHidden $true)
          (New-Col -Name "created_at" -DataType "dateTime")
          (New-Col -Name "answered_at" -DataType "dateTime")
        )
        partitions = @( (New-DLPartition -Name "teacher-questions-partition" -EntityName "teacher_questions") )
        measures = @(
          @{ name = "Total Questions"; expression = "COUNTROWS('Teacher Questions')" }
          @{ name = "Questions Answered"; expression = 'COUNTROWS(FILTER(''Teacher Questions'', ''Teacher Questions''[status] = "answered"))' }
          @{ name = "Answer Rate"; expression = "DIVIDE([Questions Answered], [Total Questions], 0)"; formatString = "0.0%" }
        )
      }

      # ===================== BRIDGE: Item Skills =====================
      @{
        name             = "Item Skills"
        sourceLineageTag = "[_public].[item_skills]"
        columns = @(
          (New-Col -Name "item_id")
          (New-Col -Name "skill_id")
        )
        partitions = @( (New-DLPartition -Name "item-skills-partition" -EntityName "item_skills") )
      }

      # ===================== BRIDGE: Skill Competency Map =====================
      @{
        name             = "Skill Competency Map"
        sourceLineageTag = "[_public].[skill_competency_map]"
        columns = @(
          (New-Col -Name "skill_id")
          (New-Col -Name "competency_id")
          (New-Col -Name "weight" -DataType "double" -SummarizeBy "average")
        )
        partitions = @( (New-DLPartition -Name "skill-competency-partition" -EntityName "skill_competency_map") )
      }
    ) # end tables

    # --- RELATIONSHIPS ---
    # NOTE: Learner dimension relationships via email are commented out until
    # add_demographics.sql is applied to Postgres (adds email column to learners).
    # Until then, Item Attempts links to Learners via pseudonym.
    relationships = @(
      # Learners ← Item Attempts (via pseudonym — available now)
      @{
        name = "Learner_to_ItemAttempts"
        fromTable = "Item Attempts"; fromColumn = "pseudonym"
        toTable = "Learners"; toColumn = "pseudonym"
      }
      # Skills ← Skill Mastery
      @{
        name = "Skill_to_SkillMastery"
        fromTable = "Skill Mastery"; fromColumn = "skill_id"
        toTable = "Skills"; toColumn = "id"
      }
      # Skills ← Item Skills (bridge)
      @{
        name = "Skill_to_ItemSkills"
        fromTable = "Item Skills"; fromColumn = "skill_id"
        toTable = "Skills"; toColumn = "id"
      }
      # Item Attempts → Item Skills (bridge, via item_id — bi-directional for drill-through)
      @{
        name = "ItemAttempts_to_ItemSkills"
        fromTable = "Item Attempts"; fromColumn = "item_id"
        toTable = "Item Skills"; toColumn = "item_id"
        crossFilteringBehavior = "bothDirections"
      }
      # Skills ← Teacher Overrides
      @{
        name = "Skill_to_TeacherOverrides"
        fromTable = "Teacher Overrides"; fromColumn = "skill_id"
        toTable = "Skills"; toColumn = "id"
      }
      # Skills ← Skill Competency Map
      @{
        name = "Skill_to_CompetencyMap"
        fromTable = "Skill Competency Map"; fromColumn = "skill_id"
        toTable = "Skills"; toColumn = "id"
      }
      # Curricula ← Skill Competency Map
      @{
        name = "Curricula_to_CompetencyMap"
        fromTable = "Skill Competency Map"; fromColumn = "competency_id"
        toTable = "Curricula"; toColumn = "id"
      }
    ) # end relationships

    # --- ANNOTATIONS ---
    annotations = @(
      @{ name = "PBI_Description"; value = "LearnEU platform adoption and student level analytics. Tracks DAU/MAU, feature usage, skill mastery progression, and learner demographics (age, gender, market, SEN, decile). Built on Postgres CDC mirroring into Fabric lakehouse (Direct Lake)." }
    )
  } # end model
} # end modelBim

# ---------------------------------------------------------------------------
# 4. Build definition.pbism (required metadata file for the API)
# ---------------------------------------------------------------------------
$pbism = @{
  '$schema' = "https://developer.microsoft.com/json-schemas/fabric/item/semanticModel/definitionProperties/1.0.0/schema.json"
  version   = "1.0"
  settings  = @{ qnaEnabled = $false }
} | ConvertTo-Json -Depth 5 -Compress

# ---------------------------------------------------------------------------
# 5. Create the semantic model via Fabric REST API
# ---------------------------------------------------------------------------
Write-Host "==> Creating semantic model '$ModelName' in workspace $WorkspaceId..." -ForegroundColor Cyan

$modelBimJson = $modelBim | ConvertTo-Json -Depth 20 -Compress
$body = @{
  displayName = $ModelName
  description = "Platform adoption & student level analytics for the LearnEU EdTech platform. Tracks usage, engagement, skill mastery, and learner demographics. Direct Lake mode over Postgres-mirrored lakehouse."
  definition  = @{
    parts = @(
      @{
        path        = "model.bim"
        payload     = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($modelBimJson))
        payloadType = "InlineBase64"
      }
      @{
        path        = "definition.pbism"
        payload     = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($pbism))
        payloadType = "InlineBase64"
      }
    )
  }
} | ConvertTo-Json -Depth 20 -Compress

$createUrl = "https://api.fabric.microsoft.com/v1/workspaces/$WorkspaceId/semanticModels"
try {
  $response = Invoke-RestMethod -Uri $createUrl -Headers $headers -Method Post -Body $body -StatusCodeVariable 'statusCode' -ResponseHeadersVariable 'respHeaders'

  # Handle 202 Accepted (long-running operation)
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
        throw "Semantic model creation failed."
      }
    } else {
      Write-Host "  No operation URL returned; checking workspace for model..." -ForegroundColor Yellow
      Start-Sleep -Seconds 10
    }
  }

  Write-Host ""
  Write-Host "==> SUCCESS! Semantic model created." -ForegroundColor Green
  Write-Host "  Model ID:    $($response.id)"
  Write-Host "  Name:        $ModelName"
  Write-Host "  Workspace:   $WorkspaceId"
  Write-Host ""
  Write-Host "==> Next steps:" -ForegroundColor Yellow
  Write-Host "  1. Open the model in Fabric portal and verify relationships"
  Write-Host "  2. Refresh the model to load Direct Lake metadata"
  Write-Host "  3. Create a Power BI report connected to this semantic model"
  Write-Host "  4. Design report pages for:"
  Write-Host "       - Adoption Overview (DAU/MAU, stickiness, logins by app/role)"
  Write-Host "       - Student Demographics (mastery by age group, gender, market, SEN)"
  Write-Host "       - Skill Mastery Progression (struggling vs mastered, by chapter)"
  Write-Host "       - AI Quality & Safety (latency, errors, blocks, feedback)"
  Write-Host "       - Teacher Engagement (overrides, question response time)"
} catch {
  $errResp = $_.Exception.Response
  if ($errResp -and $errResp.Content) {
    $errBody = $errResp.Content.ReadAsStringAsync().Result
    Write-Host "==> ERROR creating semantic model:" -ForegroundColor Red
    Write-Host $errBody
  } elseif ($_.ErrorDetails.Message) {
    Write-Host "==> ERROR creating semantic model:" -ForegroundColor Red
    Write-Host $_.ErrorDetails.Message
  } else {
    Write-Host "==> ERROR: $_" -ForegroundColor Red
  }
  throw
}

Write-Host ""
Write-Host "==> Model structure summary:" -ForegroundColor Cyan
Write-Host "  DIMENSIONS:"
Write-Host "    - Learners (market, grade, age_group, gender, decile, SEN)"
Write-Host "    - Skills (domain, chapter, difficulty, bloom)"
Write-Host "    - Curricula (country, framework, subject, grade)"
Write-Host "  FACTS:"
Write-Host "    - Connection Logs (adoption events)"
Write-Host "    - Ask History (AI interactions)"
Write-Host "    - Item Attempts (learning events)"
Write-Host "    - Skill Mastery (level snapshots)"
Write-Host "    - Learner Activity (daily rollups)"
Write-Host "    - Ask Feedback (quality signals)"
Write-Host "    - Content Safety (moderation)"
Write-Host "    - Teacher Overrides (human oversight)"
Write-Host "    - Teacher Questions (support)"
Write-Host "  BRIDGES:"
Write-Host "    - Item Skills (items <-> skills)"
Write-Host "    - Skill Competency Map (skills <-> curricula)"
Write-Host "  HIERARCHIES:"
Write-Host "    - Demographics: Market > Age Group > Gender"
Write-Host "    - Socio-Economic: Market > Decile > SEN"
Write-Host "    - Skill Taxonomy: Domain > Chapter > Skill"
Write-Host "  MEASURES (35 total):"
Write-Host "    - Adoption: DAU, MAU, Stickiness, Login Failure Rate, Unique Users"
Write-Host "    - AI Usage: Prompts, Tokens, Latency (avg/P95), Error Rate, Per-User"
Write-Host "    - Learning: Attempts, Correctness, Difficulty, Active Learners"
Write-Host "    - Mastery: Avg Level, Mastered/Struggling counts, Accuracy"
Write-Host "    - Quality: Feedback rates, Safety block rate"
Write-Host "    - Oversight: Override rate, AI-Human gap, Question answer rate"
