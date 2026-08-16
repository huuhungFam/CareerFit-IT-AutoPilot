from pathlib import Path

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.text.paragraph import Paragraph


ROOT = Path(__file__).resolve().parents[1]
DOCX = ROOT / "Doc" / "CareerFit-Thesis-Report.docx"


def previous_paragraph(paragraph: Paragraph) -> Paragraph:
    node = paragraph._p.getprevious()
    while node is not None and not node.tag.endswith("}p"):
        node = node.getprevious()
    if node is None:
        raise RuntimeError("No image paragraph found")
    return Paragraph(node, paragraph._parent)


document = Document(DOCX)
matches = [
    p
    for p in document.paragraphs
    if p.text.strip() == "Figure 4.2. Observed local Job-search latency statistics"
]
if len(matches) != 1:
    raise RuntimeError(f"Expected one Figure 4.2 caption; found {len(matches)}")
image = previous_paragraph(matches[0])
if not image._p.xpath(".//w:drawing"):
    raise RuntimeError("Figure 4.2 is not immediately preceded by a drawing")
image.alignment = WD_ALIGN_PARAGRAPH.CENTER
image.paragraph_format.page_break_before = False
image.paragraph_format.keep_with_next = True
image.paragraph_format.keep_together = True
document.save(DOCX)
print("Removed the forced page break before Figure 4.2")
