from pathlib import Path
import shutil

from docx import Document
from docx.oxml.ns import qn
from docx.shared import Pt


ROOT = Path(__file__).resolve().parents[1]
REPORT = ROOT / "Doc" / "CareerFit-Thesis-Report.docx"
BACKUP = ROOT / "Doc" / "working" / "CareerFit-Thesis-Report-before-20260809-introduction-numbering.docx"

NUMBERED_HEADINGS = {
    "Problem Statement": "1. Problem Statement",
    "Background and Related Work": "2. Background and Related Work",
    "Research Objectives": "3. Research Objectives",
    "Overall Objective": "3.1 Overall Objective",
    "Specific Objectives": "3.2 Specific Objectives",
    "Research Subjects and Scope": "4. Research Subjects and Scope",
    "Research Subject": "4.1 Research Subject",
    "Research Scope": "4.2 Research Scope",
    "Research Methods and Content": "5. Research Methods and Content",
    "Research Methods": "5.1 Research Methods",
    "Research Content": "5.2 Research Content",
    "Key Contributions": "6. Key Contributions",
    "Thesis Structure": "7. Thesis Structure",
}


def format_heading(paragraph):
    for run in paragraph.runs:
        run.font.name = "Times New Roman"
        run.font.size = Pt(13)
        rpr = run._element.get_or_add_rPr()
        rfonts = rpr.get_or_add_rFonts()
        rfonts.set(qn("w:ascii"), "Times New Roman")
        rfonts.set(qn("w:hAnsi"), "Times New Roman")
        rfonts.set(qn("w:eastAsia"), "Times New Roman")


def main():
    if not BACKUP.exists():
        BACKUP.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(REPORT, BACKUP)

    document = Document(REPORT)
    in_introduction = False
    changed = []
    for paragraph in document.paragraphs:
        text = paragraph.text.strip()
        if text == "PART 1. INTRODUCTION":
            in_introduction = True
            continue
        if text == "PART 2. MAIN CONTENT":
            break
        if not in_introduction or not paragraph.style.name.startswith("Heading"):
            continue
        if text in NUMBERED_HEADINGS:
            paragraph.text = NUMBERED_HEADINGS[text]
            format_heading(paragraph)
            changed.append(paragraph.text)

    if len(changed) != len(NUMBERED_HEADINGS):
        raise RuntimeError(f"Expected {len(NUMBERED_HEADINGS)} headings, changed {len(changed)}: {changed}")

    document.save(REPORT)
    print(f"updated={REPORT}")
    print(f"backup={BACKUP}")
    for heading in changed:
        print(heading)


if __name__ == "__main__":
    main()
