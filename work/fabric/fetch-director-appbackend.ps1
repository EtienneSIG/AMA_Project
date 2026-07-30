# Fetch the Director AppBackend definition and save its parts for inspection.
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
. (Join-Path $root 'FabricRest.ps1')
$ws = '127a12ab-fa94-421b-bee3-4f534264d3ff'
$id = 'f51f6c63-b942-4276-9baf-af7f45e2f13c'

# Try the generic items getDefinition first.
$def = $null
foreach ($seg in @('items','appBackends','AppBackends')) {
  try {
    Write-Output "Trying getDefinition via /$seg ..."
    $def = Invoke-FabricLRO -Method Post -Path "/workspaces/$ws/$seg/$id/getDefinition"
    if ($def) { Write-Output "OK via /$seg"; break }
  } catch {
    Write-Output ("  failed /$seg : " + $_.Exception.Message)
  }
}
if (-not $def) { Write-Output 'NO DEFINITION RETRIEVED'; return }
$outDir = Join-Path $root 'director-appbackend'
Save-FabricParts -Definition $def -OutDir $outDir | Out-Null
Write-Output "PARTS:"
$def.definition.parts | ForEach-Object { Write-Output ("  " + $_.path) }
