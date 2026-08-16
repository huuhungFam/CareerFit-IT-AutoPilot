param(
    [string]$InputPath = "Doc\CareerFit-Thesis-Report.docx",
    [string]$OutputPath = "Doc\working\word-proofing-audit-fast.json"
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

    $spelling = foreach ($range in $doc.SpellingErrors) {
        [pscustomobject]@{
            text = $range.Text
            start = $range.Start
            end = $range.End
        }
    }
    $grammar = foreach ($range in $doc.GrammaticalErrors) {
        [pscustomobject]@{
            text = $range.Text
            start = $range.Start
            end = $range.End
        }
    }

    $result = [pscustomobject]@{
        document = $fullInput
        spelling_count = @($spelling).Count
        grammar_count = @($grammar).Count
        spelling = @($spelling)
        grammar = @($grammar)
    }
    [System.IO.File]::WriteAllText(
        $fullOutput,
        ($result | ConvertTo-Json -Depth 5),
        [System.Text.UTF8Encoding]::new($false)
    )
    "spelling=$(@($spelling).Count) grammar=$(@($grammar).Count) output=$fullOutput"
}
finally {
    if ($doc -ne $null) { $doc.Close([ref]0) }
    if ($word -ne $null) { $word.Quit() }
    if ($doc -ne $null) { [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($doc) }
    if ($word -ne $null) { [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($word) }
    [GC]::Collect()
    [GC]::WaitForPendingFinalizers()
}
