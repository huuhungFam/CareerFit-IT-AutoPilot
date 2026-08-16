param(
    [string]$InputPath = "Doc\CareerFit-Thesis-Report.docx",
    [string]$OutputPath = "Doc\working\word-language-audit-20260718.json"
)

$ErrorActionPreference = "Stop"
$fullInput = (Resolve-Path $InputPath).Path
$fullOutput = [System.IO.Path]::GetFullPath((Join-Path (Get-Location) $OutputPath))
$word = $null
$doc = $null

try {
    $word = New-Object -ComObject Word.Application
    $word.Visible = $false
    $word.DisplayAlerts = 0
    $doc = $word.Documents.Open($fullInput, $false, $true)

    $spelling = @()
    foreach ($range in $doc.SpellingErrors) {
        $suggestions = @()
        foreach ($suggestion in $word.GetSpellingSuggestions($range.Text)) {
            $suggestions += $suggestion.Name
            if ($suggestions.Count -ge 5) { break }
        }
        $spelling += [pscustomobject]@{
            text = $range.Text
            page = $range.Information(3)
            context = $range.Paragraphs.Item(1).Range.Text.Trim()
            suggestions = $suggestions
        }
    }

    $grammar = @()
    foreach ($range in $doc.GrammaticalErrors) {
        $grammar += [pscustomobject]@{
            text = $range.Text
            page = $range.Information(3)
            context = $range.Paragraphs.Item(1).Range.Text.Trim()
        }
    }

    $result = [pscustomobject]@{
        document = $fullInput
        spelling_count = $spelling.Count
        grammar_count = $grammar.Count
        spelling = $spelling
        grammar = $grammar
    }
    $json = $result | ConvertTo-Json -Depth 6
    [System.IO.File]::WriteAllText($fullOutput, $json, [System.Text.UTF8Encoding]::new($false))
    $json
}
finally {
    if ($doc -ne $null) { $doc.Close([ref]0) }
    if ($word -ne $null) { $word.Quit() }
    if ($doc -ne $null) { [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($doc) }
    if ($word -ne $null) { [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($word) }
    [GC]::Collect()
    [GC]::WaitForPendingFinalizers()
}
