// VNet + subnets for Private Endpoints, APIM, AML compute.
// Minimal viable for demo. Production tightens NSGs and adds Bastion.

param envName string
param location string
param tags object

@description('CIDR of the demo VNet.')
param vnetCidr string = '10.42.0.0/16'

var vnetName = 'vnet-${envName}'

// APIM External/Internal VNet integration requires an NSG with the inbound rules below.
// Reference: https://aka.ms/apiminternalvnet
resource apimNsg 'Microsoft.Network/networkSecurityGroups@2024-01-01' = {
  name: 'nsg-apim-${envName}'
  location: location
  tags: tags
  properties: {
    securityRules: [
      {
        name: 'Allow-APIM-Management'
        properties: {
          priority: 100
          direction: 'Inbound'
          access: 'Allow'
          protocol: 'Tcp'
          sourcePortRange: '*'
          destinationPortRange: '3443'
          sourceAddressPrefix: 'ApiManagement'
          destinationAddressPrefix: 'VirtualNetwork'
        }
      }
      {
        name: 'Allow-LoadBalancer'
        properties: {
          priority: 110
          direction: 'Inbound'
          access: 'Allow'
          protocol: 'Tcp'
          sourcePortRange: '*'
          destinationPortRange: '6390'
          sourceAddressPrefix: 'AzureLoadBalancer'
          destinationAddressPrefix: 'VirtualNetwork'
        }
      }
      {
        name: 'Allow-AzureTrafficManager'
        properties: {
          priority: 120
          direction: 'Inbound'
          access: 'Allow'
          protocol: 'Tcp'
          sourcePortRange: '*'
          destinationPortRange: '443'
          sourceAddressPrefix: 'AzureTrafficManager'
          destinationAddressPrefix: 'VirtualNetwork'
        }
      }
    ]
  }
}

resource vnet 'Microsoft.Network/virtualNetworks@2024-01-01' = {
  name: vnetName
  location: location
  tags: tags
  properties: {
    addressSpace: { addressPrefixes: [ vnetCidr ] }
    subnets: [
      {
        name: 'snet-pe'
        properties: {
          addressPrefix: '10.42.1.0/24'
          privateEndpointNetworkPolicies: 'Disabled'
        }
      }
      {
        name: 'snet-apim'
        properties: {
          addressPrefix: '10.42.2.0/24'
          delegations: []
          networkSecurityGroup: { id: apimNsg.id }
        }
      }
      {
        name: 'snet-aml'
        properties: {
          addressPrefix: '10.42.3.0/24'
        }
      }
      {
        name: 'snet-aks'
        properties: {
          addressPrefix: '10.42.4.0/22'
        }
      }
      {
        name: 'snet-apps'
        properties: {
          addressPrefix: '10.42.8.0/24'
          delegations: [
            {
              name: 'webapp'
              properties: { serviceName: 'Microsoft.Web/serverFarms' }
            }
          ]
        }
      }
    ]
  }
}

output vnetId string = vnet.id
output peSubnetId string = '${vnet.id}/subnets/snet-pe'
output apimSubnetId string = '${vnet.id}/subnets/snet-apim'
output amlSubnetId string = '${vnet.id}/subnets/snet-aml'
output aksSubnetId string = '${vnet.id}/subnets/snet-aks'
output appsSubnetId string = '${vnet.id}/subnets/snet-apps'
