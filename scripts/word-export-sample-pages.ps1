$ErrorActionPreference = 'Stop'
$docx = (Resolve-Path 'Doc\CareerFit-Thesis-Report.docx').Path
$outDir = (Resolve-Path 'Doc\working').Path
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
try {
    $doc = $word.Documents.Open($docx, $false, $true)
    $samples = @(
        @{ Name='layout-pages-1-3.pdf'; From=1; To=3 },
        @{ Name='layout-pages-14-18.pdf'; From=14; To=18 },
        @{ Name='layout-pages-50-55.pdf'; From=50; To=55 },
        @{ Name='layout-pages-88-94.pdf'; From=88; To=94 }
    )
    foreach ($sample in $samples) {
        $path = Join-Path $outDir $sample.Name
        $doc.ExportAsFixedFormat($path, 17, $false, 0, 3, $sample.From, $sample.To)
        $path
    }
    $doc.Close($false)
}
finally {
    $word.Quit()
    [System.Runtime.InteropServices.Marshal]::FinalReleaseComObject($word) | Out-Null
}
