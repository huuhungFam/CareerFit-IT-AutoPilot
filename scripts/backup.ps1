<#
.SYNOPSIS
PostgreSQL backup script for CareerFit production database.

.DESCRIPTION
This script uses pg_dump in custom format (-Fc) to backup the PostgreSQL database running in Docker.
#>

param(
    [string]$ProjectName = "thesis",
    [string]$ComposeFile = "docker-compose.prod.yml",
    [string]$EnvFile = ".env.prod",
    [string]$DbUser = "careerfit_admin",
    [string]$DbName = "careerfit_prod",
    [string]$BackupDir = ".\backups"
)

if (-not (Test-Path -Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir | Out-Null
}

$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$BackupFile = Join-Path -Path $BackupDir -ChildPath "careerfit_${Timestamp}.dump"

Write-Host "Starting backup of database '$DbName' using docker compose..."
try {
    # Run pg_dump via docker compose to a temp file in container
    docker compose -p $ProjectName --env-file $EnvFile -f $ComposeFile exec -T postgres pg_dump -Fc -U $DbUser $DbName -f /tmp/careerfit_backup.dump
    if ($LASTEXITCODE -ne 0) {
        throw "pg_dump returned exit code $LASTEXITCODE"
    }

    # Copy out
    docker compose -p $ProjectName --env-file $EnvFile -f $ComposeFile cp postgres:/tmp/careerfit_backup.dump $BackupFile
    if ($LASTEXITCODE -ne 0) {
        throw "docker cp returned exit code $LASTEXITCODE"
    }

    if (-not (Test-Path $BackupFile) -or (Get-Item $BackupFile).Length -eq 0) {
        throw "Backup file is empty or does not exist."
    }

    Write-Host "Backup completed successfully: $BackupFile" -ForegroundColor Green
} catch {
    Write-Host "Backup failed: $_" -ForegroundColor Red
    if (Test-Path $BackupFile) {
        Remove-Item $BackupFile
    }
    exit 1
} finally {
    # Clean up temp file
    docker compose -p $ProjectName --env-file $EnvFile -f $ComposeFile exec -T postgres rm -f /tmp/careerfit_backup.dump
}
