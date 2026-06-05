param(
  [string]$ResourceGroup = 'rg-learneu-demo',
  [string]$WebAppName = 'app-director-portal-learneu-demo',
  [string]$TenantId,
  [string]$ClientId,
  [string]$ClientSecret,
  [switch]$Restart
)

$ErrorActionPreference = 'Stop'

if (-not $TenantId) {
  $TenantId = Read-Host 'Enter PBI_TENANT_ID (Microsoft Entra tenant ID)'
}
if (-not $ClientId) {
  $ClientId = Read-Host 'Enter PBI_CLIENT_ID (app registration client ID)'
}
if (-not $ClientSecret) {
  $secure = Read-Host 'Enter PBI_CLIENT_SECRET (app registration client secret)' -AsSecureString
  $ptr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  try {
    $ClientSecret = [System.Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
  }
  finally {
    [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
  }
}

if (-not $TenantId -or -not $ClientId -or -not $ClientSecret) {
  throw 'Missing one or more required values: TenantId, ClientId, ClientSecret.'
}

Write-Host "Setting Power BI embed app settings on $WebAppName..." -ForegroundColor Cyan
az webapp config appsettings set `
  --resource-group $ResourceGroup `
  --name $WebAppName `
  --settings `
    PBI_TENANT_ID=$TenantId `
    PBI_CLIENT_ID=$ClientId `
    PBI_CLIENT_SECRET=$ClientSecret `
    DIRECTOR_EMBED_CACHE_TTL_MS=120000 `
  --output table | Out-Null

if ($Restart) {
  Write-Host "Restarting $WebAppName..." -ForegroundColor Cyan
  az webapp restart --resource-group $ResourceGroup --name $WebAppName --output none
}

Write-Host 'Validating /api/health...' -ForegroundColor Cyan
$healthUrl = "https://$WebAppName.azurewebsites.net/api/health"
$health = Invoke-RestMethod -Uri $healthUrl -Method Get

$configured = $health.reporting.embed.configured
$missing = @($health.reporting.embed.missing)

if ($configured) {
  Write-Host 'Power BI embed configuration is active.' -ForegroundColor Green
} else {
  Write-Host ('Power BI embed is still not configured. Missing: ' + ($missing -join ', ')) -ForegroundColor Yellow
}

$health | ConvertTo-Json -Depth 6
