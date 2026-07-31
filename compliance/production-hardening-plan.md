# Production Hardening Plan (beyond demo SKUs)

> **Status:** 🟡 **Documented, not executed.** The deployed demo intentionally runs on
> **demo SKUs** to keep cost low. This plan is the path to a production posture. Executing it
> **changes infrastructure and cost** and is therefore **out of scope** until explicitly approved —
> creating this document changes nothing that is deployed.

## Current (demo) vs target (production)

| Area | Demo (current) | Production target | Evidence (current) |
|---|---|---|---|
| API Management | **Developer** SKU, single unit | **Premium** (multi-unit) with VNet integration + multi-region gateways | [../../demo/infra/modules/apim.bicep](../../demo/infra/modules/apim.bicep) — *"Developer SKU for demo. Production = Premium with VNet integration."* |
| Azure OpenAI capacity | Standard (shared) deployment | **PTU** (Provisioned Throughput Units) for predictable latency/quotas | AOAI deployment in [../../demo/infra/modules/apim-aoai.bicep](../../demo/infra/modules/apim-aoai.bicep) |
| Region | Single region `westeurope` | **Multi-region (EU only)** active/active or active/passive with failover | [../../demo/infra/main.bicep](../../demo/infra/main.bicep) `location = 'westeurope'` |
| PostgreSQL | Flexible Server, single instance | HA (zone-redundant) + read replicas, geo-redundant backup **within EU** | infra modules |
| Fabric capacity | F2 / F16 (demo) | Right-sized F-SKU + reserved capacity | [../../demo/infra/modules/fabric-capacity.bicep](../../demo/infra/modules/fabric-capacity.bicep) |
| App Service | B2 plan | Premium v3 with autoscale + zone redundancy | plan `asp-learneu-demo` |

## Hardening workstreams

1. **APIM Premium + VNet + multi-region** — migrate gateway, keep private ingress, add regional gateways (EU only). No public backend exposure.
2. **AOAI PTU** — provision PTUs sized from load-test p95; keep EU region; retain APIM token-injection path.
3. **Multi-region (EU)** — replicate stateless apps; Postgres HA + in-EU geo-redundant backup; Fabric/PBI region alignment; **no** cross-EU-boundary personal-data transfer.
4. **Resilience & DR** — RTO/RPO targets, failover runbook, chaos/DR test; backup/restore drills.
5. **Security hardening** — WAF at edge, private endpoints everywhere, Key Vault reference rotation, Defender for Cloud, secret-less MI auth end-to-end.
6. **FinOps** — reserved instances / capacity reservations; budget alerts; right-sizing after load test.

## Guardrails (must hold in every option)

- **EU regions only** for any personal data — no cross-EU transfer (constitution I).
- Public network access **disabled** on every backend; **APIM is the only ingress**.
- Identity split preserved: workforce tenant for staff, CIAM `learneu` for learners/parents.

## Owner & next step

- **Owner:** Platform / Cloud Architect (with FinOps + Security review).
- **Gate:** requires explicit approval + budget before any `main.bicep` / module SKU change is made.
- **Reference:** [../../plan/03-target-architecture.md](../../plan/03-target-architecture.md) · [../../plan/08-demo-on-azure.md](../../plan/08-demo-on-azure.md).
