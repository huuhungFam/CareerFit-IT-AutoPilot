$ErrorActionPreference = 'Stop'
$docx = (Resolve-Path 'Doc\CareerFit-Thesis-Report.docx').Path
$pdf = Join-Path (Split-Path $docx) 'CareerFit-Thesis-Report-layout-preview.pdf'
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
try {
    $doc = $word.Documents.Open($docx, $false, $true)
    $doc.ExportAsFixedFormat($pdf, 17)
    "pdf=$pdf pages=$($doc.ComputeStatistics(2))"
    $doc.Close($false)
}
finally {
    $word.Quit()
    [System.Runtime.InteropServices.Marshal]::FinalReleaseComObject($word) | Out-Null
}
