// Microsoft Purview — catalog for OneLake assets and lineage.
// STUB: collection, sensitivity labels, scans set up post-deploy via portal or REST.

param envName string
param location string
param tags object

resource pv 'Microsoft.Purview/accounts@2024-04-01-preview' = {
  name: 'pv-${envName}-${uniqueString(resourceGroup().id)}'
  location: location
  tags: tags
  identity: { type: 'SystemAssigned' }
  sku: { name: 'Standard', capacity: 1 }
  properties: {
    publicNetworkAccess: 'Disabled'
    managedResourceGroupName: 'rg-${envName}-pv-managed'
  }
}

output purviewId string = pv.id
output purviewName string = pv.name
