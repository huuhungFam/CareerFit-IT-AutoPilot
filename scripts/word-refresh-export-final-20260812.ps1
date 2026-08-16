$ErrorActionPreference = 'Stop'

$sourcePath = (Resolve-Path 'Doc\CareerFit-Thesis-Report.docx').Path
$docPath = Join-Path (Resolve-Path 'Doc\working').Path 'CareerFit-Thesis-Report-final-refreshed-20260812.docx'
$finalPath = (Resolve-Path 'Doc').Path + '\CareerFit-Thesis-Report.docx'
Copy-Item -LiteralPath $sourcePath -Destination $docPath -Force

$word = $null
$doc = $null
$completed = $false
try {
    $word = New-Object -ComObject Word.Application
    $word.Visible = $false
    $word.DisplayAlerts = 0
    $word.Options.UpdateFieldsAtPrint = $true

    $doc = $word.Documents.Open($docPath, $false, $false)

    # Section breaks around Appendix C must not restart page numbering.
    for ($sectionIndex = 4; $sectionIndex -le 5; $sectionIndex++) {
        $section = $doc.Sections.Item($sectionIndex)
        for ($footerIndex = 1; $footerIndex -le 3; $footerIndex++) {
            $footer = $section.Footers.Item($footerIndex)
            if ($footer.Exists) {
                $footer.LinkToPrevious = $true
                if ($footer.PageNumbers.Count -gt 0) {
                    $footer.PageNumbers.RestartNumberingAtSection = $false
                }
            }
            [System.Runtime.InteropServices.Marshal]::ReleaseComObject($footer) | Out-Null
        }
        [System.Runtime.InteropServices.Marshal]::ReleaseComObject($section) | Out-Null
    }

    for ($i = 1; $i -le $doc.TablesOfContents.Count; $i++) {
        $toc = $doc.TablesOfContents.Item($i)
        $toc.Update()
        [System.Runtime.InteropServices.Marshal]::ReleaseComObject($toc) | Out-Null
    }
    for ($i = 1; $i -le $doc.TablesOfFigures.Count; $i++) {
        $tof = $doc.TablesOfFigures.Item($i)
        $tof.Update()
        [System.Runtime.InteropServices.Marshal]::ReleaseComObject($tof) | Out-Null
    }

    $doc.Repaginate()
    $doc.Save()
    $pages = $doc.ComputeStatistics(2)
    $words = $doc.ComputeStatistics(0)
    $sections = $doc.Sections.Count
    $tables = $doc.Tables.Count
    $completed = $true

    Write-Output "pages=$pages words=$words sections=$sections tables=$tables"
}
finally {
    if ($null -ne $doc) {
        $doc.Close($false)
        [System.Runtime.InteropServices.Marshal]::FinalReleaseComObject($doc) | Out-Null
    }
    if ($null -ne $word) {
        $word.Quit()
        [System.Runtime.InteropServices.Marshal]::FinalReleaseComObject($word) | Out-Null
    }
    [GC]::Collect()
    [GC]::WaitForPendingFinalizers()
}

if ($completed) {
    Copy-Item -LiteralPath $docPath -Destination $finalPath -Force
    Write-Output $finalPath
}
