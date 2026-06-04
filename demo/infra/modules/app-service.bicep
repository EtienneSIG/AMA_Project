// App Service Plan + 4 Linux Node 22-lts web apps for the LearnEU demo
// (parent-portal, learner-web, teacher-console, admin).
// - System-assigned MI on each app (for KV access via RBAC + admin ARM access)
// - VNet integration into snet-apps (regional VNet integration, not PE)
// - App settings: APIM gateway URL + KV references for APIM key, PG password, CS key
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

@description('PostgreSQL Flexible Server FQDN (e.g. pg-learneu-demo.postgres.database.azure.com).')
param pgFqdn string

@description('PostgreSQL database name.')
param pgDatabase string

@description('PostgreSQL admin login.')
param pgAdminLogin string

@description('Key Vault secret name holding the PostgreSQL admin password.')
param pgPasswordSecretName string

@description('Azure AI Content Safety endpoint (https://cs-*.cognitiveservices.azure.com/).')
param contentSafetyEndpoint string

@description('Azure AI Content Safety account name (for role assignment scoping).')
param contentSafetyAccountName string

var planName = 'asp-${envName}'

resource plan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: planName
  location: location
  tags: tags
  sku: { name: 'B1', tier: 'Basic', capacity: 1 }
  kind: 'linux'
  properties: { reserved: true }
}

// Autoscale: scale out 1→3 instances based on CPU; scale in when idle.
// B1 supports manual scaling only; upgrade to S1/P1v3 for rule-based autoscale.
// This resource is provisioned so the rule is ready when the SKU is upgraded.
resource autoscale 'Microsoft.Insights/autoscalesettings@2022-10-01' = {
  name: 'autoscale-${envName}'
  location: location
  tags: tags
  properties: {
    enabled: true
    targetResourceUri: plan.id
    profiles: [
      {
        name: 'Auto created default profile'
        capacity: {
          minimum: '1'
          maximum: '3'
          default: '1'
        }
        rules: [
          {
            metricTrigger: {
              metricName: 'CpuPercentage'
              metricResourceUri: plan.id
              timeGrain: 'PT1M'
              statistic: 'Average'
              timeWindow: 'PT5M'
              timeAggregation: 'Average'
              operator: 'GreaterThan'
              threshold: 70
            }
            scaleAction: {
              direction: 'Increase'
              type: 'ChangeCount'
              value: '1'
              cooldown: 'PT5M'
            }
          }
          {
            metricTrigger: {
              metricName: 'CpuPercentage'
              metricResourceUri: plan.id
              timeGrain: 'PT1M'
              statistic: 'Average'
              timeWindow: 'PT10M'
              timeAggregation: 'Average'
              operator: 'LessThan'
              threshold: 30
            }
            scaleAction: {
              direction: 'Decrease'
              type: 'ChangeCount'
              value: '1'
              cooldown: 'PT10M'
            }
          }
          {
            metricTrigger: {
              metricName: 'MemoryPercentage'
              metricResourceUri: plan.id
              timeGrain: 'PT1M'
              statistic: 'Average'
              timeWindow: 'PT5M'
              timeAggregation: 'Average'
              operator: 'GreaterThan'
              threshold: 80
            }
            scaleAction: {
              direction: 'Increase'
              type: 'ChangeCount'
              value: '1'
              cooldown: 'PT5M'
            }
          }
        ]
      }
    ]
  }
}

var appNames = [
  'parent-portal'
  'learner-web'
  'teacher-console'
  'admin'
  'director-portal'
]
var adminIndex = 3
// Map app name -> auth role (must match SEED_USERS roles in apps/_shared/auth.js).
var appRoles = {
  'parent-portal':   'parent'
  'learner-web':     'student'
  'teacher-console': 'teacher'
  'admin':           'admin'
  'director-portal': 'director'
}

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
        { name: 'APP_ROLE', value: appRoles[n] }
        {
          name: 'APIM_SUBSCRIPTION_KEY'
          value: '@Microsoft.KeyVault(VaultName=${keyVaultName};SecretName=${subscriptionKeySecretName})'
        }
        { name: 'PG_HOST', value: pgFqdn }
        { name: 'PG_PORT', value: '5432' }
        { name: 'PG_DATABASE', value: pgDatabase }
        { name: 'PG_USER', value: pgAdminLogin }
        { name: 'PG_SSL', value: 'require' }
        {
          name: 'PG_PASSWORD'
          value: '@Microsoft.KeyVault(VaultName=${keyVaultName};SecretName=${pgPasswordSecretName})'
        }
        { name: 'CONTENT_SAFETY_ENDPOINT', value: contentSafetyEndpoint }
        { name: 'CONTENT_SAFETY_ENABLED', value: 'true' }
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

// Grant each app's MI "Cognitive Services User" on the Content Safety account.
// Built-in role: a97b65f3-24c7-4388-baec-2e87135dc908.
resource csAccount 'Microsoft.CognitiveServices/accounts@2024-10-01' existing = {
  name: contentSafetyAccountName
}
@batchSize(1)
resource csRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = [for (n, i) in appNames: {
  scope: csAccount
  name: guid(csAccount.id, apps[i].id, 'cognitive-services-user')
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', 'a97b65f3-24c7-4388-baec-2e87135dc908')
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
