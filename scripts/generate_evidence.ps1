<#
.SYNOPSIS
Generates evidence for UAT and final audit by executing tests and capturing outputs.
#>

$ErrorActionPreference = "Continue"
$HasSkips = $false

function Run-Step {
    param(
        [string]$Name,
        [scriptblock]$Action
    )
    Write-Host "`n>>> Running: $Name..." -ForegroundColor Cyan
    try {
        & $Action
        Write-Host ">>> PASS: $Name" -ForegroundColor Green
    } catch {
        Write-Host ">>> FAIL: $Name" -ForegroundColor Red
        Write-Host "$_" -ForegroundColor Red
        throw "Step failed: $Name"
    }
}

$EvidenceDir = ".\evidence"
if (-not (Test-Path -Path $EvidenceDir)) {
    New-Item -ItemType Directory -Path $EvidenceDir | Out-Null
}

$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$ReportFile = Join-Path -Path $EvidenceDir -ChildPath "UAT_Evidence_$Timestamp.txt"
$AbsReportFile = Join-Path (Get-Location).Path $ReportFile

# Remove old result
if (Test-Path ".\evaluation\result.json") {
    Remove-Item -Path ".\evaluation\result.json" -Force
}

$GitSHA = git rev-parse HEAD
$GitStatus = git status --short
$GitTreeStatus = if ([string]::IsNullOrWhiteSpace($GitStatus)) { "CLEAN" } else { "DIRTY" }

Add-Content -Path $ReportFile -Value "================ UAT EVIDENCE REPORT ================"
Add-Content -Path $ReportFile -Value "Generated At: $Timestamp"
Add-Content -Path $ReportFile -Value "Commit: $GitSHA"
Add-Content -Path $ReportFile -Value "Tree Status: $GitTreeStatus"
Add-Content -Path $ReportFile -Value "Environment: $(Get-WmiObject Win32_OperatingSystem | Select-Object -ExpandProperty Caption)"
Add-Content -Path $ReportFile -Value ""

try {
    Run-Step -Name "Generate Dataset" -Action {
        Push-Location .\scripts
        try {
            cmd /c "node generate_dataset.mjs >> ""$AbsReportFile"" 2>&1"
            if ($LASTEXITCODE -ne 0 -and $LASTEXITCODE -ne $null) { throw "Node script failed with exit code $LASTEXITCODE" }
            # Capture Dataset Hash into report
            $HashMatch = Select-String -Path $AbsReportFile -Pattern "Dataset Hash: (\w+)" | Select-Object -Last 1
            if ($HashMatch) {
                Add-Content -Path $AbsReportFile -Value "`n--- Telemetry: Dataset Hash ---"
                Add-Content -Path $AbsReportFile -Value $HashMatch.Matches[0].Groups[1].Value
            }
        } finally {
            Pop-Location
        }
    }

    Run-Step -Name "Backend Tests" -Action {
        Push-Location .\Backend\careerfit-backend
        try {
            $mvnOutput = "mvn_output.txt"
            cmd /c ".\mvnw.cmd test > $mvnOutput 2>&1"
            $exitCode = $LASTEXITCODE
            
            # Read output and append to report
            Get-Content $mvnOutput | Add-Content -Path $AbsReportFile
            
            if ($exitCode -ne 0 -and $exitCode -ne $null) { throw "Maven test failed with exit code $exitCode" }
            
            # Check for skipped tests
            $skippedMatch = Select-String -Path $mvnOutput -Pattern "Tests run: \d+, Failures: \d+, Errors: \d+, Skipped: (\d+)" | Select-Object -Last 1
            if ($skippedMatch) {
                $skippedCount = [int]$skippedMatch.Matches[0].Groups[1].Value
                if ($skippedCount -gt 0) {
                    throw "Maven test has $skippedCount skipped tests. Expected 0."
                }
            }
        } finally {
            Remove-Item $mvnOutput -ErrorAction Ignore
            Pop-Location
        }
    }

    Run-Step -Name "Frontend Build" -Action {
        Push-Location .\Frontend
        try {
            cmd /c "npm ci >> ""$AbsReportFile"" 2>&1"
            if ($LASTEXITCODE -ne 0 -and $LASTEXITCODE -ne $null) { throw "npm ci failed with exit code $LASTEXITCODE" }
            
            cmd /c "npm run build >> ""$AbsReportFile"" 2>&1"
            if ($LASTEXITCODE -ne 0 -and $LASTEXITCODE -ne $null) { throw "npm run build failed with exit code $LASTEXITCODE" }
        } finally {
            Pop-Location
        }
    }

    Run-Step -Name "Frontend Bundle Check" -Action {
        Push-Location .\Frontend
        try {
            cmd /c "npm run check-bundle >> ""$AbsReportFile"" 2>&1"
            if ($LASTEXITCODE -ne 0 -and $LASTEXITCODE -ne $null) { throw "npm run check-bundle failed with exit code $LASTEXITCODE" }
        } finally {
            Pop-Location
        }
    }

    Run-Step -Name "Docker Compose Config" -Action {
        cmd /c "docker compose --env-file .env.prod.ci -f docker-compose.prod.yml config >> ""$AbsReportFile"" 2>&1"
        if ($LASTEXITCODE -ne 0 -and $LASTEXITCODE -ne $null) { throw "docker compose config failed with exit code $LASTEXITCODE" }
    }

    Run-Step -Name "Monitoring Verification" -Action {
        try {
            cmd /c "powershell -ExecutionPolicy Bypass -File .\scripts\verify_monitoring.ps1 >> ""$AbsReportFile"" 2>&1"
            if ($LASTEXITCODE -ne 0 -and $LASTEXITCODE -ne $null) { throw "Monitoring Verification failed with exit code $LASTEXITCODE" }
        } catch {
            throw $_
        }
    }

    Run-Step -Name "Playwright E2E" -Action {
        try {
            # Skip if docker is not running as playwright tests require the stack
            cmd /c "docker ps > NUL 2>&1"
            if ($LASTEXITCODE -ne 0) {
                Write-Host "Docker is not running. Skipping Playwright E2E." -ForegroundColor Yellow
                Add-Content -Path $AbsReportFile -Value "`n--- Playwright E2E ---"
                Add-Content -Path $AbsReportFile -Value "Docker not available. Skipped E2E tests."
                $global:HasSkips = $true
                throw "Docker not available"
            } else {
                cmd /c "powershell -ExecutionPolicy Bypass -File .\scripts\run_e2e.ps1 >> ""$AbsReportFile"" 2>&1"
                if ($LASTEXITCODE -ne 0 -and $LASTEXITCODE -ne $null) { throw "Playwright E2E failed with exit code $LASTEXITCODE" }
            }
        } finally {
            # Removed Push-Location, so no Pop-Location needed
        }
    }

    Add-Content -Path $ReportFile -Value "`n--- Algorithm Evaluator Evaluation JSON ---"
    if (Test-Path ".\evaluation\result.json") {
        Get-Content ".\evaluation\result.json" | Add-Content -Path $ReportFile
        $EvidenceResultFile = Join-Path -Path $EvidenceDir -ChildPath "algorithm-result_$Timestamp.json"
        Copy-Item -Path ".\evaluation\result.json" -Destination $EvidenceResultFile -Force
    } else {
        Add-Content -Path $ReportFile -Value "Algorithm Evaluator result not found. Tests skipped?"
        $global:HasSkips = $true
    }

    if ($HasSkips) {
        Write-Host "`nEvidence generation completed WITH SKIPS: $ReportFile" -ForegroundColor Yellow
        Add-Content -Path $ReportFile -Value "`nOVERALL STATUS: FAIL (Tests were skipped)"
        exit 1
    } else {
        Write-Host "`nEvidence generation completed: $ReportFile" -ForegroundColor Green
        Add-Content -Path $ReportFile -Value "`nOVERALL STATUS: PASS"
    }
} catch {
    Write-Host "`nEvidence generation failed!" -ForegroundColor Red
    Add-Content -Path $ReportFile -Value "`nOVERALL STATUS: FAIL"
    Add-Content -Path $ReportFile -Value "Reason: $_"
    exit 1
}
