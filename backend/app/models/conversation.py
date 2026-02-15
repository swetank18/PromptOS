from sqlalchemy import Column, String, Integer, Boolean, DateTime, JSON, ForeignKey, Text, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid

from app.core.database import Base

class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="SET NULL"))
    agent_id = Column(UUID(as_uuid=True), ForeignKey("agents.id"), nullable=False, index=True)
    external_id = Column(String(255), index=True)
    title = Column(String(500))
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    last_message_at = Column(DateTime(timezone=True))
    message_count = Column(Integer, default=0)
    total_tokens = Column(Integer, default=0)
    model_version = Column(String(100))
    is_archived = Column(Boolean, default=False)
    is_deleted = Column(Boolean, default=False)
    deleted_at = Column(DateTime(timezone=True))
    metadata = Column(JSON, default={})

    # Relationships
    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan")

class Message(Base):
    __tablename__ = "messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    conversation_id = Column(UUID(as_uuid=True), ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(String(20), nullable=False, index=True)
    content = Column(Text, nullable=False)
    sequence_number = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    edited_at = Column(DateTime(timezone=True))
    external_id = Column(String(255))
    model = Column(String(100))
    tokens = Column(Integer)
    attachments = Column(JSON, default=[])
    artifacts = Column(JSON, default=[])
    version = Column(Integer, default=1)
    parent_message_id = Column(UUID(as_uuid=True), ForeignKey("messages.id"))
    metadata = Column(JSON, default={})

    # Relationships
    conversation = relationship("Conversation", back_populates="messages")
    
    __table_args__ = (
        CheckConstraint("role IN ('user', 'assistant', 'system')", name="check_role"),
    )
