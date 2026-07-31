# Restitution01 — LearnEU · CXO-oriented restitution

> Alternative restitution deck for **AMA Case Study 33 — LearnEU**, framed for a
> C-suite audience (CEO, CFO, COO, CIO, CTO, CMO, CHRO, CDO, CISO, CRO, CCO,
> CLO, CSO, CAIO, CXO).
>
> Focus: **outcomes, not architecture**. Every main slide answers "so what?" for
> at least one CXO. Architecture, security, compliance and ops detail live in
> the appendix so they can be pulled up on demand during Q&A.

## Layout

| Path | Purpose |
|---|---|
| `deck-outline.md` | 20-slide main deck + 1 demo + appendices, mapped to CXO concerns. |
| `cxo-question-bank.md` | Anticipated CXO questions → which slide / appendix answers them. |
| `slides/` | One Markdown file per slide. Same format as the original `restitution/slides/`. |
| `build/build_pptx.py` | Adapted builder that reads `Restitution01/slides/*.md` and writes `build/LearnEU-CXO-Restitution.pptx`. |

## Constraints (from the brief)

- **20 slides maximum** in the main deck (excluding the demo).
- **Demo** is a separate moment (Slide 17), no slide count limit.
- **Appendices** are unrestricted and meant to absorb every CXO question.
- Audience: any combination of CEO / COO / CFO / CIO / CTO / CMO / CHRO / CDO
  / CISO / CRO / CCO / CLO / CSO / CAIO / CXO.

## Build

```powershell
python -m pip install python-pptx
python Restitution01\build\build_pptx.py
```

Output: `Restitution01\build\LearnEU-CXO-Restitution.pptx`.
