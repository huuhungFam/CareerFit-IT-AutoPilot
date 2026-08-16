$ErrorActionPreference = 'Stop'

$demoRoot = Split-Path -Parent $PSScriptRoot
$demoEnvFile = Join-Path $demoRoot '.env'
$backendDir = Join-Path $demoRoot 'Backend\careerfit-backend'

if (-not (Test-Path -LiteralPath $demoEnvFile)) {
    throw "Missing demo environment file: $demoEnvFile"
}

Get-Content -LiteralPath $demoEnvFile | ForEach-Object {
    if ($_ -match '^\s*([^#][A-Za-z0-9_]*)=(.*)$') {
        $name = $matches[1]
        $value = $matches[2].Trim()
        [Environment]::SetEnvironmentVariable($name, $value, 'Process')
    }
}

Set-Location -LiteralPath $backendDir
& .\mvnw.cmd spring-boot:run
