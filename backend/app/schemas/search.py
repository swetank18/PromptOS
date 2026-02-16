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


class ConversationCompareRequest(BaseModel):
    left_conversation_id: UUID
    right_conversation_id: UUID
    max_turns: int = 20


class TurnSimilarityResult(BaseModel):
    turn_index: int
    left_message_id: UUID
    right_message_id: UUID
    left_preview: str
    right_preview: str
    similarity: Optional[float] = None
    has_left_embedding: bool
    has_right_embedding: bool


class ConversationCompareResponse(BaseModel):
    left_conversation_id: UUID
    right_conversation_id: UUID
    compared_turns: int
    comparable_turns: int
    average_similarity: Optional[float] = None
    turn_results: List[TurnSimilarityResult]
