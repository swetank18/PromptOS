from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from contextlib import asynccontextmanager
import logging

from app.core.config import settings
from app.core.database import engine, Base

# Import models to ensure they're registered
from app.models import user, conversation, embedding, agent

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events"""
    logger.info("Starting AI Conversation Capture API")
    # Create tables if they don't exist (for development)
    # In production, use Alembic migrations
    if settings.DEBUG:
        Base.metadata.create_all(bind=engine)
    yield
    logger.info("Shutting down API")

app = FastAPI(
    title="AI Conversation Capture API",
    description="Backend API for capturing and indexing AI conversations",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc"
)

# Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Import and include routers
from app.api.v1 import auth, conversations, search, agents
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(conversations.router, prefix="/api/v1/conversations", tags=["Conversations"])
app.include_router(search.router, prefix="/api/v1/search", tags=["Search"])
app.include_router(agents.router, prefix="/api/v1/agents", tags=["Agents"])

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "version": "1.0.0"
    }

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "AI Conversation Capture API",
        "docs": "/api/docs"
    }
