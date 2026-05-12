// Azure AI Content Safety — gate every generated input/output.
// PE bound to privatelink.cognitiveservices.azure.com. Local key auth is force-disabled by
// the subscription Azure Policy (CognitiveServices_LocalAuth_Modify), so the App Service
// apps authenticate with their system-assigned managed identity
// (DefaultAzureCredential -> https://cognitiveservices.azure.com/.default) and the
// "Cognitive Services User" role granted in app-service.bicep.

param envName string
param location string
param tags object
param peSubnetId string
param logAnalyticsId string

@description('Resource ID of the privatelink.cognitiveservices.azure.com private DNS zone.')
param csPrivateDnsZoneId string

var name = 'cs-${envName}-${uniqueString(resourceGroup().id)}'

resource cs 'Microsoft.CognitiveServices/accounts@2024-10-01' = {
  name: name
  location: location
  tags: tags
  kind: 'ContentSafety'
  sku: { name: 'S0' }
  properties: {
    customSubDomainName: name
    publicNetworkAccess: 'Disabled'
    networkAcls: { defaultAction: 'Deny' }
    disableLocalAuth: true
  }
}

resource pe 'Microsoft.Network/privateEndpoints@2024-01-01' = {
  name: 'pe-${name}'
  location: location
  tags: tags
  properties: {
    subnet: { id: peSubnetId }
    privateLinkServiceConnections: [
      {
        name: 'cs'
        properties: {
          privateLinkServiceId: cs.id
          groupIds: [ 'account' ]
        }
      }
    ]
  }
}

resource peDnsGroup 'Microsoft.Network/privateEndpoints/privateDnsZoneGroups@2024-01-01' = {
  parent: pe
  name: 'default'
  properties: {
    privateDnsZoneConfigs: [
      {
        name: 'cs'
        properties: { privateDnsZoneId: csPrivateDnsZoneId }
      }
    ]
  }
}

resource diag 'Microsoft.Insights/diagnosticSettings@2021-05-01-preview' = {
  scope: cs
  name: 'to-law'
  properties: {
    workspaceId: logAnalyticsId
    logs: [ { categoryGroup: 'audit', enabled: true } ]
    metrics: [ { category: 'AllMetrics', enabled: true } ]
  }
}

output endpoint string = cs.properties.endpoint
output id string = cs.id
output accountName string = cs.name
