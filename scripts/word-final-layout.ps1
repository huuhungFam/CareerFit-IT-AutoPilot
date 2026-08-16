$ErrorActionPreference = 'Stop'
$docx = (Resolve-Path 'Doc\CareerFit-Thesis-Report.docx').Path
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0

function Find-ExactText($document, $text) {
    $range = $document.Content.Duplicate
    $find = $range.Find
    $find.ClearFormatting()
    $find.Text = $text
    $find.Forward = $true
    $find.Wrap = 0
    if (-not $find.Execute()) { throw "Text not found: $text" }
    return $range
}

function Find-ExactHeading($document, $text) {
    foreach ($paragraph in $document.Paragraphs) {
        $value = $paragraph.Range.Text.Trim([char]13, [char]7, ' ')
        $styleName = [string]$paragraph.Range.Style.NameLocal
        if ($value -eq $text -and $styleName -like 'Heading*') {
            return $paragraph.Range.Duplicate
        }
    }
    throw "Heading not found: $text"
}

function Set-CenteredPageNumber($section, $style) {
    $footer = $section.Footers.Item(1)
    $footer.LinkToPrevious = $false
    $footer.Range.Text = ''
    $footer.Range.ParagraphFormat.Alignment = 1
    $numbers = $footer.PageNumbers
    $numbers.RestartNumberingAtSection = $true
    $numbers.StartingNumber = 1
    $numbers.NumberStyle = $style
    $null = $numbers.Add(1, $true)
}

try {
    $doc = $word.Documents.Open($docx)

    if ($doc.Sections.Count -eq 1) {
        $ack = Find-ExactHeading $doc 'ACKNOWLEDGEMENTS'
        $ack.Collapse(1)
        $ack.InsertBreak(2)
    }
    if ($doc.Sections.Count -eq 2) {
        $chapter = Find-ExactHeading $doc 'CHAPTER 1. INTRODUCTION'
        $chapter.Collapse(1)
        $chapter.InsertBreak(2)
    }
    if ($doc.Sections.Count -ne 3) { throw "Expected 3 sections, found $($doc.Sections.Count)" }

    foreach ($section in $doc.Sections) {
        $section.PageSetup.SectionStart = 2
        $section.PageSetup.TopMargin = $word.CentimetersToPoints(2.01)
        $section.PageSetup.BottomMargin = $word.CentimetersToPoints(2.01)
        $section.PageSetup.LeftMargin = $word.CentimetersToPoints(3.0)
        $section.PageSetup.RightMargin = $word.CentimetersToPoints(2.01)
        $section.PageSetup.HeaderDistance = $word.CentimetersToPoints(1.27)
        $section.PageSetup.FooterDistance = $word.CentimetersToPoints(1.27)
    }

    # Cover page: no page number.
    $coverFooter = $doc.Sections.Item(1).Footers.Item(1)
    $coverFooter.LinkToPrevious = $false
    $coverFooter.Range.Text = ''

    # Front matter: i, ii, iii...; main matter: 1, 2, 3...
    Set-CenteredPageNumber $doc.Sections.Item(2) 2
    Set-CenteredPageNumber $doc.Sections.Item(3) 0

    # Section breaks already start these headings on a new page.
    (Find-ExactHeading $doc 'ACKNOWLEDGEMENTS').ParagraphFormat.PageBreakBefore = 0
    (Find-ExactHeading $doc 'CHAPTER 1. INTRODUCTION').ParagraphFormat.PageBreakBefore = 0

    foreach ($toc in $doc.TablesOfContents) { $toc.Update() }
    foreach ($tof in $doc.TablesOfFigures) { $tof.Update() }
    $null = $doc.Fields.Update()
    $doc.Repaginate()
    $doc.Save()

    $pages = $doc.ComputeStatistics(2)
    $words = $doc.ComputeStatistics(0)
    "sections=$($doc.Sections.Count) pages=$pages words=$words"
    $doc.Close($false)
}
finally {
    $word.Quit()
    [System.Runtime.InteropServices.Marshal]::FinalReleaseComObject($word) | Out-Null
}
