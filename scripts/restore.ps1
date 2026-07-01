<#
.SYNOPSIS
PostgreSQL restore script for CareerFit production database.

.DESCRIPTION
This script uses pg_restore to restore a PostgreSQL database backup running in Docker.
It takes a timestamped .dump file and copies it to the container to restore.
#>

param(
    [Parameter(Mandatory=$true)]
    [string]$BackupFile,
    
    [string]$ProjectName = "thesis",
    [string]$ComposeFile = "docker-compose.prod.yml",
    [string]$EnvFile = ".env.prod",
    [string]$DbUser = "careerfit_admin",
    [string]$DbName = "careerfit_prod",
    
    [switch]$NonInteractive
)

if (-not (Test-Path -Path $BackupFile)) {
    Write-Host "Error: Backup file '$BackupFile' does not exist." -ForegroundColor Red
    exit 1
}

if ($NonInteractive -and $ProjectName -eq "thesis") {
    Write-Host "Error: NonInteractive mode is not allowed for the default production project 'thesis'." -ForegroundColor Red
    exit 1
}

if (-not $NonInteractive) {
    Write-Host "WARNING: You are about to restore the database '$DbName' in project '$ProjectName' from '$BackupFile'." -ForegroundColor Yellow
    Write-Host "This will overwrite existing data." -ForegroundColor Yellow
    $confirmation = Read-Host "Are you sure you want to proceed? (yes/no)"

    if ($confirmation -ne 'yes') {
        Write-Host "Restore cancelled." -ForegroundColor Yellow
        exit 0
    }
}

Write-Host "Starting restore of database '$DbName' using docker compose..."
try {
    # Copy file to container
    docker compose -p $ProjectName --env-file $EnvFile -f $ComposeFile cp $BackupFile postgres:/tmp/careerfit_restore.dump
    if ($LASTEXITCODE -ne 0) {
        throw "docker cp returned exit code $LASTEXITCODE"
    }

    # Verify dump before restore
    docker compose -p $ProjectName --env-file $EnvFile -f $ComposeFile exec -T postgres pg_restore --list /tmp/careerfit_restore.dump | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "Dump file is corrupt or invalid."
    }

    # Run pg_restore via docker compose
    docker compose -p $ProjectName --env-file $EnvFile -f $ComposeFile exec -T postgres pg_restore -U $DbUser -d $DbName -c --if-exists -1 /tmp/careerfit_restore.dump
    if ($LASTEXITCODE -ne 0) {
        throw "pg_restore returned exit code $LASTEXITCODE"
    }

    Write-Host "Restore completed successfully from: $BackupFile" -ForegroundColor Green
} catch {
    Write-Host "Restore failed: $_" -ForegroundColor Red
    exit 1
} finally {
    # Clean up
    docker compose -p $ProjectName --env-file $EnvFile -f $ComposeFile exec -T postgres rm -f /tmp/careerfit_restore.dump
}
