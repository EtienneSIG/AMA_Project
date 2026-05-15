"""Build the AMA restitution .pptx from restitution/slides/*.md.

Reads every slide-NN-<slug>.md, opens the official template
`Subject/Azure Master Architect_Prezo_Template_v01.pptx`, and emits
`restitution/build/LearnEU-AMA-Restitution.pptx`.

Each slide spec must follow the format defined by the
`restitution-deck-builder` agent:

    # Slide N · Section · Title
    - **Layout (template):** Title | Agenda | Content 1-col | ...
    - **Headline:** ...
    - **Sub-headline:** ...
    - **Rubric coverage:** ...
    - **Source refs:** ...

    ## Body bullets [(left — ...) | (right — ...)]
    - bullet
    - bullet

    ## Visual
    free text

    ## Speaker notes ...
    free text

The script picks a real template layout per slide:
- slide 1                          -> 'Title slide'
- slide 2                          -> 'Agenda'
- slide 20 (closing)               -> '1_Closing logo slide'
- explicit 'Content 2-col'         -> '3 Columns'
- explicit 'Architecture' / 'Demo' -> 'Title Only'
- everything else                  -> 'Right Content'
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

from pptx import Presentation
from pptx.util import Pt

ROOT = Path(__file__).resolve().parents[2]
TEMPLATE = ROOT / "Subject" / "Azure Master Architect_Prezo_Template_v01.pptx"
SLIDES_DIR = ROOT / "restitution" / "slides"
OUT = ROOT / "restitution" / "build" / "LearnEU-AMA-Restitution.pptx"


def parse_slide(md: str) -> dict:
    """Extract structured fields from a slide markdown file."""
    out = {
        "title": "",
        "layout": "",
        "headline": "",
        "subheadline": "",
        "rubric": "",
        "sources": "",
        "bullets": [],
        "visual": "",
        "notes": "",
        "demo_cue": "",
    }
    # Title line: # Slide N · Section · Title
    m = re.search(r"^#\s+Slide\s+\d+\s*·\s*[^·]+·\s*(.+)$", md, re.MULTILINE)
    if m:
        out["title"] = m.group(1).strip()

    def field(name: str) -> str:
        rx = re.compile(rf"^-\s+\*\*{re.escape(name)}.*?:\*\*\s*(.+)$", re.MULTILINE)
        m = rx.search(md)
        return m.group(1).strip() if m else ""

    out["layout"] = field("Layout (template)")
    out["headline"] = field("Headline")
    out["subheadline"] = field("Sub-headline")
    out["rubric"] = field("Rubric coverage")
    out["sources"] = field("Source refs")

    # All "## Body bullets" sections (may be 1 or 2 columns)
    bullets: list[str] = []
    for sec in re.finditer(
        r"^##\s+Body bullets[^\n]*\n((?:(?!^##\s).+\n?)*)", md, re.MULTILINE
    ):
        block = sec.group(1)
        for line in block.splitlines():
            line = line.strip()
            if line.startswith("- "):
                bullets.append(line[2:].strip())
    out["bullets"] = bullets

    def section(name: str) -> str:
        m = re.search(
            rf"^##\s+{re.escape(name)}[^\n]*\n((?:(?!^##\s).+\n?)*)",
            md,
            re.MULTILINE,
        )
        return m.group(1).strip() if m else ""

    out["visual"] = section("Visual")
    out["demo_cue"] = section("Demo cue")
    # Speaker notes header may have "(FR or EN per user choice)" qualifier
    m = re.search(
        r"^##\s+Speaker notes[^\n]*\n((?:(?!^##\s).+\n?)*)", md, re.MULTILINE
    )
    if m:
        out["notes"] = m.group(1).strip()
    return out


def pick_layout(prs: Presentation, slide_idx: int, layout_hint: str):
    """Map our spec's layout name to a real layout in the template."""
    layouts = {l.name: l for l in prs.slide_layouts}
    hint = (layout_hint or "").lower()
    if slide_idx == 1:
        return layouts.get("Title slide")
    if slide_idx == 2 or "agenda" in hint:
        return layouts.get("Agenda")
    if slide_idx == 20 or "closing" in hint:
        return (
            layouts.get("1_Closing logo slide")
            or layouts.get("2_Closing logo slide")
        )
    if "2-col" in hint or "two col" in hint:
        return layouts.get("3 Columns") or layouts.get("Right Content")
    if "architecture" in hint or "demo" in hint:
        return layouts.get("Title Only") or layouts.get("Right Content")
    return layouts.get("Right Content") or layouts.get("Title Only")


def first_text_placeholder(slide, exclude_idx: set[int]):
    """Return the first body-ish placeholder not in exclude_idx, or None."""
    for ph in slide.placeholders:
        if ph.placeholder_format.idx in exclude_idx:
            continue
        if ph.has_text_frame:
            return ph
    return None


def set_title(slide, text: str) -> int | None:
    """Set the slide title; return the placeholder idx that was used."""
    title = slide.shapes.title
    if title is not None:
        title.text = text or ""
        return title.placeholder_format.idx
    # Fallback: first placeholder
    for ph in slide.placeholders:
        if ph.has_text_frame:
            ph.text = text or ""
            return ph.placeholder_format.idx
    return None


def set_body(slide, bullets: list[str], subheadline: str, used_idx: set[int]):
    body = first_text_placeholder(slide, used_idx)
    if body is None:
        return
    tf = body.text_frame
    tf.clear()
    lines: list[tuple[str, int]] = []
    if subheadline:
        lines.append((subheadline, 0))
    for b in bullets:
        lines.append((b, 1 if subheadline else 0))
    if not lines:
        return
    # First line goes into the existing single paragraph
    first_text, first_lvl = lines[0]
    tf.paragraphs[0].text = first_text
    tf.paragraphs[0].level = first_lvl
    for run in tf.paragraphs[0].runs:
        run.font.size = Pt(20 if first_lvl == 0 else 16)
    for text, lvl in lines[1:]:
        p = tf.add_paragraph()
        p.text = text
        p.level = lvl
        for run in p.runs:
            run.font.size = Pt(16 if lvl >= 1 else 18)


def set_notes(slide, notes: str, footer: str = "") -> None:
    if not notes and not footer:
        return
    tf = slide.notes_slide.notes_text_frame
    tf.clear()
    full = notes
    if footer:
        full = (notes + "\n\n" + footer).strip()
    tf.text = full


def main() -> int:
    if not TEMPLATE.exists():
        print(f"ERROR: template not found: {TEMPLATE}", file=sys.stderr)
        return 2
    if not SLIDES_DIR.is_dir():
        print(f"ERROR: slides dir not found: {SLIDES_DIR}", file=sys.stderr)
        return 2

    prs = Presentation(str(TEMPLATE))
    # Wipe any existing slides shipped in the template (drop rel + sldId)
    sldIdLst = prs.slides._sldIdLst  # noqa: SLF001
    for sldId in list(sldIdLst):
        rId = sldId.attrib[
            "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id"
        ]
        prs.part.drop_rel(rId)
        sldIdLst.remove(sldId)

    md_files = sorted(SLIDES_DIR.glob("slide-*.md"))
    if not md_files:
        print(f"ERROR: no slide-*.md files in {SLIDES_DIR}", file=sys.stderr)
        return 2

    for path in md_files:
        m = re.match(r"slide-(\d+)-", path.name)
        if not m:
            continue
        idx = int(m.group(1))
        spec = parse_slide(path.read_text(encoding="utf-8"))
        layout = pick_layout(prs, idx, spec["layout"])
        if layout is None:
            print(f"WARN: no layout for slide {idx}, skipping")
            continue
        slide = prs.slides.add_slide(layout)
        title_text = spec["headline"] or spec["title"]
        used_title_idx = set_title(slide, title_text)
        used = {used_title_idx} if used_title_idx is not None else set()
        # Closing slide: just title, no body
        if idx not in (1, 20):
            set_body(slide, spec["bullets"], spec["subheadline"], used)
        footer_lines = []
        if spec["rubric"]:
            footer_lines.append(f"[Rubric coverage] {spec['rubric']}")
        if spec["visual"]:
            footer_lines.append(f"[Visual] {spec['visual']}")
        if spec["demo_cue"]:
            footer_lines.append(f"[Demo cue] {spec['demo_cue']}")
        if spec["sources"]:
            footer_lines.append(f"[Source refs] {spec['sources']}")
        set_notes(slide, spec["notes"], "\n".join(footer_lines))
        print(
            f"slide {idx:02d} · layout='{layout.name}' · {title_text[:60]}"
        )

    OUT.parent.mkdir(parents=True, exist_ok=True)
    prs.save(str(OUT))
    print(f"\nSaved: {OUT}  ({OUT.stat().st_size:,} bytes, {len(md_files)} slides)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
