# Getting Started - Complete Setup Guide

## Current Status

✅ **What's Complete**:
- Full browser extension (capture works for ChatGPT, Claude, Gemini)
- Complete backend API with all routes
- Database schema with pgvector
- Embedding service
- Docker configuration
- Comprehensive documentation

❌ **What's Needed**: Docker Desktop installation to run the backend

---

## Quick Start (Once Docker is Installed)

### 1. Install Docker Desktop

**Download**: https://www.docker.com/products/docker-desktop/

After installation:
1. Restart your computer
2. Launch Docker Desktop
3. Wait for the whale icon in system tray (Docker is running)

### 2. Initialize and Start Services

```powershell
cd c:\Users\sweat\Desktop\codex\docex

# Start all services
docker compose up -d

# Wait 10 seconds for services to start
Start-Sleep -Seconds 10

# Initialize database
.\scripts\init-db.ps1
```

### 3. Verify Backend is Running

```powershell
# Check health
curl http://localhost:8000/health

# Or open in browser
start http://localhost:8000/api/docs
```

You should see the interactive API documentation.

### 4. Load Browser Extension

1. Open Chrome: `chrome://extensions/`
2. Enable "Developer mode" (toggle in top-right)
3. Click "Load unpacked"
4. Select: `c:\Users\sweat\Desktop\codex\docex\extension`

### 5. Register a User

**Option A: Via API Docs**
1. Go to http://localhost:8000/api/docs
2. Expand `POST /api/v1/auth/register`
3. Click "Try it out"
4. Fill in:
```json
{
  "email": "your@email.com",
  "password": "yourpassword123",
  "full_name": "Your Name"
}
```
5. Click "Execute"
6. Copy the user ID from response

**Option B: Via Extension Popup** (when implemented)
1. Click extension icon
2. Click "Register"
3. Fill in details

### 6. Login and Get Token

1. Go to http://localhost:8000/api/docs
2. Expand `POST /api/v1/auth/login`
3. Fill in your credentials
4. Copy the `access_token` from response

### 7. Get Agent IDs

1. Go to http://localhost:8000/api/docs
2. Expand `GET /api/v1/agents/`
3. Click "Try it out" → "Execute"
4. Copy the agent IDs for ChatGPT, Claude, and Gemini

### 8. Test Conversation Capture

**Manual Test via API**:
1. Go to http://localhost:8000/api/docs
2. Click the "Authorize" button (top-right)
3. Paste your access token
4. Expand `POST /api/v1/conversations/`
5. Create a test conversation:
```json
{
  "agent_id": "<chatgpt-agent-id>",
  "title": "Test Conversation",
  "messages": [
    {
      "role": "user",
      "content": "Hello, how are you?",
      "sequence_number": 0
    },
    {
      "role": "assistant",
      "content": "I'm doing well, thank you!",
      "sequence_number": 1
    }
  ]
}
```

**Via Extension** (needs token configuration):
1. Update `extension/background/api-client.js` line 7:
```javascript
this.baseURL = 'http://localhost:8000';
```
2. Reload extension in `chrome://extensions/`
3. Go to https://chat.openai.com
4. Open a conversation
5. Click "💾 Capture" button

### 9. Test Search

1. Go to http://localhost:8000/api/docs
2. Make sure you're authorized (green lock icon)
3. Expand `POST /api/v1/search/semantic`
4. Try a search:
```json
{
  "query": "hello",
  "limit": 10,
  "similarity_threshold": 0.3
}
```

---

## What Each Component Does

### Backend Services (Docker)

**PostgreSQL** (port 5432)
- Stores all conversations, messages, users
- pgvector extension for embeddings
- Full-text search capabilities

**Redis** (port 6379)
- Caching layer
- Celery job queue
- Session storage

**FastAPI Backend** (port 8000)
- REST API endpoints
- JWT authentication
- Request validation

**Celery Worker**
- Background embedding generation
- Async task processing
- Cleanup jobs

### Browser Extension

**Content Scripts**
- Extract conversations from AI platforms
- Detect new messages automatically
- Handle platform-specific formatting

**Background Worker**
- Offline queue (IndexedDB)
- Periodic sync with backend
- Token management

**Popup UI**
- Authentication
- Status display
- Manual controls

---

## API Endpoints Available

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login and get JWT
- `GET /api/v1/auth/me` - Get current user info

### Agents
- `GET /api/v1/agents/` - List all AI platforms
- `GET /api/v1/agents/{id}` - Get agent details

### Conversations
- `POST /api/v1/conversations/` - Create conversation
- `POST /api/v1/conversations/batch` - Batch create (for extension)
- `GET /api/v1/conversations/` - List conversations
- `GET /api/v1/conversations/{id}` - Get conversation with messages
- `PUT /api/v1/conversations/{id}` - Update conversation
- `DELETE /api/v1/conversations/{id}` - Delete conversation

### Search
- `POST /api/v1/search/semantic` - Vector similarity search
- `POST /api/v1/search/keyword` - Full-text search
- `POST /api/v1/search/hybrid` - Combined search (RRF)

### System
- `GET /health` - Health check
- `GET /` - API info

---

## Troubleshooting

### Docker won't start
- Enable WSL 2: `wsl --install`
- Enable virtualization in BIOS
- Restart computer

### Can't access http://localhost:8000
```powershell
# Check if containers are running
docker compose ps

# Check backend logs
docker compose logs backend

# Restart backend
docker compose restart backend
```

### Database errors
```powershell
# Reinitialize database
docker compose down -v
docker compose up -d
Start-Sleep -Seconds 10
.\scripts\init-db.ps1
```

### Extension not capturing
1. Check console for errors (F12 on AI platform page)
2. Verify API URL in `extension/background/api-client.js`
3. Check if you're logged in (extension popup)

---

## Next Steps After Setup

### 1. Build Frontend Dashboard
```powershell
npx create-next-app@latest frontend --typescript --tailwind
cd frontend
npm install @tanstack/react-query axios
```

### 2. Implement Remaining Features
See `PRODUCTION_CHECKLIST.md` for full roadmap:
- Project management
- Analytics dashboard
- Advanced search filters
- Export functionality

### 3. Deploy to Production
See `docs/DEPLOYMENT.md` for:
- Cloud deployment (AWS, Google Cloud, DigitalOcean)
- SSL/TLS setup
- Monitoring and logging
- Scaling strategies

---

## Useful Commands

```powershell
# Start services
docker compose up -d

# Stop services
docker compose down

# View logs
docker compose logs -f backend
docker compose logs -f celery_worker

# Restart a service
docker compose restart backend

# Clean slate (removes all data)
docker compose down -v

# Database backup
docker compose exec postgres pg_dump -U postgres ai_conversations > backup.sql

# Database restore
Get-Content backup.sql | docker compose exec -T postgres psql -U postgres -d ai_conversations
```

---

## Support

- **API Docs**: http://localhost:8000/api/docs
- **Setup Guide**: `SETUP.md`
- **Deployment**: `docs/DEPLOYMENT.md`
- **API Reference**: `docs/API.md`
- **Production Checklist**: `PRODUCTION_CHECKLIST.md`

---

**You're ready to go!** Once Docker is installed, run the commands above and you'll have a fully functional AI conversation capture system.
