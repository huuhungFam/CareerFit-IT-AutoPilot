$ErrorActionPreference = 'Stop'
$docx = (Resolve-Path 'Doc\CareerFit-Thesis-Report.docx').Path
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0

function Find-Heading($document, $text) {
    foreach ($paragraph in $document.Paragraphs) {
        $value = $paragraph.Range.Text.Trim([char]13, [char]7, ' ')
        $styleName = [string]$paragraph.Range.Style.NameLocal
        if ($value -eq $text -and $styleName -like 'Heading*') {
            return $paragraph.Range.Duplicate
        }
    }
    throw "Heading not found: $text"
}

try {
    $doc = $word.Documents.Open($docx)
    $listHeading = Find-Heading $doc 'LIST OF TABLES'
    $nextHeading = Find-Heading $doc 'LIST OF ABBREVIATIONS'
    $range = $doc.Range($listHeading.End, $nextHeading.Start)
    $range.Delete()
    $range.Collapse(1)
    $field = $doc.Fields.Add($range, -1, 'TOC \h \z \t "Table Caption,1"', $true)
    $null = $field.Update()
    foreach ($toc in $doc.TablesOfContents) { $toc.Update() }
    foreach ($tof in $doc.TablesOfFigures) { $tof.Update() }
    $doc.Repaginate()
    $doc.Save()
    "pages=$($doc.ComputeStatistics(2)) words=$($doc.ComputeStatistics(0))"
    $doc.Close($false)
}
finally {
    $word.Quit()
    [System.Runtime.InteropServices.Marshal]::FinalReleaseComObject($word) | Out-Null
}
