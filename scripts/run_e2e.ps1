$ErrorActionPreference = "Stop"
$ProjectName = "careerfit_e2e"

# Use PSScriptRoot to find project root
$RepoRoot = Resolve-Path "$PSScriptRoot\.."
Push-Location $RepoRoot

try {
    # Check if port 18080 is already in use
    try {
        $connection = [System.Net.Sockets.TcpClient]::new()
        $asyncResult = $connection.BeginConnect("localhost", 18080, $null, $null)
        $waitHandle = $asyncResult.AsyncWaitHandle
        if ($waitHandle.WaitOne(100, $false)) {
            $connection.EndConnect($asyncResult)
            throw "Port 18080 is already in use. Please free the port before running E2E tests. Do NOT delete other containers automatically."
        }
    } catch {
        if ($_.Exception.Message -match "Port 18080 is already in use") {
            throw $_
        }
        # Connection refused / timeout means port is free
    } finally {
        if ($connection) { $connection.Close() }
    }

    Write-Host "Starting isolated E2E stack..."
    $process = Start-Process -FilePath "docker" -ArgumentList "compose -p $ProjectName -f docker-compose.prod.yml --env-file .env.prod.ci up -d --build" -NoNewWindow -Wait -PassThru
    if ($process.ExitCode -ne 0) {
        throw "Docker compose up failed."
    }

    Write-Host "Waiting for backend to be healthy..."
    $Healthy = $false
    $RetryCount = 0
    while (-not $Healthy -and $RetryCount -lt 45) {
        Start-Sleep -Seconds 2
        # Verify specific container health
        $status = docker inspect --format="{{if .Config.Healthcheck}}{{print .State.Health.Status}}{{end}}" ${ProjectName}-backend-1
        if ($status -match "healthy") {
            try {
                $response = Invoke-RestMethod -Uri "http://localhost:18080/actuator/health/readiness" -Method Get -ErrorAction Stop
                if ($response.status -eq "UP") {
                    $Healthy = $true
                }
            } catch {
                # ignore error and retry
            }
        }
        $RetryCount++
    }

    if (-not $Healthy) {
        Write-Host "Backend failed to start. Logs:"
        docker compose -p $ProjectName -f docker-compose.prod.yml --env-file .env.prod.ci logs backend
        throw "Backend failed to become healthy."
    }

    Write-Host "Stack is up! Running Playwright tests..."
    Push-Location "Frontend"
    try {
        $env:BASE_URL = "http://localhost:18080"
        $process = Start-Process -FilePath "npm" -ArgumentList "run", "test:e2e:prod" -NoNewWindow -Wait -PassThru
        if ($process.ExitCode -ne 0) {
            throw "Playwright E2E tests failed with exit code $($process.ExitCode)"
        }
        Write-Host "E2E run successful!" -ForegroundColor Green
    } finally {
        Pop-Location
    }
} catch {
    Write-Host "E2E Run Failed: $_" -ForegroundColor Red
    Write-Host "Docker compose status:"
    docker compose -p $ProjectName -f docker-compose.prod.yml --env-file .env.prod.ci ps
    Write-Host "Backend logs:"
    docker compose -p $ProjectName -f docker-compose.prod.yml --env-file .env.prod.ci logs backend
    Write-Host "Frontend logs:"
    docker compose -p $ProjectName -f docker-compose.prod.yml --env-file .env.prod.ci logs frontend
    $global:E2E_EXIT_CODE = 1
} finally {
    Write-Host "Cleaning up E2E stack..."
    $process = Start-Process -FilePath "docker" -ArgumentList "compose -p $ProjectName -f docker-compose.prod.yml --env-file .env.prod.ci down -v" -NoNewWindow -Wait -PassThru
    if ($process.ExitCode -ne 0) {
        Write-Host "Docker compose down failed." -ForegroundColor Yellow
    }
    Pop-Location
}

if ($global:E2E_EXIT_CODE -eq 1) {
    exit 1
} else {
    exit 0
}
