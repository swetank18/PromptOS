import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import uuid
import random

app = FastAPI(title="Docex Mock Backend")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mock Data Store
MOCK_USERS = {}
MOCK_CONVERSATIONS = {}
MOCK_TOKENS = {}

class ConversationCreate(BaseModel):
    agent_id: str
    title: Optional[str] = None
    messages: List[dict]
    project_id: Optional[str] = None
    external_id: Optional[str] = None
    metadata: Optional[dict] = {}

class BatchCreate(BaseModel):
    conversations: List[ConversationCreate]

@app.get("/health")
def health():
    return {"status": "healthy", "mode": "mock"}

@app.post("/api/v1/auth/login")
def login(creds: dict):
    token = f"mock-token-{uuid.uuid4()}"
    MOCK_TOKENS[token] = "user-123"
    return {"access_token": token, "token_type": "bearer", "expires_in": 3600}

@app.post("/api/v1/auth/register")
def register(data: dict):
    return {"id": str(uuid.uuid4()), "email": data.get("email"), "full_name": data.get("full_name")}

@app.get("/api/v1/auth/me")
def me():
    return {
        "id": "user-123",
        "email": "test@example.com",
        "full_name": "Test User",
        "is_active": True
    }

@app.get("/api/v1/agents/")
def list_agents():
    return [
        {"id": "a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d", "name": "chatgpt", "display_name": "ChatGPT"},
        {"id": "b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e", "name": "claude", "display_name": "Claude"},
        {"id": "c3d4e5f6-a7b8-6c7d-0e1f-2a3b4c5d6e7f", "name": "gemini", "display_name": "Gemini"}
    ]

# Simple keyword-based auto-tagging
def auto_tag(title: str, messages: List[dict]) -> List[dict]:
    tags = []
    content = (title or "") + " " + " ".join([m.get("content", "") for m in messages])
    content = content.lower()
    
    keywords = {
        "python": {"name": "Python", "color": "blue"},
        "javascript": {"name": "JavaScript", "color": "yellow"},
        "typescript": {"name": "TypeScript", "color": "blue"},
        "react": {"name": "React", "color": "cyan"},
        "sql": {"name": "SQL", "color": "orange"},
        "docker": {"name": "Docker", "color": "blue"},
        "css": {"name": "CSS", "color": "pink"},
        "html": {"name": "HTML", "color": "orange"},
        "api": {"name": "API", "color": "green"},
        "bug": {"name": "Debugging", "color": "red"},
        "test": {"name": "Testing", "color": "green"}
    }
    
    for key, tag in keywords.items():
        if key in content:
            tags.append(tag)
            
    return tags

@app.post("/api/v1/conversations/")
def create_conversation(conv: ConversationCreate):
    conv_id = str(uuid.uuid4())
    
    # Auto-tag
    tags = auto_tag(conv.title, conv.messages)
    
    # Store with tags
    conv_data = conv.dict()
    conv_data["tags"] = tags
    MOCK_CONVERSATIONS[conv_id] = conv_data
    
    return {
        "id": conv_id,
        "title": conv.title or "New Conversation",
        "created_at": datetime.now().isoformat(),
        "message_count": len(conv.messages),
        "agent_id": conv.agent_id,
        "tags": tags
    }

@app.post("/api/v1/conversations/batch")
def batch_conversations(batch: BatchCreate):
    created = []
    for conv in batch.conversations:
        conv_id = str(uuid.uuid4())
        
        # Auto-tag
        tags = auto_tag(conv.title, conv.messages)
        
        conv_data = conv.dict()
        conv_data["tags"] = tags
        MOCK_CONVERSATIONS[conv_id] = conv_data
        
        created.append({
            "id": conv_id,
            "title": conv.title,
            "external_id": conv.external_id,
            "tags": tags
        })
    return {
        "created": len(created),
        "updated": 0,
        "failed": 0,
        "conversations": created
    }

@app.get("/api/v1/conversations/")
def list_conversations(tag: Optional[str] = None):
    # If using mock storage
    if MOCK_CONVERSATIONS:
        conversations = [
            {
                "id": k,
                "title": v.get("title") or "New Conversation",
                "agent_id": v.get("agent_id"),
                "created_at": datetime.now().isoformat(),
                "message_count": len(v.get("messages", [])),
                "tags": v.get("tags", [])
            }
            for k, v in MOCK_CONVERSATIONS.items()
        ]
        
        # Filter by tag if provided
        if tag:
            conversations = [
                c for c in conversations 
                if c.get("tags") and any(t.get("name").lower() == tag.lower() for t in c["tags"])
            ]
            
        return conversations

    # Default dummy data
    defaults = [
        {
            "id": str(uuid.uuid4()),
            "title": "How to center a div in CSS",
            "agent_id": "a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d",
            "created_at": datetime.now().isoformat(),
            "message_count": 4,
            "tags": [{"name": "CSS", "color": "pink"}, {"name": "Frontend", "color": "purple"}]
        },
        {
            "id": str(uuid.uuid4()),
            "title": "Python script for data analysis",
            "agent_id": "b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e",
            "created_at": datetime.now().isoformat(),
            "message_count": 12,
            "tags": [{"name": "Python", "color": "blue"}, {"name": "Data", "color": "green"}]
        }
    ]
    
    if tag:
        return [
            c for c in defaults 
            if c.get("tags") and any(t.get("name").lower() == tag.lower() for t in c["tags"])
        ]
        
    return defaults

if __name__ == "__main__":
    print("🚀 Starting Mock Backend on http://localhost:8000")
    print("⚠️  Use this ONLY for testing the extension when Docker is unavailable.")
    uvicorn.run(app, host="0.0.0.0", port=8000)
