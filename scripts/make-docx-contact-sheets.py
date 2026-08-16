from pathlib import Path

from PIL import Image, ImageDraw


pages = Path(r"C:\CODING\Thesis\Doc\working\render-20260807\pages")
output = pages.parent / "contacts"
output.mkdir(exist_ok=True)
files = sorted(pages.glob("page-*.png"), key=lambda item: int(item.stem.split("-")[-1]))
thumb_width, thumb_height = 248, 350
columns, rows = 4, 3

for start in range(0, len(files), columns * rows):
    chunk = files[start:start + columns * rows]
    sheet = Image.new("RGB", (columns * thumb_width, rows * (thumb_height + 24)), "white")
    draw = ImageDraw.Draw(sheet)
    for offset, file in enumerate(chunk):
        image = Image.open(file).convert("RGB")
        image.thumbnail((thumb_width - 8, thumb_height - 8))
        x = (offset % columns) * thumb_width + (thumb_width - image.width) // 2
        y = (offset // columns) * (thumb_height + 24) + 4
        sheet.paste(image, (x, y))
        page = int(file.stem.split("-")[-1])
        draw.text(((offset % columns) * thumb_width + 6,
                   (offset // columns) * (thumb_height + 24) + thumb_height + 2),
                  f"Page {page}", fill="black")
    sheet.save(output / f"contact-{start // (columns * rows) + 1:02d}.png")

print(f"pages={len(files)} contacts={len(list(output.glob('*.png')))}")
