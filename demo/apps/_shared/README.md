# Shared app library

Files in this folder are **canonical sources** copied into each app's source tree before deploy.

| File | Copied to |
|---|---|
| `auth.js` | `apps/{learner-web,parent-portal,teacher-console,admin}/auth.js` |
| `login.html` | `apps/{learner-web,parent-portal,teacher-console,admin}/public/login.html` |

Run `pwsh ./sync.ps1` to fan-out the copies, or `azd deploy` (which calls the predeploy hook).

**Why duplicate instead of npm workspace:**
azd packages each App Service independently and does not pull in parent directories. A shared workspace would require lifting the build to a monorepo with `@learneu/shared` package — out of scope for the demo.
