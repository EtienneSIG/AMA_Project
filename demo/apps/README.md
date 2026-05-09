# Apps — STUBS

Three web apps make up the demo UX:

| App | Stack | Purpose |
|---|---|---|
| `parent-portal/` | React + Entra External ID custom UI | Parental consent + rights flows |
| `teacher-console/` | React + Power BI Embed | Class dashboards, grade override |
| `learner-web/` | React + ONNX Runtime Web | Adaptive lesson UI, client-side inference |

These folders are intentionally minimal placeholders. Day 8–9 of the
tutorial scaffolds them with `npm create vite@latest` and wires them up.

For the **scaffold-only** path: nothing here deploys. The `azure.yaml`
`services:` block is commented out until you're ready.
