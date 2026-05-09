// Microsoft Fabric capacity — F2 for demo. Pause when idle to save cost.
// NOTE: workspace + lakehouse + Power BI items are created via Fabric APIs / portal post-deploy.

param envName string
param location string
param tags object

@description('Fabric admin members (user/group object ids). At least one required.')
param adminMembers array = []

resource fab 'Microsoft.Fabric/capacities@2023-11-01' = {
  name: take('fab${replace(envName,'-','')}${uniqueString(resourceGroup().id)}', 24)
  location: location
  tags: tags
  sku: { name: 'F2', tier: 'Fabric' }
  properties: {
    administration: {
      members: adminMembers
    }
  }
}

output fabricCapacityId string = fab.id
output fabricCapacityName string = fab.name
