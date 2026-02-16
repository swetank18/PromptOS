from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from uuid import UUID

# Message Schemas
class MessageBase(BaseModel):
    role: str = Field(..., pattern="^(user|assistant|system)$")
    content: str
    sequence_number: int
    external_id: Optional[str] = None
    model: Optional[str] = None
    tokens: Optional[int] = None
    metadata: Optional[Dict[str, Any]] = {}

class MessageCreate(MessageBase):
    pass

class MessageResponse(MessageBase):
    id: UUID
    conversation_id: UUID
    created_at: datetime
    
    class Config:
        from_attributes = True

# Conversation Schemas
class ConversationBase(BaseModel):
    title: Optional[str] = None
    project_id: Optional[UUID] = None
    external_id: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = {}

class ConversationCreate(ConversationBase):
    agent_id: UUID | str
    messages: List[MessageCreate] = []

class ConversationUpdate(BaseModel):
    title: Optional[str] = None
    project_id: Optional[UUID] = None
    is_archived: Optional[bool] = None

class ConversationResponse(ConversationBase):
    id: UUID
    user_id: UUID
    agent_id: UUID
    created_at: datetime
    updated_at: datetime
    message_count: int
    messages: Optional[List[MessageResponse]] = None
    
    class Config:
        from_attributes = True

class ConversationListResponse(BaseModel):
    id: UUID
    title: Optional[str]
    agent_id: UUID
    project_id: Optional[UUID]
    created_at: datetime
    message_count: int
    
    class Config:
        from_attributes = True

# Batch Create
class ConversationBatchCreate(BaseModel):
    conversations: List[ConversationCreate]

class ConversationBatchResponse(BaseModel):
    created: int
    updated: int
    failed: int
    conversations: List[ConversationResponse]
