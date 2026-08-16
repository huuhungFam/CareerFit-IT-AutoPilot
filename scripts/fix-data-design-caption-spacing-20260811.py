from pathlib import Path
import re

from docx import Document


ROOT = Path(__file__).resolve().parents[1]
DOCX = ROOT / "Doc" / "CareerFit-Thesis-Report.docx"

document = Document(DOCX)
changed = 0
for paragraph in document.paragraphs:
    if paragraph.style.name != "Figure Caption":
        continue
    updated = re.sub(r"^(Figure 3\.(?:1[1-9]|2[0-2])\.)(\S)", r"\1 \2", paragraph.text.strip())
    if updated == paragraph.text.strip():
        continue
    paragraph.text = updated
    previous = paragraph._p.getprevious()
    while previous is not None and not previous.tag.endswith("}p"):
        previous = previous.getprevious()
    if previous is not None:
        for prop in previous.xpath(".//wp:docPr"):
            prop.set("title", updated)
            prop.set("descr", updated)
    changed += 1

if changed != 12:
    raise RuntimeError(f"Expected 12 shifted captions to fix; found {changed}")
document.save(DOCX)
print(f"Fixed caption spacing in {changed} Chapter 3 figures")
