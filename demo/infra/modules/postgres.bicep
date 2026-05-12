// Azure Database for PostgreSQL Flexible Server — LearnEU app data store.
// Stores: connection_logs, ask_history, sheets, plus reference data (curricula,
// glossary, learners) and ML feedback (item_attempts, content_safety_results).
//
// Hardening:
// - Public network access disabled (private endpoint only).
// - TLS 1.2+ enforced.
// - Admin password generated at deploy-time and stored in Key Vault as a secret
//   ('pg-admin-password'); App Services consume it via @Microsoft.KeyVault references.
// - 7-day backups, geo-redundancy off (demo cost).
//
// Microsoft Fabric mirroring readiness (https://learn.microsoft.com/azure/postgresql/integration/concepts-fabric-mirroring):
// - System-assigned Managed Identity ENABLED (Azure CDC uses it to write OneLake).
// - Compute tier = GeneralPurpose (Burstable is NOT supported as mirroring source).
// - wal_level = logical, max_worker_processes raised, azure_cdc allowlisted + preloaded.
// - The 'fabric_user' role + permissions are created post-deploy via
//   ml/fabric_mirroring/setup.sql.
//
// Cost note: General Purpose D2ds_v5 ~ 130 €/mo (vs Burstable B1ms ~ 13 €/mo). Required
// for Fabric mirroring; set fabricMirroringReady=false to fall back to Burstable.

param envName string
param location string
param tags object
param peSubnetId string
param logAnalyticsId string

@description('Resource id of the privatelink.postgres.database.azure.com private DNS zone (from private-dns module).')
param pgPrivateDnsZoneId string

@description('Key Vault name (RBAC) where the admin password secret is written.')
param keyVaultName string

@description('PostgreSQL admin login name.')
param adminLogin string = 'learneu_admin'

@description('Generated password (passed from main.bicep using newGuid()). Min 8 chars, mixed case + digits enforced server-side.')
@secure()
param adminPassword string

@description('Database name created on the server.')
param databaseName string = 'learneu'

@description('When true, provisions a SKU/configuration compatible with Microsoft Fabric mirroring (GeneralPurpose, SAMI, logical WAL, azure_cdc). When false, falls back to a cheap Burstable B1ms.')
param fabricMirroringReady bool = true

@description('Server SKU. Defaults follow fabricMirroringReady (GP D2ds_v5 vs Burstable B1ms).')
param skuName string = fabricMirroringReady ? 'Standard_D2ds_v5' : 'Standard_B1ms'

@description('Server compute tier.')
param skuTier string = fabricMirroringReady ? 'GeneralPurpose' : 'Burstable'

@description('Maximum number of databases that can be mirrored concurrently to Fabric.')
@minValue(1)
@maxValue(6)
param maxMirroredDatabases int = 3

@description('Storage in GB. Min 32 for Flexible Server.')
@minValue(32)
@maxValue(2048)
param storageGB int = 32

@description('PostgreSQL major version.')
@allowed([ '14', '15', '16' ])
param postgresVersion string = '16'

var serverName = 'pg-${envName}'

// max_worker_processes: default 8. Fabric guidance: +3 per mirrored DB. We size for the
// configured maximum so we never have to restart again when adding databases.
var workerProcesses = 8 + (3 * maxMirroredDatabases)

resource pg 'Microsoft.DBforPostgreSQL/flexibleServers@2024-08-01' = {
  name: serverName
  location: location
  tags: tags
  identity: {
    type: 'SystemAssigned'
  }
  sku: {
    name: skuName
    tier: skuTier
  }
  properties: {
    version: postgresVersion
    administratorLogin: adminLogin
    administratorLoginPassword: adminPassword
    storage: {
      storageSizeGB: storageGB
      autoGrow: 'Enabled'
    }
    backup: {
      backupRetentionDays: 7
      geoRedundantBackup: 'Disabled'
    }
    highAvailability: {
      mode: 'Disabled'
    }
    network: {
      publicNetworkAccess: 'Disabled'
    }
    authConfig: {
      activeDirectoryAuth: 'Enabled'
      passwordAuth: 'Enabled'
      tenantId: subscription().tenantId
    }
  }
}

// require_secure_transport=on is the default; set explicitly for clarity.
resource secureTransport 'Microsoft.DBforPostgreSQL/flexibleServers/configurations@2024-08-01' = {
  parent: pg
  name: 'require_secure_transport'
  properties: {
    value: 'on'
    source: 'user-override'
  }
}

// ---- Microsoft Fabric mirroring server parameters ----
// Only wal_level and max_worker_processes are user-set here. The azure_cdc extension
// (and its addition to shared_preload_libraries) is handled by the Fabric mirroring
// enablement workflow itself (`az postgres flexible-server fabric-mirroring start`),
// which also triggers the required restart. Setting azure.extensions or
// shared_preload_libraries manually is rejected by the platform.
resource walLevel 'Microsoft.DBforPostgreSQL/flexibleServers/configurations@2024-08-01' = if (fabricMirroringReady) {
  parent: pg
  name: 'wal_level'
  properties: {
    value: 'logical'
    source: 'user-override'
  }
}

resource maxWorkerProcesses 'Microsoft.DBforPostgreSQL/flexibleServers/configurations@2024-08-01' = if (fabricMirroringReady) {
  parent: pg
  name: 'max_worker_processes'
  properties: {
    value: string(workerProcesses)
    source: 'user-override'
  }
  dependsOn: [ walLevel ]
}

resource db 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2024-08-01' = {
  parent: pg
  name: databaseName
  properties: {
    charset: 'UTF8'
    collation: 'en_US.utf8'
  }
}

// Private endpoint into snet-pe
resource pe 'Microsoft.Network/privateEndpoints@2024-01-01' = {
  name: 'pe-${serverName}'
  location: location
  tags: tags
  properties: {
    subnet: { id: peSubnetId }
    privateLinkServiceConnections: [
      {
        name: 'pg'
        properties: {
          privateLinkServiceId: pg.id
          groupIds: [ 'postgresqlServer' ]
        }
      }
    ]
  }
}

// Bind the PE to the privatelink DNS zone so VNet clients resolve the FQDN to the PE NIC IP.
resource peDnsGroup 'Microsoft.Network/privateEndpoints/privateDnsZoneGroups@2024-01-01' = {
  parent: pe
  name: 'default'
  properties: {
    privateDnsZoneConfigs: [
      {
        name: 'pg'
        properties: {
          privateDnsZoneId: pgPrivateDnsZoneId
        }
      }
    ]
  }
}

// Diagnostic settings → Log Analytics (StorageIOStats + PostgreSQLLogs).
resource diag 'Microsoft.Insights/diagnosticSettings@2021-05-01-preview' = {
  scope: pg
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

// Persist admin password into Key Vault for App Services to consume via KV reference.
resource kv 'Microsoft.KeyVault/vaults@2024-04-01-preview' existing = {
  name: keyVaultName
}

resource pwdSecret 'Microsoft.KeyVault/vaults/secrets@2024-04-01-preview' = {
  parent: kv
  name: 'pg-admin-password'
  properties: {
    value: adminPassword
    contentType: 'text/plain'
  }
}

output serverName string = pg.name
output fqdn string = pg.properties.fullyQualifiedDomainName
output databaseName string = databaseName
output adminLogin string = adminLogin
output fabricMirroringReady bool = fabricMirroringReady
output sami string = pg.identity.principalId
#disable-next-line outputs-should-not-contain-secrets
output passwordSecretName string = pwdSecret.name
