#!/usr/bin/env pwsh
# Test script for MinGo.Quartz.Platform
# Usage: ./scripts/test.ps1 [-Configuration Debug]

param(
    [string]$Configuration = "Debug"
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot

Write-Host "=== Testing MinGo.Quartz.Platform ===" -ForegroundColor Cyan

# Build first
& "$PSScriptRoot/build.ps1" -Configuration $Configuration
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

# Run tests
Write-Host "`n--- Running tests ---" -ForegroundColor Yellow
dotnet test "$root/tests/MinGo.Quartz.Platform.Tests/MinGo.Quartz.Platform.Tests.csproj" -c $Configuration --no-build --verbosity normal
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "`n=== All tests passed ===" -ForegroundColor Green
