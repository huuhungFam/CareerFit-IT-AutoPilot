param(
    [string]$InputPath = "Doc\CareerFit-Thesis-Report.docx",
    [string]$OutputPath = "Doc\working\word-proofing-audit-fast-20260812.json"
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
    $doc = $word.Documents.Open($fullInput, $false, $true)

    $spelling = [System.Collections.Generic.List[object]]::new()
    foreach ($range in $doc.SpellingErrors) {
        $context = $range.Paragraphs.Item(1).Range.Text.Trim([char]13, [char]7, ' ')
        $spelling.Add([pscustomobject]@{
            text = $range.Text
            page = $range.Information(3)
            context = $context
        })
    }

    $grammar = [System.Collections.Generic.List[object]]::new()
    foreach ($range in $doc.GrammaticalErrors) {
        $context = $range.Paragraphs.Item(1).Range.Text.Trim([char]13, [char]7, ' ')
        $grammar.Add([pscustomobject]@{
            text = $range.Text
            page = $range.Information(3)
            context = $context
        })
    }

    $result = [pscustomobject]@{
        document = $fullInput
        spelling_count = $spelling.Count
        grammar_count = $grammar.Count
        spelling = $spelling
        grammar = $grammar
    }
    [System.IO.File]::WriteAllText(
        $fullOutput,
        ($result | ConvertTo-Json -Depth 5),
        [System.Text.UTF8Encoding]::new($false)
    )
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
