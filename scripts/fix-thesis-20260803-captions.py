from pathlib import Path

from docx import Document
from docx.oxml.ns import qn
from docx.shared import Pt


path = Path(r"C:\CODING\Thesis\Doc\CareerFit-Thesis-Report.docx")
doc = Document(path)
updates = {
    "Figure 1.5.": "Figure 1.5. CV review, confirmation, and matching sequence",
    "Figure 3.3.": "Figure 3.3. CV ingestion, review, and confirmation pipeline",
    "Figure 3.5.": "Figure 3.5. Direct score and Potential assessment flow",
    "Figure 3.8.": "Figure 3.8. Per-account AutoFit policy guard",
    "Figure 3.10.": "Figure 3.10. Frontend routes, server-side catalogue, and API data flow",
}
for prefix, text in updates.items():
    matches = [p for p in doc.paragraphs if p.text.strip().startswith(prefix)]
    if not matches:
        raise RuntimeError(prefix)
    paragraph = matches[-1]
    paragraph.text = text
    for run in paragraph.runs:
        run.font.name = "Times New Roman"
        run.font.size = Pt(11)
        rpr = run._element.get_or_add_rPr()
        rpr.rFonts.set(qn("w:ascii"), "Times New Roman")
        rpr.rFonts.set(qn("w:hAnsi"), "Times New Roman")
        rpr.rFonts.set(qn("w:eastAsia"), "Times New Roman")

doc.save(path)
print(path)
