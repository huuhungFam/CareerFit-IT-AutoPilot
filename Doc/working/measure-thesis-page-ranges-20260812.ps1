param(
    [Parameter(Mandatory = $true)][string]$InputDocx
)

$ErrorActionPreference = 'Stop'
$sourcePath = (Resolve-Path -LiteralPath $InputDocx).Path
$copyPath = (Resolve-Path 'Doc\working').Path + '\page-range-measure-copy.docx'
Copy-Item -LiteralPath $sourcePath -Destination $copyPath -Force

$word = $null
$document = $null
try {
    $word = New-Object -ComObject Word.Application
    $word.Visible = $false
    $word.DisplayAlerts = 0
    $word.Options.UpdateLinksAtOpen = $false
    $document = $word.Documents.Open($copyPath, $false, $false)
    $document.Repaginate()

    $targets = @(
        'CHAPTER 4. TESTING AND EVALUATION',
        'PART 3. CONCLUSION',
        'REFERENCES'
    )
    $pages = @{}
    foreach ($paragraph in $document.Paragraphs) {
        $text = $paragraph.Range.Text.Trim([char]13, [char]7, [char]32)
        if ($targets -contains $text) {
            $pages[$text] = @{
                Physical = $paragraph.Range.Information(3)
                Logical = $paragraph.Range.Information(1)
            }
        }
        [System.Runtime.InteropServices.Marshal]::ReleaseComObject($paragraph) | Out-Null
    }

    [pscustomobject]@{
        TotalPhysicalPages = $document.ComputeStatistics(2)
        Chapter4PhysicalStart = $pages['CHAPTER 4. TESTING AND EVALUATION'].Physical
        Chapter4PhysicalEnd = $pages['PART 3. CONCLUSION'].Physical - 1
        Chapter4LogicalStart = $pages['CHAPTER 4. TESTING AND EVALUATION'].Logical
        Chapter4LogicalEnd = $pages['PART 3. CONCLUSION'].Logical - 1
        ConclusionPhysicalStart = $pages['PART 3. CONCLUSION'].Physical
        ConclusionPhysicalEnd = $pages['REFERENCES'].Physical - 1
        ConclusionLogicalStart = $pages['PART 3. CONCLUSION'].Logical
        ConclusionLogicalEnd = $pages['REFERENCES'].Logical - 1
        ReferencesPhysicalStart = $pages['REFERENCES'].Physical
        ReferencesLogicalStart = $pages['REFERENCES'].Logical
    } | ConvertTo-Json -Compress
}
finally {
    if ($null -ne $document) {
        $document.Close($false)
        [System.Runtime.InteropServices.Marshal]::FinalReleaseComObject($document) | Out-Null
    }
    if ($null -ne $word) {
        $word.Quit()
        [System.Runtime.InteropServices.Marshal]::FinalReleaseComObject($word) | Out-Null
    }
    [GC]::Collect()
    [GC]::WaitForPendingFinalizers()
}
