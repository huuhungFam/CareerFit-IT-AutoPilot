from copy import deepcopy
from pathlib import Path
from docx import Document
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import OxmlElement
from docx.oxml.ns import qn

SRC = Path(r"C:\CODING\Thesis\Doc\PhamHuuHung__B2203557.docx")
TMP = SRC.with_name(SRC.stem + ".fit-tables.tmp.docx")
TARGET_CM = 15.5
TARGET_TWIPS = round(TARGET_CM / 2.54 * 1440)

# 1-based table numbers: 14 Use Case tables and Appendix A/B.
TARGET_TABLES = list(range(7, 21)) + [45, 46]

doc = Document(SRC)

def set_attr(el, local, value):
    el.set(qn(f"w:{local}"), str(value))

def set_table_width(tbl, width_twips):
    pr = tbl._tbl.tblPr
    tbl_w = pr.find(qn("w:tblW"))
    if tbl_w is None:
        tbl_w = OxmlElement("w:tblW")
        pr.insert(0, tbl_w)
    set_attr(tbl_w, "type", "dxa")
    set_attr(tbl_w, "w", width_twips)

    tbl_ind = pr.find(qn("w:tblInd"))
    if tbl_ind is None:
        tbl_ind = OxmlElement("w:tblInd")
        pr.append(tbl_ind)
    set_attr(tbl_ind, "type", "dxa")
    set_attr(tbl_ind, "w", 0)

def proportional_widths(widths, target):
    total = sum(widths)
    scaled = [max(1, round(w * target / total)) for w in widths]
    scaled[-1] += target - sum(scaled)
    return scaled

for table_no in TARGET_TABLES:
    table = doc.tables[table_no - 1]
    grid = table._tbl.tblGrid
    cols = list(grid.gridCol_lst)
    original = [int(c.get(qn("w:w"))) for c in cols]
    scaled = proportional_widths(original, TARGET_TWIPS)

    for col, width in zip(cols, scaled):
        set_attr(col, "w", width)

    # Preserve each cell's column span while making its preferred width agree
    # with the resized table grid.
    for row in table.rows:
        col_index = 0
        for cell in row.cells:
            tc_pr = cell._tc.get_or_add_tcPr()
            grid_span = tc_pr.find(qn("w:gridSpan"))
            span = int(grid_span.get(qn("w:val"))) if grid_span is not None else 1
            width = sum(scaled[col_index:col_index + span])
            tc_w = tc_pr.find(qn("w:tcW"))
            if tc_w is None:
                tc_w = OxmlElement("w:tcW")
                tc_pr.append(tc_w)
            set_attr(tc_w, "type", "dxa")
            set_attr(tc_w, "w", width)
            col_index += span

    table.alignment = WD_TABLE_ALIGNMENT.LEFT
    table.autofit = False
    set_table_width(table, TARGET_TWIPS)

doc.save(TMP)
TMP.replace(SRC)
print(f"updated={len(TARGET_TABLES)} target_cm={TARGET_CM} file={SRC}")
