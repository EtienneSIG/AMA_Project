[CmdletBinding()]
param(
  [string]$WorkspaceId   = '127a12ab-fa94-421b-bee3-4f534264d3ff',
  [string]$ModelName     = 'LearnEU - Director Reporting (Postgres VNG)',
  [string]$PgServer      = 'pg-learneu-demo.postgres.database.azure.com',
  [string]$PgDatabase    = 'learneu',
  [string]$PgSchema      = 'public',
  [string]$GatewayId     = 'c156c9d4-1cd3-4082-999f-6de7ae9b3c50',
  [string]$DatasourceId  = '1a26851b-13d2-4b6e-9a8b-cd84be841fbc'
)

$ErrorActionPreference = 'Stop'

Write-Host "==> Authenticating to Power BI/Fabric..." -ForegroundColor Cyan
$token = (az account get-access-token --resource "https://analysis.windows.net/powerbi/api" --query accessToken -o tsv)
if (-not $token) { throw "Failed to get access token. Run 'az login' first." }
$headers = @{ Authorization = "Bearer $token"; 'Content-Type' = 'application/json' }

function New-Col {
  param(
    [string]$Name,
    [string]$DataType = 'string',
    [string]$SummarizeBy = 'none',
    [bool]$IsKey = $false,
    [bool]$IsHidden = $false
  )
  $c = @{ name=$Name; dataType=$DataType; sourceColumn=$Name; summarizeBy=$SummarizeBy }
  if ($IsKey) { $c.isKey = $true }
  if ($IsHidden) { $c.isHidden = $true }
  return $c
}

function New-PgImportPartition {
  param([string]$Name, [string]$TableName)

  $sql = "select * from $PgSchema.$TableName"
  return @{
    name = $Name
    mode = 'import'
    source = @{
      type = 'm'
      expression = @(
        'let',
        "    Source = AzurePostgreSQL.Database(""$PgServer"", ""$PgDatabase""),",
        "    Data = Value.NativeQuery(Source, ""$sql"")",
        'in',
        '    Data'
      )
    }
  }
}

Write-Host "==> Building PostgreSQL-backed semantic model definition..." -ForegroundColor Cyan
$modelBim = @{
  compatibilityLevel = 1604
  model = @{
    culture = 'en-US'
    defaultPowerBIDataSourceVersion = 'powerBI_V3'
    tables = @(
      @{
        name = 'Learners'
        columns = @(
          (New-Col -Name 'learner_id' -IsKey $true)
          (New-Col -Name 'pseudonym')
          (New-Col -Name 'market')
          (New-Col -Name 'grade' -DataType 'int64')
          (New-Col -Name 'decile' -DataType 'int64')
          (New-Col -Name 'sen' -DataType 'boolean')
        )
        partitions = @((New-PgImportPartition -Name 'learners-import' -TableName 'learners'))
      },
      @{
        name = 'Item Attempts'
        columns = @(
          (New-Col -Name 'id' -DataType 'int64' -IsKey $true)
          (New-Col -Name 'email' -IsHidden $true)
          (New-Col -Name 'pseudonym')
          (New-Col -Name 'item_id')
          (New-Col -Name 'difficulty' -DataType 'double' -SummarizeBy 'average')
          (New-Col -Name 'predicted' -DataType 'double' -SummarizeBy 'average')
          (New-Col -Name 'correct' -DataType 'boolean')
          (New-Col -Name 'latency_ms' -DataType 'int64' -SummarizeBy 'average')
          (New-Col -Name 'created_at' -DataType 'dateTime')
        )
        partitions = @((New-PgImportPartition -Name 'item-attempts-import' -TableName 'item_attempts'))
        measures = @(
          @{ name='Total Attempts'; expression="COUNTROWS('Item Attempts')" }
          @{ name='Correct Attempts'; expression="COUNTROWS(FILTER('Item Attempts', 'Item Attempts'[correct] = TRUE()))" }
          @{ name='Correctness Rate'; expression='DIVIDE([Correct Attempts], [Total Attempts], 0)'; formatString='0.0%' }
          @{ name='National Correctness Rate'; expression='CALCULATE([Correctness Rate], REMOVEFILTERS(''Hierarchy Assignments''), REMOVEFILTERS(''Learners''))'; formatString='0.0%' }
          @{ name='Delta vs National (pts)'; expression='VAR establishmentRate = [Correctness Rate] VAR nationalRate = [National Correctness Rate] RETURN IF(OR(ISBLANK(establishmentRate), ISBLANK(nationalRate)), BLANK(), ROUND((establishmentRate - nationalRate) * 100, 1))'; formatString='0.0' }
          @{ name='Recent Trend (pts)'; expression='VAR recentRate = CALCULATE([Correctness Rate], FILTER(ALL(''Item Attempts''[created_at]), DATEVALUE(''Item Attempts''[created_at]) >= TODAY() - 6)) VAR priorRate = CALCULATE([Correctness Rate], FILTER(ALL(''Item Attempts''[created_at]), DATEVALUE(''Item Attempts''[created_at]) >= TODAY() - 13 && DATEVALUE(''Item Attempts''[created_at]) < TODAY() - 6)) RETURN IF(OR(ISBLANK(recentRate), ISBLANK(priorRate)), BLANK(), ROUND((recentRate - priorRate) * 100, 1))'; formatString='0.0' }
        )
      },
      @{
        name = 'Director Profiles'
        columns = @(
          (New-Col -Name 'director_subject_id' -IsKey $true)
          (New-Col -Name 'director_email')
          (New-Col -Name 'display_name')
          (New-Col -Name 'primary_school_id')
          (New-Col -Name 'primary_region_id')
          (New-Col -Name 'status')
          (New-Col -Name 'created_at' -DataType 'dateTime')
        )
        partitions = @((New-PgImportPartition -Name 'director-profile-import' -TableName 'director_profile'))
      },
      @{
        name = 'Reporting Scope'
        columns = @(
          (New-Col -Name 'id' -DataType 'int64' -IsKey $true)
          (New-Col -Name 'director_subject_id')
          (New-Col -Name 'school_id')
          (New-Col -Name 'region_id')
          (New-Col -Name 'role')
          (New-Col -Name 'effective_from' -DataType 'dateTime')
          (New-Col -Name 'effective_to' -DataType 'dateTime')
          (New-Col -Name 'granted_by')
          (New-Col -Name 'granted_at' -DataType 'dateTime')
          (New-Col -Name 'status')
        )
        partitions = @((New-PgImportPartition -Name 'reporting-scope-import' -TableName 'reporting_scope'))
        measures = @(
          @{ name='Active Scope Grants'; expression='COUNTROWS(FILTER(''Reporting Scope'', ''Reporting Scope''[status] = "active"))' }
          @{ name='Directors With Scope'; expression="DISTINCTCOUNT('Reporting Scope'[director_subject_id])" }
        )
      },
      @{
        name = 'Hierarchy Assignments'
        columns = @(
          (New-Col -Name 'id' -DataType 'int64' -IsKey $true)
          (New-Col -Name 'learner_id')
          (New-Col -Name 'class_id')
          (New-Col -Name 'school_id')
          (New-Col -Name 'region_id')
          (New-Col -Name 'effective_from' -DataType 'dateTime')
          (New-Col -Name 'effective_to' -DataType 'dateTime')
          (New-Col -Name 'source_system')
          (New-Col -Name 'status')
          (New-Col -Name 'exception_flag' -DataType 'boolean')
          (New-Col -Name 'created_at' -DataType 'dateTime')
        )
        partitions = @((New-PgImportPartition -Name 'hierarchy-assignments-import' -TableName 'learner_hierarchy_assignment'))
        measures = @(
          @{ name='Hierarchy Rows'; expression="COUNTROWS('Hierarchy Assignments')" }
          @{ name='Assigned Learners'; expression="DISTINCTCOUNT('Hierarchy Assignments'[learner_id])" }
          @{ name='Exception Count'; expression='COUNTROWS(FILTER(''Hierarchy Assignments'', ''Hierarchy Assignments''[exception_flag] = TRUE()))' }
          @{ name='Hierarchy Exception Rate'; expression='DIVIDE(COUNTROWS(FILTER(''Hierarchy Assignments'', ''Hierarchy Assignments''[exception_flag] = TRUE())), COUNTROWS(''Hierarchy Assignments''), 0)'; formatString='0.0%' }
        )
      },
      @{
        name = 'Hierarchy Exceptions'
        columns = @(
          (New-Col -Name 'id' -DataType 'int64' -IsKey $true)
          (New-Col -Name 'learner_id')
          (New-Col -Name 'issue_type')
          (New-Col -Name 'issue_detail')
          (New-Col -Name 'severity')
          (New-Col -Name 'detected_at' -DataType 'dateTime')
          (New-Col -Name 'status')
          (New-Col -Name 'resolved_at' -DataType 'dateTime')
          (New-Col -Name 'resolved_by')
        )
        partitions = @((New-PgImportPartition -Name 'hierarchy-exceptions-import' -TableName 'hierarchy_exception'))
        measures = @(
          @{ name='Open Hierarchy Exceptions'; expression='COUNTROWS(FILTER(''Hierarchy Exceptions'', ''Hierarchy Exceptions''[status] = "open"))' }
          @{ name='High Severity Exceptions'; expression='COUNTROWS(FILTER(''Hierarchy Exceptions'', ''Hierarchy Exceptions''[severity] = "high" && ''Hierarchy Exceptions''[status] = "open"))' }
        )
      }
    )
    relationships = @(
      @{ name='Learner_to_ItemAttempts'; fromTable='Item Attempts'; fromColumn='pseudonym'; toTable='Learners'; toColumn='pseudonym' }
      @{ name='DirectorProfiles_to_ReportingScope'; fromTable='Reporting Scope'; fromColumn='director_subject_id'; toTable='Director Profiles'; toColumn='director_subject_id' }
      @{ name='Learners_to_HierarchyAssignments'; fromTable='Hierarchy Assignments'; fromColumn='learner_id'; toTable='Learners'; toColumn='pseudonym'; crossFilteringBehavior='bothDirections' }
    )
    annotations = @(
      @{ name='PBI_Description'; value='Director reporting semantic model sourced directly from Azure PostgreSQL through virtual network gateway connection vng-learneu-demo.' }
    )
  }
}

$pbism = @{
  '$schema' = 'https://developer.microsoft.com/json-schemas/fabric/item/semanticModel/definitionProperties/1.0.0/schema.json'
  version = '1.0'
  settings = @{ qnaEnabled = $false }
} | ConvertTo-Json -Depth 5 -Compress

$modelBimJson = $modelBim | ConvertTo-Json -Depth 25 -Compress
$body = @{
  displayName = $ModelName
  description = 'Director reporting semantic model backed by Azure PostgreSQL through VNet gateway connection.'
  definition = @{ parts = @(
      @{ path='model.bim'; payload=[Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($modelBimJson)); payloadType='InlineBase64' },
      @{ path='definition.pbism'; payload=[Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($pbism)); payloadType='InlineBase64' }
    ) }
} | ConvertTo-Json -Depth 30 -Compress

$createUri = "https://api.fabric.microsoft.com/v1/workspaces/$WorkspaceId/semanticModels"
Write-Host "==> Creating semantic model '$ModelName'..." -ForegroundColor Cyan
$response = Invoke-WebRequest -Uri $createUri -Headers $headers -Method Post -Body $body -UseBasicParsing

if ($response.StatusCode -eq 202) {
  $locationHeader = $response.Headers['Location']
  if (-not $locationHeader) { throw 'Semantic model create returned 202 but no polling URL.' }
  $pollUrl = if ($locationHeader -is [array]) { $locationHeader[0] } else { $locationHeader }

  $completed = $false
  for ($i = 1; $i -le 48; $i++) {
    Start-Sleep -Seconds 5
    $op = Invoke-RestMethod -Uri $pollUrl -Headers $headers -Method Get
    $status = [string]$op.status
    if ($status -in @('Succeeded','Completed')) {
      $completed = $true
      break
    }
    if ($status -in @('Failed','Cancelled')) {
      $details = $op | ConvertTo-Json -Depth 10
      throw "Semantic model create failed: $details"
    }
  }
  if (-not $completed) { throw 'Timed out waiting for semantic model creation.' }
} elseif ($response.StatusCode -ne 201) {
  throw "Unexpected create status: $($response.StatusCode)"
}

Write-Host '==> Resolving created semantic model id...' -ForegroundColor Cyan
$models = Invoke-RestMethod -Uri "https://api.fabric.microsoft.com/v1/workspaces/$WorkspaceId/semanticModels" -Headers $headers -Method Get
$model = $models.value | Where-Object { $_.displayName -eq $ModelName } | Select-Object -First 1
if (-not $model) { throw "Could not find created semantic model '$ModelName'." }
$modelId = $model.id
Write-Host "  Model id: $modelId" -ForegroundColor Green

Write-Host '==> Binding dataset to vng-learneu-demo gateway datasource...' -ForegroundColor Cyan
$bindBody = @{ gatewayObjectId=$GatewayId; datasourceObjectIds=@($DatasourceId) } | ConvertTo-Json -Depth 5
$bindUri = "https://api.powerbi.com/v1.0/myorg/groups/$WorkspaceId/datasets/$modelId/Default.BindToGateway"
Invoke-RestMethod -Uri $bindUri -Headers $headers -Method Post -Body $bindBody
Write-Host '  BindToGateway completed.' -ForegroundColor Green

Write-Host '==> Triggering first refresh...' -ForegroundColor Cyan
$refreshUri = "https://api.powerbi.com/v1.0/myorg/groups/$WorkspaceId/datasets/$modelId/refreshes"
Invoke-RestMethod -Uri $refreshUri -Headers $headers -Method Post -Body '{}'

$refreshCompleted = $false
for ($i = 1; $i -le 48; $i++) {
  Start-Sleep -Seconds 5
  $rh = Invoke-RestMethod -Uri ($refreshUri + '?$top=1') -Headers $headers -Method Get
  $state = [string]$rh.value[0].status
  if ($state -eq 'Completed') { $refreshCompleted = $true; break }
  if ($state -in @('Failed','Disabled','Cancelled')) {
    $details = $rh | ConvertTo-Json -Depth 12
    throw "Initial refresh failed: $details"
  }
}
if (-not $refreshCompleted) { throw 'Timed out waiting for first refresh.' }

Write-Host ''
Write-Host '==> SUCCESS' -ForegroundColor Green
Write-Host "ModelName: $ModelName"
Write-Host "ModelId:   $modelId"
Write-Host "Gateway:   $GatewayId"
Write-Host "Datasource:$DatasourceId"
