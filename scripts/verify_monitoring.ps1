$ErrorActionPreference = "Stop"
$ProjectName = "careerfit_monitoring_verify"

function Test-Port {
    param([int]$Port)
    $connection = $null
    try {
        $connection = [System.Net.Sockets.TcpClient]::new("localhost", $Port)
        return $true
    } catch {
        return $false
    } finally {
        if ($connection) { $connection.Close() }
    }
}

if ((Test-Port 18081) -or (Test-Port 13000)) {
    Write-Host "Port 18081 or 13000 is already in use. Please clear them before running." -ForegroundColor Red
    exit 1
}

# Ensure clean state
Write-Host "Cleaning up any existing monitoring verification stack..."
docker compose -p $ProjectName -f docker-compose.prod.yml --env-file .env.prod.ci --profile monitoring down -v

Write-Host "Starting monitoring stack..."
$env:FRONTEND_PORT = "18081"
$env:GRAFANA_PORT = "13000"
$env:DEMO_MODE = "true"

$process = Start-Process -FilePath "docker" -ArgumentList "compose -p $ProjectName -f docker-compose.prod.yml --env-file .env.prod.ci --profile monitoring up -d --build" -NoNewWindow -Wait -PassThru
if ($process.ExitCode -ne 0) {
    Write-Host "Docker compose up failed." -ForegroundColor Red
    exit 1
}

try {
    Write-Host "Waiting for services to become healthy..."
    $services = @("postgres", "backend", "frontend", "prometheus", "grafana")
    foreach ($svc in $services) {
        $Healthy = $false
        $RetryCount = 0
        while (-not $Healthy -and $RetryCount -lt 45) {
            Start-Sleep -Seconds 2
            $status = docker inspect --format="{{if .Config.Healthcheck}}{{print .State.Health.Status}}{{end}}" ${ProjectName}-${svc}-1
            if ($status -match "healthy") {
                $Healthy = $true
            }
            $RetryCount++
        }
        if (-not $Healthy) {
            throw "$svc failed to become healthy."
        }
        Write-Host "$svc is healthy!"
    }

    Write-Host "1. Testing Frontend..."
    $fe = Invoke-RestMethod -Uri "http://localhost:18081" -Method Get
    if (-not $fe) { throw "Frontend is down" }

    Write-Host "2. Testing Backend Readiness via Nginx..."
    $be = Invoke-RestMethod -Uri "http://localhost:18081/actuator/health/readiness" -Method Get
    if ($be.status -ne "UP") { throw "Backend is not UP" }

    Write-Host "3. Testing Grafana Health..."
    $gf = Invoke-RestMethod -Uri "http://localhost:13000/api/health" -Method Get
    if ($gf.database -ne "ok") { throw "Grafana is not healthy" }

    Write-Host "4. Testing Grafana Datasources..."
    $authBytes = [System.Text.Encoding]::ASCII.GetBytes("admin:dummy_grafana_pass")
    $authBase64 = [System.Convert]::ToBase64String($authBytes)
    $authHeader = @{ "Authorization" = "Basic $authBase64" }

    $ds = Invoke-RestMethod -Uri "http://localhost:13000/api/datasources" -Method Get -Headers $authHeader
    $promDs = $ds | Where-Object { $_.name -eq "Prometheus" }
    if (-not $promDs -or $promDs.url -ne "http://prometheus:9090" -or -not $promDs.isDefault) {
        throw "Prometheus datasource not properly configured"
    }

    Write-Host "5. Testing Grafana Dashboard..."
    $db = Invoke-RestMethod -Uri "http://localhost:13000/api/search?query=Backend" -Method Get -Headers $authHeader
    $backendDb = $db | Where-Object { $_.title -match "Backend" }
    if (-not $backendDb) { throw "Backend Services dashboard missing" }

    Write-Host "Generating some traffic to backend..."
    for ($i=0; $i -lt 5; $i++) {
        try { Invoke-RestMethod -Uri "http://localhost:18081/api/jobs" -Method Get | Out-Null } catch {}
    }
    Start-Sleep -Seconds 5

    Write-Host "6. Testing Prometheus Target UP..."
    $TargetUp = $false
    for ($i=0; $i -lt 30; $i++) {
        $upQuery = docker compose -p $ProjectName -f docker-compose.prod.yml --env-file .env.prod.ci --profile monitoring exec backend curl -s "http://prometheus:9090/api/v1/query?query=up%7Bjob%3D%22careerfit-backend%22%7D" | ConvertFrom-Json
        if ($upQuery -and $upQuery.data -and $upQuery.data.result -and $upQuery.data.result.Count -gt 0 -and $upQuery.data.result[0].value[1] -eq "1") {
            $TargetUp = $true
            break
        }
        Start-Sleep -Seconds 2
    }
    if (-not $TargetUp) { throw "Backend target is not UP in Prometheus after 60s" }

    Write-Host "7. Testing Prometheus Histogram..."
    $HistUp = $false
    for ($i=0; $i -lt 30; $i++) {
        $histQuery = docker compose -p $ProjectName -f docker-compose.prod.yml --env-file .env.prod.ci --profile monitoring exec backend curl -s "http://prometheus:9090/api/v1/query?query=http_server_requests_seconds_bucket" | ConvertFrom-Json
        if ($histQuery -and $histQuery.data -and $histQuery.data.result -and $histQuery.data.result.Count -gt 0) {
            $HistUp = $true
            break
        }
        Start-Sleep -Seconds 2
    }
    if (-not $HistUp) { throw "Histogram http_server_requests_seconds_bucket not found" }

    Write-Host "8. Testing Prometheus Alert Rules..."
    $rulesQuery = docker compose -p $ProjectName -f docker-compose.prod.yml --env-file .env.prod.ci --profile monitoring exec backend curl -s "http://prometheus:9090/api/v1/rules" | ConvertFrom-Json
    $rules = $rulesQuery.data.groups.rules
    if ($rules.Count -eq 0) { throw "No alert rules found" }
    foreach ($r in $rules) {
        if ($r.health -ne "ok") { throw "Rule $($r.name) health is not ok" }
    }
    if (-not ($rules | Where-Object { $_.name -eq "BackendDown" })) { throw "BackendDown rule missing" }
    if (-not ($rules | Where-Object { $_.name -eq "HighLatency" })) { throw "HighLatency rule missing" }

    Write-Host "9. Checking Grafana logs for errors..."
    $gfLogs = docker logs ${ProjectName}-grafana-1 2>&1
    if ($gfLogs -match "error.*datasource" -or $gfLogs -match "error.*dashboard") {
        throw "Grafana logs contain provisioning errors"
    }

    Write-Host "Monitoring verification successful!" -ForegroundColor Green
    exit 0
} catch {
    Write-Host "Verification failed: $_" -ForegroundColor Red
    docker compose -p $ProjectName -f docker-compose.prod.yml --env-file .env.prod.ci --profile monitoring logs prometheus grafana backend
    exit 1
} finally {
    Write-Host "Cleaning up monitoring stack..."
    $process = Start-Process -FilePath "docker" -ArgumentList "compose -p $ProjectName -f docker-compose.prod.yml --env-file .env.prod.ci --profile monitoring down -v" -NoNewWindow -Wait -PassThru
    if ($process.ExitCode -ne 0) {
        Write-Host "Docker compose down failed." -ForegroundColor Yellow
    }
}
