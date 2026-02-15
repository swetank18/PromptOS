# Quick Start Guide - AI Conversation Capture System

## Prerequisites

Before you begin, ensure you have:
- ✅ Docker Desktop installed and running
- ✅ Chrome browser
- ✅ Git (optional, for version control)

## Step 1: Start the Backend Services

### Option A: Using Docker Compose (Recommended)

1. **Open PowerShell in the project directory**
```powershell
cd c:\Users\sweat\Desktop\codex\docex
```

2. **Start all services**
```powershell
docker-compose up -d
```

This will start:
- PostgreSQL (port 5432)
- Redis (port 6379)
- FastAPI Backend (port 8000)
- Celery Worker (background tasks)

3. **Verify services are running**
```powershell
# Check if containers are running
docker-compose ps

# Check backend health
curl http://localhost:8000/health
# Or open in browser: http://localhost:8000/health
```

Expected response:
```json
{"status":"healthy","version":"1.0.0"}
```

4. **View API documentation**
Open in browser: http://localhost:8000/api/docs

### Option B: Manual Docker Commands

If docker-compose doesn't work, you can start services individually:

```powershell
# Create network
docker network create ai-capture-network

# Start PostgreSQL
docker run -d --name postgres --network ai-capture-network `
  -e POSTGRES_DB=ai_conversations `
  -e POSTGRES_USER=postgres `
  -e POSTGRES_PASSWORD=postgres `
  -p 5432:5432 `
  pgvector/pgvector:pg16

# Start Redis
docker run -d --name redis --network ai-capture-network `
  -p 6379:6379 `
  redis:7-alpine

# Wait for database to be ready
Start-Sleep -Seconds 10

# Initialize database
docker exec -i postgres psql -U postgres -d ai_conversations < backend/db/schema.sql
```

## Step 2: Load the Browser Extension

1. **Open Chrome and navigate to extensions**
   - Type in address bar: `chrome://extensions/`
   - Or Menu → More Tools → Extensions

2. **Enable Developer Mode**
   - Toggle the switch in the top-right corner

3. **Load the extension**
   - Click "Load unpacked"
   - Navigate to: `c:\Users\sweat\Desktop\codex\docex\extension`
   - Click "Select Folder"

4. **Verify extension is loaded**
   - You should see "AI Conversation Capture" in your extensions list
   - Pin it to the toolbar for easy access

## Step 3: Test the Extension

### Test on ChatGPT

1. **Navigate to ChatGPT**
   - Go to https://chat.openai.com
   - Start or open an existing conversation

2. **Capture the conversation**
   - Look for the "💾 Capture" button in the top-right
   - Click it
   - You should see "✓ Captured" confirmation

3. **Check the extension popup**
   - Click the extension icon in Chrome toolbar
   - You should see the queue count increase

### Test on Claude

1. Navigate to https://claude.ai
2. Open a conversation
3. Click the "💾 Capture" button
4. Verify capture success

### Test on Gemini

1. Navigate to https://gemini.google.com
2. Open a conversation
3. Click the "💾 Capture" button
4. Verify capture success

## Step 4: Register and Authenticate

Currently, the extension requires backend authentication. You have two options:

### Option A: Use Extension Popup (When API routes are implemented)

1. Click the extension icon
2. Click "Register"
3. Fill in your details
4. Sign in

### Option B: Direct API Registration (Current MVP)

Use the API docs to register:

1. Open http://localhost:8000/api/docs
2. Expand `/api/v1/auth/register` (when implemented)
3. Click "Try it out"
4. Fill in the request body
5. Execute

## Step 5: Verify Data Storage

### Check Database

```powershell
# Connect to PostgreSQL
docker exec -it postgres psql -U postgres -d ai_conversations

# View tables
\dt

# Check conversations
SELECT * FROM conversations;

# Check messages
SELECT * FROM messages LIMIT 5;

# Exit
\q
```

### Check Redis Queue

```powershell
# Connect to Redis
docker exec -it redis redis-cli

# Check queue size
LLEN queue

# Exit
exit
```

## Troubleshooting

### Backend won't start

**Check if ports are already in use:**
```powershell
# Check port 8000
netstat -ano | findstr :8000

# Check port 5432
netstat -ano | findstr :5432

# Check port 6379
netstat -ano | findstr :6379
```

**Solution:** Stop conflicting services or change ports in `docker-compose.yml`

### Extension not capturing

1. **Check content script is loaded**
   - Right-click on the page → Inspect
   - Go to Console tab
   - Look for messages like `[ChatGPT] Extractor initialized`

2. **Check background service worker**
   - Go to `chrome://extensions/`
   - Click "Service worker" under your extension
   - Check for errors in the console

3. **Verify API connection**
   - Open extension popup
   - Check if status shows "Online" or "Offline"

### Database connection errors

```powershell
# Restart PostgreSQL
docker-compose restart postgres

# Check logs
docker-compose logs postgres
```

### Can't access API docs

```powershell
# Check backend logs
docker-compose logs backend

# Restart backend
docker-compose restart backend
```

## Next Steps

### 1. Implement Remaining API Routes

The backend structure is ready, but you need to implement:
- `/api/v1/auth/*` - Authentication endpoints
- `/api/v1/conversations/*` - Conversation CRUD
- `/api/v1/search/*` - Search endpoints
- `/api/v1/projects/*` - Project management

See `docs/API.md` for specifications.

### 2. Test Embedding Generation

Once conversations are stored, test the embedding pipeline:

```powershell
# Check Celery worker logs
docker-compose logs celery_worker

# Manually trigger embedding generation (when implemented)
# This will happen automatically via background tasks
```

### 3. Build Frontend Dashboard

Create a Next.js dashboard to:
- View all conversations
- Search semantically
- Manage projects
- View analytics

### 4. Production Deployment

When ready for production:
1. Review `docs/DEPLOYMENT.md`
2. Set strong JWT secrets
3. Configure production database
4. Set up SSL/TLS
5. Deploy to cloud provider

## Useful Commands

### Docker Management

```powershell
# View all containers
docker-compose ps

# View logs (all services)
docker-compose logs -f

# View logs (specific service)
docker-compose logs -f backend
docker-compose logs -f postgres
docker-compose logs -f celery_worker

# Restart a service
docker-compose restart backend

# Stop all services
docker-compose down

# Stop and remove volumes (clean slate)
docker-compose down -v

# Rebuild containers
docker-compose up -d --build
```

### Database Management

```powershell
# Backup database
docker exec postgres pg_dump -U postgres ai_conversations > backup.sql

# Restore database
docker exec -i postgres psql -U postgres ai_conversations < backup.sql

# Reset database
docker exec postgres psql -U postgres -c "DROP DATABASE ai_conversations;"
docker exec postgres psql -U postgres -c "CREATE DATABASE ai_conversations;"
docker exec -i postgres psql -U postgres -d ai_conversations < backend/db/schema.sql
```

### Extension Development

```powershell
# After making changes to extension code:
# 1. Go to chrome://extensions/
# 2. Click the refresh icon on your extension
# 3. Test the changes
```

## Support

- **Documentation**: See `docs/` folder
- **API Reference**: http://localhost:8000/api/docs
- **Architecture**: See `implementation_plan.md`
- **Issues**: Check logs with `docker-compose logs`

## Production Checklist

Before deploying to production:

- [ ] Change JWT_SECRET to a strong random value
- [ ] Set DEBUG=false
- [ ] Configure production database URL
- [ ] Set up SSL/TLS certificates
- [ ] Configure CORS for production domain
- [ ] Set up monitoring (Prometheus/Grafana)
- [ ] Configure backups
- [ ] Review security settings
- [ ] Load test the system
- [ ] Prepare privacy policy for extension

---

**You're all set!** The system is now running locally and ready for development and testing.
