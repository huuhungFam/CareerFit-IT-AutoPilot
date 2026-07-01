$ErrorActionPreference = "Continue"
$EvidenceFiles = @()

for ($i = 1; $i -le 3; $i++) {
    Write-Host "================ RUN $i ================" -ForegroundColor Cyan
    
    # Run the script and capture its output
    $outputFile = "temp_output_$i.txt"
    powershell.exe -ExecutionPolicy Bypass -File .\scripts\generate_evidence.ps1 | Tee-Object -FilePath $outputFile
    $exitCode = $LASTEXITCODE
    
    if ($exitCode -ne 0) {
        Write-Host "Run $i FAILED with exit code $exitCode! Halting." -ForegroundColor Red
        Remove-Item $outputFile -ErrorAction Ignore
        exit 1
    }

    # Extract evidence file path from output
    $content = Get-Content $outputFile
    $evidenceMatch = $content | Select-String -Pattern "Evidence generation completed.*?: (.*UAT_Evidence_.*\.txt)" | Select-Object -Last 1
    if ($evidenceMatch) {
        $EvidenceFiles += $evidenceMatch.Matches[0].Groups[1].Value.Trim()
    }
    Remove-Item $outputFile -ErrorAction Ignore
}

$UniqueFiles = $EvidenceFiles | Select-Object -Unique

if ($UniqueFiles.Count -ne 3) {
    Write-Host "`nERROR: Not all evidence files are unique!" -ForegroundColor Red
    exit 1
}

Write-Host "`nAll 3 runs PASSED!" -ForegroundColor Green
Write-Host "Evidence Files Generated:"
foreach ($f in $UniqueFiles) {
    Write-Host "- $f" -ForegroundColor Yellow
}
exit 0
