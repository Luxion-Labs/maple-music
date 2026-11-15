# Build Maple Music with embedded Neon credentials
# This allows zero-config distribution

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host " Building Maple Music (Release)" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Load credentials from ui/.env.local (or root .env.local)
$envFile = if (Test-Path "ui\.env.local") { "ui\.env.local" } else { ".env.local" }
if (-not (Test-Path $envFile)) {
    Write-Host "Error: .env.local not found!" -ForegroundColor Red
    Write-Host "Run 'neon deploy' in the ui/ directory first." -ForegroundColor Yellow
    exit 1
}

# Parse .env.local
$neonUrl = ""
$neonToken = ""

Get-Content $envFile | ForEach-Object {
    if ($_ -match '^NEON_FUNCTION_HOST_SUFFIX=(.+)$') {
        $suffix = $matches[1]
        $neonUrl = "https://br-delicate-cherry-bbfmt591-artworkupload$suffix/"
    }
    if ($_ -match '^MAPLE_UPLOAD_TOKEN=(.+)$') {
        $neonToken = $matches[1]
    }
}

if ([string]::IsNullOrEmpty($neonUrl) -or [string]::IsNullOrEmpty($neonToken)) {
    Write-Host "Error: Could not find Neon credentials in .env.local" -ForegroundColor Red
    Write-Host ""
    Write-Host "Expected:" -ForegroundColor Yellow
    Write-Host "  NEON_FUNCTION_HOST_SUFFIX=..." -ForegroundColor White
    Write-Host "  MAPLE_UPLOAD_TOKEN=..." -ForegroundColor White
    exit 1
}

Write-Host "Neon Configuration:" -ForegroundColor Green
Write-Host "  URL: $neonUrl" -ForegroundColor White
Write-Host "  Token: $($neonToken.Substring(0, 8))..." -ForegroundColor White
Write-Host ""

# Set environment variables for the build
$env:NEON_ARTWORK_URL = $neonUrl
$env:NEON_ARTWORK_TOKEN = $neonToken

Write-Host "Building Tauri app with embedded credentials..." -ForegroundColor Yellow
Write-Host ""

# Build the app
cargo tauri build

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "Build successful!" -ForegroundColor Green
    Write-Host ""
    Write-Host "The app now has Neon credentials built-in." -ForegroundColor Cyan
    Write-Host "Users can install and run with ZERO configuration!" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Installer location:" -ForegroundColor Yellow
    Write-Host "  src-tauri\target\release\bundle\" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "Build failed!" -ForegroundColor Red
    Write-Host ""
    exit 1
}
