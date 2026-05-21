"""Generate PNG visual assets for the LearnEU CXO TED-style deck.

All assets are procedural (no internet) so the deck stays fully reproducible.
Produces 1920x1080 backgrounds plus several smaller tiles.
"""
from __future__ import annotations

import math
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont

OUT = Path(__file__).resolve().parents[1] / "assets"
OUT.mkdir(parents=True, exist_ok=True)

W, H = 1920, 1080

NAVY = (18, 42, 74)
DEEP = (8, 20, 40)
ORANGE = (242, 140, 0)
TEAL = (0, 175, 175)
PINK = (235, 90, 120)
GREEN = (90, 200, 130)
SOFT = (200, 212, 230)
WHITE = (255, 255, 255)


def _font(size: int) -> ImageFont.ImageFont:
    for name in ("seguibl.ttf", "segoeuib.ttf", "arialbd.ttf", "DejaVuSans-Bold.ttf"):
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            continue
    return ImageFont.load_default()


def gradient(start: tuple, end: tuple, w: int = W, h: int = H) -> Image.Image:
    img = Image.new("RGB", (w, h), start)
    px = img.load()
    for y in range(h):
        t = y / max(h - 1, 1)
        r = int(start[0] * (1 - t) + end[0] * t)
        g = int(start[1] * (1 - t) + end[1] * t)
        b = int(start[2] * (1 - t) + end[2] * t)
        for x in range(w):
            px[x, y] = (r, g, b)
    return img


def add_orbs(img: Image.Image, color: tuple, count: int = 5, alpha: int = 50) -> Image.Image:
    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)
    import random
    rnd = random.Random(7)
    for _ in range(count):
        r = rnd.randint(180, 360)
        x = rnd.randint(-100, img.width - 100)
        y = rnd.randint(-100, img.height - 100)
        d.ellipse([x - r, y - r, x + r, y + r], fill=(*color, alpha))
    overlay = overlay.filter(ImageFilter.GaussianBlur(60))
    return Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB")


def save(img: Image.Image, name: str) -> None:
    p = OUT / name
    img.save(p, "PNG", optimize=True)
    print(f"  wrote {p.relative_to(OUT.parent)}  ({p.stat().st_size:,} bytes)")


# ---------- backgrounds ----------

def bg_hero_navy() -> None:
    img = gradient(DEEP, NAVY)
    img = add_orbs(img, ORANGE, count=3, alpha=40)
    img = add_orbs(img, TEAL, count=2, alpha=30)
    save(img, "bg-hero-navy.png")


def bg_hero_orange() -> None:
    img = gradient((180, 90, 0), ORANGE)
    img = add_orbs(img, WHITE, count=4, alpha=25)
    save(img, "bg-hero-orange.png")


def bg_hero_teal() -> None:
    img = gradient((0, 80, 90), TEAL)
    img = add_orbs(img, WHITE, count=4, alpha=25)
    save(img, "bg-hero-teal.png")


def bg_hero_pink() -> None:
    img = gradient((130, 30, 60), PINK)
    img = add_orbs(img, WHITE, count=4, alpha=25)
    save(img, "bg-hero-pink.png")


def bg_hero_green() -> None:
    img = gradient((20, 90, 60), GREEN)
    img = add_orbs(img, WHITE, count=4, alpha=25)
    save(img, "bg-hero-green.png")


def bg_dark_grid() -> None:
    img = gradient(DEEP, NAVY)
    d = ImageDraw.Draw(img)
    for x in range(0, W, 80):
        d.line([(x, 0), (x, H)], fill=(40, 60, 90), width=1)
    for y in range(0, H, 80):
        d.line([(0, y), (W, y)], fill=(40, 60, 90), width=1)
    img = add_orbs(img, ORANGE, count=2, alpha=35)
    save(img, "bg-dark-grid.png")


# ---------- persona tiles ----------

def persona(name: str, initials: str, color: tuple, file: str) -> None:
    img = gradient(DEEP, NAVY)
    d = ImageDraw.Draw(img)
    cx, cy = W // 2, H // 2 - 60
    r = 280
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=color)
    f_init = _font(260)
    bbox = d.textbbox((0, 0), initials, font=f_init)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    d.text((cx - tw // 2, cy - th // 2 - 20), initials, fill=WHITE, font=f_init)
    f_name = _font(90)
    bbox = d.textbbox((0, 0), name, font=f_name)
    tw = bbox[2] - bbox[0]
    d.text(((W - tw) // 2, cy + r + 40), name, fill=WHITE, font=f_name)
    save(img, file)


# ---------- EU map (very stylized) ----------

def eu_map() -> None:
    img = gradient(DEEP, NAVY)
    d = ImageDraw.Draw(img)
    countries = {
        "NL": (760, 380, ORANGE),
        "BE": (720, 460, ORANGE),
        "DE": (900, 460, ORANGE),
        "PL": (1100, 440, ORANGE),
        "RO": (1180, 600, ORANGE),
    }
    other = [
        (550, 420), (620, 350), (820, 300), (1000, 320), (1050, 600),
        (650, 600), (880, 720), (780, 700), (1230, 380), (1280, 700),
        (520, 600), (470, 500), (560, 320), (920, 580), (1150, 540),
    ]
    for x, y in other:
        d.ellipse([x - 32, y - 32, x + 32, y + 32], fill=(40, 70, 110))
    for code, (x, y, c) in countries.items():
        d.ellipse([x - 55, y - 55, x + 55, y + 55], fill=c)
        f = _font(36)
        bbox = d.textbbox((0, 0), code, font=f)
        tw = bbox[2] - bbox[0]
        th = bbox[3] - bbox[1]
        d.text((x - tw // 2, y - th // 2 - 6), code, fill=WHITE, font=f)
    f = _font(70)
    d.text((180, 140), "Five markets. One platform.", fill=WHITE, font=f)
    save(img, "eu-map.png")


# ---------- big stat backgrounds ----------

def stat_card(text: str, sub: str, color: tuple, file: str) -> None:
    img = gradient(DEEP, NAVY)
    img = add_orbs(img, color, count=3, alpha=55)
    d = ImageDraw.Draw(img)
    f_big = _font(540)
    bbox = d.textbbox((0, 0), text, font=f_big)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    d.text(((W - tw) // 2, (H - th) // 2 - 70), text, fill=color, font=f_big)
    f_sub = _font(60)
    bbox = d.textbbox((0, 0), sub, font=f_sub)
    tw = bbox[2] - bbox[0]
    d.text(((W - tw) // 2, H // 2 + 280), sub, fill=WHITE, font=f_sub)
    save(img, file)


# ---------- compliance lock ----------

def lock_eu() -> None:
    img = gradient(DEEP, (10, 30, 60))
    d = ImageDraw.Draw(img)
    cx, cy = W // 2, H // 2
    r = 320
    d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=ORANGE, width=14)
    inner = 12
    for i in range(12):
        a = math.radians(i * 30 - 90)
        x = cx + math.cos(a) * (r - 40)
        y = cy + math.sin(a) * (r - 40)
        d.ellipse([x - inner, y - inner, x + inner, y + inner], fill=ORANGE)
    f = _font(180)
    bbox = d.textbbox((0, 0), "EU", font=f)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    d.text((cx - tw // 2, cy - th // 2 - 20), "EU", fill=WHITE, font=f)
    f2 = _font(70)
    sub = "Privacy by design"
    bbox = d.textbbox((0, 0), sub, font=f2)
    tw = bbox[2] - bbox[0]
    d.text(((W - tw) // 2, cy + r + 60), sub, fill=SOFT, font=f2)
    save(img, "eu-lock.png")


def main() -> None:
    bg_hero_navy()
    bg_hero_orange()
    bg_hero_teal()
    bg_hero_pink()
    bg_hero_green()
    bg_dark_grid()
    persona("Lucas, 12 \u00b7 Learner", "L", TEAL, "persona-learner.png")
    persona("Mr Klein \u00b7 Teacher", "K", ORANGE, "persona-teacher.png")
    persona("Sophie \u00b7 Parent", "S", PINK, "persona-parent.png")
    eu_map()
    stat_card("40%", "the gap between schools using the same content", ORANGE, "stat-gap.png")
    stat_card("35%", "of teacher hours lost to admin grading", PINK, "stat-admin.png")
    stat_card("12mo", "to enter every new EU market \u2014 today", TEAL, "stat-12mo.png")
    stat_card("4.1M", "minors counting on us to get this right", GREEN, "stat-learners.png")
    stat_card("\u221226%", "outcome gap reduction we commit to", ORANGE, "stat-reduction.png")
    stat_card("\u20ac55M", "annual value at run-rate", GREEN, "stat-value.png")
    stat_card("6 wk", "new market \u2014 down from 12 months", TEAL, "stat-6wk.png")
    stat_card("100%", "GDPR Article 8 \u2014 always", PINK, "stat-gdpr.png")
    lock_eu()
    print(f"\nAll assets in {OUT}")


if __name__ == "__main__":
    main()
