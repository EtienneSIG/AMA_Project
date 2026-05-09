// App Service Plan + 3 Linux Node 20 web apps for the LearnEU demo (parent-portal, learner-web, teacher-console).
// - System-assigned MI on each app (for KV access via RBAC)
// - VNet integration into snet-apps (regional VNet integration, not PE)
// - App settings: APIM gateway URL + KV reference for the APIM subscription key
// - Diagnostic settings → Log Analytics
//
// Cost: B1 plan ~13 €/mo. Apps share the plan.

param envName string
param location string
param tags object
param appsSubnetId string
param logAnalyticsId string
param appInsightsConnectionString string

@description('Key Vault name (RBAC) hosting the apim subscription key secret.')
param keyVaultName string

@description('KV secret name for the APIM subscription primary key.')
param subscriptionKeySecretName string

@description('APIM Internal gateway URL (e.g. https://apim-learneu-demo.azure-api.net).')
param apimGatewayUrl string

@description('AOAI deployment name (path segment for chat completions).')
param aoaiDeploymentName string

var planName = 'asp-${envName}'

resource plan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: planName
  location: location
  tags: tags
  sku: { name: 'B1', tier: 'Basic', capacity: 1 }
  kind: 'linux'
  properties: { reserved: true }
}

var appNames = [
  'parent-portal'
  'learner-web'
  'teacher-console'
  'admin'
]
var adminIndex = 3

resource keyVault 'Microsoft.KeyVault/vaults@2024-04-01-preview' existing = {
  name: keyVaultName
}

@batchSize(1)
resource apps 'Microsoft.Web/sites@2023-12-01' = [for (n, i) in appNames: {
  name: 'app-${n}-${envName}'
  location: location
  tags: tags
  kind: 'app,linux'
  identity: { type: 'SystemAssigned' }
  properties: {
    serverFarmId: plan.id
    httpsOnly: true
    virtualNetworkSubnetId: appsSubnetId
    vnetRouteAllEnabled: true
    siteConfig: {
      linuxFxVersion: 'NODE|22-lts'
      alwaysOn: true
      ftpsState: 'Disabled'
      minTlsVersion: '1.2'
      http20Enabled: true
      vnetRouteAllEnabled: true
      appSettings: concat([
        { name: 'SCM_DO_BUILD_DURING_DEPLOYMENT', value: 'true' }
        { name: 'ENABLE_ORYX_BUILD', value: 'true' }
        { name: 'APPLICATIONINSIGHTS_CONNECTION_STRING', value: appInsightsConnectionString }
        { name: 'APIM_GATEWAY_URL', value: apimGatewayUrl }
        { name: 'AOAI_DEPLOYMENT_NAME', value: aoaiDeploymentName }
        { name: 'APP_ROLE', value: n }
        {
          name: 'APIM_SUBSCRIPTION_KEY'
          value: '@Microsoft.KeyVault(VaultName=${keyVaultName};SecretName=${subscriptionKeySecretName})'
        }
      ], n == 'admin' ? [
        { name: 'AZURE_SUBSCRIPTION_ID', value: subscription().subscriptionId }
        { name: 'AZURE_RESOURCE_GROUP', value: resourceGroup().name }
        { name: 'ENV_NAME', value: envName }
      ] : [])
    }
  }
}]

// Grant the admin app's MI Website Contributor on each of the 3 user-facing sites.
// Built-in role: de139f84-1756-47ae-9be6-808fbbe84772.
@batchSize(1)
resource adminWebsiteContrib 'Microsoft.Authorization/roleAssignments@2022-04-01' = [for i in range(0, 3): {
  scope: apps[i]
  name: guid(apps[i].id, apps[adminIndex].id, 'website-contributor')
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', 'de139f84-1756-47ae-9be6-808fbbe84772')
    principalId: apps[adminIndex].identity.principalId
    principalType: 'ServicePrincipal'
  }
}]

// Grant each app's MI Key Vault Secrets User on KV
@batchSize(1)
resource kvRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = [for (n, i) in appNames: {
  scope: keyVault
  name: guid(keyVault.id, apps[i].id, 'kv-secrets-user')
  properties: {
    // Key Vault Secrets User
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '4633458b-17de-408a-b874-0445c86b69e6')
    principalId: apps[i].identity.principalId
    principalType: 'ServicePrincipal'
  }
}]

module appDiag 'app-diag.bicep' = [for (n, i) in appNames: {
  name: 'app-diag-${n}'
  params: {
    siteName: apps[i].name
    logAnalyticsId: logAnalyticsId
  }
}]

output appNames array = [for (n, i) in appNames: apps[i].name]
output appHostnames array = [for (n, i) in appNames: apps[i].properties.defaultHostName]
