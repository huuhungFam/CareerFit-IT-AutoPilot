Option Explicit

Dim fso, root, docx, pdf, word, doc, toc, tof, story, pages
Set fso = CreateObject("Scripting.FileSystemObject")
root = fso.GetParentFolderName(fso.GetParentFolderName(WScript.ScriptFullName))
docx = fso.BuildPath(root, "Doc\CareerFit-Thesis-Report.docx")
pdf = fso.BuildPath(root, "Doc\working\caption-placement-check.pdf")

Set word = CreateObject("Word.Application")
word.Visible = False
word.DisplayAlerts = 0
Set doc = word.Documents.Open(docx, False, False)

For Each story In doc.StoryRanges
    story.Fields.Update
Next
For Each toc In doc.TablesOfContents
    toc.Update
Next
For Each tof In doc.TablesOfFigures
    tof.Update
Next

doc.Repaginate
doc.Save
doc.ExportAsFixedFormat pdf, 17
pages = doc.ComputeStatistics(2)
WScript.Echo "pages=" & pages & " pdf=" & pdf
doc.Close False
word.Quit
Set doc = Nothing
Set word = Nothing
