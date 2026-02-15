# Database initialization script for Windows
# This script initializes the database schema and seeds initial data

Write-Host "🗄️  Initializing database..." -ForegroundColor Cyan

# Wait for PostgreSQL to be ready
$maxAttempts = 30
$attempt = 0

while ($attempt -lt $maxAttempts) {
    try {
        docker compose exec -T postgres pg_isready -U postgres | Out-Null
        if ($LASTEXITCODE -eq 0) {
            break
        }
    }
    catch {
        # Ignore error
    }
    
    Write-Host "⏳ Waiting for PostgreSQL..." -ForegroundColor Yellow
    Start-Sleep -Seconds 2
    $attempt++
}

if ($attempt -eq $maxAttempts) {
    Write-Host "❌ PostgreSQL failed to start" -ForegroundColor Red
    exit 1
}

Write-Host "✅ PostgreSQL is ready" -ForegroundColor Green

# Run schema
Write-Host "📋 Creating schema..." -ForegroundColor Yellow
Get-Content backend\db\schema.sql | docker compose exec -T postgres psql -U postgres -d ai_conversations

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Schema creation failed" -ForegroundColor Red
    exit 1
}

# Seed data
Write-Host "🌱 Seeding data..." -ForegroundColor Yellow
Get-Content backend\db\seed.sql | docker compose exec -T postgres psql -U postgres -d ai_conversations

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Data seeding failed" -ForegroundColor Red
    exit 1
}

Write-Host "✨ Database initialized successfully!" -ForegroundColor Green
