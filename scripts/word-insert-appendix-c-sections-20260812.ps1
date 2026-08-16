$ErrorActionPreference = 'Stop'

$sourcePath = (Resolve-Path 'Doc\working\CareerFit-Thesis-Report-final-format-20260812.docx').Path
$docPath = Join-Path (Resolve-Path 'Doc\working').Path 'CareerFit-Thesis-Report-word-sections-20260812.docx'
$finalPath = (Resolve-Path 'Doc').Path + '\CareerFit-Thesis-Report.docx'
Copy-Item -LiteralPath $sourcePath -Destination $docPath -Force
$wdFindStop = 0
$wdCollapseStart = 1
$wdSectionBreakNextPage = 2
$wdOrientPortrait = 0
$wdOrientLandscape = 1

function Find-HeadingRange {
    param($Document, [string]$Heading)
    $range = $Document.Content.Duplicate
    $find = $range.Find
    $find.ClearFormatting()
    $find.Text = $Heading
    # Search backwards so the actual appendix heading is selected instead of
    # the same text in the Table of Contents.
    $find.Forward = $false
    $find.Wrap = $wdFindStop
    $find.MatchCase = $true
    if (-not $find.Execute()) { throw "Heading not found: $Heading" }
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($find) | Out-Null
    return $range
}

function Insert-BreakBeforeHeading {
    param($Document, [string]$Heading)
    $range = Find-HeadingRange -Document $Document -Heading $Heading
    $range.Collapse($wdCollapseStart)
    $range.InsertBreak($wdSectionBreakNextPage)
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($range) | Out-Null
}

$word = $null
$doc = $null
$completed = $false
try {
    $word = New-Object -ComObject Word.Application
    $word.Visible = $false
    $word.DisplayAlerts = 0
    $doc = $word.Documents.Open($docPath, $false, $false)

    if ($doc.Sections.Count -eq 3) {
        Insert-BreakBeforeHeading -Document $doc -Heading 'Appendix D. Evaluation Summary'
        Insert-BreakBeforeHeading -Document $doc -Heading 'Appendix C. Full Data Dictionary'
    }
    if ($doc.Sections.Count -ne 5) {
        throw "Expected 5 sections after split; found $($doc.Sections.Count)"
    }

    $cRange = Find-HeadingRange -Document $doc -Heading 'Appendix C. Full Data Dictionary'
    $dRange = Find-HeadingRange -Document $doc -Heading 'Appendix D. Evaluation Summary'
    $cSectionNo = $cRange.Information(2)
    $dSectionNo = $dRange.Information(2)
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($cRange) | Out-Null
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($dRange) | Out-Null

    $cSection = $doc.Sections.Item($cSectionNo)
    $cSection.PageSetup.Orientation = $wdOrientLandscape
    $cSection.PageSetup.PageWidth = $word.CentimetersToPoints(29.7)
    $cSection.PageSetup.PageHeight = $word.CentimetersToPoints(21.0)
    $cSection.PageSetup.TopMargin = $word.CentimetersToPoints(3.0)
    $cSection.PageSetup.BottomMargin = $word.CentimetersToPoints(3.0)
    $cSection.PageSetup.LeftMargin = $word.CentimetersToPoints(3.5)
    $cSection.PageSetup.RightMargin = $word.CentimetersToPoints(2.0)
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($cSection) | Out-Null

    $dSection = $doc.Sections.Item($dSectionNo)
    $dSection.PageSetup.Orientation = $wdOrientPortrait
    $dSection.PageSetup.PageWidth = $word.CentimetersToPoints(21.0)
    $dSection.PageSetup.PageHeight = $word.CentimetersToPoints(29.7)
    $dSection.PageSetup.TopMargin = $word.CentimetersToPoints(3.0)
    $dSection.PageSetup.BottomMargin = $word.CentimetersToPoints(3.0)
    $dSection.PageSetup.LeftMargin = $word.CentimetersToPoints(3.5)
    $dSection.PageSetup.RightMargin = $word.CentimetersToPoints(2.0)
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($dSection) | Out-Null

    $doc.Save()
    $completed = $true
    Write-Output "sections=$($doc.Sections.Count) appendixC=$cSectionNo appendixD=$dSectionNo"
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
