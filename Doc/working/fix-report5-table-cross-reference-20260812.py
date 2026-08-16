from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile
import shutil
import tempfile


DOCX = Path(r"C:\CODING\Thesis\Doc\CareerFit-Thesis-Report(5).docx")
OLD = b"endpoints returned the observations shown in Table 4.7."
NEW = b"endpoints returned the observations shown in Table 4.6."


with tempfile.TemporaryDirectory() as temporary_directory:
    temporary = Path(temporary_directory)
    with ZipFile(DOCX, "r") as archive:
        archive.extractall(temporary)

    document_xml = temporary / "word" / "document.xml"
    content = document_xml.read_bytes()
    count = content.count(OLD)
    if count != 1:
        raise SystemExit(f"Expected exactly one target occurrence, found {count}.")
    document_xml.write_bytes(content.replace(OLD, NEW, 1))

    rebuilt = DOCX.with_suffix(".tmp.docx")
    with ZipFile(rebuilt, "w", ZIP_DEFLATED) as archive:
        for path in temporary.rglob("*"):
            if path.is_file():
                archive.write(path, path.relative_to(temporary))
    shutil.move(rebuilt, DOCX)

print("Corrected Table 4.7 cross-reference to Table 4.6.")
