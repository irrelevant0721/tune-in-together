$ErrorActionPreference = 'Stop'
Push-Location $PSScriptRoot
try {
    docker compose -f docker-compose.friends.yml up -d --no-build
    if ($LASTEXITCODE -ne 0) { throw 'Music startup failed. Start Docker Desktop and retry.' }
    Write-Host 'Local: http://127.0.0.1:4000'
    Write-Host 'Public: https://music.example.com (shared tunnel must be running)'
} finally { Pop-Location }
