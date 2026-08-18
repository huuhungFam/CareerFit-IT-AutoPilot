from pathlib import Path

import pypdfium2 as pdfium
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(r"C:\CODING\Thesis\Doc\working")
PDF = ROOT / "PhamHuuHung__B2203557-format-QA.pdf"
PAGES = ROOT / "PhamHuuHung__B2203557-format-pages"
SHEETS = ROOT / "PhamHuuHung__B2203557-format-contact-sheets"
PAGES.mkdir(parents=True, exist_ok=True)
SHEETS.mkdir(parents=True, exist_ok=True)

document = pdfium.PdfDocument(PDF)
thumbnails = []

for index in range(len(document)):
    page = document[index]
    image = page.render(scale=1.2).to_pil().convert("RGB")
    page_path = PAGES / f"page-{index + 1:03d}.jpg"
    image.save(page_path, quality=86)
    image.thumbnail((390, 550))
    thumbnails.append(image.copy())

font = ImageFont.load_default()
per_sheet = 12
for offset in range(0, len(thumbnails), per_sheet):
    group = thumbnails[offset:offset + per_sheet]
    canvas = Image.new("RGB", (1240, 2280), "white")
    draw = ImageDraw.Draw(canvas)
    for local_index, thumbnail in enumerate(group):
        row, column = divmod(local_index, 3)
        x = 15 + column * 410
        y = 15 + row * 565
        canvas.paste(thumbnail, (x, y))
        draw.text((x, y + thumbnail.height + 4), f"Page {offset + local_index + 1}", fill="black", font=font)
    canvas.save(SHEETS / f"sheet-{offset // per_sheet + 1:02d}.jpg", quality=88)

print(f"pages={len(document)} sheets={(len(thumbnails) + per_sheet - 1) // per_sheet}")
