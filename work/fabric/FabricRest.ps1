# Reusable Fabric REST helpers (esig_tenant identity via az CLI).
# Dot-source: . .\work\fabric\FabricRest.ps1
$ErrorActionPreference = 'Stop'
$script:WS = '127a12ab-fa94-421b-bee3-4f534264d3ff'  # EULearn

function Get-FabricToken {
  az account get-access-token --resource "https://api.fabric.microsoft.com" --query accessToken -o tsv
}

function Invoke-FabricApi {
  param(
    [string]$Method = 'Get',
    [Parameter(Mandatory)][string]$Path,   # e.g. /workspaces/<ws>/items
    $Body
  )
  $tok = Get-FabricToken
  $headers = @{ Authorization = "Bearer $tok" }
  $uri = "https://api.fabric.microsoft.com/v1$Path"
  $jsonBody = if ($null -ne $Body) { ($Body | ConvertTo-Json -Depth 30) } else { $null }
  return Invoke-RestMethod -Uri $uri -Method $Method -Headers $headers -ContentType 'application/json' -Body $jsonBody
}

# Handles 200 (sync) and 202 (LRO poll) for POSTs like getDefinition / updateDefinition / create.
function Invoke-FabricLRO {
  param(
    [string]$Method = 'Post',
    [Parameter(Mandatory)][string]$Path,
    $Body
  )
  $tok = Get-FabricToken
  $headers = @{ Authorization = "Bearer $tok" }
  $uri = "https://api.fabric.microsoft.com/v1$Path"
  $jsonBody = if ($null -ne $Body) { ($Body | ConvertTo-Json -Depth 30) } else { '{}' }
  $resp = Invoke-WebRequest -Uri $uri -Method $Method -Headers $headers -ContentType 'application/json' -Body $jsonBody
  if ($resp.StatusCode -eq 200 -or $resp.StatusCode -eq 201) {
    if ($resp.Content) { return ($resp.Content | ConvertFrom-Json) } else { return $null }
  }
  $op = $resp.Headers['Location']; if ($op -is [array]) { $op = $op[0] }
  if (-not $op) { if ($resp.Content) { return ($resp.Content | ConvertFrom-Json) } else { return $null } }
  for ($i = 0; $i -lt 60; $i++) {
    Start-Sleep -Milliseconds 2000
    $tok = Get-FabricToken; $h = @{ Authorization = "Bearer $tok" }
    $st = Invoke-RestMethod -Uri $op -Headers $h
    if ($st.status -eq 'Succeeded') {
      try { return (Invoke-RestMethod -Uri "$op/result" -Headers $h -Method Get) } catch { return $st }
    }
    elseif ($st.status -eq 'Failed') { throw "LRO failed: $($st | ConvertTo-Json -Depth 8)" }
  }
  throw 'LRO timeout'
}

function Get-FabricDefinition {
  param([Parameter(Mandatory)][string]$ItemType, [Parameter(Mandatory)][string]$ItemId, [string]$Format)
  $q = if ($Format) { "?format=$Format" } else { '' }
  return Invoke-FabricLRO -Method Post -Path "/workspaces/$script:WS/$ItemType/$ItemId/getDefinition$q"
}

function Save-FabricParts {
  param([Parameter(Mandatory)]$Definition, [Parameter(Mandatory)][string]$OutDir)
  New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
  foreach ($p in $Definition.definition.parts) {
    $dest = Join-Path $OutDir $p.path
    New-Item -ItemType Directory -Force -Path (Split-Path $dest -Parent) | Out-Null
    if ($p.payloadType -eq 'InlineBase64') {
      [IO.File]::WriteAllBytes($dest, [Convert]::FromBase64String($p.payload))
    } else {
      Set-Content -Path $dest -Value $p.payload
    }
  }
  return $OutDir
}

# Build a definition parts array (InlineBase64) from every file under $Dir.
function Build-FabricParts {
  param([Parameter(Mandatory)][string]$Dir)
  $root = (Resolve-Path $Dir).Path
  $parts = @()
  foreach ($f in Get-ChildItem -Recurse -File $root) {
    $rel = $f.FullName.Substring($root.Length + 1).Replace('\','/')
    $bytes = [IO.File]::ReadAllBytes($f.FullName)
    $parts += [ordered]@{
      path        = $rel
      payload     = [Convert]::ToBase64String($bytes)
      payloadType = 'InlineBase64'
    }
  }
  return $parts
}

function Update-FabricDefinition {
  param(
    [Parameter(Mandatory)][string]$ItemType,  # e.g. semanticModels, reports
    [Parameter(Mandatory)][string]$ItemId,
    [Parameter(Mandatory)][string]$Dir
  )
  $parts = Build-FabricParts -Dir $Dir
  $body = @{ definition = @{ parts = $parts } }
  return Invoke-FabricLRO -Method Post -Path "/workspaces/$script:WS/$ItemType/$ItemId/updateDefinition" -Body $body
}

function New-FabricReport {
  param(
    [Parameter(Mandatory)][string]$DisplayName,
    [Parameter(Mandatory)][string]$Dir
  )
  $parts = Build-FabricParts -Dir $Dir
  $body = @{ displayName = $DisplayName; definition = @{ parts = $parts } }
  return Invoke-FabricLRO -Method Post -Path "/workspaces/$script:WS/reports" -Body $body
}

function New-FabricSemanticModel {
  param(
    [Parameter(Mandatory)][string]$DisplayName,
    [Parameter(Mandatory)][string]$Dir
  )
  $parts = Build-FabricParts -Dir $Dir
  $body = @{ displayName = $DisplayName; definition = @{ parts = $parts } }
  return Invoke-FabricLRO -Method Post -Path "/workspaces/$script:WS/semanticModels" -Body $body
}

# List items of a given type (e.g. reports, semanticModels) in the EULearn workspace.
function Get-FabricItems {
  param([string]$Type = 'items')
  return Invoke-FabricApi -Method Get -Path "/workspaces/$script:WS/$Type"
}
