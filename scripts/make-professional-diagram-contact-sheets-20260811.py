from pathlib import Path
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
PAGES = ROOT / "Doc" / "working" / "render-20260811-professional-diagrams-final2" / "pages"
OUT = ROOT / "Doc" / "working" / "render-20260811-professional-diagrams-final2" / "contact-sheets"
OUT.mkdir(parents=True, exist_ok=True)

font = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 24)
page_paths = sorted(PAGES.glob("page-*.png"), key=lambda p: int(p.stem.split("-")[-1]))

thumb_w, thumb_h = 520, 735
label_h = 40
cols, rows = 2, 4

for start in range(0, len(page_paths), cols * rows):
    group = page_paths[start:start + cols * rows]
    sheet = Image.new("RGB", (cols * thumb_w, rows * (thumb_h + label_h)), "#D0D0D0")
    draw = ImageDraw.Draw(sheet)
    for idx, path in enumerate(group):
        page_no = int(path.stem.split("-")[-1])
        with Image.open(path) as source:
            source = source.convert("RGB")
            source.thumbnail((thumb_w - 20, thumb_h - 20), Image.Resampling.LANCZOS)
            x = (idx % cols) * thumb_w + (thumb_w - source.width) // 2
            y = (idx // cols) * (thumb_h + label_h) + 10
            sheet.paste(source, (x, y))
            draw.text((idx % cols * thumb_w + thumb_w // 2, y + thumb_h - 5), f"Page {page_no}", font=font, fill="black", anchor="ma")
    first = int(group[0].stem.split("-")[-1])
    last = int(group[-1].stem.split("-")[-1])
    sheet.save(OUT / f"contact-{first:03d}-{last:03d}.png", optimize=True)

print(f"pages={len(page_paths)} sheets={len(list(OUT.glob('contact-*.png')))}")
