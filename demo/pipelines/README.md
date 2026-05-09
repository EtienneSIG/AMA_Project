# Pipelines — STUBS

Three pipelines wrap the AI capabilities of the demo:

| Folder | Purpose | Status |
|---|---|---|
| `localisation/` | NL → DE Math unit translation via Azure OpenAI + Content Safety | starter `localise.py` provided |
| `content-safety/` | Standalone gate library reused by localisation, assessment, learner UI | TODO |
| `continuous-eval/` | Continuous evaluation on Foundry / AML for adaptive + assessment models | TODO |

See [`../plan/08-demo-on-azure.md`](../../plan/08-demo-on-azure.md) for the full design.
