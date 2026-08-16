$ErrorActionPreference = 'Stop'

$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$docx = Join-Path $root 'Doc\CareerFit-Thesis-Report.docx'
$python = 'C:\Users\PhamHuuHwng\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe'
$sourceA = Join-Path $root 'scripts\simplify-thesis-language-20260722.py'
$sourceB = Join-Path $root 'scripts\fix-thesis-language-residuals-20260722.py'

$targetJson = @'
import ast, json, sys
targets = []
for path in sys.argv[1:]:
    tree = ast.parse(open(path, encoding="utf-8").read())
    for node in tree.body:
        if not isinstance(node, ast.Assign):
            continue
        names = [x.id for x in node.targets if isinstance(x, ast.Name)]
        if not ({"REPLACEMENTS", "STYLE_REPLACEMENTS"} & set(names)):
            continue
        mapping = ast.literal_eval(node.value)
        targets.extend(mapping.values())
print(json.dumps(sorted(set(targets)), ensure_ascii=False))
'@ | & $python - $sourceA $sourceB

$targets = $targetJson | ConvertFrom-Json
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
$doc = $null
$found = @()
try {
    $doc = $word.Documents.Open($docx, $false, $true)
    foreach ($paragraph in $doc.Paragraphs) {
        $text = $paragraph.Range.Text.Trim([char]13, [char]7).Trim()
        foreach ($target in $targets) {
            if ($text.Contains([string]$target)) {
                $found += [pscustomobject]@{
                    page = [int]$paragraph.Range.Information(3)
                    target = [string]$target
                    text = $text
                }
            }
        }
        [Runtime.InteropServices.Marshal]::FinalReleaseComObject($paragraph) | Out-Null
    }
}
finally {
    if ($doc -ne $null) { $doc.Close($false) }
    $word.Quit()
    if ($doc -ne $null) { [Runtime.InteropServices.Marshal]::FinalReleaseComObject($doc) | Out-Null }
    [Runtime.InteropServices.Marshal]::FinalReleaseComObject($word) | Out-Null
}

$pages = $found.page | Sort-Object -Unique
[pscustomobject]@{
    target_count = $targets.Count
    found_count = $found.Count
    pages = @($pages)
    found = @($found)
} | ConvertTo-Json -Depth 4
