$ErrorActionPreference = 'Stop'
$docx = (Resolve-Path 'Doc\CareerFit-Thesis-Report.docx').Path
$pdf = Join-Path (Split-Path $docx) 'CareerFit-Thesis-Report.pdf'
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
try {
    $doc = $word.Documents.Open($docx)
    foreach ($story in $doc.StoryRanges) {
        $null = $story.Fields.Update()
    }
    foreach ($toc in $doc.TablesOfContents) {
        $toc.Update()
    }
    foreach ($tof in $doc.TablesOfFigures) {
        $tof.Update()
    }
    $doc.Repaginate()
    $doc.Save()
    $doc.ExportAsFixedFormat($pdf, 17)
    $pages = $doc.ComputeStatistics(2)
    $words = $doc.ComputeStatistics(0)
    "pages=$pages words=$words pdf=$pdf"
    $doc.Close($false)
}
finally {
    $word.Quit()
    [System.Runtime.InteropServices.Marshal]::FinalReleaseComObject($word) | Out-Null
}
