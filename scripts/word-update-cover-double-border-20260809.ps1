$ErrorActionPreference = 'Stop'
$path = (Resolve-Path 'Doc\CareerFit-Thesis-Report.docx').Path
$word = $null
$doc = $null
$createdWord = $false
$openedDocument = $false

try {
    try {
        $word = [System.Runtime.InteropServices.Marshal]::GetActiveObject('Word.Application')
    }
    catch {
        $word = New-Object -ComObject Word.Application
        $word.Visible = $false
        $word.DisplayAlerts = 0
        $createdWord = $true
    }

    foreach ($candidate in $word.Documents) {
        if ($candidate.FullName -eq $path) {
            $doc = $candidate
            break
        }
    }

    if ($null -eq $doc) {
        $doc = $word.Documents.Open($path, $false, $false)
        $openedDocument = $true
    }

    if ($doc.Sections.Count -ne 3) {
        throw "Expected 3 sections, found $($doc.Sections.Count)"
    }

    $section = $doc.Sections.Item(1)
    $borders = $section.Borders
    $borders.Enable = 1
    $borders.DistanceFrom = 1
    $borders.DistanceFromTop = 12
    $borders.DistanceFromBottom = 12
    $borders.DistanceFromLeft = 12
    $borders.DistanceFromRight = 12
    $borders.AlwaysInFront = $true

    foreach ($borderIndex in @(-1, -2, -3, -4)) {
        $border = $borders.Item($borderIndex)
        $border.LineStyle = 7
        $border.LineWidth = 18
        $border.Color = 0
    }

    $doc.Save()
    Write-Output "updated=$path sections=$($doc.Sections.Count) pages=$($doc.ComputeStatistics(2))"
}
finally {
    if ($openedDocument -and $null -ne $doc) { $doc.Close($false) }
    if ($createdWord -and $null -ne $word) { $word.Quit() }
    if ($null -ne $doc) { [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($doc) }
    if ($null -ne $word) { [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($word) }
    [GC]::Collect()
    [GC]::WaitForPendingFinalizers()
}
