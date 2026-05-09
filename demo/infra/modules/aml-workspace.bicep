// Azure Machine Learning workspace — CMK, no payload retention on online endpoints (set per-deployment).
// STUB: storage / ACR / dependencies are inlined here for demo brevity. Production externalises them.

param envName string
param location string
param tags object
param peSubnetId string
param keyVaultId string
param logAnalyticsId string
param appInsightsId string

var prefix = uniqueString(resourceGroup().id, envName)

resource storage 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: take('staml${prefix}', 24)
  location: location
  tags: tags
  sku: { name: 'Standard_LRS' }
  kind: 'StorageV2'
  properties: {
    minimumTlsVersion: 'TLS1_2'
    allowBlobPublicAccess: false
    publicNetworkAccess: 'Disabled'
    networkAcls: { defaultAction: 'Deny', bypass: 'AzureServices' }
  }
}

resource acr 'Microsoft.ContainerRegistry/registries@2023-11-01-preview' = {
  name: take('acr${prefix}', 50)
  location: location
  tags: tags
  sku: { name: 'Premium' }
  properties: {
    adminUserEnabled: false
    publicNetworkAccess: 'Disabled'
    networkRuleSet: { defaultAction: 'Deny' }
  }
}

resource ws 'Microsoft.MachineLearningServices/workspaces@2024-10-01' = {
  name: 'mlw-${envName}'
  location: location
  tags: tags
  identity: { type: 'SystemAssigned' }
  properties: {
    friendlyName: 'LearnEU AML'
    storageAccount: storage.id
    keyVault: keyVaultId
    applicationInsights: appInsightsId
    containerRegistry: acr.id
    publicNetworkAccess: 'Disabled'
    hbiWorkspace: true
  }
}

resource peWs 'Microsoft.Network/privateEndpoints@2024-01-01' = {
  name: 'pe-mlw-${envName}'
  location: location
  tags: tags
  properties: {
    subnet: { id: peSubnetId }
    privateLinkServiceConnections: [
      {
        name: 'amlworkspace'
        properties: {
          privateLinkServiceId: ws.id
          groupIds: [ 'amlworkspace' ]
        }
      }
    ]
  }
}

resource diag 'Microsoft.Insights/diagnosticSettings@2021-05-01-preview' = {
  scope: ws
  name: 'to-law'
  properties: {
    workspaceId: logAnalyticsId
    logs: [ { categoryGroup: 'allLogs', enabled: true } ]
    metrics: [ { category: 'AllMetrics', enabled: true } ]
  }
}

output workspaceName string = ws.name
output workspaceId string = ws.id
