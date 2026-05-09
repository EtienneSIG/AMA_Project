// Log Analytics + Application Insights for demo telemetry and AI Act Art. 12 logs.

param envName string
param location string
param tags object

resource law 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: 'log-${envName}'
  location: location
  tags: tags
  properties: {
    sku: { name: 'PerGB2018' }
    retentionInDays: 90
  }
}

resource appi 'Microsoft.Insights/components@2020-02-02' = {
  name: 'appi-${envName}'
  location: location
  tags: tags
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: law.id
    publicNetworkAccessForIngestion: 'Enabled'
    publicNetworkAccessForQuery: 'Enabled'
  }
}

output logAnalyticsId string = law.id
output appInsightsId string = appi.id
output appInsightsConnectionString string = appi.properties.ConnectionString
