from __future__ import annotations

import math
from pathlib import Path

import pypdfium2 as pdfium
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
PDF = ROOT / "Doc" / "working" / "CareerFit-Thesis-Report-final-format-qa.pdf"
OUT = ROOT / "Doc" / "working" / "final-format-qa-contact-sheets"


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for old_sheet in OUT.glob("sheet-*.jpg"):
        old_sheet.unlink()
    pdf = pdfium.PdfDocument(PDF)
    pages_per_sheet = 12
    thumb_w, thumb_h = 360, 500
    gutter, label_h = 18, 28
    cols, rows = 3, 4
    font = ImageFont.load_default()

    for sheet_index in range(math.ceil(len(pdf) / pages_per_sheet)):
        canvas = Image.new(
            "RGB",
            (cols * thumb_w + (cols + 1) * gutter, rows * (thumb_h + label_h) + (rows + 1) * gutter),
            "white",
        )
        draw = ImageDraw.Draw(canvas)
        for slot in range(pages_per_sheet):
            page_index = sheet_index * pages_per_sheet + slot
            if page_index >= len(pdf):
                break
            page = pdf[page_index]
            bitmap = page.render(scale=1.0)
            image = bitmap.to_pil().convert("RGB")
            image.thumbnail((thumb_w, thumb_h), Image.Resampling.LANCZOS)
            col, row = slot % cols, slot // cols
            x = gutter + col * thumb_w + max(0, (thumb_w - image.width) // 2)
            y = gutter + row * (thumb_h + label_h)
            canvas.paste(image, (x, y))
            draw.rectangle((x, y, x + image.width, y + image.height), outline="#777777", width=1)
            draw.text((gutter + col * thumb_w + 4, y + thumb_h + 5), f"Page {page_index + 1}", fill="black", font=font)
        out = OUT / f"sheet-{sheet_index + 1:02d}.jpg"
        canvas.save(out, quality=88)
        print(out)

    print(f"pages={len(pdf)} sheets={math.ceil(len(pdf) / pages_per_sheet)}")


if __name__ == "__main__":
    main()
