// Diagnostic settings for a single App Service site → Log Analytics.
// Used as a child module of app-service.bicep to avoid Bicep self-reference issues in resource loops.

param siteName string
param logAnalyticsId string

resource site 'Microsoft.Web/sites@2023-12-01' existing = {
  name: siteName
}

resource diag 'Microsoft.Insights/diagnosticSettings@2021-05-01-preview' = {
  scope: site
  name: 'to-law'
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
