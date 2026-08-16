param(
    [Parameter(Mandatory = $true)][int]$From,
    [Parameter(Mandatory = $true)][int]$To,
    [Parameter(Mandatory = $true)][string]$OutputPath
)

$ErrorActionPreference = 'Stop'
$docx = (Resolve-Path 'Doc\CareerFit-Thesis-Report.docx').Path
$pdf = [System.IO.Path]::GetFullPath((Join-Path (Get-Location) $OutputPath))
$parent = Split-Path $pdf
if (-not (Test-Path $parent)) { New-Item -ItemType Directory -Path $parent -Force | Out-Null }
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
$doc = $null
try {
    $doc = $word.Documents.Open($docx, $false, $true)
    $doc.ExportAsFixedFormat($pdf, 17, $false, 0, 3, $From, $To, 0, $true, $true, 1, $true, $true, $false)
    "pdf=$pdf from=$From to=$To size=$((Get-Item $pdf).Length)"
}
finally {
    if ($doc -ne $null) { $doc.Close($false) }
    $word.Quit()
    if ($doc -ne $null) { [Runtime.InteropServices.Marshal]::FinalReleaseComObject($doc) | Out-Null }
    [Runtime.InteropServices.Marshal]::FinalReleaseComObject($word) | Out-Null
}
