from pathlib import Path

from docx import Document
from docx.oxml.ns import qn
from docx.shared import Pt


REPORT = Path(__file__).resolve().parents[1] / "Doc" / "CareerFit-Thesis-Report.docx"
OLD = (
    "The report contains an Introduction, four chapters, and a Conclusion. "
    "Chapter 1 defines the problem, stakeholders, requirements, and use cases. "
    "Chapter 2 presents the theoretical background and solution design. "
    "Chapter 3 explains the implementation. Chapter 4 presents the evaluation "
    "method, evidence, and threats to validity. The Conclusion discusses "
    "achievements, limitations, and future work."
)
INTERMEDIATE = (
    "The report contains an Introduction, four main chapters, and a Conclusion. "
    "Chapters 1–4 respectively present requirements, theoretical background and "
    "design, implementation, and evaluation. The Conclusion summarizes the "
    "achievements, limitations, and future work."
)
NEW = (
    "The report includes an Introduction, four chapters covering requirements, "
    "design, implementation, and evaluation, and a Conclusion."
)


document = Document(REPORT)
matches = [p for p in document.paragraphs if p.text.strip() in {OLD, INTERMEDIATE, NEW}]
if len(matches) != 1:
    raise RuntimeError(f"Expected one Thesis Structure paragraph, found {len(matches)}")
paragraph = matches[0]
paragraph.text = NEW
for run in paragraph.runs:
    run.font.name = "Times New Roman"
    run.font.size = Pt(13)
    rfonts = run._element.get_or_add_rPr().get_or_add_rFonts()
    rfonts.set(qn("w:ascii"), "Times New Roman")
    rfonts.set(qn("w:hAnsi"), "Times New Roman")
    rfonts.set(qn("w:eastAsia"), "Times New Roman")
document.save(REPORT)
print(REPORT)
