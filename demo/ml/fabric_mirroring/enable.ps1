# ----------------------------------------------------------------------------
# Microsoft Fabric mirroring — post-deploy enablement helper.
# ----------------------------------------------------------------------------
# What this does:
#   1. Verifies the Postgres server is on a Fabric-supported tier (not Burstable).
#   2. Confirms System-Assigned Managed Identity is enabled.
#   3. Confirms wal_level=logical and azure_cdc is in shared_preload_libraries.
#   4. Calls `az postgres flexible-server fabric-mirroring start` for the demo db.
#   5. Prints the next step: "create fabric_user role with ml/fabric_mirroring/setup.sql".
#
# Prereqs:
#   - az login + az account set -s <sub>
#   - azd provision has run successfully (Bicep applied)
#
# Usage:
#   pwsh ml/fabric_mirroring/enable.ps1 \
#        -ResourceGroup rg-learneu-demo `
#        -ServerName    pg-learneu-demo `
#        -DatabaseName  learneu
# ----------------------------------------------------------------------------

[CmdletBinding()]
param(
  [string] $ResourceGroup = 'rg-learneu-demo',
  [string] $ServerName    = 'pg-learneu-demo',
  [string] $DatabaseName  = 'learneu'
)

$ErrorActionPreference = 'Stop'

Write-Host "==> Inspecting $ServerName ..." -ForegroundColor Cyan
$srv = az postgres flexible-server show -g $ResourceGroup -n $ServerName | ConvertFrom-Json
if (-not $srv) { throw "Server '$ServerName' not found in '$ResourceGroup'." }

# 1. Compute tier check
$tier = $srv.sku.tier
Write-Host "  SKU:           $($srv.sku.name) ($tier)"
if ($tier -eq 'Burstable') {
  Write-Warning "Burstable tier is NOT supported as a Fabric mirroring source."
  Write-Warning "Re-run 'azd provision' with fabricMirroringReady=true (default) to upgrade to GeneralPurpose."
}

# 2. SAMI check
$sami = $srv.identity
$samiState = if ($sami -and $sami.type -match 'SystemAssigned') { 'enabled' } else { 'DISABLED' }
Write-Host "  SAMI:          $samiState ($($sami.principalId))"
if ($samiState -ne 'enabled') {
  Write-Host "  Enabling system-assigned managed identity ..." -ForegroundColor Yellow
  az postgres flexible-server identity assign -g $ResourceGroup -s $ServerName --system-assigned Enabled | Out-Null
}

# 3. Server parameters
function Get-PgParam([string]$name) {
  (az postgres flexible-server parameter show -g $ResourceGroup -s $ServerName -n $name --query value -o tsv) 2>$null
}
$wal     = Get-PgParam 'wal_level'
$preload = Get-PgParam 'shared_preload_libraries'
$workers = Get-PgParam 'max_worker_processes'
$ext     = Get-PgParam 'azure.extensions'
Write-Host "  wal_level:                $wal"
Write-Host "  max_worker_processes:     $workers"
Write-Host "  shared_preload_libraries: $preload"
Write-Host "  azure.extensions:         $ext"
$ready = ($wal -eq 'logical')
if (-not $ready) {
  Write-Warning "wal_level is not 'logical'. Re-run 'azd provision' to apply it."
  exit 2
}

Write-Host "  (azure_cdc preload + extension allowlist will be set by 'fabric-mirroring start')" -ForegroundColor DarkGray

# 4. Start mirroring (calls the Azure CDC extension control plane)
Write-Host "==> Starting Fabric mirroring registration for db '$DatabaseName' ..." -ForegroundColor Cyan
az postgres flexible-server fabric-mirroring start `
  --resource-group $ResourceGroup `
  --server-name $ServerName `
  --database-names $DatabaseName `
  --yes
if ($LASTEXITCODE -ne 0) {
  Write-Warning "fabric-mirroring start failed. Check that the server has been restarted since shared_preload_libraries was changed."
  exit 3
}

Write-Host ""
Write-Host "==> Server is mirroring-ready. Next steps:" -ForegroundColor Green
Write-Host "  1. Create the fabric_user role on the database:"
Write-Host "       psql ""host=$($srv.fullyQualifiedDomainName) dbname=$DatabaseName user=$($srv.administratorLogin) sslmode=require"" \"
Write-Host "            -f ml/fabric_mirroring/setup.sql -v fabric_password='<strong-pwd>'"
Write-Host "  2. In the Fabric portal, create a new 'Mirrored Azure Database for PostgreSQL':"
Write-Host "       Server: $($srv.fullyQualifiedDomainName)"
Write-Host "       Database: $DatabaseName"
Write-Host "       Auth: Basic (username=fabric_user, password=<strong-pwd>)"
Write-Host "  3. Because the server uses a private endpoint, configure a Virtual Network Data Gateway"
Write-Host "     in Fabric that has line of sight to vnet-learneu-demo / snet-pe."
