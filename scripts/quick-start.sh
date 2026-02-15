#!/bin/bash

# Quick start script for AI Conversation Capture System

set -e

echo "🚀 AI Conversation Capture - Quick Start"
echo "========================================"

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command -v docker &> /dev/null; then
    echo "❌ Docker not found. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose not found. Please install Docker Compose first."
    exit 1
fi

echo "✅ Prerequisites met"

# Create .env if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cp .env.example .env
    echo "⚠️  Please edit .env with your configuration"
fi

# Start services
echo "🐳 Starting Docker services..."
docker-compose up -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check backend health
echo "🏥 Checking backend health..."
if curl -f http://localhost:8000/health > /dev/null 2>&1; then
    echo "✅ Backend is healthy"
else
    echo "❌ Backend health check failed"
    echo "Check logs with: docker-compose logs backend"
    exit 1
fi

# Check database
echo "🗄️  Checking database..."
if docker-compose exec -T postgres pg_isready -U postgres > /dev/null 2>&1; then
    echo "✅ Database is ready"
else
    echo "❌ Database check failed"
    exit 1
fi

# Check Redis
echo "📦 Checking Redis..."
if docker-compose exec -T redis redis-cli ping > /dev/null 2>&1; then
    echo "✅ Redis is ready"
else
    echo "❌ Redis check failed"
    exit 1
fi

echo ""
echo "✨ Setup complete!"
echo ""
echo "📚 Next steps:"
echo "1. Load the browser extension:"
echo "   - Open Chrome and go to chrome://extensions/"
echo "   - Enable 'Developer mode'"
echo "   - Click 'Load unpacked'"
echo "   - Select the 'extension/' directory"
echo ""
echo "2. Access the API:"
echo "   - API: http://localhost:8000"
echo "   - Docs: http://localhost:8000/api/docs"
echo ""
echo "3. View logs:"
echo "   - docker-compose logs -f backend"
echo "   - docker-compose logs -f celery_worker"
echo ""
echo "4. Stop services:"
echo "   - docker-compose down"
echo ""
