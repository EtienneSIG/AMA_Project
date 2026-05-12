# Microsoft Fabric mirroring — LearnEU Postgres

This folder contains everything needed to turn the **`pg-learneu-demo`** Azure
Database for PostgreSQL Flexible Server into a **mirrored database in Microsoft
Fabric** (zero-ETL, near real-time replication into OneLake).

## What is configured by Bicep

`infra/modules/postgres.bicep` (param `fabricMirroringReady=true`, default) sets:

| Setting | Value | Why |
|---|---|---|
| `identity.type` | `SystemAssigned` | Azure CDC uses the SAMI to write to OneLake |
| `sku` | `Standard_D2ds_v5` (GeneralPurpose) | Burstable is **not supported** as a mirroring source |
| `wal_level` | `logical` | Required for logical replication / CDC |
| `max_worker_processes` | `8 + 3 × maxMirroredDatabases` | +3 background workers per mirrored DB |

> `shared_preload_libraries`, `azure.extensions` and `max_mirrored_databases` are **not**
> set by Bicep — the platform manages `azure_cdc` itself when you call the Fabric
> mirroring enablement CLI (`az postgres flexible-server fabric-mirroring start`),
> which also restarts the server.

To skip Fabric readiness and keep the cheap Burstable tier, deploy with
`fabricMirroringReady=false`.

## Post-deploy steps

```pwsh
# 1. Apply infra (the Bicep restart bakes azure_cdc into shared_preload_libraries)
azd provision

# 2. Verify + register the database with the CDC control plane
pwsh ml/fabric_mirroring/enable.ps1 `
     -ResourceGroup rg-learneu-demo `
     -ServerName    pg-learneu-demo `
     -DatabaseName  learneu

# 3. Create the fabric_user role + permissions on the database
$kv = az keyvault list -g rg-learneu-demo --query "[0].name" -o tsv
$env:PGPASSWORD = az keyvault secret show -n pg-admin-password --vault-name $kv --query value -o tsv
psql "host=pg-learneu-demo.postgres.database.azure.com dbname=learneu user=learneu_admin sslmode=require" `
     -f ml/fabric_mirroring/setup.sql -v fabric_password='<pick-a-strong-password>'

# 4. In the Fabric portal:
#      Workspaces → New → Mirrored Azure Database for PostgreSQL
#      Server:   pg-learneu-demo.postgres.database.azure.com
#      Database: learneu
#      Auth:     Basic (fabric_user / <strong-password>)
#      Network:  use a Virtual Network Data Gateway that can reach snet-pe
```

## Network considerations

The Postgres server is **private only** (`publicNetworkAccess=Disabled`,
private endpoint in `snet-pe`). Fabric therefore requires a
[Virtual Network Data Gateway](https://learn.microsoft.com/data-integration/vnet/create-data-gateways)
with a delegated subnet inside `vnet-learneu-demo`. The simplest pattern is a
new `/27` subnet (e.g. `snet-fabric-gw`) delegated to
`Microsoft.PowerPlatform/vnetaccesslinks`.

## Tenant prerequisites (one-off, Fabric admin)

- Tenant setting **Service principals can use Fabric APIs** = enabled.
- Tenant setting **Users can access data stored in OneLake with apps external
  to Fabric** = enabled.
- The user creating the mirrored database needs **Member** or **Admin** in the
  target Fabric workspace (Contributor lacks the Reshare permission).

## What gets mirrored

Every table in the `public` schema with a primary key — that includes the
LearnEU app tables: `connection_logs`, `ask_history`, `sheets`,
`item_attempts`, `content_safety_results`, `learners`, `curricula`,
`glossary_terms`. Adding new tables later requires no extra setup: the SQL
script grants `SELECT` by default privilege so newly created tables are
mirrored automatically.

## References

- [Fabric mirroring concepts (Postgres)](https://learn.microsoft.com/azure/postgresql/integration/concepts-fabric-mirroring)
- [Tutorial: configure mirrored Postgres in Fabric](https://learn.microsoft.com/fabric/mirroring/azure-database-postgresql-tutorial)
- [`az postgres flexible-server fabric-mirroring`](https://learn.microsoft.com/cli/azure/postgres/flexible-server/fabric-mirroring)
