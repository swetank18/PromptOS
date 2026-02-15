from sqlalchemy import Column, DateTime, String, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from pgvector.sqlalchemy import Vector
import uuid

from app.core.database import Base

class Embedding(Base):
    __tablename__ = "embeddings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    message_id = Column(UUID(as_uuid=True), ForeignKey("messages.id", ondelete="CASCADE"), nullable=False, index=True)
    embedding = Column(Vector(384))  # 384 dimensions for all-MiniLM-L6-v2
    model_name = Column(String(100), nullable=False)
    model_version = Column(String(50), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
