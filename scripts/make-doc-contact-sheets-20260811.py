from pathlib import Path
import sys
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else ROOT / "Doc" / "working" / "render-20260811-data-design"
OUTPUT = SOURCE / "contact-sheets"
OUTPUT.mkdir(parents=True, exist_ok=True)

pages = sorted(SOURCE.glob("page-*.png"))
font = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 20)
cols, rows = 5, 4
thumb_w, thumb_h = 300, 425
gap_x, gap_y, label_h = 18, 24, 30
margin = 24

for sheet_index in range(0, len(pages), cols * rows):
    batch = pages[sheet_index:sheet_index + cols * rows]
    width = margin * 2 + cols * thumb_w + (cols - 1) * gap_x
    height = margin * 2 + rows * (thumb_h + label_h) + (rows - 1) * gap_y
    sheet = Image.new("RGB", (width, height), "#D0D0D0")
    draw = ImageDraw.Draw(sheet)
    for index, path in enumerate(batch):
        row, col = divmod(index, cols)
        x = margin + col * (thumb_w + gap_x)
        y = margin + row * (thumb_h + label_h + gap_y)
        with Image.open(path) as page:
            page = page.convert("RGB")
            page.thumbnail((thumb_w, thumb_h))
            px = x + (thumb_w - page.width) // 2
            py = y + (thumb_h - page.height) // 2
            sheet.paste(page, (px, py))
        label = path.stem.replace("page-", "Page ")
        draw.text((x + thumb_w // 2, y + thumb_h + 5), label, font=font, fill="black", anchor="ma")
    first = sheet_index + 1
    last = sheet_index + len(batch)
    sheet.save(OUTPUT / f"contact-{first:03d}-{last:03d}.png", optimize=True)
    print(OUTPUT / f"contact-{first:03d}-{last:03d}.png")
