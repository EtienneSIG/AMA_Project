-- Microsoft Fabric mirroring — Postgres role + permissions setup.
-- Run this AFTER `azd provision` and AFTER the Bicep restart that loads azure_cdc.
-- Connect as the `learneu_admin` user (member of azure_pg_admin) to the `learneu` db.
--
-- Quick start (from a host with line of sight to the private endpoint, e.g. the
-- jumpbox / a VNet-attached runner):
--
--   $env:PGPASSWORD = (az keyvault secret show -n pg-admin-password `
--       --vault-name kv-learneu-demo-<suffix> --query value -o tsv)
--   psql "host=pg-learneu-demo.postgres.database.azure.com port=5432 \
--         dbname=learneu user=learneu_admin sslmode=require" `
--         -f ml/fabric_mirroring/setup.sql -v fabric_password='<pick-strong>'
--
-- After this completes, head to the Fabric portal -> "Mirrored Azure Database
-- for PostgreSQL" -> point it at this server and authenticate as fabric_user.

\set ON_ERROR_STOP on

-- 1. Required extensions (azure_cdc is preloaded via shared_preload_libraries).
CREATE EXTENSION IF NOT EXISTS azure_cdc;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Dedicated low-privilege role for Fabric (least privilege per Fabric guidance).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'fabric_user') THEN
    EXECUTE format(
      'CREATE ROLE fabric_user WITH LOGIN PASSWORD %L CREATEDB CREATEROLE REPLICATION',
      :'fabric_password'
    );
  ELSE
    EXECUTE format('ALTER ROLE fabric_user WITH PASSWORD %L', :'fabric_password');
  END IF;
END
$$;

-- 3. Grant the CDC admin role + per-database privileges Fabric requires.
GRANT azure_cdc_admin TO fabric_user;
GRANT CREATE  ON DATABASE learneu TO fabric_user;
GRANT CONNECT ON DATABASE learneu TO fabric_user;

-- 4. Read access on every existing table in `public` (Fabric reads, never writes).
GRANT USAGE ON SCHEMA public TO fabric_user;
GRANT SELECT ON ALL TABLES    IN SCHEMA public TO fabric_user;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO fabric_user;

-- 5. Auto-grant SELECT on future tables/sequences so newly added tables mirror too.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT ON TABLES TO fabric_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT ON SEQUENCES TO fabric_user;

-- 6. Sanity check.
SELECT current_database()                                AS db,
       current_setting('wal_level')                      AS wal_level,
       current_setting('max_worker_processes')           AS workers,
       current_setting('shared_preload_libraries')       AS preload,
       (SELECT extversion FROM pg_extension WHERE extname='azure_cdc') AS azure_cdc_version;
