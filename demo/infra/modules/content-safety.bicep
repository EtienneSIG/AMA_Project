// Azure AI Content Safety — gate every generated output.

param envName string
param location string
param tags object
param peSubnetId string
param logAnalyticsId string

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
