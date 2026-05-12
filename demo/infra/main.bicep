// LearnEU Case Study 33 — demo deployment entrypoint
// Subscription-scope. Creates the resource group and wires every module.
// EU-only, public access disabled, CMK via Key Vault.
//
// NOTE: Several modules are marked STUB and need completion before a full `azd up`.
// Run `az deployment sub what-if` first.

targetScope = 'subscription'

// -----------------------------
// Parameters
// -----------------------------

@description('Demo environment name. Used to derive resource names.')
@minLength(3)
@maxLength(20)
param envName string = 'learneu-demo'

@description('Primary region. EU only — Case Study 33 hard rule.')
@allowed([
  'westeurope'
  'northeurope'
  'francecentral'
  'germanywestcentral'
  'polandcentral'
  'swedencentral'
])
param location string = 'westeurope'

@description('Tags applied to every resource.')
param tags object = {
  program: 'LearnEU'
  caseStudy: '33'
  dataClass: 'ChildPersonalData-Restricted'
  region: 'EU'
  managedBy: 'azd'
}

@description('Object id of the principal that runs azd (assigned admin roles on Key Vault, AML, etc.). Defaults to the deployer at runtime — set explicitly when running outside azd.')
param deployerObjectId string = ''

@description('Deploy Microsoft Purview. Disabled by default: some tenants do not have EU service locations available for Purview (only US). When false, lineage/classification governance is documented as a follow-up rather than provisioned.')
param deployPurview bool = false

@description('Deploy Microsoft Fabric capacity. Disabled by default: requires at least one Fabric admin member configured upfront (Power BI/Fabric admin), and is not on the critical path for Case Study 33 acceptance.')
param deployFabric bool = false

@description('PostgreSQL admin password. Defaults to a strong random value generated at deploy time and persisted to Key Vault under secret name "pg-admin-password" (consumed by App Services via @Microsoft.KeyVault references). Override only when re-deploying onto an existing server.')
@secure()
param postgresAdminPassword string = '${toUpper(uniqueString(subscription().id, 'pg', newGuid()))}aZ9!${uniqueString(newGuid())}'

// -----------------------------
// Resource group
// -----------------------------

resource rg 'Microsoft.Resources/resourceGroups@2024-03-01' = {
  name: 'rg-${envName}'
  location: location
  tags: tags
}

// -----------------------------
// Modules (ordered by dependency)
// -----------------------------

module networking 'modules/networking.bicep' = {
  scope: rg
  name: 'networking'
  params: {
    envName: envName
    location: location
    tags: tags
  }
}

module monitor 'modules/monitor.bicep' = {
  scope: rg
  name: 'monitor'
  params: {
    envName: envName
    location: location
    tags: tags
  }
}

module privateDns 'modules/private-dns.bicep' = {
  scope: rg
  name: 'private-dns'
  params: {
    vnetId: networking.outputs.vnetId
    tags: tags
    apimName: 'apim-${envName}'
    apimPrivateIp: apim.outputs.apimPrivateIp
  }
}

module keyvault 'modules/keyvault.bicep' = {
  scope: rg
  name: 'keyvault'
  params: {
    envName: envName
    location: location
    tags: tags
    peSubnetId: networking.outputs.peSubnetId
    deployerObjectId: deployerObjectId
  }
}

module openai 'modules/openai.bicep' = {
  scope: rg
  name: 'openai'
  params: {
    envName: envName
    location: location
    tags: tags
    peSubnetId: networking.outputs.peSubnetId
    logAnalyticsId: monitor.outputs.logAnalyticsId
    aoaiPrivateDnsZoneId: privateDns.outputs.aoaiZoneId
  }
}

module aisearch 'modules/ai-search.bicep' = {
  scope: rg
  name: 'aisearch'
  params: {
    envName: envName
    location: location
    tags: tags
    peSubnetId: networking.outputs.peSubnetId
    logAnalyticsId: monitor.outputs.logAnalyticsId
  }
}

module contentSafety 'modules/content-safety.bicep' = {
  scope: rg
  name: 'contentsafety'
  params: {
    envName: envName
    location: location
    tags: tags
    peSubnetId: networking.outputs.peSubnetId
    logAnalyticsId: monitor.outputs.logAnalyticsId
    csPrivateDnsZoneId: privateDns.outputs.csZoneId
  }
}

module aml 'modules/aml-workspace.bicep' = {
  scope: rg
  name: 'aml'
  params: {
    envName: envName
    location: location
    tags: tags
    peSubnetId: networking.outputs.peSubnetId
    keyVaultId: keyvault.outputs.keyVaultId
    logAnalyticsId: monitor.outputs.logAnalyticsId
    appInsightsId: monitor.outputs.appInsightsId
  }
}

module apim 'modules/apim.bicep' = {
  scope: rg
  name: 'apim'
  params: {
    envName: envName
    location: location
    tags: tags
    apimSubnetId: networking.outputs.apimSubnetId
    logAnalyticsId: monitor.outputs.logAnalyticsId
  }
}

module apimAoai 'modules/apim-aoai.bicep' = {
  scope: rg
  name: 'apim-aoai'
  params: {
    apimName: 'apim-${envName}'
    aoaiAccountName: openai.outputs.accountName
    aoaiEndpoint: openai.outputs.endpoint
    apimPrincipalId: apim.outputs.apimPrincipalId
    keyVaultName: keyvault.outputs.keyVaultName
  }
}

module appService 'modules/app-service.bicep' = {
  scope: rg
  name: 'app-service'
  params: {
    envName: envName
    location: location
    tags: tags
    appsSubnetId: networking.outputs.appsSubnetId
    logAnalyticsId: monitor.outputs.logAnalyticsId
    appInsightsConnectionString: monitor.outputs.appInsightsConnectionString
    keyVaultName: keyvault.outputs.keyVaultName
    subscriptionKeySecretName: apimAoai.outputs.subscriptionKeySecretName
    apimGatewayUrl: apim.outputs.gatewayUrl
    aoaiDeploymentName: openai.outputs.deploymentName
    pgFqdn: postgres.outputs.fqdn
    pgDatabase: postgres.outputs.databaseName
    pgAdminLogin: postgres.outputs.adminLogin
    pgPasswordSecretName: postgres.outputs.passwordSecretName
    contentSafetyEndpoint: contentSafety.outputs.endpoint
    contentSafetyAccountName: contentSafety.outputs.accountName
  }
}

module postgres 'modules/postgres.bicep' = {
  scope: rg
  name: 'postgres'
  params: {
    envName: envName
    location: location
    tags: tags
    peSubnetId: networking.outputs.peSubnetId
    logAnalyticsId: monitor.outputs.logAnalyticsId
    pgPrivateDnsZoneId: privateDns.outputs.pgZoneId
    keyVaultName: keyvault.outputs.keyVaultName
    adminPassword: postgresAdminPassword
  }
}

module purview 'modules/purview.bicep' = if (deployPurview) {
  scope: rg
  name: 'purview'
  params: {
    envName: envName
    location: location
    tags: tags
  }
}

module fabric 'modules/fabric-capacity.bicep' = if (deployFabric) {
  scope: rg
  name: 'fabric'
  params: {
    envName: envName
    location: location
    tags: tags
  }
}

// -----------------------------
// Outputs (consumed by azd / scripts)
// -----------------------------

output resourceGroupName string = rg.name
output location string = location
output openAiEndpoint string = openai.outputs.endpoint
output aiSearchEndpoint string = aisearch.outputs.endpoint
output contentSafetyEndpoint string = contentSafety.outputs.endpoint
output amlWorkspaceName string = aml.outputs.workspaceName
output apimGatewayUrl string = apim.outputs.gatewayUrl
output apimAoaiApiPath string = apimAoai.outputs.apiPath
output apimAoaiProductName string = apimAoai.outputs.productName
output appHostnames array = appService.outputs.appHostnames
output keyVaultName string = keyvault.outputs.keyVaultName
output postgresFqdn string = postgres.outputs.fqdn
output postgresDatabase string = postgres.outputs.databaseName
output postgresAdminLogin string = postgres.outputs.adminLogin
#disable-next-line outputs-should-not-contain-secrets
output postgresPasswordSecretName string = postgres.outputs.passwordSecretName
