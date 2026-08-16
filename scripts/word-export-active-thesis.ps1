$ErrorActionPreference = 'Stop'
$pdf = Join-Path (Resolve-Path 'Doc').Path 'CareerFit-Thesis-Report.pdf'
$word = [Runtime.InteropServices.Marshal]::GetActiveObject('Word.Application')
$doc = $word.Documents.Item(1)
try {
    $doc.ExportAsFixedFormat($pdf, 17)
    "pdf=$pdf pages=$($doc.ComputeStatistics(2)) words=$($doc.ComputeStatistics(0))"
}
finally {
    $doc.Close($false)
    $word.Quit()
    [Runtime.InteropServices.Marshal]::FinalReleaseComObject($doc) | Out-Null
    [Runtime.InteropServices.Marshal]::FinalReleaseComObject($word) | Out-Null
}
