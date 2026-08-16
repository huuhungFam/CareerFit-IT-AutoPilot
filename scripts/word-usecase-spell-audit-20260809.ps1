$ErrorActionPreference = 'Stop'
$path = (Resolve-Path 'Doc\CareerFit-Thesis-Report.docx').Path
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
$doc = $null
try {
    $doc = $word.Documents.Open($path, $false, $true)
    $startFind = $doc.Content.Duplicate
    $startFind.Find.ClearFormatting()
    if (-not $startFind.Find.Execute('1.5.1 Candidate Manages CV, Profile, and Portfolio and Receives Match Results')) {
        throw 'Use-case start heading was not found.'
    }
    $endFind = $doc.Content.Duplicate
    $endFind.Start = $startFind.End
    $endFind.Find.ClearFormatting()
    if (-not $endFind.Find.Execute('1.6 Chapter Summary')) {
        throw 'Use-case end heading was not found.'
    }
    $range = $doc.Range($startFind.Start, $endFind.Start)
    $errors = @($range.SpellingErrors | ForEach-Object { $_.Text } | Sort-Object -Unique)
    Write-Output "unique_spelling_flags=$($errors.Count)"
    $errors
}
finally {
    if ($doc -ne $null) { $doc.Close($false) }
    $word.Quit()
    if ($doc -ne $null) { [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($doc) }
    [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($word)
    [GC]::Collect()
    [GC]::WaitForPendingFinalizers()
}
