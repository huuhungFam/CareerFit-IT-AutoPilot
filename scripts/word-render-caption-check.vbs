Option Explicit

Dim fso, root, docx, pdf, word, doc, paragraph, targetPage, pages
Set fso = CreateObject("Scripting.FileSystemObject")
root = fso.GetParentFolderName(fso.GetParentFolderName(WScript.ScriptFullName))
docx = fso.BuildPath(root, "Doc\CareerFit-Thesis-Report.docx")
pdf = fso.BuildPath(root, "Doc\working\caption-placement-check.pdf")

Set word = CreateObject("Word.Application")
word.Visible = False
word.DisplayAlerts = 0
Set doc = word.Documents.Open(docx, False, True)
doc.Repaginate

targetPage = 0
For Each paragraph In doc.Paragraphs
    If InStr(1, paragraph.Range.Text, "Table 1.1. Mapping of objectives", 1) > 0 Then
        targetPage = paragraph.Range.Information(3)
        Exit For
    End If
Next

doc.ExportAsFixedFormat pdf, 17
pages = doc.ComputeStatistics(2)
WScript.Echo "table_1_1_page=" & targetPage & " pages=" & pages & " pdf=" & pdf
doc.Close False
word.Quit
Set doc = Nothing
Set word = Nothing
