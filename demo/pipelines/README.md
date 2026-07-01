# Pipelines

Three pipelines wrap the AI capabilities of the demo:

| Folder | Purpose | Status |
|---|---|---|
| `localisation/` | NL → DE Math unit translation via Azure OpenAI + Content Safety | ✅ runnable — live (Azure) **and** `--offline` synthetic path |
| `content-safety/` | Standalone gate library reused by localisation, assessment, learner UI | TODO |
| `continuous-eval/` | Continuous evaluation on Foundry / AML for adaptive + assessment models | TODO |

See [`../plan/08-demo-on-azure.md`](../../plan/08-demo-on-azure.md) for the full design.

## Localisation — end-to-end run

The localisation pipeline runs with **no Azure dependency** via `--offline`
(deterministic, glossary-driven NL→DE translation + a local Content Safety
heuristic), or against live Azure OpenAI + Content Safety without the flag:

```powershell
cd demo
python pipelines/localisation/localise.py `
    --in data/math_unit_fractions.md `
    --target de-DE `
    --out data/localised/de-DE/math_unit_fractions.md `
    --offline
```

Outputs (committed as evidence):
- `data/localised/de-DE/math_unit_fractions.md` — localised unit (glossary terms
  `Bruch` / `Zähler` / `Nenner` applied verbatim).
- `data/localised/de-DE/math_unit_fractions.md.safety.json` — Content Safety
  verdict (`blocked=false`, all categories 0). This satisfies criterion 3 of
  [`../DEPLOYMENT-REPORT.md`](../DEPLOYMENT-REPORT.md).
