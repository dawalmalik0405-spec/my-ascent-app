# Stop Ascent: Docker infra (API/worker/web stop with Ctrl+C in start.ps1)
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root
Write-Host "Stopping Docker services..." -ForegroundColor Cyan
docker compose down
Write-Host "Done. If API/worker/web still run, close the start.ps1 terminal or press Ctrl+C there." -ForegroundColor Green
