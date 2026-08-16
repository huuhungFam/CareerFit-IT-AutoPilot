from pathlib import Path

from docx import Document
from docx.text.paragraph import Paragraph


ROOT = Path(__file__).resolve().parents[1]
DOCX = ROOT / "Doc" / "CareerFit-Thesis-Report.docx"
ALT = "Figure 1.1. CareerFit system context"

document = Document(DOCX)
captions = [p for p in document.paragraphs if p.text.strip() == ALT]
if len(captions) != 1:
    raise RuntimeError(f"Expected one Figure 1.1 caption; found {len(captions)}")
previous = captions[0]._p.getprevious()
while previous is not None and not previous.tag.endswith("}p"):
    previous = previous.getprevious()
image_paragraph = Paragraph(previous, captions[0]._parent)
properties = image_paragraph._p.xpath(".//wp:docPr")
if len(properties) != 1:
    raise RuntimeError(f"Expected one Figure 1.1 image property element; found {len(properties)}")
properties[0].set("title", ALT)
properties[0].set("descr", ALT)
document.save(DOCX)
print(f"Added Figure 1.1 alternative text in {DOCX}")
