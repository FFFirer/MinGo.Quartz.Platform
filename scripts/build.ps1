#!/usr/bin/env pwsh
# Build script for MinGo.Quartz.Platform
# Usage: ./scripts/build.ps1 [-Configuration Release]

param(
    [string]$Configuration = "Debug"
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot

Write-Host "=== Building MinGo.Quartz.Platform ($Configuration) ===" -ForegroundColor Cyan

# Restore
Write-Host "`n--- Restore ---" -ForegroundColor Yellow
dotnet restore "$root/src/MinGo.Quartz.Platform/MinGo.Quartz.Platform.csproj" -p:NuGetAudit=false
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

# Build main project
Write-Host "`n--- Build: MinGo.Quartz.Platform ---" -ForegroundColor Yellow
dotnet build "$root/src/MinGo.Quartz.Platform/MinGo.Quartz.Platform.csproj" -c $Configuration --no-restore -p:NuGetAudit=false
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

# Build tests
Write-Host "`n--- Build: Tests ---" -ForegroundColor Yellow
dotnet build "$root/tests/MinGo.Quartz.Platform.Tests/MinGo.Quartz.Platform.Tests.csproj" -c $Configuration --no-restore -p:NuGetAudit=false
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "`n=== Build succeeded ===" -ForegroundColor Green
