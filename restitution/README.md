# Restitution — AMA Case Study 33 (LearnEU)

Working folder for the **final restitution deck** of the Azure Master Architect review.
Owned and maintained by the [`restitution-deck-builder`](../agents/restitution-deck-builder.chatmode.md) agent.

## Layout

| Path | Purpose |
|---|---|
| `deck-outline.md` | Single source of truth: 21-slide skeleton mapped to the **12 rubric categories**. |
| `slides/` | One Markdown file per slide (`slide-NN-<slug>.md`) using the agent's spec format. |
| `coverage-matrix.md` | Auto-maintained table `Rubric # → Slide #` to prove all 12 categories are covered. |
| `demo-storyboard.md` | Live-demo script with stopwatch timings (target ≤ 7 min). |
| `speaker-notes.md` | Concatenated speaker notes for rehearsal / teleprompter. |
| `assets/` | Screenshots, exported diagrams, ONNX/Postgres/APIM captures referenced by slides. |
| `build/` | Generated artefacts (e.g. `LearnEU-AMA-Restitution.pptx` once the agent runs `build_pptx.py`). |

## Bootstrap

The folder is bootstrapped by the agent on first invocation. To regenerate everything from scratch:

> "Bootstrap the restitution folder, full deck, FR speaker notes, EN bullets."

The agent will:

1. Re-read [Subject/case-study-33-edtech-personalised-learning.md](../Subject/case-study-33-edtech-personalised-learning.md), [Subject/AMA_Rubric_Evaluation.md](../Subject/AMA_Rubric_Evaluation.md), and key `plan/` + `demo/` files.
2. Overwrite `deck-outline.md`, all `slides/slide-NN-*.md`, `coverage-matrix.md`, `demo-storyboard.md`, `speaker-notes.md`.
3. Print the coverage matrix to confirm all 12 rubric categories are scored.
4. **Not** touch `assets/` or `build/` unless explicitly asked.

## Build to .pptx

`build/build_pptx.py` (created on demand) reads each `slides/slide-NN-*.md`, opens `Subject/Azure Master Architect_Prezo_Template_v01.pptx` with `python-pptx`, clones the right master layout, and emits `build/LearnEU-AMA-Restitution.pptx`. Run:

```powershell
python -m pip install python-pptx
python restitution\build\build_pptx.py
```
