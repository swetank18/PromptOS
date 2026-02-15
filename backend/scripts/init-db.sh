#!/bin/bash

# Database initialization script
# This script initializes the database schema and seeds initial data

set -e

echo "🗄️  Initializing database..."

# Wait for PostgreSQL to be ready
until PGPASSWORD=$DB_PASSWORD psql -h postgres -U postgres -d ai_conversations -c '\q' 2>/dev/null; do
  echo "⏳ Waiting for PostgreSQL..."
  sleep 2
done

echo "✅ PostgreSQL is ready"

# Run schema
echo "📋 Creating schema..."
PGPASSWORD=$DB_PASSWORD psql -h postgres -U postgres -d ai_conversations -f /app/db/schema.sql

# Seed data
echo "🌱 Seeding data..."
PGPASSWORD=$DB_PASSWORD psql -h postgres -U postgres -d ai_conversations -f /app/db/seed.sql

echo "✨ Database initialized successfully!"
