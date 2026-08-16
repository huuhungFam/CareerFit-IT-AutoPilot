Option Explicit

Dim fso, root, docx, pdf, word, doc, toc, tof, story, pages, words
Set fso = CreateObject("Scripting.FileSystemObject")
root = fso.GetParentFolderName(fso.GetParentFolderName(WScript.ScriptFullName))
docx = fso.BuildPath(root, "Doc\CareerFit-Thesis-Report.docx")
pdf = fso.BuildPath(root, "Doc\CareerFit-Thesis-Report.pdf")

Set word = CreateObject("Word.Application")
word.Visible = False
word.DisplayAlerts = 0

On Error Resume Next
Set doc = word.Documents.Open(docx, False, False)
If Err.Number <> 0 Then
    WScript.Echo "open-error=" & Err.Description
    word.Quit
    WScript.Quit 1
End If
On Error GoTo 0

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
words = doc.ComputeStatistics(0)
WScript.Echo "pages=" & pages & " words=" & words & " pdf=" & pdf
doc.Close False
word.Quit

Set doc = Nothing
Set word = Nothing
