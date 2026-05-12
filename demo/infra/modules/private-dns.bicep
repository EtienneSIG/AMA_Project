// Private DNS zones used by the demo VNet.
// - privatelink.openai.azure.com  → AOAI private endpoints (registrationEnabled=false)
// - azure-api.net                 → A record overriding APIM Internal gateway hostname so
//                                    VNet-integrated apps resolve it to the private IP.
// Add additional zones (KV, Search, AML, CS, Storage, ACR) in follow-up slices.

param vnetId string
param tags object

@description('APIM service name (forms apim-{envName}.azure-api.net).')
param apimName string

@description('APIM Internal-mode private IP, read from the existing APIM resource by main.bicep.')
param apimPrivateIp string

resource aoaiZone 'Microsoft.Network/privateDnsZones@2024-06-01' = {
  name: 'privatelink.openai.azure.com'
  location: 'global'
  tags: tags
}

resource aoaiZoneLink 'Microsoft.Network/privateDnsZones/virtualNetworkLinks@2024-06-01' = {
  parent: aoaiZone
  name: 'vnet-link'
  location: 'global'
  tags: tags
  properties: {
    virtualNetwork: { id: vnetId }
    registrationEnabled: false
  }
}

resource apimZone 'Microsoft.Network/privateDnsZones@2024-06-01' = {
  name: 'azure-api.net'
  location: 'global'
  tags: tags
}

resource apimZoneLink 'Microsoft.Network/privateDnsZones/virtualNetworkLinks@2024-06-01' = {
  parent: apimZone
  name: 'vnet-link'
  location: 'global'
  tags: tags
  properties: {
    virtualNetwork: { id: vnetId }
    registrationEnabled: false
  }
}

resource apimARecord 'Microsoft.Network/privateDnsZones/A@2024-06-01' = {
  parent: apimZone
  name: apimName
  properties: {
    ttl: 60
    aRecords: [
      { ipv4Address: apimPrivateIp }
    ]
  }
}

// Postgres Flexible Server private DNS zone (A records auto-created by the PE).
resource pgZone 'Microsoft.Network/privateDnsZones@2024-06-01' = {
  name: 'privatelink.postgres.database.azure.com'
  location: 'global'
  tags: tags
}

resource pgZoneLink 'Microsoft.Network/privateDnsZones/virtualNetworkLinks@2024-06-01' = {
  parent: pgZone
  name: 'vnet-link'
  location: 'global'
  tags: tags
  properties: {
    virtualNetwork: { id: vnetId }
    registrationEnabled: false
  }
}

// Key Vault private DNS zone — required so VNet-integrated apps can resolve
// kv-*.vault.azure.net to the KV private endpoint when KV publicNetworkAccess=Disabled.
resource kvZone 'Microsoft.Network/privateDnsZones@2024-06-01' = {
  name: 'privatelink.vaultcore.azure.net'
  location: 'global'
  tags: tags
}

resource kvZoneLink 'Microsoft.Network/privateDnsZones/virtualNetworkLinks@2024-06-01' = {
  parent: kvZone
  name: 'link-vnet-kv'
  location: 'global'
  tags: tags
  properties: {
    virtualNetwork: { id: vnetId }
    registrationEnabled: false
  }
}

// Cognitive Services private DNS zone — required for Content Safety (kind=ContentSafety)
// over its private endpoint. AOAI uses its own privatelink.openai.azure.com zone.
resource csZone 'Microsoft.Network/privateDnsZones@2024-06-01' = {
  name: 'privatelink.cognitiveservices.azure.com'
  location: 'global'
  tags: tags
}

resource csZoneLink 'Microsoft.Network/privateDnsZones/virtualNetworkLinks@2024-06-01' = {
  parent: csZone
  name: 'link-vnet-cs'
  location: 'global'
  tags: tags
  properties: {
    virtualNetwork: { id: vnetId }
    registrationEnabled: false
  }
}

output aoaiZoneId string = aoaiZone.id
output apimZoneId string = apimZone.id
output kvZoneId string = kvZone.id
output pgZoneId string = pgZone.id
output csZoneId string = csZone.id
