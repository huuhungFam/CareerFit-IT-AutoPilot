$ErrorActionPreference = "Stop"

$ProjectName = "drill_project"
$EnvFile = ".env.prod.ci"

Write-Host "Starting isolated drill stack..."
docker compose -p $ProjectName -f docker-compose.prod.yml --env-file $EnvFile up -d --build postgres

Write-Host "Waiting for database to be ready..."
Start-Sleep -Seconds 10

try {
    Write-Host "Creating marker data..."
    docker compose -p $ProjectName -f docker-compose.prod.yml --env-file $EnvFile exec -T postgres psql -U dummy_user -d dummy_db -c "CREATE TABLE IF NOT EXISTS marker (id serial PRIMARY KEY, data text); INSERT INTO marker (data) VALUES ('drill_test_data');"

    Write-Host "Running backup..."
    .\scripts\backup.ps1 -ProjectName $ProjectName -EnvFile $EnvFile -DbUser dummy_user -DbName dummy_db

    $BackupFiles = Get-ChildItem -Path .\backups\careerfit_*.dump | Sort-Object LastWriteTime -Descending
    $LatestBackup = $BackupFiles[0].FullName

    Write-Host "Dropping marker data..."
    docker compose -p $ProjectName -f docker-compose.prod.yml --env-file $EnvFile exec -T postgres psql -U dummy_user -d dummy_db -c "DROP TABLE marker;"

    Write-Host "Running restore..."
    .\scripts\restore.ps1 -BackupFile $LatestBackup -ProjectName $ProjectName -EnvFile $EnvFile -DbUser dummy_user -DbName dummy_db -NonInteractive

    Write-Host "Verifying marker data..."
    $result = docker compose -p $ProjectName -f docker-compose.prod.yml --env-file $EnvFile exec -T postgres psql -U dummy_user -d dummy_db -t -c "SELECT data FROM marker LIMIT 1;"
    if ($result -match "drill_test_data") {
        Write-Host "Drill successful!" -ForegroundColor Green
    } else {
        throw "Drill failed to recover marker data."
    }

    Write-Host "Testing corrupt dump negative case..."
    Set-Content -Path .\backups\corrupt.dump -Value "This is a corrupt dump"
    try {
        .\scripts\restore.ps1 -BackupFile .\backups\corrupt.dump -ProjectName $ProjectName -EnvFile $EnvFile -DbUser dummy_user -DbName dummy_db -NonInteractive
        throw "Corrupt dump did not fail as expected!"
    } catch {
        Write-Host "Corrupt dump failed as expected." -ForegroundColor Green
    }
} finally {
    Write-Host "Cleaning up drill stack..."
    docker compose -p $ProjectName -f docker-compose.prod.yml --env-file $EnvFile down -v
}
