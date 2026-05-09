// Key Vault Premium for customer-managed keys.
// NOTE: Production should use a Managed HSM. This module uses Key Vault Premium for demo simplicity.

param envName string
param location string
param tags object
param peSubnetId string

@description('Object id that gets Key Vault Administrator. Optional — leave empty if running with az CLI default.')
param deployerObjectId string = ''

var kvName = take(replace('kv-${envName}-${uniqueString(resourceGroup().id)}', '_', '-'), 24)

resource kv 'Microsoft.KeyVault/vaults@2024-04-01-preview' = {
  name: kvName
  location: location
  tags: tags
  properties: {
    sku: { family: 'A', name: 'premium' }
    tenantId: subscription().tenantId
    enableRbacAuthorization: true
    enablePurgeProtection: true
    softDeleteRetentionInDays: 90
    publicNetworkAccess: 'Disabled'
    networkAcls: { defaultAction: 'Deny', bypass: 'AzureServices' }
  }
}

// Key Vault Administrator role on the deployer (optional).
resource roleKvAdmin 'Microsoft.Authorization/roleAssignments@2022-04-01' = if (!empty(deployerObjectId)) {
  scope: kv
  name: guid(kv.id, deployerObjectId, 'kv-admin')
  properties: {
    // Key Vault Administrator
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '00482a5a-887f-4fb3-b363-3b7fe8e74483')
    principalId: deployerObjectId
    principalType: 'User'
  }
}

// Grant the active ARM deployment principal Key Vault Secrets Officer so that
// secrets can be written by sibling Bicep modules (apim-aoai stores the APIM key).
// Uses deployer().objectId (Bicep ≥ 0.27).
resource roleKvSecretsOfficer 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: kv
  name: guid(kv.id, deployer().objectId, 'kv-secrets-officer')
  properties: {
    // Key Vault Secrets Officer
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', 'b86a8fe4-44ce-4948-aee5-eccb2c155cd7')
    principalId: deployer().objectId
    principalType: 'User'
  }
}

// Private endpoint
resource pe 'Microsoft.Network/privateEndpoints@2024-01-01' = {
  name: 'pe-${kvName}'
  location: location
  tags: tags
  properties: {
    subnet: { id: peSubnetId }
    privateLinkServiceConnections: [
      {
        name: 'kv'
        properties: {
          privateLinkServiceId: kv.id
          groupIds: [ 'vault' ]
        }
      }
    ]
  }
}

output keyVaultId string = kv.id
output keyVaultName string = kv.name
output keyVaultUri string = kv.properties.vaultUri
