from pathlib import Path

from docx import Document
from docx.enum.text import WD_LINE_SPACING
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Pt


REPORT_PATH = Path(r"C:\CODING\Thesis\Doc\CareerFit-Thesis-Report.docx")


def keep_table_rows_together(document: Document) -> int:
    updated = 0
    for table in document.tables:
        for row in table.rows:
            tr_pr = row._tr.get_or_add_trPr()
            if tr_pr.find(qn("w:cantSplit")) is None:
                tr_pr.append(OxmlElement("w:cantSplit"))
                updated += 1
    return updated


def compact_toc_styles(document: Document) -> list[str]:
    updated_styles = []
    for style_name in ("toc 1", "toc 2", "toc 3", "TOC 1", "TOC 2", "TOC 3"):
        try:
            style = document.styles[style_name]
        except KeyError:
            continue

        style.font.name = "Times New Roman"
        style.font.size = Pt(10.5)
        style._element.rPr.rFonts.set(qn("w:ascii"), "Times New Roman")
        style._element.rPr.rFonts.set(qn("w:hAnsi"), "Times New Roman")
        style._element.rPr.rFonts.set(qn("w:eastAsia"), "Times New Roman")

        paragraph_format = style.paragraph_format
        paragraph_format.space_before = Pt(0)
        paragraph_format.space_after = Pt(0)
        paragraph_format.line_spacing_rule = WD_LINE_SPACING.SINGLE
        updated_styles.append(style.name)
    return list(dict.fromkeys(updated_styles))


document = Document(REPORT_PATH)
toc_styles = compact_toc_styles(document)
rows_updated = keep_table_rows_together(document)
document.save(REPORT_PATH)

print(f"report={REPORT_PATH}")
print(f"toc_styles={toc_styles}")
print(f"table_rows_with_cant_split_added={rows_updated}")
