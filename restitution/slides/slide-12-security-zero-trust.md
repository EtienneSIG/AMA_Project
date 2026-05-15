# Slide 12 · Compliance · Security & Zero-Trust

- **Layout (template):** Content 2-col
- **Headline:** Zero-trust by construction, not by policy
- **Sub-headline:** No public data plane, no static secret, no broad role
- **Rubric coverage:** #3
- **Source refs:** demo/infra/main.bicep · demo/apps/_shared/auth.js · demo/apps/_shared/server.js · plan/04-compliance-eu-ai-act-gdpr.md

## Body bullets (left — infra)
- Managed identity on every service-to-service call
- Key Vault: soft-delete + purge protection + private endpoint
- Private endpoints on KV / AOAI / Search / CS / PG / AML / Storage
- Public access disabled on all data services
- EU-only region allow-list enforced in `main.bicep`

## Body bullets (right — application)
- bcryptjs password hashing
- Signed cookies (`secure`, `httpOnly`, `sameSite=lax`)
- CSRF double-submit (`learneu_csrf` + `X-CSRF-Token`)
- In-memory rate limit: 10/min on login, 60/min general API
- Role-gated routes — admin / teacher / parent / student
- TLS-only Postgres, KV-referenced password

## Visual
Two-column lockbox icon set: left = infra controls, right = app controls. Centre badge "0 secrets in code".

## Speaker notes
Le zero-trust ici n'est pas une promesse contractuelle, c'est une propriété de la stack. Côté infra : tout est en managed identity, Key Vault est protégé en soft-delete + purge protection, et **tout** est derrière un private endpoint — Key Vault, OpenAI, AI Search, Content Safety, Postgres, AML, Storage. Public access désactivé partout sauf sur APIM. Région EU-only allow-listée dans `main.bicep`. Côté application : bcryptjs sur les mots de passe, cookies signés en `httpOnly + sameSite=lax`, **double-submit CSRF** avec un cookie `learneu_csrf` réinjecté en header `X-CSRF-Token` par un fetch interceptor partagé, rate-limit sliding-window 10/min sur le login et 60/min sur l'API. Le mot de passe Postgres est lui-même un KV reference, donc ne vit jamais dans la définition d'app settings. Voir [plan/04-compliance-eu-ai-act-gdpr.md](../plan/04-compliance-eu-ai-act-gdpr.md).
