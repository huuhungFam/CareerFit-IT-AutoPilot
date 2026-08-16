from pathlib import Path
import shutil

from docx import Document
from docx.oxml import OxmlElement
from docx.oxml.ns import qn


ROOT = Path(__file__).resolve().parents[1]
REPORT = ROOT / "Doc" / "CareerFit-Thesis-Report.docx"
BACKUP = ROOT / "Doc" / "working" / "CareerFit-Thesis-Report-before-20260809-double-cover-border.docx"


def set_double_page_border(section):
    sect_pr = section._sectPr
    borders = sect_pr.find(qn("w:pgBorders"))
    if borders is None:
        borders = OxmlElement("w:pgBorders")
        sect_pr.append(borders)

    borders.set(qn("w:offsetFrom"), "page")
    borders.set(qn("w:display"), "allPages")
    borders.set(qn("w:zOrder"), "front")

    for side_name in ("top", "left", "bottom", "right"):
        side = borders.find(qn(f"w:{side_name}"))
        if side is None:
            side = OxmlElement(f"w:{side_name}")
            borders.append(side)
        side.set(qn("w:val"), "double")
        side.set(qn("w:sz"), "18")
        side.set(qn("w:space"), "12")
        side.set(qn("w:color"), "000000")


def main():
    if not BACKUP.exists():
        BACKUP.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(REPORT, BACKUP)

    document = Document(REPORT)
    if len(document.sections) != 3:
        raise RuntimeError(f"Expected 3 sections, found {len(document.sections)}")
    set_double_page_border(document.sections[0])
    document.save(REPORT)
    print(REPORT)
    print(BACKUP)


if __name__ == "__main__":
    main()
