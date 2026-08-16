from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
PAGES = ROOT / "Doc" / "working" / "render-20260811-standard-flowcharts-final" / "pages"
OUT = ROOT / "Doc" / "working" / "render-20260811-standard-flowcharts-final" / "contact-sheets"
OUT.mkdir(parents=True, exist_ok=True)

FONT = ImageFont.truetype("arial.ttf", 24)
THUMB_W = 360
THUMB_H = 510
LABEL_H = 38
COLS = 4
ROWS = 2
PER_SHEET = COLS * ROWS


def page_number(path: Path) -> int:
    return int(path.stem.split("-")[-1])


pages = sorted(PAGES.glob("page-*.png"), key=page_number)
for sheet_index in range((len(pages) + PER_SHEET - 1) // PER_SHEET):
    selected = pages[sheet_index * PER_SHEET : (sheet_index + 1) * PER_SHEET]
    sheet = Image.new("RGB", (COLS * THUMB_W, ROWS * (THUMB_H + LABEL_H)), "#d9d9d9")
    draw = ImageDraw.Draw(sheet)
    for slot, page in enumerate(selected):
        with Image.open(page) as source:
            source = source.convert("RGB")
            source.thumbnail((THUMB_W - 12, THUMB_H - 12), Image.Resampling.LANCZOS)
            col = slot % COLS
            row = slot // COLS
            x = col * THUMB_W + (THUMB_W - source.width) // 2
            y = row * (THUMB_H + LABEL_H) + (THUMB_H - source.height) // 2
            sheet.paste(source, (x, y))
            label = f"Page {page_number(page)}"
            draw.text((col * THUMB_W + 12, row * (THUMB_H + LABEL_H) + THUMB_H + 4), label, font=FONT, fill="black")
    first, last = page_number(selected[0]), page_number(selected[-1])
    sheet.save(OUT / f"contact-{first:03d}-{last:03d}.png", optimize=True)

print(f"pages={len(pages)} sheets={(len(pages) + PER_SHEET - 1) // PER_SHEET} out={OUT}")
