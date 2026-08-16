from pathlib import Path

from docx import Document
from docx.enum.section import WD_ORIENT
from docx.shared import Cm


ROOT = Path(__file__).resolve().parents[1]
REPORT = ROOT / "Doc" / "CareerFit-Thesis-Report.docx"

document = Document(REPORT)

for section in document.sections:
    section.orientation = WD_ORIENT.PORTRAIT
    section.page_width = Cm(21)
    section.page_height = Cm(29.7)
    section.top_margin = Cm(3)
    section.bottom_margin = Cm(3)
    section.left_margin = Cm(3.5)
    section.right_margin = Cm(2)

document.save(REPORT)

print(f"Updated margins in {REPORT}")
for index, section in enumerate(document.sections, start=1):
    print(
        f"section={index} "
        f"page={section.page_width.cm:.2f}x{section.page_height.cm:.2f}cm "
        f"margins_TBLR="
        f"{section.top_margin.cm:.2f}/"
        f"{section.bottom_margin.cm:.2f}/"
        f"{section.left_margin.cm:.2f}/"
        f"{section.right_margin.cm:.2f}cm"
    )
