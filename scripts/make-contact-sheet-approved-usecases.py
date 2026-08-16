from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

source = Path(r"C:\CODING\Thesis\Doc\working\render-20260809-approved-usecases-word")
output = source / "contact-sheets"
output.mkdir(parents=True, exist_ok=True)
pages = sorted(source.glob("page-*.png"), key=lambda p: int(p.stem.split("-")[-1]))
font = ImageFont.truetype(r"C:\Windows\Fonts\arial.ttf", 15)
cols, per, thumb_w, gap, label_h = 4, 16, 250, 12, 24
for start in range(0, len(pages), per):
    batch = pages[start:start+per]
    thumbs = []
    for path in batch:
        image = Image.open(path).convert("RGB")
        h = round(image.height * thumb_w / image.width)
        thumbs.append((path, image.resize((thumb_w, h))))
    rows = (len(batch)+cols-1)//cols
    th = max(im.height for _,im in thumbs)
    sheet = Image.new("RGB", (gap+cols*(thumb_w+gap), gap+rows*(label_h+th+gap)), "#d9dde4")
    draw = ImageDraw.Draw(sheet)
    for index,(path,im) in enumerate(thumbs):
        row,col=divmod(index,cols); x=gap+col*(thumb_w+gap); y=gap+row*(label_h+th+gap)
        draw.text((x,y+3),f"Page {int(path.stem.split('-')[-1])}",font=font,fill="black")
        sheet.paste(im,(x,y+label_h))
    first=int(batch[0].stem.split('-')[-1]); last=int(batch[-1].stem.split('-')[-1])
    sheet.save(output/f"pages-{first:03d}-{last:03d}.jpg",quality=88)
print(f"pages={len(pages)} sheets={(len(pages)+per-1)//per}")
