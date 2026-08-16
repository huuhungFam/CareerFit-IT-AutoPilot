$ErrorActionPreference = 'Stop'
$path = (Resolve-Path 'Doc\CareerFit-Thesis-Report.docx').Path
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
$doc = $null
try {
    $doc = $word.Documents.Open($path, $false, $true)
    $bad = New-Object System.Collections.Generic.List[string]
    $checked = 0
    for ($tableIndex = 1; $tableIndex -le $doc.Tables.Count; $tableIndex++) {
        $table = $doc.Tables.Item($tableIndex)
        foreach ($cell in $table.Range.Cells) {
            $range = $cell.Range.Duplicate
            if ($range.End -gt $range.Start) { $range.End = $range.End - 1 }
            if ([string]::IsNullOrWhiteSpace($range.Text)) { continue }
            $checked++
            $size = $range.Font.Size
            $name = $range.Font.Name
            if ($size -ne 13 -or $name -ne 'Times New Roman') {
                $bad.Add("table=$tableIndex cell=$($cell.RowIndex),$($cell.ColumnIndex) font=$name size=$size")
            }
        }
    }
    Write-Output "checked_cells=$checked bad_cells=$($bad.Count)"
    $bad | Select-Object -First 30
}
finally {
    if ($doc -ne $null) { $doc.Close($false) }
    $word.Quit()
    if ($doc -ne $null) { [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($doc) }
    [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($word)
    [GC]::Collect()
    [GC]::WaitForPendingFinalizers()
}
