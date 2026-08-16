from pathlib import Path
from docx import Document
from docx.oxml.ns import qn

ROOT = Path(__file__).resolve().parents[1]
path = ROOT / "Doc" / "CareerFit-Thesis-Report.docx"
doc = Document(path)

for node in doc._element.xpath(".//w:instrText"):
    text = node.text or ""
    if 'TOC \\h \\z \\c "Figure"' in text:
        node.text = 'TOC \\h \\z \\t "Figure Caption,1"'
    elif 'TOC \\h \\z \\c "Table"' in text:
        node.text = 'TOC \\h \\z \\t "Table Caption,1"'

settings = doc.settings._element
update = settings.find(qn("w:updateFields"))
if update is None:
    from docx.oxml import OxmlElement
    update = OxmlElement("w:updateFields")
    settings.append(update)
update.set(qn("w:val"), "true")

doc.save(path)
print(path)
