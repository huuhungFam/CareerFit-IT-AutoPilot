$ErrorActionPreference = 'Stop'

$docPath = (Resolve-Path 'Doc\CareerFit-Thesis-Report.docx').Path
$pdfPath = Join-Path (Resolve-Path 'Doc\working').Path 'CareerFit-Thesis-Report-final-format-qa.pdf'

$wdFindStop = 0
$wdCollapseStart = 1
$wdSectionBreakNextPage = 2
$wdOrientPortrait = 0
$wdOrientLandscape = 1
$wdAlignParagraphLeft = 0
$wdAlignParagraphCenter = 1
$wdLineSpaceMultiple = 5
$wdAutoFitWindow = 2
$wdPreferredWidthPercent = 2
$wdExportFormatPDF = 17

function Find-ExactTextRange {
    param($Document, [string]$Text)
    $range = $Document.Content.Duplicate
    $find = $range.Find
    $find.ClearFormatting()
    $find.Text = $Text
    $find.Forward = $true
    $find.Wrap = $wdFindStop
    $find.MatchCase = $true
    $find.MatchWholeWord = $false
    if (-not $find.Execute()) {
        throw "Could not find exact text: $Text"
    }
    return $range
}

function Get-SectionNumberAtRange {
    param($Range)
    return $Range.Information(2) # wdActiveEndSectionNumber
}

function Insert-SectionBreakBefore {
    param($Document, [string]$Heading)
    $range = Find-ExactTextRange -Document $Document -Text $Heading
    $range.Collapse($wdCollapseStart)
    $range.InsertBreak($wdSectionBreakNextPage)
}

$word = $null
$doc = $null
try {
    $word = New-Object -ComObject Word.Application
    $word.Visible = $false
    $word.DisplayAlerts = 0

    $doc = $word.Documents.Open($docPath, $false, $false)

    $cRange = Find-ExactTextRange -Document $doc -Text 'Appendix C. Full Data Dictionary'
    $dRange = Find-ExactTextRange -Document $doc -Text 'Appendix D. Evaluation Summary'

    # Add native Word section boundaries only when Appendix C and D still share a section.
    if ((Get-SectionNumberAtRange $cRange) -eq (Get-SectionNumberAtRange $dRange)) {
        Insert-SectionBreakBefore -Document $doc -Heading 'Appendix D. Evaluation Summary'
        Insert-SectionBreakBefore -Document $doc -Heading 'Appendix C. Full Data Dictionary'
    }

    $cRange = Find-ExactTextRange -Document $doc -Text 'Appendix C. Full Data Dictionary'
    $dRange = Find-ExactTextRange -Document $doc -Text 'Appendix D. Evaluation Summary'
    $cSectionNo = Get-SectionNumberAtRange $cRange
    $dSectionNo = Get-SectionNumberAtRange $dRange

    $cSection = $doc.Sections.Item($cSectionNo)
    $cSection.PageSetup.Orientation = $wdOrientLandscape
    $cSection.PageSetup.PageWidth = $word.CentimetersToPoints(29.7)
    $cSection.PageSetup.PageHeight = $word.CentimetersToPoints(21.0)
    $cSection.PageSetup.TopMargin = $word.CentimetersToPoints(3.0)
    $cSection.PageSetup.BottomMargin = $word.CentimetersToPoints(3.0)
    $cSection.PageSetup.LeftMargin = $word.CentimetersToPoints(3.5)
    $cSection.PageSetup.RightMargin = $word.CentimetersToPoints(2.0)

    $dSection = $doc.Sections.Item($dSectionNo)
    $dSection.PageSetup.Orientation = $wdOrientPortrait
    $dSection.PageSetup.PageWidth = $word.CentimetersToPoints(21.0)
    $dSection.PageSetup.PageHeight = $word.CentimetersToPoints(29.7)
    $dSection.PageSetup.TopMargin = $word.CentimetersToPoints(3.0)
    $dSection.PageSetup.BottomMargin = $word.CentimetersToPoints(3.0)
    $dSection.PageSetup.LeftMargin = $word.CentimetersToPoints(3.5)
    $dSection.PageSetup.RightMargin = $word.CentimetersToPoints(2.0)

    # Expand Appendix C dictionaries across the landscape text area.
    $cStart = $cRange.Start
    $dStart = $dRange.Start
    for ($i = 1; $i -le $doc.Tables.Count; $i++) {
        $table = $doc.Tables.Item($i)
        if ($table.Range.Start -ge $cStart -and $table.Range.Start -lt $dStart) {
            $table.AllowAutoFit = $true
            $table.AutoFitBehavior($wdAutoFitWindow)
            $table.PreferredWidthType = $wdPreferredWidthPercent
            $table.PreferredWidth = 100

            if ($table.Columns.Count -eq 7) {
                $table.AllowAutoFit = $false
                $widths = @(32, 102, 100, 45, 45, 135, 225)
                for ($col = 1; $col -le 7; $col++) {
                    $table.Columns.Item($col).Width = $widths[$col - 1]
                }
            }

            for ($row = 1; $row -le $table.Rows.Count; $row++) {
                $table.Rows.Item($row).AllowBreakAcrossPages = 0
            }
            if ($table.Rows.Count -ge 3) {
                $table.Rows.Item($table.Rows.Count - 1).Range.ParagraphFormat.KeepWithNext = -1
            }
            $table.Rows.Item(1).HeadingFormat = -1
        }
    }

    # Ensure all substantive Word tables remain readable and do not stretch words.
    for ($i = 3; $i -le $doc.Tables.Count; $i++) {
        $table = $doc.Tables.Item($i)
        $table.Range.Font.Name = 'Times New Roman'
        $table.Range.Font.Size = 13
        $table.Range.ParagraphFormat.Alignment = $wdAlignParagraphLeft
        $table.Range.ParagraphFormat.LineSpacingRule = $wdLineSpaceMultiple
        $table.Range.ParagraphFormat.LineSpacing = 15.6
        $table.Range.ParagraphFormat.SpaceBefore = 0
        $table.Range.ParagraphFormat.SpaceAfter = 0

        if ($table.Rows.Count -gt 0 -and $table.Columns.Count -ge 3) {
            $table.Rows.Item(1).Range.ParagraphFormat.Alignment = $wdAlignParagraphCenter
            $table.Rows.Item(1).Range.Font.Bold = -1
            $table.Rows.Item(1).HeadingFormat = -1
        }
    }

    foreach ($toc in $doc.TablesOfContents) { $toc.Update() }
    foreach ($tof in $doc.TablesOfFigures) { $tof.Update() }
    $doc.Fields.Update() | Out-Null

    $doc.Repaginate()
    $doc.Save()
    $doc.ExportAsFixedFormat($pdfPath, $wdExportFormatPDF)

    [pscustomobject]@{
        Document = $docPath
        PDF = $pdfPath
        Sections = $doc.Sections.Count
        AppendixCSection = $cSectionNo
        AppendixDSection = $dSectionNo
        Pages = $doc.ComputeStatistics(2)
        Tables = $doc.Tables.Count
        TOCs = $doc.TablesOfContents.Count
        ListsOfFiguresOrTables = $doc.TablesOfFigures.Count
    } | Format-List
}
finally {
    if ($doc) { $doc.Close($false) }
    if ($word) { $word.Quit() }
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($doc) | Out-Null
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($word) | Out-Null
    [GC]::Collect()
    [GC]::WaitForPendingFinalizers()
}
