param(
    [string]$InputPath = "Doc\CareerFit-Thesis-Report.docx",
    [string]$OutputPath = "Doc\working\word-core-proofing-audit-20260812.json"
)

$ErrorActionPreference = "Stop"
$fullInput = (Resolve-Path -LiteralPath $InputPath).Path
$fullOutput = [System.IO.Path]::GetFullPath($OutputPath)
$word = $null
$doc = $null

try {
    $word = New-Object -ComObject Word.Application
    $word.Visible = $false
    $word.DisplayAlerts = 0
    $word.Options.CheckGrammarWithSpelling = $false
    $doc = $word.Documents.Open($fullInput, $false, $true)

    $abstractStart = $null
    $referencesStart = $null
    foreach ($paragraph in $doc.Paragraphs) {
        $text = $paragraph.Range.Text.Trim([char]13, [char]7, ' ')
        if ($null -eq $abstractStart -and $text -eq 'ABSTRACT') { $abstractStart = $paragraph.Range.Start }
        if ($text -eq 'REFERENCES') { $referencesStart = $paragraph.Range.Start; break }
    }
    if ($null -eq $abstractStart -or $null -eq $referencesStart) { throw 'Could not locate audit range' }
    $core = $doc.Range($abstractStart, $referencesStart)

    $spelling = [System.Collections.Generic.List[object]]::new()
    foreach ($range in $core.SpellingErrors) {
        $spelling.Add([pscustomobject]@{
            text = $range.Text
            page = $range.Information(3)
            context = $range.Paragraphs.Item(1).Range.Text.Trim([char]13, [char]7, ' ')
        })
    }

    $grammar = [System.Collections.Generic.List[object]]::new()
    foreach ($range in $core.GrammaticalErrors) {
        $grammar.Add([pscustomobject]@{
            text = $range.Text
            page = $range.Information(3)
            context = $range.Paragraphs.Item(1).Range.Text.Trim([char]13, [char]7, ' ')
        })
    }

    $result = [pscustomobject]@{
        document = $fullInput
        range = 'ABSTRACT through Conclusion'
        spelling_count = $spelling.Count
        grammar_count = $grammar.Count
        spelling = $spelling
        grammar = $grammar
    }
    [System.IO.File]::WriteAllText($fullOutput, ($result | ConvertTo-Json -Depth 5), [System.Text.UTF8Encoding]::new($false))
    "spelling=$($spelling.Count) grammar=$($grammar.Count) output=$fullOutput"
}
finally {
    if ($null -ne $doc) { $doc.Close($false) }
    if ($null -ne $word) { $word.Quit() }
    if ($null -ne $doc) { [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($doc) }
    if ($null -ne $word) { [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($word) }
    [GC]::Collect()
    [GC]::WaitForPendingFinalizers()
}
