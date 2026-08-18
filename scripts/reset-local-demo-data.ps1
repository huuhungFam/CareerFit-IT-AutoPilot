[CmdletBinding()]
param(
    [switch]$Force
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

if (-not $Force) {
    throw 'Destructive reset requires -Force. This command removes only the two validated local CareerFit volumes.'
}

$workspace = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$startedAt = [DateTime]::UtcNow

function Invoke-Checked {
    param([Parameter(Mandatory)][string]$File, [string[]]$Arguments = @(), [string]$Label)
    & $File @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "Failed: $Label (exit $LASTEXITCODE)"
    }
}

function Invoke-Compose {
    param([Parameter(Mandatory)][string[]]$Arguments, [Parameter(Mandatory)][string]$Label)
    Push-Location $workspace
    try { Invoke-Checked -File 'docker' -Arguments (@('compose') + $Arguments) -Label $Label }
    finally { Pop-Location }
}

function Invoke-DbScalar {
    param([Parameter(Mandatory)][string]$Sql)
    Push-Location $workspace
    try {
        $result = $Sql | & docker compose exec -T postgres psql -U careerfit -d careerfit -v ON_ERROR_STOP=1 -t -A
        if ($LASTEXITCODE -ne 0) { throw 'PostgreSQL verification query failed.' }
        return ($result | Out-String).Trim()
    } finally { Pop-Location }
}

function Assert-Scalar {
    param([Parameter(Mandatory)][string]$Sql, [Parameter(Mandatory)][string]$Expected, [Parameter(Mandatory)][string]$Label)
    $actual = Invoke-DbScalar $Sql
    if ($actual -ne $Expected) { throw "$Label expected '$Expected' but got '$actual'." }
    Write-Host "PASS: $Label"
}

function Get-VolumeMetadata {
    param([Parameter(Mandatory)][string]$Name)
    $raw = & docker volume inspect $Name 2>$null
    if ($LASTEXITCODE -ne 0) { return $null }
    return (($raw | Out-String) | ConvertFrom-Json)[0]
}

function Assert-ComposeVolume {
    param([Parameter(Mandatory)]$Volume, [Parameter(Mandatory)][string]$Project, [Parameter(Mandatory)][string]$LogicalName)
    if ($Volume.Name -notmatch "^$([regex]::Escape($Project))_") { throw "Refusing unexpected volume '$($Volume.Name)'." }
    $labels = $Volume.Labels
    $projectLabel = $labels.PSObject.Properties['com.docker.compose.project']?.Value
    $volumeLabel = $labels.PSObject.Properties['com.docker.compose.volume']?.Value
    if ($projectLabel -ne $Project -or $volumeLabel -ne $LogicalName) {
        throw "Refusing volume '$($Volume.Name)': Compose labels do not match this workspace."
    }
}

function Assert-StorageVolumeEmpty {
    param([Parameter(Mandatory)][string]$VolumeName)
    $count = & docker run --rm -v "${VolumeName}:/storage" alpine:3.20 sh -c "find /storage -type f | wc -l"
    if ($LASTEXITCODE -ne 0) { throw "Could not inspect backend storage volume '$VolumeName'." }
    if (($count | Out-String).Trim() -ne '0') { throw "Backend storage volume '$VolumeName' contains stale runtime files after reset." }
    Write-Host 'PASS: backend storage volume is empty before backend startup'
}

Push-Location $workspace
try {
    # Capture compose metadata in memory only; never print resolved environment values.
    $composeConfig = ((& docker compose --profile backend config --format json) | Out-String | ConvertFrom-Json)
    if ($LASTEXITCODE -ne 0) { throw 'Unable to resolve Docker Compose configuration.' }
    $project = [string]$composeConfig.name
    $postgresVolumeName = [string]$composeConfig.volumes.careerfit_postgres_data.name
    $storageVolumeName = [string]$composeConfig.volumes.careerfit_backend_storage.name
    if ([string]::IsNullOrWhiteSpace($project) -or [string]::IsNullOrWhiteSpace($postgresVolumeName) -or [string]::IsNullOrWhiteSpace($storageVolumeName)) {
        throw 'Compose configuration does not expose the required named volumes.'
    }

    $oldPostgres = Get-VolumeMetadata $postgresVolumeName
    $oldStorage = Get-VolumeMetadata $storageVolumeName
    if ($null -ne $oldPostgres) { Assert-ComposeVolume $oldPostgres $project 'careerfit_postgres_data' }
    if ($null -ne $oldStorage) { Assert-ComposeVolume $oldStorage $project 'careerfit_backend_storage' }
    Write-Host "Validated local Compose project '$project' and its two reset volumes."

    Invoke-Compose -Arguments @('--profile', 'backend', 'down', '--remove-orphans') -Label 'stopping CareerFit Compose services'
    foreach ($volumeName in @($postgresVolumeName, $storageVolumeName)) {
        if ($null -ne (Get-VolumeMetadata $volumeName)) {
            Invoke-Checked -File 'docker' -Arguments @('volume', 'rm', $volumeName) -Label "removing validated volume $volumeName"
        }
    }

    Invoke-Compose -Arguments @('up', '-d', 'postgres') -Label 'starting PostgreSQL'
    Invoke-Compose -Arguments @('--profile', 'backend', 'create', 'backend') -Label 'creating labeled backend storage volume'
    Assert-StorageVolumeEmpty $storageVolumeName
    $ready = $false
    for ($attempt = 1; $attempt -le 30; $attempt++) {
        & docker compose exec -T postgres pg_isready -U careerfit -d careerfit *> $null
        if ($LASTEXITCODE -eq 0) { $ready = $true; break }
        Start-Sleep -Seconds 2
    }
    if (-not $ready) { throw 'PostgreSQL did not become ready within 60 seconds.' }

    # Run Maven from the backend module.  The Flyway Maven goal otherwise resolves
    # its default filesystem migration location relative to this script's workspace
    # root and silently sees only stale compiled resources (V1–V9).
    Push-Location (Join-Path $workspace 'Backend/careerfit-backend')
    try {
        Invoke-Checked -File '.\mvnw.cmd' -Arguments @(
            'flyway:migrate',
            '-Dflyway.url=jdbc:postgresql://localhost:5433/careerfit', '-Dflyway.user=careerfit', '-Dflyway.password=careerfit'
        ) -Label 'migrating fresh CareerFit schema'
    }
    finally { Pop-Location }
    Invoke-Checked -File 'node' -Arguments @((Join-Path $workspace 'scripts/import-scraped-jobs.mjs')) -Label 'importing scraped CareerFit jobs'

    $idempotencyBefore = Invoke-DbScalar "SELECT md5(COALESCE(string_agg(id::text || '|' || recruiter_id::text || '|' || external_hash, ',' ORDER BY id), '')) FROM job WHERE external_hash IS NOT NULL;"
    Invoke-Checked -File 'node' -Arguments @((Join-Path $workspace 'scripts/import-scraped-jobs.mjs')) -Label 'verifying idempotent scraped-job import'
    $idempotencyAfter = Invoke-DbScalar "SELECT md5(COALESCE(string_agg(id::text || '|' || recruiter_id::text || '|' || external_hash, ',' ORDER BY id), '')) FROM job WHERE external_hash IS NOT NULL;"
    if ($idempotencyBefore -ne $idempotencyAfter) { throw 'Second importer pass changed imported job identity or ownership.' }
    Write-Host 'PASS: importer idempotency checksum'

    Invoke-Compose -Arguments @('--profile', 'backend', 'up', '-d', '--build', 'backend') -Label 'starting CareerFit backend'
    $healthy = $false
    for ($attempt = 1; $attempt -le 60; $attempt++) {
        try {
            $health = Invoke-RestMethod -Uri 'http://localhost:8080/actuator/health' -TimeoutSec 3
            if ($health.status -eq 'UP') { $healthy = $true; break }
        } catch { }
        Start-Sleep -Seconds 2
    }
    if (-not $healthy) { throw 'Backend did not become healthy within 120 seconds.' }

    # Baseline and security manifest. All values are assertions, never informational-only output.
    Assert-Scalar "SELECT COUNT(*) FROM job;" '993' 'total job count'
    Assert-Scalar "SELECT COUNT(*) FROM job WHERE external_hash IS NOT NULL;" '974' 'imported job count'
    Assert-Scalar "SELECT COUNT(DISTINCT recruiter_id) FROM job WHERE external_hash IS NOT NULL AND recruiter_id IN (SELECT id FROM user_account WHERE account_source = 'IMPORTED' AND is_active);" '433' 'active imported recruiter count'
    Assert-Scalar "SELECT COUNT(DISTINCT lower(BTRIM(company))) FROM job WHERE external_hash IS NOT NULL;" '433' 'canonical imported company count'
    Assert-Scalar "SELECT COUNT(*) FROM (SELECT source_platform, source_url FROM job WHERE external_hash IS NOT NULL GROUP BY source_platform, source_url HAVING COUNT(*) > 1) d;" '0' 'duplicate imported source identities'
    Assert-Scalar "SELECT COUNT(*) FROM (SELECT external_hash FROM job WHERE external_hash IS NOT NULL GROUP BY external_hash HAVING COUNT(*) > 1) d;" '0' 'duplicate imported external hashes'
    Assert-Scalar "SELECT COUNT(*) FROM job j JOIN user_account u ON u.id = j.recruiter_id WHERE j.external_hash IS NOT NULL AND (u.account_source <> 'IMPORTED' OR NOT u.is_active);" '0' 'imported ownership policy violations'
    Assert-Scalar "SELECT COUNT(*) FROM user_account WHERE email IN ('ca', 're', 'ad') AND is_active;" '3' 'quick-login active accounts'
    Assert-Scalar "SELECT COUNT(*) FROM user_account WHERE (email = 'ca' AND role = 'CANDIDATE') OR (email = 're' AND role = 'RECRUITER') OR (email = 'ad' AND role = 'ADMIN');" '3' 'quick-login roles'
    Assert-Scalar "SELECT COUNT(*) FROM automation_policy p JOIN user_account u ON u.id = p.user_id WHERE u.email IN ('ca', 're') AND p.demo_mode_enabled;" '2' 'quick-login Demo Mode defaults'
    Assert-Scalar "SELECT COUNT(*) FROM user_account WHERE email IN ('hungb2203557@student.ctu.edu.vn', 'phamhuuhung216@gmail.com');" '0' 'absence of live-demo accounts'
    Assert-Scalar "SELECT COUNT(*) FROM automation_policy p JOIN user_account u ON u.id = p.user_id WHERE u.account_source = 'IMPORTED' AND (p.demo_mode_enabled OR p.email_notifications_enabled OR p.daily_digest_enabled OR p.auto_apply_enabled OR p.auto_invite_enabled OR p.job_scan_enabled OR p.high_match_email_enabled OR p.email_action_enabled);" '0' 'imported automation/email policy violations'
    Assert-Scalar "SELECT COUNT(*) FROM notification_outbox o JOIN user_account u ON u.id = o.recipient_user_id WHERE u.email IN ('hungb2203557@student.ctu.edu.vn', 'phamhuuhung216@gmail.com');" '0' 'orphan live-demo outbox rows'
    Assert-Scalar "SELECT version FROM flyway_schema_history WHERE success ORDER BY installed_rank DESC LIMIT 1;" '35' 'latest Flyway migration'

    $newPostgres = Get-VolumeMetadata $postgresVolumeName
    $newStorage = Get-VolumeMetadata $storageVolumeName
    Assert-ComposeVolume $newPostgres $project 'careerfit_postgres_data'
    Assert-ComposeVolume $newStorage $project 'careerfit_backend_storage'
    if ([DateTime]::Parse($newPostgres.CreatedAt).ToUniversalTime() -le $startedAt -or [DateTime]::Parse($newStorage.CreatedAt).ToUniversalTime() -le $startedAt) {
        throw 'One or more new volumes were not recreated during this reset.'
    }
    Invoke-Checked -File 'node' -Arguments @((Join-Path $workspace 'scripts/test-api-smoke.mjs')) -Label 'API smoke test'
    Write-Host 'RESET MANIFEST PASS: clean baseline is ready for the live two-role rehearsal.'
}
finally {
    Pop-Location
}
