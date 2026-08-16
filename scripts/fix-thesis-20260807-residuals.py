from pathlib import Path

from docx import Document
from docx.oxml.ns import qn
from docx.shared import Pt


path = Path(r"C:\CODING\Thesis\Doc\CareerFit-Thesis-Report.docx")
doc = Document(path)

updates = {
    "The role-based workflow objective": "The role-based workflow objective was achieved at prototype level. Guests can browse public Jobs and employers. Candidates can review CVs, inspect matching and recommendation results, apply or withdraw, submit feedback, configure AutoFit, and report an active Job. Recruiters can manage Jobs, applicants, and the Talent Pool and can report a CV that is visible through an owned Job. Administrators can review grouped report cases and choose Dismiss or Ban. The 46 Chrome tests cover representative flows but not every route or browser.",
    "Major application, feedback, automation": "Major application, feedback, automation, content-report, moderation, and administrative actions create structured audit rows. Notification delivery, email-action status, report resolution, and target BANNED state add operational evidence. The project includes unit, integration, security, algorithm, and E2E tests and produces a dataset-hashed benchmark artifact.",
}

for prefix, text in updates.items():
    matches = [p for p in doc.paragraphs if p.text.strip().startswith(prefix)]
    if len(matches) != 1:
        raise RuntimeError(f"{prefix}: {len(matches)}")
    paragraph = matches[0]
    paragraph.text = text
    for run in paragraph.runs:
        run.font.name = "Times New Roman"
        run.font.size = Pt(13)
        rpr = run._element.get_or_add_rPr()
        rfonts = rpr.get_or_add_rFonts()
        rfonts.set(qn("w:ascii"), "Times New Roman")
        rfonts.set(qn("w:hAnsi"), "Times New Roman")
        rfonts.set(qn("w:eastAsia"), "Times New Roman")

doc.save(path)
print(path)
