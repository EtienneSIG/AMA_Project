// APIM ↔ Azure OpenAI wiring:
// - Cognitive Services User RBAC for APIM SystemAssigned identity on the AOAI account
// - APIM backend pointing at the AOAI endpoint
// - APIM API exposing chat completions via /aoai/openai/deployments/{deployment-id}/chat/completions
// - Inbound policy: managed-identity auth + azure-openai-token-limit + emit-token-metric
// - Product `learneu-demo` with subscription gating, linked to the API
//
// Auth path: client → APIM (subscription key) → APIM injects Entra token via MI → AOAI (PE-only).

param apimName string
param aoaiAccountName string
param aoaiEndpoint string
param apimPrincipalId string

@description('Key Vault name where the APIM subscription primary key will be persisted as a secret.')
param keyVaultName string

@description('Secret name in Key Vault for the APIM subscription primary key.')
param subscriptionKeySecretName string = 'apim-subscription-key'

@description('Tokens-per-minute cap enforced per APIM subscription. Set ≤ AOAI deployment TPM.')
param tokensPerMinute int = 40000

var cognitiveServicesUserRoleId = 'a97b65f3-24c7-4388-baec-2e87135dc908'

resource aoai 'Microsoft.CognitiveServices/accounts@2024-10-01' existing = {
  name: aoaiAccountName
}

resource apim 'Microsoft.ApiManagement/service@2024-05-01' existing = {
  name: apimName
}

resource roleAssign 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: aoai
  name: guid(aoai.id, apimPrincipalId, cognitiveServicesUserRoleId)
  properties: {
    principalId: apimPrincipalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', cognitiveServicesUserRoleId)
  }
}

resource backend 'Microsoft.ApiManagement/service/backends@2024-05-01' = {
  parent: apim
  name: 'aoai-backend'
  properties: {
    url: aoaiEndpoint
    protocol: 'http'
  }
}

resource api 'Microsoft.ApiManagement/service/apis@2024-05-01' = {
  parent: apim
  name: 'aoai'
  properties: {
    displayName: 'Azure OpenAI Proxy'
    path: 'aoai'
    serviceUrl: aoaiEndpoint
    protocols: [ 'https' ]
    subscriptionRequired: true
  }
}

resource opChat 'Microsoft.ApiManagement/service/apis/operations@2024-05-01' = {
  parent: api
  name: 'chatCompletions'
  properties: {
    displayName: 'Chat Completions'
    method: 'POST'
    urlTemplate: '/openai/deployments/{deployment-id}/chat/completions'
    templateParameters: [
      { name: 'deployment-id', type: 'string', required: true, description: 'AOAI deployment name (e.g. gpt-5.4-nano)' }
    ]
  }
}

var policyTemplate = '''<policies>
  <inbound>
    <base />
    <set-backend-service backend-id="aoai-backend" />
    <authentication-managed-identity resource="https://cognitiveservices.azure.com" />
    <azure-openai-token-limit counter-key="@(context.Subscription.Id)" tokens-per-minute="__TPM__" estimate-prompt-tokens="false" />
    <azure-openai-emit-token-metric namespace="learneu" />
  </inbound>
  <backend><base /></backend>
  <outbound><base /></outbound>
  <on-error><base /></on-error>
</policies>'''

resource apiPolicy 'Microsoft.ApiManagement/service/apis/policies@2024-05-01' = {
  parent: api
  name: 'policy'
  properties: {
    format: 'rawxml'
    value: replace(policyTemplate, '__TPM__', string(tokensPerMinute))
  }
  dependsOn: [ backend, opChat ]
}

resource product 'Microsoft.ApiManagement/service/products@2024-05-01' = {
  parent: apim
  name: 'learneu-demo'
  properties: {
    displayName: 'LearnEU Demo'
    description: 'Subscription gating for the LearnEU demo APIs.'
    subscriptionRequired: true
    approvalRequired: false
    state: 'published'
  }
}

resource productApi 'Microsoft.ApiManagement/service/products/apis@2024-05-01' = {
  parent: product
  name: api.name
}

resource appsSubscription 'Microsoft.ApiManagement/service/subscriptions@2024-05-01' = {
  parent: apim
  name: 'learneu-apps'
  properties: {
    displayName: 'LearnEU apps (parent-portal, learner-web, teacher-console)'
    scope: product.id
    state: 'active'
    allowTracing: false
  }
}

resource keyVault 'Microsoft.KeyVault/vaults@2024-04-01-preview' existing = {
  name: keyVaultName
}

resource subKeySecret 'Microsoft.KeyVault/vaults/secrets@2024-04-01-preview' = {
  parent: keyVault
  name: subscriptionKeySecretName
  properties: {
    value: appsSubscription.listSecrets().primaryKey
    contentType: 'APIM subscription primary key (product=learneu-demo)'
  }
}

output apiPath string = api.properties.path
output productName string = product.name
output subscriptionKeySecretName string = subscriptionKeySecretName
