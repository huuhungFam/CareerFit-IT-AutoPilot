$ErrorActionPreference = 'Stop'
$docx = (Resolve-Path 'Doc\CareerFit-Thesis-Report.docx').Path
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0

function Find-Heading($document, $text) {
    foreach ($paragraph in $document.Paragraphs) {
        $value = $paragraph.Range.Text.Trim([char]13, [char]7, ' ')
        if ($value -eq $text) {
            return $paragraph.Range.Duplicate
        }
    }
    throw "Heading not found: $text"
}

try {
    $doc = $word.Documents.Open($docx)
    $tableHeading = Find-Heading $doc 'LIST OF TABLES'
    $abbreviationHeading = Find-Heading $doc 'LIST OF ABBREVIATIONS'

    $oldLists = $doc.Range($tableHeading.End, $abbreviationHeading.Start)
    foreach ($field in $oldLists.Fields) {
        $field.Locked = $false
        $field.Unlink()
    }
    $oldLists.Delete()

    $abbreviationHeading = Find-Heading $doc 'LIST OF ABBREVIATIONS'
    $insert = $doc.Range($abbreviationHeading.Start, $abbreviationHeading.Start)
    $insert.InsertBefore("LIST OF FIGURES`r")

    $figureHeading = $doc.Range(
        $abbreviationHeading.Start,
        $abbreviationHeading.Start + "LIST OF FIGURES".Length + 1
    )
    $figureHeading.Style = $doc.Styles.Item('Heading 1')

    $tableHeading = Find-Heading $doc 'LIST OF TABLES'
    $figureHeading = Find-Heading $doc 'LIST OF FIGURES'
    $tableList = $doc.Range($tableHeading.End, $figureHeading.Start)
    $tableList.Collapse(1)
    $tableField = $doc.Fields.Add(
        $tableList,
        -1,
        'TOC \h \z \t "Table Caption,1"',
        $true
    )
    $null = $tableField.Update()

    $figureHeading = Find-Heading $doc 'LIST OF FIGURES'
    $abbreviationHeading = Find-Heading $doc 'LIST OF ABBREVIATIONS'
    $figureList = $doc.Range($figureHeading.End, $abbreviationHeading.Start)
    $figureList.Collapse(1)
    $figureField = $doc.Fields.Add(
        $figureList,
        -1,
        'TOC \h \z \t "Figure Caption,1"',
        $true
    )
    $null = $figureField.Update()

    foreach ($toc in $doc.TablesOfContents) { $toc.Update() }
    $null = $doc.Fields.Update()
    $doc.Repaginate()
    $doc.Save()
    "pages=$($doc.ComputeStatistics(2)) words=$($doc.ComputeStatistics(0))"
    $doc.Close($false)
}
finally {
    $word.Quit()
    [System.Runtime.InteropServices.Marshal]::FinalReleaseComObject($word) | Out-Null
}
