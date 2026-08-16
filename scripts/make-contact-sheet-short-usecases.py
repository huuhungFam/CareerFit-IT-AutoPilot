from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


SOURCE = Path(r"C:\CODING\Thesis\Doc\working\render-20260811-short-usecases")
OUTPUT = SOURCE / "contact-sheets"
OUTPUT.mkdir(parents=True, exist_ok=True)
PAGES = sorted(SOURCE.glob("page-*.jpg"), key=lambda path: int(path.stem.split("-")[-1]))
FONT = ImageFont.truetype(r"C:\Windows\Fonts\arial.ttf", 17)

columns = 4
pages_per_sheet = 16
thumb_width = 300
gap = 14
label_height = 26

for start in range(0, len(PAGES), pages_per_sheet):
    batch = PAGES[start:start + pages_per_sheet]
    thumbnails = []
    for path in batch:
        source = Image.open(path).convert("RGB")
        height = round(source.height * thumb_width / source.width)
        thumbnails.append((path, source.resize((thumb_width, height))))
    rows = (len(batch) + columns - 1) // columns
    thumb_height = max(image.height for _, image in thumbnails)
    sheet = Image.new(
        "RGB",
        (gap + columns * (thumb_width + gap), gap + rows * (label_height + thumb_height + gap)),
        "#d9dde4",
    )
    draw = ImageDraw.Draw(sheet)
    for index, (path, thumbnail) in enumerate(thumbnails):
        row, column = divmod(index, columns)
        x = gap + column * (thumb_width + gap)
        y = gap + row * (label_height + thumb_height + gap)
        page = int(path.stem.split("-")[-1])
        draw.text((x, y + 3), f"Page {page}", font=FONT, fill="black")
        sheet.paste(thumbnail, (x, y + label_height))
    first = int(batch[0].stem.split("-")[-1])
    last = int(batch[-1].stem.split("-")[-1])
    sheet.save(OUTPUT / f"pages-{first:03d}-{last:03d}.jpg", quality=90)

print(f"pages={len(PAGES)} sheets={(len(PAGES) + pages_per_sheet - 1) // pages_per_sheet}")
