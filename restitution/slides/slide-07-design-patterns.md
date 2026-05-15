# Slide 7 · Architecture · Design Patterns

- **Layout (template):** Content 2-col
- **Headline:** Patterns picked on purpose
- **Sub-headline:** Each pattern earns a regulatory or operational outcome
- **Rubric coverage:** #2
- **Source refs:** demo/infra/modules/app-service.bicep · demo/apps/_shared/ · plan/03-target-architecture.md

## Body bullets (left — patterns)
- Layered architecture (6 lanes, 1 owner each)
- Module pattern: Bicep `app-service.bicep` provisions 4 apps
- Zero-trust / Managed Identity everywhere
- Private endpoint pattern for KV / AOAI / Search / CS / PG
- Centralised RBAC in `app-service.bicep` lines 127-167
- Gated optional modules (Purview, Fabric, AKS off)
- Shared middleware: `_shared/auth.js`, `db/`, `contentSafety.js`

## Body bullets (right — why it matters)
- Modular Bicep → 4 apps from one template (DRY)
- MI + KV refs → 0 secrets in code, 0 to rotate manually
- Private endpoints → no public data plane to attack
- Gating → lower TCO, faster azd up, clear deferred list
- Shared middleware → single fix-place for auth/CSRF/rate-limit

## Visual
Two-column table: left lists patterns with little icons; right lists the regulatory or operational benefit.

## Speaker notes
Chaque pattern a été choisi pour servir une exigence, pas pour cocher une mode. Le module Bicep `app-service.bicep` génère les quatre web apps avec le même template — un seul endroit pour patcher la conf de toutes. Le zero-trust avec managed identities supprime tous les secrets du code : Key Vault est consulté au démarrage via un `@Microsoft.KeyVault(...)` reference. Les private endpoints ferment littéralement la porte d'entrée publique de toutes les ressources sensibles. Le gating des modules optionnels — Purview, Fabric, AKS confidentiel — fait baisser le coût démo à environ 25 € sans masquer ce qu'il reste à faire. Et la couche `apps/_shared/` mutualise auth, CSRF, rate-limit, accès Postgres : un correctif y vit une fois, est synchronisé vers les quatre apps via `sync.ps1`.
