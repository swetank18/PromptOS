from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from uuid import UUID

class SearchRequest(BaseModel):
    query: str
    project_ids: Optional[List[UUID]] = None
    agent_ids: Optional[List[UUID]] = None
    limit: int = 20
    similarity_threshold: float = 0.5

class SearchResult(BaseModel):
    message_id: UUID
    content: str
    role: str
    conversation_id: UUID
    conversation_title: Optional[str]
    agent_name: str
    similarity: Optional[float] = None
    
    class Config:
        from_attributes = True

class SearchResponse(BaseModel):
    query: str
    results: List[SearchResult]
    total: int
    search_type: str
