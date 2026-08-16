from docx import Document


document = Document(r"C:\CODING\Thesis\Doc\CareerFit-Thesis-Report.docx")
print(f"sections={len(document.sections)}")
for index, section in enumerate(document.sections):
    print(
        index,
        "start=", section.start_type,
        "margins=", tuple(round(value.cm, 2) for value in (
            section.top_margin,
            section.bottom_margin,
            section.left_margin,
            section.right_margin,
        )),
        "pgBorders=", "pgBorders" in section._sectPr.xml,
    )

for index, paragraph in enumerate(document.paragraphs[:100]):
    xml = paragraph._p.xml
    if "sectPr" in xml or 'w:type="page"' in xml or "lastRenderedPageBreak" in xml:
        print(
            "paragraph=", index,
            "style=", paragraph.style.name,
            "text=", repr(paragraph.text),
            "section_break=", "sectPr" in xml,
            "explicit_page_break=", 'w:type="page"' in xml,
            "rendered_breaks=", xml.count("lastRenderedPageBreak"),
        )
