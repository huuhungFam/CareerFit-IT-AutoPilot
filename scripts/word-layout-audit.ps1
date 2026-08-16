$ErrorActionPreference = 'Stop'
$docx = (Resolve-Path 'Doc\CareerFit-Thesis-Report.docx').Path
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
try {
    $doc = $word.Documents.Open($docx, $false, $true)
    $doc.Repaginate()
    "PAGES=$($doc.ComputeStatistics(2)) SECTIONS=$($doc.Sections.Count)"
    "HEADINGS"
    foreach ($paragraph in $doc.Paragraphs) {
        $styleName = [string]$paragraph.Range.Style.NameLocal
        if ($styleName -like 'Heading*') {
            $text = $paragraph.Range.Text.Trim([char]13, [char]7, ' ')
            $page = $paragraph.Range.Information(3)
            $y = [math]::Round([double]$paragraph.Range.Information(6), 1)
            "page=$page y=$y style=$styleName text=$text"
        }
    }
    "IMAGES"
    for ($i = 1; $i -le $doc.InlineShapes.Count; $i++) {
        $shape = $doc.InlineShapes.Item($i)
        $page = $shape.Range.Information(3)
        $height = [math]::Round($shape.Height / 72, 2)
        "image=$i page=$page heightIn=$height"
    }
    "TABLES"
    for ($i = 1; $i -le $doc.Tables.Count; $i++) {
        $table = $doc.Tables.Item($i)
        $startPage = $table.Range.Information(3)
        $end = $table.Range.Duplicate
        $end.Collapse(0)
        $endPage = $end.Information(3)
        "table=$i pages=$startPage-$endPage rows=$($table.Rows.Count)"
    }
    $doc.Close($false)
}
finally {
    $word.Quit()
    [System.Runtime.InteropServices.Marshal]::FinalReleaseComObject($word) | Out-Null
}
