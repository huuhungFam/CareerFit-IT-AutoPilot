from pathlib import Path

from docx import Document
from docx.table import Table
from docx.text.paragraph import Paragraph


ROOT = Path(__file__).resolve().parents[1]
DOCX = ROOT / "Doc" / "CareerFit-Thesis-Report.docx"
doc = Document(DOCX)
table_index = 0
last_caption = ""
last_heading = ""

for child in doc.element.body.iterchildren():
    if child.tag.endswith("}p"):
        paragraph = Paragraph(child, doc)
        text = " ".join(paragraph.text.split())
        if paragraph.style.name.startswith("Heading") and text:
            last_heading = text
        if paragraph.style.name == "Table Caption" and text:
            last_caption = text
    elif child.tag.endswith("}tbl"):
        table_index += 1
        table = Table(child, doc)
        print(f"{table_index:02d}\t{last_heading}\t{last_caption}\trows={len(table.rows)} cols={len(table.columns)}")
