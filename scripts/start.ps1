# Ascent Platform — start everything in ONE terminal (multiplexed logs)
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

$python = Join-Path $Root ".venv\Scripts\python.exe"
if (-not (Test-Path $python)) {
    Write-Host "Create venv first: py -3.11 -m venv .venv" -ForegroundColor Red
    exit 1
}

# Load .env into process (simple parser)
$envFile = Join-Path $Root ".env"
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
            $name = $matches[1].Trim()
            $value = $matches[2].Trim()
            [Environment]::SetEnvironmentVariable($name, $value, "Process")
        }
    }
}

$env:PYTHONPATH = Join-Path $Root "backend"

# API/worker run on Windows host — always use localhost (not Docker service names)
$env:DATABASE_URL = "postgresql+asyncpg://ascent:ascent@localhost:5432/ascent"
$env:DATABASE_URL_SYNC = "postgresql://ascent:ascent@localhost:5432/ascent"
$env:REDIS_URL = "redis://localhost:6379/0"
$env:QDRANT_URL = "http://localhost:6333"
$env:TEMPORAL_HOST = "localhost:7233"
$env:INIT_MCP_ON_API = "false"
$env:ENABLE_GITHUB_REMEDIATION_PR = "false"
$env:OTEL_EXPORTER_OTLP_ENDPOINT = ""
if (-not $env:NVIDIA_NIM_MODEL) { $env:NVIDIA_NIM_MODEL = "minimaxai/minimax-m2.7" }
Write-Host "Using localhost for Postgres, Redis, Qdrant, Temporal" -ForegroundColor DarkGray

Write-Host "`n=== Starting Docker infrastructure ===" -ForegroundColor Cyan
docker compose up -d postgres redis qdrant temporal temporal-ui
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "`n=== Waiting for Postgres, Redis, Qdrant ===" -ForegroundColor Cyan
Start-Sleep -Seconds 10

Write-Host "=== Waiting for Temporal on localhost:7233 (up to 90s) ===" -ForegroundColor Cyan
$temporalReady = $false
for ($i = 1; $i -le 45; $i++) {
    try {
        $tcp = New-Object System.Net.Sockets.TcpClient
        $tcp.Connect("127.0.0.1", 7233)
        $tcp.Close()
        $temporalReady = $true
        Write-Host "Temporal is ready." -ForegroundColor Green
        break
    } catch {
        Write-Host "  attempt $i/45..." -ForegroundColor DarkGray
        Start-Sleep -Seconds 2
    }
}
if (-not $temporalReady) {
    Write-Host "WARNING: Temporal not reachable on port 7233. Worker may fail." -ForegroundColor Yellow
    Write-Host "  Check: docker compose logs temporal --tail 50" -ForegroundColor Yellow
}

if (-not (Test-Path (Join-Path $Root "node_modules\concurrently"))) {
    Write-Host "Installing concurrently (one-time)..." -ForegroundColor Yellow
    npm install --no-fund --no-audit 2>$null
}

if (-not (Test-Path (Join-Path $Root "frontend\node_modules"))) {
    Write-Host "Installing frontend dependencies (one-time)..." -ForegroundColor Yellow
    npm install --prefix frontend --no-fund --no-audit
}

Write-Host "`n=== Starting API + Worker + Frontend (Ctrl+C stops all) ===" -ForegroundColor Green
Write-Host "  Dashboard: http://localhost:3000" -ForegroundColor Green
Write-Host "  API docs:  http://localhost:8000/docs`n" -ForegroundColor Green

# No -k: if worker is slow to connect, API and dashboard still stay up
npx concurrently `
    -n "API,WORKER,WEB" `
    -c "blue,yellow,green" `
    "`"$python`" -m uvicorn src.main:app --reload --host 0.0.0.0 --port 8000" `
    "`"$python`" -m src.workers.main" `
    "npm run dev --prefix frontend"
