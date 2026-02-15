# Complete Setup Guide - AI Conversation Capture System

## Current Status: Docker Not Installed

Docker is required to run the backend services. You have several options:

---

## Option 1: Install Docker Desktop (Recommended)

### Step 1: Download and Install Docker Desktop

1. **Download Docker Desktop for Windows**
   - Visit: https://www.docker.com/products/docker-desktop/
   - Click "Download for Windows"
   - Run the installer

2. **Installation Requirements**
   - Windows 10 64-bit: Pro, Enterprise, or Education (Build 19041 or higher)
   - OR Windows 11 64-bit
   - WSL 2 feature enabled (installer will help with this)
   - Virtualization enabled in BIOS

3. **After Installation**
   - Restart your computer
   - Launch Docker Desktop
   - Wait for it to start (you'll see a whale icon in the system tray)

4. **Verify Installation**
```powershell
docker --version
docker compose version
```

5. **Return to Project and Start Services**
```powershell
cd c:\Users\sweat\Desktop\codex\docex
docker compose up -d
```

---

## Option 2: Run Backend Manually (Without Docker)

If you can't install Docker, you can run the services manually:

### Prerequisites

1. **Install Python 3.11+**
   - Download from: https://www.python.org/downloads/
   - During installation, check "Add Python to PATH"

2. **Install PostgreSQL 16**
   - Download from: https://www.postgresql.org/download/windows/
   - During installation:
     - Set password: `postgres`
     - Port: `5432`
     - Remember the installation path

3. **Install Redis**
   - Download from: https://github.com/microsoftarchive/redis/releases
   - Or use Memurai (Redis for Windows): https://www.memurai.com/

### Step-by-Step Manual Setup

#### 1. Set Up PostgreSQL

```powershell
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE ai_conversations;

# Exit
\q

# Run schema
psql -U postgres -d ai_conversations -f backend\db\schema.sql
```

#### 2. Install pgvector Extension

```powershell
# Download pgvector for Windows
# Visit: https://github.com/pgvector/pgvector/releases

# Or install via PostgreSQL extensions manager
# This step may require compiling from source on Windows
```

**Note**: pgvector on Windows can be challenging. Consider using Docker for this reason.

#### 3. Start Redis

```powershell
# If using Redis
redis-server

# If using Memurai
memurai
```

#### 4. Set Up Python Backend

```powershell
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
.\venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt

# Set environment variables
$env:DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ai_conversations"
$env:REDIS_URL="redis://localhost:6379/0"
$env:JWT_SECRET="your-secret-key-change-this"
$env:DEBUG="true"

# Run backend
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

#### 5. Start Celery Worker (Separate Terminal)

```powershell
cd backend
.\venv\Scripts\Activate.ps1

# Set environment variables (same as above)
$env:DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ai_conversations"
$env:REDIS_URL="redis://localhost:6379/0"

# Start Celery
celery -A app.tasks.celery_app worker --loglevel=info --pool=solo
```

**Note**: Use `--pool=solo` on Windows as the default pool doesn't work well.

---

## Option 3: Use Cloud Development Environment

### GitHub Codespaces

1. Push your code to GitHub
2. Open in Codespaces
3. Docker is pre-installed
4. Run `docker compose up -d`

### Gitpod

1. Push your code to GitHub/GitLab
2. Open in Gitpod
3. Docker is pre-installed
4. Run `docker compose up -d`

---

## Option 4: Extension-Only Mode (Testing)

You can test the extension without the backend:

### 1. Modify Extension for Testing

Edit `extension/background/background.js` to add mock mode:

```javascript
// At the top of the file
const MOCK_MODE = true; // Set to true for testing without backend

// In handleCaptureConversation function
if (MOCK_MODE) {
  console.log('[Mock] Would save conversation:', enrichedData);
  return {
    success: true,
    conversationId: 'mock-' + Date.now(),
    synced: false,
    mock: true
  };
}
```

### 2. Load Extension

1. Go to `chrome://extensions/`
2. Enable Developer mode
3. Load unpacked → select `extension/` folder
4. Test on ChatGPT/Claude/Gemini

### 3. View Captured Data

Open browser console on AI platforms to see captured conversations.

---

## Recommended Path Forward

### For Development & Testing

**Best Option**: Install Docker Desktop
- Easiest setup
- Matches production environment
- All services managed together
- One command to start everything

### For Production

**Best Option**: Deploy to cloud
- Use managed services (AWS RDS, Google Cloud SQL)
- No local setup required
- Scalable and reliable

---

## After Docker is Installed

Once Docker Desktop is running:

### 1. Start Services

```powershell
cd c:\Users\sweat\Desktop\codex\docex
docker compose up -d
```

### 2. Verify Services

```powershell
# Check containers
docker compose ps

# Check backend health
curl http://localhost:8000/health

# Or open in browser
start http://localhost:8000/health
```

### 3. View Logs

```powershell
# All services
docker compose logs -f

# Specific service
docker compose logs -f backend
docker compose logs -f postgres
docker compose logs -f celery_worker
```

### 4. Load Extension

1. Chrome → `chrome://extensions/`
2. Enable Developer mode
3. Load unpacked → `c:\Users\sweat\Desktop\codex\docex\extension`

### 5. Test Capture

1. Go to https://chat.openai.com
2. Open a conversation
3. Click "💾 Capture" button
4. Check extension popup for status

---

## Troubleshooting

### Docker Desktop Won't Start

**Issue**: "Docker Desktop starting..." forever

**Solutions**:
1. Enable WSL 2:
   ```powershell
   wsl --install
   wsl --set-default-version 2
   ```

2. Enable Virtualization in BIOS
   - Restart computer
   - Enter BIOS (usually F2, F10, or Del during boot)
   - Enable Intel VT-x or AMD-V
   - Save and exit

3. Reset Docker Desktop
   - Right-click Docker icon → Troubleshoot → Reset to factory defaults

### PostgreSQL Connection Errors

**Issue**: Can't connect to database

**Solutions**:
1. Check if PostgreSQL is running:
   ```powershell
   docker compose ps postgres
   ```

2. Check logs:
   ```powershell
   docker compose logs postgres
   ```

3. Restart PostgreSQL:
   ```powershell
   docker compose restart postgres
   ```

### Port Already in Use

**Issue**: Port 8000/5432/6379 already in use

**Solutions**:
1. Find what's using the port:
   ```powershell
   netstat -ano | findstr :8000
   ```

2. Kill the process or change port in `docker-compose.yml`

---

## Next Steps After Setup

### 1. Implement API Routes

The backend structure is ready but needs route implementations:

**Create**: `backend/app/api/v1/auth.py`
```python
from fastapi import APIRouter, Depends, HTTPException
from app.core.auth import create_access_token, verify_password, get_password_hash
from app.core.database import get_db
from app.models.user import User

router = APIRouter()

@router.post("/register")
async def register(email: str, password: str, full_name: str, db = Depends(get_db)):
    # Check if user exists
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    user = User(
        email=email,
        password_hash=get_password_hash(password),
        full_name=full_name
    )
    db.add(user)
    db.commit()
    
    return {"id": str(user.id), "email": user.email}

@router.post("/login")
async def login(email: str, password: str, db = Depends(get_db)):
    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_access_token({"sub": str(user.id)})
    return {"access_token": token, "token_type": "bearer"}
```

Then uncomment the router imports in `backend/app/main.py`.

### 2. Test End-to-End

1. Register a user via API docs
2. Login and get JWT token
3. Update extension with token
4. Capture a conversation
5. Verify in database

### 3. Build Frontend Dashboard

Create Next.js app:
```powershell
npx create-next-app@latest frontend
cd frontend
npm install @tanstack/react-query axios
npm run dev
```

### 4. Deploy to Production

See `docs/DEPLOYMENT.md` for production deployment guide.

---

## Quick Reference

### Essential Commands

```powershell
# Start everything
docker compose up -d

# Stop everything
docker compose down

# View logs
docker compose logs -f

# Restart a service
docker compose restart backend

# Rebuild after code changes
docker compose up -d --build

# Clean slate (removes volumes)
docker compose down -v
```

### Useful URLs

- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/api/docs
- PostgreSQL: localhost:5432
- Redis: localhost:6379

### Database Access

```powershell
# Connect to PostgreSQL
docker compose exec postgres psql -U postgres -d ai_conversations

# View tables
\dt

# Query conversations
SELECT * FROM conversations;

# Exit
\q
```

---

## Support

If you encounter issues:

1. Check logs: `docker compose logs -f`
2. Review `QUICKSTART.md`
3. See `docs/DEPLOYMENT.md` for detailed troubleshooting
4. Check Docker Desktop is running (whale icon in system tray)

---

**Current Status**: Waiting for Docker Desktop installation to proceed with automated setup.
