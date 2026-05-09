// Azure OpenAI — gpt-5.4-nano (reasoning, 400K context), EU Data Boundary, public access disabled.
// Plan B: GlobalStandard pay-as-you-go (no PTU). Capacity = TPM in thousands (50 = 50K TPM).

param envName string
param location string
param tags object
param peSubnetId string
param logAnalyticsId string

@description('Resource id of the privatelink.openai.azure.com Private DNS Zone to register the PE A record in.')
param aoaiPrivateDnsZoneId string

@description('Azure OpenAI deployment name used by apps and pipelines (model: gpt-5.4-nano).')
param deploymentName string = 'gpt-5.4-nano'

@description('Deployment SKU type. GlobalStandard recommended for the demo (no PTU reservation).')
@allowed([
  'GlobalStandard'
  'Standard'
  'ProvisionedManaged'
])
param deploymentSkuName string = 'GlobalStandard'

@description('SKU capacity. For GlobalStandard / Standard this is TPM in thousands (50 = 50K TPM). For ProvisionedManaged this is the PTU count.')
param deploymentCapacity int = 50

var aoaiName = 'aoai-${envName}-${uniqueString(resourceGroup().id)}'

resource aoai 'Microsoft.CognitiveServices/accounts@2024-10-01' = {
  name: aoaiName
  location: location
  tags: tags
  kind: 'OpenAI'
  sku: { name: 'S0' }
  properties: {
    customSubDomainName: aoaiName
    publicNetworkAccess: 'Disabled'
    networkAcls: { defaultAction: 'Deny' }
    disableLocalAuth: true
  }
}

resource gptDeployment 'Microsoft.CognitiveServices/accounts/deployments@2024-10-01' = {
  parent: aoai
  name: deploymentName
  sku: {
    name: deploymentSkuName
    capacity: deploymentCapacity
  }
  properties: {
    model: {
      format: 'OpenAI'
      name: 'gpt-5.4-nano'
      version: '2026-03-17'
    }
    raiPolicyName: 'Microsoft.DefaultV2'
  }
}

resource pe 'Microsoft.Network/privateEndpoints@2024-01-01' = {
  name: 'pe-${aoaiName}'
  location: location
  tags: tags
  properties: {
    subnet: { id: peSubnetId }
    privateLinkServiceConnections: [
      {
        name: 'aoai'
        properties: {
          privateLinkServiceId: aoai.id
          groupIds: [ 'account' ]
        }
      }
    ]
  }
  dependsOn: [ gptDeployment ]
}

resource peDnsGroup 'Microsoft.Network/privateEndpoints/privateDnsZoneGroups@2024-01-01' = {
  parent: pe
  name: 'default'
  properties: {
    privateDnsZoneConfigs: [
      {
        name: 'privatelink-openai'
        properties: {
          privateDnsZoneId: aoaiPrivateDnsZoneId
        }
      }
    ]
  }
}

resource diag 'Microsoft.Insights/diagnosticSettings@2021-05-01-preview' = {
  scope: aoai
  name: 'to-law'
  properties: {
    workspaceId: logAnalyticsId
    logs: [
      { categoryGroup: 'audit', enabled: true }
      { categoryGroup: 'allLogs', enabled: true }
    ]
    metrics: [ { category: 'AllMetrics', enabled: true } ]
  }
}

output endpoint string = aoai.properties.endpoint
output accountId string = aoai.id
output accountName string = aoai.name
output deploymentName string = gptDeployment.name
