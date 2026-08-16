$ErrorActionPreference = 'Stop'

$sourcePath = (Resolve-Path 'Doc\CareerFit-Thesis-Report.docx').Path
$inputPath = (Resolve-Path 'Doc\working').Path + '\CareerFit-Thesis-Report-pdf-export-copy.docx'
$outputPath = (Resolve-Path 'Doc\working').Path + '\CareerFit-Thesis-Report-final-format-qa.pdf'
Copy-Item -LiteralPath $sourcePath -Destination $inputPath -Force
$word = $null
$document = $null

try {
    $word = New-Object -ComObject Word.Application
    $word.Visible = $false
    $word.DisplayAlerts = 0
    $word.AutomationSecurity = 3
    $word.Options.UpdateLinksAtOpen = $false
    $word.Options.SaveNormalPrompt = $false
    $document = $word.Documents.Open($inputPath, $false, $false)
    $document.ExportAsFixedFormat($outputPath, 17)
    $pages = $document.ComputeStatistics(2)
    Write-Output "pdf=$outputPath pages=$pages"
}
finally {
    if ($null -ne $document) {
        $document.Close($false)
        [System.Runtime.InteropServices.Marshal]::FinalReleaseComObject($document) | Out-Null
    }
    if ($null -ne $word) {
        $word.Quit()
        [System.Runtime.InteropServices.Marshal]::FinalReleaseComObject($word) | Out-Null
    }
    [GC]::Collect()
    [GC]::WaitForPendingFinalizers()
}
