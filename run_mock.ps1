# Run Mock Backend
# Use this when Docker is unavailable to test the extension

Write-Host "🚀 Setting up Mock Backend Environment..." -ForegroundColor Cyan

# Check Python
if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Python not found. Please install Python 3.10+" -ForegroundColor Red
    exit 1
}

# Create venv if not exists
if (-not (Test-Path ".venv")) {
    Write-Host "📦 Creating virtual environment..." -ForegroundColor Yellow
    python -m venv .venv
}

# Activate venv
Write-Host "🔌 Activating virtual environment..." -ForegroundColor Yellow
if (Test-Path ".\.venv\Scripts\Activate.ps1") {
    & ".\.venv\Scripts\Activate.ps1"
}
else {
    Write-Host "⚠️  Could not find activation script. Running python directly." -ForegroundColor Yellow
}

# Install minimal dependencies
Write-Host "⬇️  Installing dependencies (fastapi, uvicorn)..." -ForegroundColor Yellow
python -m pip install fastapi uvicorn

# Run mock server
Write-Host ""
Write-Host "✅ Starting Mock Server..." -ForegroundColor Green
Write-Host "   API URL: http://localhost:8000" -ForegroundColor White
Write-Host "   Docs: http://localhost:8000/docs" -ForegroundColor White
Write-Host "⚠️  Press Ctrl+C to stop" -ForegroundColor Gray
Write-Host ""

python mock_server.py
