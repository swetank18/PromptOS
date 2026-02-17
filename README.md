# AI Conversation Capture System

Production-grade browser extension + backend system for capturing, structuring, and indexing conversations from multiple AI platforms (ChatGPT, Claude, Gemini) into a unified searchable database.

## 🏗️ Architecture

- **Browser Extension** (Manifest v3): Captures conversations from AI platforms
- **Backend API** (FastAPI): RESTful API for data management
- **Database** (PostgreSQL + pgvector): Relational storage with vector search
- **Embedding Pipeline** (Celery + sentence-transformers): Async semantic indexing
- **Frontend Dashboard** (Next.js): Web interface for search and analytics

## 🚀 Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js 18+ (for extension and frontend development)
- Python 3.11+ (for backend development)

### Local Development

1. **Clone the repository**
```bash
git clone <repository-url>
cd docex
```

2. **Set up environment variables**
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Start services with Docker Compose**
```bash
docker-compose up -d
```

This will start:
- PostgreSQL with pgvector on port 5432
- Redis on port 6379
- FastAPI backend on port 8000
- Celery worker for background tasks

4. **Load the browser extension**
- Open Chrome and navigate to `chrome://extensions/`
- Enable "Developer mode"
- Click "Load unpacked"
- Select the `extension/` directory

5. **Access the API**
- API Documentation: http://localhost:8000/api/docs
- Health Check: http://localhost:8000/health

## 📁 Project Structure

```
docex/
├── extension/          # Browser extension (Manifest v3)
│   ├── manifest.json
│   ├── background/     # Service worker
│   ├── content/        # Platform extractors
│   └── popup/          # Extension UI
├── backend/            # FastAPI backend
│   ├── app/
│   │   ├── main.py
│   │   ├── core/       # Config, database, auth
│   │   ├── models/     # SQLAlchemy models
│   │   ├── api/        # API routes
│   │   └── services/   # Business logic
│   └── db/
│       └── schema.sql  # Database schema
├── frontend/           # Next.js dashboard (TODO)
├── docker-compose.yml  # Local development setup
└── docs/               # Documentation
```

## 🔧 Development

### Backend Development

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Extension Development

The extension uses vanilla JavaScript (no build step required). Simply make changes and reload the extension in Chrome.

### Database Migrations

```bash
cd backend
alembic revision --autogenerate -m "Description"
alembic upgrade head
```

## 🎯 Features

### Current (MVP)
- ✅ Browser extension for ChatGPT, Claude, Gemini
- ✅ Offline queue with IndexedDB
- ✅ PostgreSQL database with pgvector
- ✅ FastAPI backend with JWT authentication
- ✅ Docker Compose for local development

### Planned
- [ ] Semantic search with embeddings
- [ ] Next.js dashboard
- [ ] Analytics and visualization
- [ ] Cross-agent comparison
- [ ] Export/import functionality

## 📚 Documentation

See the [implementation plan](C:\Users\sweat\.gemini\antigravity\brain\91c2255c-90c1-4929-b212-dd2a1d07bf92\implementation_plan.md) for detailed architecture and design decisions.

## 🔒 Security

- Minimal extension permissions (only specific AI platforms)
- JWT authentication with secure token storage
- SQL injection protection via parameterized queries
- CORS whitelist for extension and frontend
- Privacy-first: optional local-only mode

## 📝 License

MIT License - see LICENSE file for details

## 🤝 Contributing

Contributions welcome! Please read CONTRIBUTING.md for guidelines.

## 📧 Support

For issues and questions, please open a GitHub issue.

Railway deployment guide: docs/RAILWAY_SETUP.md

