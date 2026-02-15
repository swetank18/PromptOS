# Quick Start Script for Windows

Write-Host "🚀 AI Conversation Capture - Quick Start" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Check Docker
Write-Host "📋 Checking prerequisites..." -ForegroundColor Yellow

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Docker not found. Please install Docker Desktop first." -ForegroundColor Red
    exit 1
}

if (-not (Get-Command docker-compose -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Docker Compose not found. Please install Docker Compose first." -ForegroundColor Red
    exit 1
}

Write-Host "✅ Prerequisites met" -ForegroundColor Green

# Create .env if it doesn't exist
if (-not (Test-Path .env)) {
    Write-Host "📝 Creating .env file..." -ForegroundColor Yellow
    Copy-Item .env.example .env
    Write-Host "⚠️  Please edit .env with your configuration" -ForegroundColor Yellow
}

# Start services
Write-Host "🐳 Starting Docker services..." -ForegroundColor Yellow
docker-compose up -d

# Wait for services
Write-Host "⏳ Waiting for services to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Check backend health
Write-Host "🏥 Checking backend health..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri http://localhost:8000/health -UseBasicParsing
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Backend is healthy" -ForegroundColor Green
    }
}
catch {
    Write-Host "❌ Backend health check failed" -ForegroundColor Red
    Write-Host "Check logs with: docker-compose logs backend" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "✨ Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📚 Next steps:" -ForegroundColor Cyan
Write-Host "1. Load the browser extension:" -ForegroundColor White
Write-Host "   - Open Chrome and go to chrome://extensions/" -ForegroundColor Gray
Write-Host "   - Enable 'Developer mode'" -ForegroundColor Gray
Write-Host "   - Click 'Load unpacked'" -ForegroundColor Gray
Write-Host "   - Select the 'extension/' directory" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Access the API:" -ForegroundColor White
Write-Host "   - API: http://localhost:8000" -ForegroundColor Gray
Write-Host "   - Docs: http://localhost:8000/api/docs" -ForegroundColor Gray
Write-Host ""
Write-Host "3. View logs:" -ForegroundColor White
Write-Host "   - docker-compose logs -f backend" -ForegroundColor Gray
Write-Host "   - docker-compose logs -f celery_worker" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Stop services:" -ForegroundColor White
Write-Host "   - docker-compose down" -ForegroundColor Gray
Write-Host ""
