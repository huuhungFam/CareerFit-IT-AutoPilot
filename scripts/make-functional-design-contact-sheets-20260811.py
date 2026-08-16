from pathlib import Path
import sys

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "Doc" / "working" / "functional-design-page-render"
OUTPUT = SOURCE / "contact-sheets"
PER_SHEET = 9
THUMB_WIDTH = 360
LABEL_HEIGHT = 28
GAP = 14
COLS = 3


def page_number(path: Path) -> int:
    return int(path.stem.rsplit("-", 1)[-1])


pages = sorted(SOURCE.glob("page-*.png"), key=page_number)
if not pages:
    raise SystemExit("No rendered pages found")
OUTPUT.mkdir(parents=True, exist_ok=True)
font = ImageFont.truetype(r"C:\Windows\Fonts\arial.ttf", 16)

for sheet_index in range(0, len(pages), PER_SHEET):
    batch = pages[sheet_index : sheet_index + PER_SHEET]
    thumbs = []
    for path in batch:
        image = Image.open(path).convert("RGB")
        height = round(image.height * THUMB_WIDTH / image.width)
        thumbs.append((path, image.resize((THUMB_WIDTH, height))))
    rows = (len(batch) + COLS - 1) // COLS
    thumb_height = max(image.height for _, image in thumbs)
    width = GAP + COLS * (THUMB_WIDTH + GAP)
    height = GAP + rows * (LABEL_HEIGHT + thumb_height + GAP)
    sheet = Image.new("RGB", (width, height), "#d9dde4")
    draw = ImageDraw.Draw(sheet)
    for index, (path, image) in enumerate(thumbs):
        row, col = divmod(index, COLS)
        x = GAP + col * (THUMB_WIDTH + GAP)
        y = GAP + row * (LABEL_HEIGHT + thumb_height + GAP)
        draw.text((x, y + 4), f"Page {page_number(path)}", font=font, fill="black")
        sheet.paste(image, (x, y + LABEL_HEIGHT))
    first = page_number(batch[0])
    last = page_number(batch[-1])
    sheet.save(OUTPUT / f"pages-{first:03d}-{last:03d}.jpg", quality=90)

print(f"pages={len(pages)} sheets={(len(pages) + PER_SHEET - 1) // PER_SHEET}")
