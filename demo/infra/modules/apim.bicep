// API Management — Developer SKU for demo. Production = Premium with VNet integration.
// STUB: products, APIs, OAuth policies are added on Day 7 of the tutorial via az CLI / Bicep extension.

param envName string
param location string
param tags object
param apimSubnetId string

@description('Log Analytics workspace resource id for diagnostic settings (required for EU AI Act audit trail).')
param logAnalyticsId string

@description('Publisher email for APIM registration.')
param publisherEmail string = 'noreply@learneu.example'

@description('Publisher org displayed in the developer portal.')
param publisherName string = 'LearnEU Demo'

resource apim 'Microsoft.ApiManagement/service@2024-05-01' = {
  name: 'apim-${envName}'
  location: location
  tags: tags
  sku: { name: 'Developer', capacity: 1 }
  identity: { type: 'SystemAssigned' }
  properties: {
    publisherEmail: publisherEmail
    publisherName: publisherName
    virtualNetworkType: 'Internal'
    virtualNetworkConfiguration: { subnetResourceId: apimSubnetId }
  }
}

resource apimDiag 'Microsoft.Insights/diagnosticSettings@2021-05-01-preview' = {
  name: 'to-law'
  scope: apim
  properties: {
    workspaceId: logAnalyticsId
    logs: [
      { categoryGroup: 'allLogs', enabled: true }
    ]
    metrics: [
      { category: 'AllMetrics', enabled: true }
    ]
  }
}

output gatewayUrl string = apim.properties.gatewayUrl
output apimId string = apim.id
output apimPrincipalId string = apim.identity.principalId
output apimPrivateIp string = apim.properties.privateIPAddresses[0]
