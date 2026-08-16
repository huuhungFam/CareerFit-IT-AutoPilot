$ErrorActionPreference = 'Stop'

$docPath = (Resolve-Path 'Doc\CareerFit-Thesis-Report(5).docx').Path
$pdfPath = (Resolve-Path 'Doc\working').Path + '\CareerFit-Thesis-Report(5)-QA.pdf'
$word = $null
$document = $null
$completed = $false

try {
    $word = New-Object -ComObject Word.Application
    $word.Visible = $false
    $word.DisplayAlerts = 0
    $word.AutomationSecurity = 3
    $word.Options.UpdateLinksAtOpen = $false
    $word.Options.SaveNormalPrompt = $false
    $word.Options.UpdateFieldsAtPrint = $true

    $document = $word.Documents.Open($docPath, $false, $false)

    for ($sectionIndex = 4; $sectionIndex -le [Math]::Min(5, $document.Sections.Count); $sectionIndex++) {
        $section = $document.Sections.Item($sectionIndex)
        for ($footerIndex = 1; $footerIndex -le 3; $footerIndex++) {
            $footer = $section.Footers.Item($footerIndex)
            if ($footer.Exists) {
                $footer.LinkToPrevious = $true
                if ($footer.PageNumbers.Count -gt 0) {
                    $footer.PageNumbers.RestartNumberingAtSection = $false
                }
                $null = $footer.Range.Fields.Update()
            }
            [System.Runtime.InteropServices.Marshal]::ReleaseComObject($footer) | Out-Null
        }
        [System.Runtime.InteropServices.Marshal]::ReleaseComObject($section) | Out-Null
    }

    for ($i = 1; $i -le $document.TablesOfContents.Count; $i++) {
        $toc = $document.TablesOfContents.Item($i)
        $toc.Update()
        [System.Runtime.InteropServices.Marshal]::ReleaseComObject($toc) | Out-Null
    }
    for ($i = 1; $i -le $document.TablesOfFigures.Count; $i++) {
        $tof = $document.TablesOfFigures.Item($i)
        $tof.Update()
        [System.Runtime.InteropServices.Marshal]::ReleaseComObject($tof) | Out-Null
    }
    $null = $document.Fields.Update()
    $document.Repaginate()
    $document.Save()

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

    $document.ExportAsFixedFormat($pdfPath, 17)
    $completed = $true

    [pscustomobject]@{
        Docx = $docPath
        Pdf = $pdfPath
        TotalPhysicalPages = $document.ComputeStatistics(2)
        WordCount = $document.ComputeStatistics(0)
        Sections = $document.Sections.Count
        Tables = $document.Tables.Count
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

if (-not $completed) {
    throw 'Word refresh/export did not complete.'
}
