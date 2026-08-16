from pathlib import Path

from docx import Document


REPORT = Path(r"C:\CODING\Thesis\Doc\CareerFit-Thesis-Report.docx")
BAD_PREFIX = 'TOC \\h \\z \\t "Table Caption,1"'


def remove_paragraph(paragraph) -> None:
    element = paragraph._element
    element.getparent().remove(element)
    paragraph._p = paragraph._element = None


document = Document(REPORT)
removed = []
for paragraph in list(document.paragraphs):
    if paragraph.text.startswith(BAD_PREFIX):
        removed.append(paragraph.text)
        remove_paragraph(paragraph)

if len(removed) != 1:
    raise RuntimeError(f"Expected one leaked TOC field-code paragraph, found {len(removed)}")

document.save(REPORT)
print(f"Removed leaked field-code paragraph: {removed[0]}")
