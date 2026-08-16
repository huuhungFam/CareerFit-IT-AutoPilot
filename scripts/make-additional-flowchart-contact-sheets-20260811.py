from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / "Doc" / "working" / "render-20260811-additional-flowcharts-final"
PAGES = BASE / "pages"
OUT = BASE / "contact-sheets"
OUT.mkdir(parents=True, exist_ok=True)

FONT = ImageFont.truetype("arial.ttf", 24)
THUMB_W, THUMB_H, LABEL_H = 360, 510, 38
COLS, ROWS = 4, 2
PER_SHEET = COLS * ROWS


def number(path: Path) -> int:
    return int(path.stem.split("-")[-1])


pages = sorted(PAGES.glob("page-*.png"), key=number)
for index in range((len(pages) + PER_SHEET - 1) // PER_SHEET):
    selected = pages[index * PER_SHEET : (index + 1) * PER_SHEET]
    sheet = Image.new("RGB", (COLS * THUMB_W, ROWS * (THUMB_H + LABEL_H)), "#d9d9d9")
    draw = ImageDraw.Draw(sheet)
    for slot, page in enumerate(selected):
        with Image.open(page) as source:
            source = source.convert("RGB")
            source.thumbnail((THUMB_W - 12, THUMB_H - 12), Image.Resampling.LANCZOS)
            col, row = slot % COLS, slot // COLS
            x = col * THUMB_W + (THUMB_W - source.width) // 2
            y = row * (THUMB_H + LABEL_H) + (THUMB_H - source.height) // 2
            sheet.paste(source, (x, y))
            draw.text((col * THUMB_W + 12, row * (THUMB_H + LABEL_H) + THUMB_H + 4),
                      f"Page {number(page)}", font=FONT, fill="black")
    sheet.save(OUT / f"contact-{number(selected[0]):03d}-{number(selected[-1]):03d}.png", optimize=True)

print(f"pages={len(pages)} sheets={(len(pages) + PER_SHEET - 1) // PER_SHEET} out={OUT}")
